/* eslint-disable */
const assert = require('assert');

// Ported helper tests
function parseMessageContent(rawText) {
  if (!rawText) return { replyTo: null, text: "" };
  const match = rawText.match(/^\[reply:(\{.*?\})\]\n?([\s\S]*)$/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === "object") {
        return {
          replyTo: {
            id: String(parsed.id || ""),
            senderName: String(parsed.senderName || "Pesan"),
            text: String(parsed.text || ""),
          },
          text: match[2] || "",
        };
      }
    } catch (_) {}
  }
  return { replyTo: null, text: rawText };
}

function resolveReplyInfo(msg, currentUserId) {
  if (msg.replyTo) return msg.replyTo;

  if (msg.reply_to) {
    const isMe = Boolean(currentUserId && msg.reply_to.sender_id === currentUserId);
    const senderName = isMe ? "Anda" : (msg.reply_to.sender?.name || "Pengguna");
    const rawSnippet = String(msg.reply_to.message || "");
    const cleanSnippet = parseMessageContent(rawSnippet).text;
    const text = cleanSnippet.length > 120 ? cleanSnippet.slice(0, 117) + "..." : cleanSnippet;
    return {
      id: String(msg.reply_to.id || msg.reply_to_message_id || ""),
      senderName,
      text: msg.reply_to.is_deleted ? "Pesan telah dihapus" : (text || "Pesan"),
      senderId: msg.reply_to.sender_id,
      isDeleted: Boolean(msg.reply_to.is_deleted)
    };
  }

  const rawText = msg.message || msg.text || "";
  const parsed = parseMessageContent(rawText);
  if (parsed.replyTo) return parsed.replyTo;

  return null;
}

console.log('--- TESTING FRONTEND CHAT HELPER LOGIC ---');

// Test 1: Normal text without reply
{
  const res = parseMessageContent('Halo admin, apa kabar?');
  assert.strictEqual(res.replyTo, null);
  assert.strictEqual(res.text, 'Halo admin, apa kabar?');
  console.log('✓ Test 1: Normal text without reply parsed correctly');
}

// Test 2: Legacy format reply
{
  const raw = '[reply:{"id":"abc-123","senderName":"Admin","text":"Bisa dipinjam"}]\nBaik, terima kasih';
  const res = parseMessageContent(raw);
  assert.notStrictEqual(res.replyTo, null);
  assert.strictEqual(res.replyTo.id, 'abc-123');
  assert.strictEqual(res.replyTo.senderName, 'Admin');
  assert.strictEqual(res.replyTo.text, 'Bisa dipinjam');
  assert.strictEqual(res.text, 'Baik, terima kasih');
  console.log('✓ Test 2: Legacy reply parsed correctly');
}

// Test 3: resolveReplyInfo from DB object
{
  const msgFromDb = {
    id: 'msg-456',
    message: 'Baik, saya tunggu',
    reply_to_message_id: 'msg-123',
    reply_to: {
      id: 'msg-123',
      message: 'Silakan ambil di lab',
      sender_id: 'user-admin',
      sender: { name: 'Admin Sarpras', role: 'admin' }
    }
  };

  const replyInfo = resolveReplyInfo(msgFromDb, 'user-regular');
  assert.strictEqual(replyInfo.id, 'msg-123');
  assert.strictEqual(replyInfo.senderName, 'Admin Sarpras');
  assert.strictEqual(replyInfo.text, 'Silakan ambil di lab');
  assert.strictEqual(replyInfo.isDeleted, false);
  console.log('✓ Test 3: resolveReplyInfo handles DB reply object with sender details');
}

// Test 4: resolveReplyInfo when message was deleted
{
  const msgDeleted = {
    id: 'msg-789',
    message: 'Kenapa pesan dihapus?',
    reply_to_message_id: 'deleted-msg-id',
    reply_to: {
      id: 'deleted-msg-id',
      message: 'Pesan telah dihapus',
      is_deleted: true
    }
  };

  const replyInfo = resolveReplyInfo(msgDeleted, 'user-regular');
  assert.strictEqual(replyInfo.isDeleted, true);
  assert.strictEqual(replyInfo.text, 'Pesan telah dihapus');
  console.log('✓ Test 4: resolveReplyInfo handles deleted original message safely');
}

// Test 5: Single-level reply (WhatsApp style)
{
  // If user replies to a message that itself has a reply, only the referenced message content is quoted
  const nestedMsg = {
    id: 'nested-msg',
    message: 'Ini balasan ke balasan',
    reply_to_message_id: 'first-reply',
    reply_to: {
      id: 'first-reply',
      message: '[reply:{"id":"original-id","senderName":"Budi","text":"Tanya"}]\nJawaban saya',
      sender_id: 'user-staff',
      sender: { name: 'Staff', role: 'petugas' }
    }
  };

  const replyInfo = resolveReplyInfo(nestedMsg, 'user-regular');
  // It should clean out the nested reply tag and only show 'Jawaban saya'
  assert.strictEqual(replyInfo.text, 'Jawaban saya');
  console.log('✓ Test 5: Single-level reply ignores nested quote tags');
}

console.log('--- ALL FRONTEND CHAT HELPER TESTS PASSED ---');
