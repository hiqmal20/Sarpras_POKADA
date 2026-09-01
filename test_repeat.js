const authService = require('./services/authService');

async function testRepeatedLogins() {
  console.log('Testing 3 sequential logins...');
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await authService.loginUser({
        email: 'AdminSarpras1',
        nomor_induk: '2026',
        password: 'Admin123!'
      });
      console.log(`Login #${i} SUCCESS:`, res.user.name, 'Token:', !!res.token);
    } catch (e) {
      console.error(`Login #${i} FAILED:`, e.message);
    }
  }
}

testRepeatedLogins();
