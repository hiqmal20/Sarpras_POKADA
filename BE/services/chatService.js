const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');
const { ROLES } = require('../constants/roles');

const verifyChatAccess = async (chatId, userId, userRole) => {
  const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(userRole);
  if (isPrivileged) return;

  const { data: chat, error } = await supabase
    .from('chats')
    .select('user_id, admin_id')
    .eq('id', chatId)
    .single();

  if (error || !chat) {
    throw new AppError('Chat tidak ditemukan', 404);
  }

  if (chat.user_id !== userId && chat.admin_id !== userId) {
    throw new AppError('Akses ditolak: Anda bukan peserta chat ini', 403);
  }
};

exports.findAllChats = async ({ user_id, admin_id, status }, currentUserId, io) => {
  let query = supabase
    .from('chats')
    .select(`
      *,
      user:users!chats_user_id_fkey (id, name, email, foto, role),
      admin:users!chats_admin_id_fkey (id, name, email, foto, role)
    `)
    .order('updated_at', { ascending: false });

  if (user_id) query = query.or(`user_id.eq.${user_id},admin_id.eq.${user_id}`);
  if (admin_id) query = query.eq('admin_id', admin_id);
  if (status) query = query.eq('status', status);

  const { data: chats, error } = await query;
  if (error) throw error;

  if (!chats || chats.length === 0) return [];

  const chatIds = chats.map((c) => c.id);
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, chat_id, message, sender_id, is_read, created_at')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: true });

  const messagesByChat = {};
  (messages || []).forEach((m) => {
    if (!messagesByChat[m.chat_id]) messagesByChat[m.chat_id] = [];
    messagesByChat[m.chat_id].push(m);
  });

  const enrichedChats = chats.map((chat) => {
    const chatMsgs = messagesByChat[chat.id] || [];
    const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : null;

    const unreadCount = currentUserId
      ? chatMsgs.filter((m) => m.is_read !== true && m.sender_id !== currentUserId).length
      : 0;

    const partnerId = chat.user_id === currentUserId ? chat.admin_id : chat.user_id;
    const isPartnerOnline = Boolean(partnerId && io?.onlineUsers?.has(partnerId));
    const hasOnlineAdmin = Boolean(io?.onlineAdmins && io.onlineAdmins.size > 0);
    const partnerUser = chat.user_id === currentUserId ? chat.admin : chat.user;
    const partnerLastSeen =
      (partnerId && io?.lastSeenUsers?.get(partnerId)) ||
      partnerUser?.last_seen ||
      null;

    return {
      ...chat,
      last_message: lastMsg ? lastMsg.message : (chat.subject || 'Percakapan baru'),
      last_message_at: lastMsg ? lastMsg.created_at : chat.updated_at,
      unread_count: unreadCount,
      is_partner_online: isPartnerOnline,
      partner_last_seen: partnerLastSeen,
      has_online_admin: hasOnlineAdmin,
    };
  });

  return enrichedChats;
};

exports.findChatMessages = async (chatId, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);

  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

exports.getOrCreateChat = async ({ user_id, subject }) => {
  const { data: existingChat } = await supabase
    .from('chats')
    .select(`
      *,
      user:users!chats_user_id_fkey (id, name, email, foto, role),
      admin:users!chats_admin_id_fkey (id, name, email, foto, role)
    `)
    .eq('user_id', user_id)
    .eq('status', 'Open')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingChat) {
    return existingChat;
  }

  return await exports.createNewChat({ user_id, subject: subject || 'Konsultasi SARPRAS' });
};

exports.createNewChat = async ({ user_id, admin_id, subject, initial_message, attachment_url }) => {
  const now = new Date().toISOString();

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert([{
      user_id,
      admin_id: admin_id || null,
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

exports.postMessage = async (chatId, { sender_id, message, attachment_url }, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);

  const now = new Date().toISOString();

  const { data: newMsg, error: msgError } = await supabase
    .from('chat_messages')
    .insert([{
      chat_id: chatId,
      sender_id,
      message,
      attachment_url: attachment_url || null,
      is_read: false,
      created_at: now
    }])
    .select(`
      *,
      sender:users!chat_messages_sender_id_fkey (id, name, foto, role)
    `)
    .single();

  if (msgError) throw msgError;

  await supabase
    .from('chats')
    .update({ updated_at: now })
    .eq('id', chatId);

  return newMsg;
};

exports.markChatAsRead = async (chatId, userId) => {
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', userId);

  if (error) throw error;
  return true;
};

exports.clearChatMessages = async (chatId, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('chat_id', chatId);

  if (error) throw error;

  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

  return true;
};

exports.deleteChat = async (chatId, userId, userRole) => {
  await verifyChatAccess(chatId, userId, userRole);

  // Hapus seluruh pesan di dalam chat terlebih dahulu
  await supabase
    .from('chat_messages')
    .delete()
    .eq('chat_id', chatId);

  // Hapus entitas percakapan
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) throw error;
  return true;
};
