const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const p1 = await supabase.auth.signInWithPassword({ email: 'webdesigner@cec.com.br', password: '123456' });
  const p2 = await supabase.auth.signInWithPassword({ email: 'webdesigner@cec.com.br', password: '12345678' });
  const p3 = await supabase.auth.signInWithPassword({ email: 'piticalyn@cec.com.br', password: '123456' });
  const p4 = await supabase.auth.signInWithPassword({ email: 'piticalyn@cec.com.br', password: '12345678' });
  
  console.log('webdesigner@cec.com.br (123456):', p1.error ? p1.error.message : 'SUCCESS');
  console.log('webdesigner@cec.com.br (12345678):', p2.error ? p2.error.message : 'SUCCESS');
  console.log('piticalyn@cec.com.br (123456):', p3.error ? p3.error.message : 'SUCCESS');
  console.log('piticalyn@cec.com.br (12345678):', p4.error ? p4.error.message : 'SUCCESS');
}
test();
