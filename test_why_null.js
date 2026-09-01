const supabase = require('./config/supabaseClient');

async function testWhyNull() {
  console.log('Testing without maybeSingle:');
  const q1 = await supabase.from('users').select('*').ilike('name', 'AdminSarpras1');
  console.log('Q1:', q1.data);

  console.log('Testing with trim/lower/ILIKE on full table:');
  const all = await supabase.from('users').select('*');
  console.log('All users in DB:', all.data);
}

testWhyNull();
