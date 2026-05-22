const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://cecnovo-supabase.e0kmyh.easypanel.host',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
);
async function test() {
  const result = await supabase.auth.signInWithPassword({ email: 'webdesigner@cec.com.br', password: '123456' });
  console.log('Login result:', result.error ? result.error.message : 'SUCCESS: ' + result.data.user.email);
}
test();
