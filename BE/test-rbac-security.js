const assert = require('assert');
const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const authService = require('./services/authService');
const { requireAuth, requireRole } = require('./middleware/authMiddleware');
const { ROLES } = require('./constants/roles');

async function testRbacSecurity() {
  console.log('====================================================');
  console.log('🔒 RUNNING SECURITY & RBAC NEGATIVE TESTS');
  console.log('====================================================\n');

  // 1. Get tokens
  const userLogin = await authService.loginUser({
    email: 'fathir@gmail.com',
    nomor_induk: '2025',
    password: 'Hitam123'
  });
  const userToken = userLogin.token;

  const adminLogin = await authService.loginUser({
    email: 'admin.sarpras@gmail.com',
    nomor_induk: '2026',
    password: 'Admin123!'
  });
  const adminToken = adminLogin.token;

  // 2. Setup mock express app with real authMiddleware
  const app = express();
  app.use(express.json());

  // Protected endpoint for Admin only
  app.get('/api/admin-only', requireAuth, requireRole('Admin'), (req, res) => {
    res.json({ status: 'success', data: 'admin-secret-data' });
  });

  // Protected endpoint for any authenticated user
  app.get('/api/user-resource', requireAuth, (req, res) => {
    res.json({ status: 'success', user: req.user.name, role: req.user.role });
  });

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 1: Unauthenticated request -> Must return 401
    const unauthRes = await fetch(`${baseUrl}/api/user-resource`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated access must return 401');
    console.log('✅ PASS: Unauthenticated access blocked with HTTP 401');

    // Test 2: User token on User resource -> Must return 200
    const userOkRes = await fetch(`${baseUrl}/api/user-resource`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(userOkRes.status, 200, 'User token on user resource must return 200');
    const userOkData = await userOkRes.json();
    assert.strictEqual(userOkData.role, 'Mahasiswa');
    console.log('✅ PASS: Authenticated user granted access to user resource');

    // Test 3: User token on Admin-only resource -> Must return 403 Forbidden!
    const userBlockedRes = await fetch(`${baseUrl}/api/admin-only`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(userBlockedRes.status, 403, 'User access to Admin endpoint must return 403');
    console.log('✅ PASS: Regular user blocked from Admin endpoint with HTTP 403 Forbidden');

    // Test 4: Admin token on Admin-only resource -> Must return 200 OK
    const adminOkRes = await fetch(`${baseUrl}/api/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminOkRes.status, 200, 'Admin token on admin resource must return 200');
    console.log('✅ PASS: Admin successfully granted access to Admin endpoint with HTTP 200');

    console.log('\n====================================================');
    console.log('🎉 ALL SECURITY & RBAC TESTS PASSED!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

testRbacSecurity().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ RBAC TEST FAILED:', err);
  process.exit(1);
});
