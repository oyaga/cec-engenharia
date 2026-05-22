const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://api.cecnovo-supabase.e0kmyh.easypanel.host',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
);
async function test() {
  console.log('Testando conexão...');
  const result = await supabase.auth.signInWithPassword({ email: 'webdesigner@cec.com.br', password: '123456' });
  console.log('Login:', result.error ? 'ERRO: ' + result.error.message : 'SUCESSO: ' + result.data.user.email);
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log('DB:', error ? 'ERRO: ' + error.message : 'CONECTADO! Registros: ' + JSON.stringify(data));
}
test();
