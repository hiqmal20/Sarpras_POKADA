const supabase = require('./config/supabaseClient');

async function testSupabaseClientState() {
  const email = 'sarpraspokada@gmail.com';
  const password = 'Admin123!';

  console.log('Login 1:');
  const res1 = await supabase.auth.signInWithPassword({ email, password });
  console.log('Res 1 user:', res1.data.user?.id, 'error:', res1.error);

  console.log('Login 2:');
  const res2 = await supabase.auth.signInWithPassword({ email, password });
  console.log('Res 2 user:', res2.data.user?.id, 'error:', res2.error);
}

testSupabaseClientState();
