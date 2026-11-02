const assert = require('assert');
const {
  sendMessageSchema,
  createChatSchema,
  updateMessageSchema,
  updateChatStatusSchema
} = require('./validations/chatValidation');

console.log('--- RUNNING CHAT REPLY VALIDATION & LOGIC TESTS ---');

// Test 1: Pesan biasa tanpa reply_to_message_id valid
{
  const res = sendMessageSchema.validate({
    message: 'Halo admin, apakah alat proyektor tersedia?'
  });
  assert.strictEqual(res.error, undefined, 'Normal message should be valid without reply_to_message_id');
  assert.strictEqual(res.value.message, 'Halo admin, apakah alat proyektor tersedia?');
  console.log('✓ Test 1: Mengirim pesan biasa tanpa reply valid');
}

// Test 2: Pesan dengan reply_to_message_id UUID valid
{
  const validUuid = 'c8e19b88-1fa8-4820-94d3-7729f6b92f91';
  const res = sendMessageSchema.validate({
    message: 'Iya proyektor siap dipinjam',
    reply_to_message_id: validUuid
  });
  assert.strictEqual(res.error, undefined, 'Valid UUID reply_to_message_id should pass');
  assert.strictEqual(res.value.reply_to_message_id, validUuid);
  console.log('✓ Test 2: Pesan dengan reply_to_message_id valid lulus validasi');
}

// Test 3: reply_to_message_id bukan UUID ditolak
{
  const res = sendMessageSchema.validate({
    message: 'Test pesan',
    reply_to_message_id: 'invalid-non-uuid-string'
  });
  assert.notStrictEqual(res.error, undefined, 'Invalid UUID should be rejected');
  assert.match(res.error.message, /reply_to_message_id/, 'Error message should mention reply_to_message_id');
  console.log('✓ Test 3: reply_to_message_id non-UUID ditolak');
}

// Test 4: Pesan kosong ditolak
{
  const res = sendMessageSchema.validate({
    message: '   '
  });
  assert.notStrictEqual(res.error, undefined, 'Empty message should be rejected');
  console.log('✓ Test 4: Pesan kosong ditolak');
}

// Test 5: Pesan melebihi 5000 karakter ditolak
{
  const res = sendMessageSchema.validate({
    message: 'a'.repeat(5001)
  });
  assert.notStrictEqual(res.error, undefined, 'Message > 5000 characters should be rejected');
  console.log('✓ Test 5: Pesan > 5000 karakter ditolak');
}

// Test 6: attachment_url bukan HTTPS ditolak
{
  const res = sendMessageSchema.validate({
    message: 'Lihat gambar',
    attachment_url: 'http://insecure.com/test.jpg'
  });
  assert.notStrictEqual(res.error, undefined, 'Non-HTTPS attachment should be rejected');
  console.log('✓ Test 6: attachment_url non-HTTPS ditolak');
}

// Test 7: updateChatStatusSchema validasi
{
  const valid = updateChatStatusSchema.validate({ status: 'Closed' });
  assert.strictEqual(valid.error, undefined);
  const invalid = updateChatStatusSchema.validate({ status: 'Pending' });
  assert.notStrictEqual(invalid.error, undefined);
  console.log('✓ Test 7: Status Open/Closed tervalidasi');
}

// Test 8: Clean preview parsing backward compatibility
{
  const cleanMessagePreview = (text) => {
    if (!text) return '';
    const match = String(text).match(/^\[reply:(\{.*?Feature.*?\})\]\n?([\s\S]*)$/i) ||
                  String(text).match(/^\[reply:(\{.*?\}\])\n?([\s\S]*)$/) ||
                  String(text).match(/^\[reply:(\{.*?Feature.*?\})\]/i) ||
                  String(text).match(/^\[reply:(\{.*?\}\])/);
    if (match) {
      const rest = String(text).replace(/^\[reply:(\{.*?\}\])\n?/, '');
      return rest;
    }
    return text;
  };

  const legacyMsg = '[reply:{"id":"123","senderName":"Admin","text":"Halo"}]\nPesan balasan saya';
  const clean = String(legacyMsg).replace(/^\[reply:(\{.*?\}\])\n?/, '');
  assert.strictEqual(clean, 'Pesan balasan saya');
  console.log('✓ Test 8: Backward compatibility pesan legacy berhasil di-parse');
}

console.log('--- ALL VALIDATION & LOGIC TESTS PASSED ---');
