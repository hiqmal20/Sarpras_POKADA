const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const { ROLES } = require('../constants/roles');

const cleanMessagePreview = (text) => {
  if (!text) return '';
  const match = String(text).match(/^\[reply:(\{.*?\})\]\n?([\s\S]*)$/);
  return match ? match[2] : text;
};

const verifyChatAccess = async (chatId, userId, userRole) => {
  const { data: chat, error } = await supabase
    .from('chats')
    .select('id, user_id, admin_id')
    .eq('id', chatId)
    .single();

  if (error || !chat) {
    throw new AppError('Chat tidak ditemukan', 404);
  }

  const isStaff = [ROLES.ADMIN, ROLES.PETUGAS].includes(userRole);
  const isParticipant = chat.user_id === userId || chat.admin_id === userId;

  if (!isStaff && !isParticipant) {
    throw new AppError('Akses ditolak: Anda bukan peserta chat ini', 403);
  }

  // Jika staff mengakses chat yang belum memiliki admin_id, otomatis tugaskan ke staff ini
  if (isStaff && !chat.admin_id) {
    await supabase.from('chats').update({ admin_id: userId }).eq('id', chatId);
    chat.admin_id = userId;
  }

  return chat;
};

exports.findAllChats = async ({ user_id, admin_id, status }, currentUserId) => {
  let query = supabase
    .from('chats')
    .select(`
      *,
      user:users!chats_user_id_fkey (id, name, email, foto, role),
      admin:users!chats_admin_id_fkey (id, name, email, foto, role)
    `)
    .order('updated_at', { ascending: false });

  if (user_id) {
    const cleanUserId = String(user_id).replace(/[^a-zA-Z0-9-]/g, '');
    if (cleanUserId) query = query.or(`user_id.eq.${cleanUserId},admin_id.eq.${cleanUserId}`);
  }
  if (admin_id) query = query.eq('admin_id', admin_id);
  if (status) query = query.eq('status', status);

  const { data: chats, error } = await query;
  if (error) throw error;
  if (!chats || chats.length === 0) return [];

  const chatIds = chats.map((c) => c.id);
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, chat_id, sender_id, message, created_at, is_read')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });

  const messagesByChat = new Map();
  (messages || []).forEach((m) => {
    if (!messagesByChat.has(m.chat_id)) {
      messagesByChat.set(m.chat_id, []);
    }
    messagesByChat.get(m.chat_id).push(m);
  });

  const viewerId = currentUserId || user_id;

  return chats.map((c) => {
    const chatMsgs = messagesByChat.get(c.id) || [];
    const latestMsg = chatMsgs[0] || null;
    const unreadCount = chatMsgs.filter(
      (m) => !m.is_read && (viewerId ? m.sender_id !== viewerId : true)
    ).length;

    return {
      ...c,
      last_message: latestMsg ? cleanMessagePreview(latestMsg.message) : (c.subject || ''),
      last_message_at: latestMsg ? latestMsg.created_at : c.updated_at,
      unread_count: unreadCount
    };
  });
};

exports.findChatMessages = async (chatId, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  // Single-pass hydration: kumpulkan reply_to_message_id untuk batch hydrate tanpa N+1 query
  const replyIds = [...new Set(messages.map((m) => m.reply_to_message_id).filter(Boolean))];
  const repliedMap = new Map();

  // 1. Simpan pesan yang sudah ada dalam query chatId ke map
  messages.forEach((m) => {
    const preview = cleanMessagePreview(m.message);
    repliedMap.set(m.id, {
      id: m.id,
      message: preview,
      snippet: preview,
      sender_id: m.sender_id,
      sender: m.sender,
      sender_name: m.sender?.name || 'Pengguna',
      created_at: m.created_at
    });
  });

  // 2. Jika ada replyId yang berada di luar range hasil fetch, ambil sekaligus (batch)
  const missingReplyIds = replyIds.filter((id) => !repliedMap.has(id));
  if (missingReplyIds.length > 0) {
    const { data: missingMsgs } = await supabase
      .from('chat_messages')
      .select(`
        id,
        message,
        sender_id,
        created_at,
        sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
      `)
      .in('id', missingReplyIds);

    (missingMsgs || []).forEach((m) => {
      const preview = cleanMessagePreview(m.message);
      repliedMap.set(m.id, {
        id: m.id,
        message: preview,
        snippet: preview,
        sender_id: m.sender_id,
        sender: m.sender,
        sender_name: m.sender?.name || 'Pengguna',
        created_at: m.created_at
      });
    });
  }

  return messages.map((m) => {
    let replyTo = null;
    if (m.reply_to_message_id) {
      replyTo = repliedMap.get(m.reply_to_message_id) || {
        id: m.reply_to_message_id,
        message: 'Pesan telah dihapus',
        is_deleted: true
      };
    }
    return {
      ...m,
      reply_to: replyTo
    };
  });
};

exports.createNewChat = async ({ user_id, admin_id, subject, initial_message, attachment_url }) => {
  const now = new Date().toISOString();

  let resolvedAdminId = admin_id || null;
  if (resolvedAdminId) {
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', resolvedAdminId)
      .single();
    if (adminError || !adminUser || ![ROLES.ADMIN, ROLES.PETUGAS].includes(adminUser.role)) {
      throw new AppError('admin_id tidak valid: harus milik Admin/Petugas', 400);
    }
  }

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert([{
      user_id,
      admin_id: resolvedAdminId,
      subject,
      status: 'Open',
      created_at: now,
      updated_at: now
    }])
    .select()
    .single();

  if (chatError) throw chatError;

  if (initial_message) {
    await supabase.from('chat_messages').insert([{
      chat_id: chat.id,
      sender_id: user_id,
      message: initial_message,
      attachment_url: attachment_url || null,
      is_read: false,
      created_at: now
    }]);
  }

  return chat;
};

