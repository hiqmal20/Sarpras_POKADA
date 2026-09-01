const supabase = require('./config/supabaseClient');
const authService = require('./services/authService');

async function testWhyFailsOnRepeat() {
  console.log('Login 1:');
  const res1 = await authService.loginUser({
    email: 'AdminSarpras1',
    nomor_induk: '2026',
    password: 'Admin123!'
  });
  console.log('Res 1 done.');

  console.log('\nChecking query directly after Login 1:');
  const q = await supabase
    .from('users')
    .select('*')
    .ilike('name', 'AdminSarpras1')
    .ilike('nomor_induk', '2026')
    .maybeSingle();

  console.log('Query result after Login 1:', q);
}

testWhyFailsOnRepeat();
