const assert = require('assert');
const supabase = require('./config/supabaseClient');
const authService = require('./services/authService');
const categoryService = require('./services/categoryService');
const itemService = require('./services/itemService');
const borrowingService = require('./services/borrowingService');
const returnService = require('./services/returnService');
const chatService = require('./services/chatService');
const dashboardService = require('./services/dashboardService');

async function runEndToEndTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING END-TO-END SYSTEM INTEGRATION TESTS');
  console.log('====================================================\n');

  let userToken, adminToken;
  let userProfile, adminProfile;
  let testCategoryId, testItemId, testBorrowingId, testChatId, testMsg1Id;

  // -----------------------------------------------------------------
  // 1. AUTHENTICATION TESTING
  // -----------------------------------------------------------------
  console.log('--- 1. Testing User & Admin Login ---');
  
  // Test 1.1: User Login
  const userLogin = await authService.loginUser({
    email: 'fathir@gmail.com',
    nomor_induk: '2025',
    password: 'Hitam123'
  });
  assert(userLogin.token, 'User token should be generated');
  assert.strictEqual(userLogin.user.email, 'fathir@gmail.com');
  assert.strictEqual(userLogin.user.role, 'Mahasiswa');
  userToken = userLogin.token;
  userProfile = userLogin.user;
  console.log('✅ PASS: User Login (fathir@gmail.com, role: Mahasiswa)');

  // Test 1.2: Admin Login
  const adminLogin = await authService.loginUser({
    email: 'admin.sarpras@gmail.com',
    nomor_induk: '2026',
    password: 'Admin123!'
  });
  assert(adminLogin.token, 'Admin token should be generated');
  assert.strictEqual(adminLogin.user.email, 'admin.sarpras@gmail.com');
  assert.strictEqual(adminLogin.user.role, 'Admin');
  adminToken = adminLogin.token;
  adminProfile = adminLogin.user;
  console.log('✅ PASS: Admin Login (admin.sarpras@gmail.com, role: Admin)');

  // Test 1.3: Negative Login Test (Wrong Password)
  try {
    await authService.loginUser({
      email: 'fathir@gmail.com',
      nomor_induk: '2025',
      password: 'WrongPassword999'
    });
    assert.fail('Should have thrown error on wrong password');
  } catch (err) {
    assert(err.statusCode === 401 || err.statusCode === 400);
    console.log('✅ PASS: Invalid password rejected with status 401/400');
  }

  // -----------------------------------------------------------------
  // 2. CATEGORY & ITEM MANAGEMENT (ADMIN)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Testing Master Data: Categories & Items ---');
  const cat = await categoryService.createNewCategory({
    name: 'Elektronik Audit Test',
    description: 'Kategori pengujian integrasi sarpras'
  });
  assert(cat.id, 'Category should be created with an ID');
  testCategoryId = cat.id;
  console.log('✅ PASS: Category created:', cat.name, 'ID:', cat.id);

  const item = await itemService.createNewItem({
    name: 'Proyektor Epson EB-E500 Test',
    item_code: 'ITM-TEST-' + Date.now().toString().slice(-4),
    category_id: testCategoryId,
    brand: 'Epson',
    stock: 10,
    available_stock: 10,
    condition: 'Baik',
    location: 'Lab Multimedia 1',
    status: 'Tersedia'
  });
  assert(item.id, 'Item should be created with an ID');
  testItemId = item.id;
  console.log('✅ PASS: Item created:', item.name, 'Stock:', item.stock);

  // -----------------------------------------------------------------
  // 3. USER BORROWING FLOW (USER)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Testing Borrowing Workflow ---');
  const borrowDate = new Date().toISOString().split('T')[0];
  const returnDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

  const borrowing = await borrowingService.createBorrowingRequest({
    user_id: userProfile.id,
    borrow_date: borrowDate,
    planned_return_date: returnDate,
    purpose: 'Praktikum Pemrograman Web Sarpras',
    items: [
      { item_id: testItemId, quantity: 2, condition_before: 'Baik' }
    ]
  });
  assert(borrowing.id, 'Borrowing should be created with an ID');
  testBorrowingId = borrowing.id;
  console.log('✅ PASS: Borrowing created by user. Borrow code:', borrowing.borrow_code, 'Status:', borrowing.status);

  // Check item stock reduction
  const itemAfterBorrow = await itemService.findItemById(testItemId);
  assert.strictEqual(itemAfterBorrow.available_stock, 8, 'Available stock should be decremented from 10 to 8');
  console.log('✅ PASS: Stock correctly decremented from 10 to 8');

  // Test 3.1: Admin Approves Borrowing
  const approvedBorrow = await borrowingService.updateStatus(
    testBorrowingId,
    { status: 'Disetujui', admin_note: 'Disetujui untuk kegiatan akademik' }
  );
  assert.strictEqual(approvedBorrow.status, 'Disetujui');
  console.log('✅ PASS: Admin approved borrowing request (status: Disetujui)');

  // -----------------------------------------------------------------
  // 4. USER RETURN REQUEST & PHYSICAL RETURN (ADMIN)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Testing Return Workflow ---');
  const { data: returnReq, error: retReqErr } = await supabase
    .from('return_requests')
    .insert([{
      borrowing_id: testBorrowingId,
      user_id: userProfile.id,
      planned_return_date: returnDate,
      condition: 'Baik',
      note: 'Selesai digunakan dalam kondisi baik'
    }])
    .select()
    .single();
  if (retReqErr) throw retReqErr;
  assert(returnReq.id, 'Return request should be created');
  console.log('✅ PASS: User submitted return request ID:', returnReq.id);

  // Admin approves return request & processes physical return
  const { error: updReqErr } = await supabase
    .from('return_requests')
    .update({
      status: 'Disetujui',
      admin_note: 'Barang diterima dan dicek lengkap',
      verified_by: adminProfile.id,
      verified_at: new Date().toISOString()
    })
    .eq('id', returnReq.id);
  if (updReqErr) throw updReqErr;
  console.log('✅ PASS: Admin approved return request');

  const returnRecord = await returnService.createReturnRecord({
    borrowing_id: testBorrowingId,
    received_by: adminProfile.id,
    return_date: returnDate,
    condition: 'Baik',
    note: 'Pengecekan fisik selesai tanpa cacat'
  });
  assert(returnRecord.id, 'Return record should be created');
  console.log('✅ PASS: Physical return processed. Status borrowing updated to Dikembalikan');

  // Verify stock restoration
  const itemAfterReturn = await itemService.findItemById(testItemId);
  assert.strictEqual(itemAfterReturn.available_stock, 10, 'Available stock should be restored to 10');
  console.log('✅ PASS: Item stock restored to 10');

  // -----------------------------------------------------------------
  // 5. CHAT & WHATSAPP-STYLE MESSAGE REPLY TESTING
  // -----------------------------------------------------------------
  console.log('\n--- 5. Testing Chat & WhatsApp-Style Message Reply ---');
  const chat = await chatService.createNewChat({
    user_id: userProfile.id,
    admin_id: adminProfile.id,
    subject: 'Pertanyaan Peminjaman Proyektor',
    initial_message: 'Halo Admin, apakah proyektor Epson tersedia untuk hari Senin?'
  });
  assert(chat.id, 'Chat should be created');
  testChatId = chat.id;
  console.log('✅ PASS: Chat initiated by user, ID:', testChatId);

  // Get initial message ID
  const chatHistory1 = await chatService.findChatMessages(testChatId, userProfile.id, userProfile.role);
  assert(chatHistory1.length >= 1, 'Should contain initial message');
  testMsg1Id = chatHistory1[0].id;

  // Admin replies to message 1
  const replyMsg = await chatService.postMessage(
    testChatId,
    {
      sender_id: adminProfile.id,
      message: 'Tentu, proyektor sudah tersedia dan dapat diambil di lab.',
      reply_to_message_id: testMsg1Id
    },
    adminProfile.id,
    adminProfile.role
  );
  assert(replyMsg.id, 'Reply message should be created');
  assert.strictEqual(replyMsg.reply_to_message_id, testMsg1Id);
  console.log('✅ PASS: Admin replied quoting message 1');

  // Fetch messages with reply hydration
  const chatHistory2 = await chatService.findChatMessages(testChatId, adminProfile.id, adminProfile.role);
  const hydratedReply = chatHistory2.find(m => m.id === replyMsg.id);
  assert(hydratedReply, 'Hydrated reply message should be present');
  assert(hydratedReply.reply_to, 'reply_to metadata must be hydrated');
  assert.strictEqual(hydratedReply.reply_to.id, testMsg1Id);
  assert.strictEqual(hydratedReply.reply_to.sender_name, userProfile.name);
  console.log('✅ PASS: Reply hydration resolved quoted sender:', hydratedReply.reply_to.sender_name, 'snippet:', hydratedReply.reply_to.snippet);

  // -----------------------------------------------------------------
  // 6. DASHBOARD & STATS (ADMIN)
  // -----------------------------------------------------------------
  console.log('\n--- 6. Testing Admin Dashboard Stats ---');
  const stats = await dashboardService.getStats();
  assert(stats, 'Stats should be returned');
  assert(typeof stats.items.total === 'number', 'stats.items.total should be a number');
  assert(typeof stats.users.totalAktif === 'number', 'stats.users.totalAktif should be a number');
  console.log('✅ PASS: Dashboard stats loaded (Items Total:', stats.items.total, 'Active Users:', stats.users.totalAktif, 'Borrowings Active:', stats.borrowings.aktif, ')');

  // -----------------------------------------------------------------
  // 7. CLEANUP TEST ARTIFACTS
  // -----------------------------------------------------------------
  console.log('\n--- 7. Cleaning Up Test Artifacts ---');
  try {
    await supabase.from('chat_messages').delete().eq('chat_id', testChatId);
    await supabase.from('chats').delete().eq('id', testChatId);
    await supabase.from('returns').delete().eq('borrowing_id', testBorrowingId);
    await supabase.from('return_requests').delete().eq('borrowing_id', testBorrowingId);
    await supabase.from('borrowings_items').delete().eq('borrowing_id', testBorrowingId);
    await supabase.from('borrowings').delete().eq('id', testBorrowingId);
    await supabase.from('items').delete().eq('id', testItemId);
    await supabase.from('categories').delete().eq('id', testCategoryId);
    console.log('✅ PASS: Test data cleaned up safely without affecting master records');
  } catch (cleanErr) {
    console.warn('Cleanup warning:', cleanErr.message);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL END-TO-END SYSTEM INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runEndToEndTests().then(() => process.exit(0)).catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