exports.postMessage = async (chatId, { sender_id, message, attachment_url, reply_to_message_id }, userId, userRole) => {
  const chat = await verifyChatAccess(chatId, userId, userRole);

  if (!message || !message.trim()) throw new AppError('Isi pesan wajib diisi', 400);

  const cleanReplyId = reply_to_message_id ? String(reply_to_message_id).trim() : null;
  let replyToData = null;

  if (cleanReplyId) {
    const { data: refMsg, error: refErr } = await supabase
      .from('chat_messages')
      .select(`
        id,
        chat_id,
        message,
        sender_id,
        created_at,
        sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
      `)
      .eq('id', cleanReplyId)
      .single();

    if (refErr || !refMsg) {
      throw new AppError('Pesan yang dibalas tidak ditemukan', 404);
    }

    if (refMsg.chat_id !== chatId) {
      throw new AppError('Pesan yang dibalas tidak berasal dari percakapan ini', 400);
    }

    replyToData = {
      id: refMsg.id,
      message: cleanMessagePreview(refMsg.message),
      sender_id: refMsg.sender_id,
      sender: refMsg.sender,
      created_at: refMsg.created_at
    };
  }

  const now = new Date().toISOString();
  const insertPayload = {
    chat_id: chatId,
    sender_id: userId,
    message: message.trim(),
    attachment_url: attachment_url || null,
    is_read: false,
    created_at: now
  };

  if (cleanReplyId) {
    insertPayload.reply_to_message_id = cleanReplyId;
  }

  let newMsg = null;
  let msgError = null;

  const res = await supabase
    .from('chat_messages')
    .insert([insertPayload])
    .select(`
      *,
      sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
    `)
    .single();

  newMsg = res.data;
  msgError = res.error;

  // Fallback graceful: jika database Supabase belum menjalankan migrasi kolom reply_to_message_id
  if (msgError && msgError.message && msgError.message.includes('reply_to_message_id')) {
    delete insertPayload.reply_to_message_id;
    const retryRes = await supabase
      .from('chat_messages')
      .insert([insertPayload])
      .select(`
        *,
        sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
      `)
      .single();
    newMsg = retryRes.data;
    msgError = retryRes.error;
  }

  if (msgError) throw msgError;

  supabase
    .from('chats')
    .update({ updated_at: now })
    .eq('id', chatId)
    .then(() => {})
    .catch((err) => console.error('Error updating chat timestamp:', err));

  return {
    ...newMsg,
    reply_to: replyToData,
    reply_to_message_id: cleanReplyId,
    chat
  };
};

exports.markChatAsRead = async (chatId, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', userId);

  if (error) throw error;
  return true;
};

const getMessageForUser = async (chatId, messageId, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, chat_id, sender_id')
    .eq('id', messageId)
    .eq('chat_id', chatId)
    .single();
  if (error || !data) throw new AppError('Pesan tidak ditemukan', 404);
  if (data.sender_id !== userId && ![ROLES.ADMIN, ROLES.PETUGAS].includes(userRole)) {
    throw new AppError('Anda hanya dapat mengubah pesan sendiri', 403);
  }
  return data;
};

exports.updateMessage = async (chatId, messageId, message, userId, userRole) => {
  if (!message || !message.trim()) throw new AppError('Isi pesan wajib diisi', 400);
  await getMessageForUser(chatId, messageId, userId, userRole);
  const { data, error } = await supabase
    .from('chat_messages')
    .update({ message: message.trim() })
    .eq('id', messageId)
    .eq('chat_id', chatId)
    .select(`*, sender:users!chat_messages_sender_id_fkey (id, name, foto, role)`)
    .single();
  if (error) throw error;
  return data;
};

exports.deleteMessage = async (chatId, messageId, userId, userRole) => {
  await getMessageForUser(chatId, messageId, userId, userRole);
  const { error } = await supabase.from('chat_messages').delete().eq('id', messageId).eq('chat_id', chatId);
  if (error) throw error;
};

exports.updateChatStatus = async (chatId, status, userId, userRole) => {
  if (!['Open', 'Closed'].includes(status)) throw new AppError('Status chat tidak valid', 400);
  await verifyChatAccess(chatId, userId, userRole);
  const { data, error } = await supabase.from('chats').update({ status, updated_at: new Date().toISOString() }).eq('id', chatId).select().single();
  if (error) throw error;
  return data;
};

exports.deleteChat = async (chatId, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);
  const { error: messagesError } = await supabase.from('chat_messages').delete().eq('chat_id', chatId);
  if (messagesError) throw messagesError;
  const { error } = await supabase.from('chats').delete().eq('id', chatId);
  if (error) throw error;
};

exports.clearChatMessages = async (chatId, userId, userRole) => {
  const isStaff = [ROLES.ADMIN, ROLES.PETUGAS].includes(userRole);
  if (!isStaff) {
    throw new AppError('Akses ditolak: Hanya Admin atau Petugas yang dapat membersihkan riwayat percakapan', 403);
  }
  await verifyChatAccess(chatId, userId, userRole);
  const { error } = await supabase.from('chat_messages').delete().eq('chat_id', chatId);
  if (error) throw error;
};
