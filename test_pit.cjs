const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://api.cecnovo-supabase.e0kmyh.easypanel.host',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
);
async function test() {
  const r1 = await supabase.auth.signInWithPassword({ email: 'piticalyn@cec.com.br', password: '123456' });
  console.log('piticalyn:', r1.error ? r1.error.message : 'SUCESSO! ' + r1.data.user.email);
  
  const r2 = await supabase.auth.signInWithPassword({ email: 'secretaria@cursocec.com.br', password: '123456' });
  console.log('secretaria:', r2.error ? r2.error.message : 'SUCESSO! ' + r2.data.user.email);
}
test();
