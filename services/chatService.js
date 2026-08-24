const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllChats = async ({ user_id, admin_id, status }) => {
  let query = supabase
    .from('chats')
    .select(`
      *,
      user:users!chats_user_id_fkey (id, name, email, foto, role),
      admin:users!chats_admin_id_fkey (id, name, email, foto, role)
    `)
    .order('updated_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (admin_id) query = query.eq('admin_id', admin_id);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  return data;
};

exports.findChatMessages = async (chatId) => {
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

exports.postMessage = async (chatId, { sender_id, message, attachment_url }) => {
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
  let query = supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chatId);

  if (userId) {
    query = query.neq('sender_id', userId);
  }

  const { error } = await query;
  if (error) throw error;

  return true;
};
