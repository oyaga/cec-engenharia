const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://api.cecnovo-supabase.e0kmyh.easypanel.host',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'
);
async function setup() {
  // Cria webdesigner
  const { data: wd, error: e1 } = await supabase.auth.admin.createUser({
    email: 'webdesigner@cec.com.br', password: '123456', email_confirm: true
  });
  console.log('Webdesigner criado:', e1 ? e1.message : wd.user.email);

  // Reseta senha do piticalyn
  const { data: pit, error: e2 } = await supabase.auth.admin.updateUserById(
    '1f9a8cdd-9991-45b7-9af4-0851a4d9eb58',
    { password: '123456', email_confirm: true }
  );
  console.log('Piticalyn senha resetada:', e2 ? e2.message : 'OK');

  // Reseta senha da secretaria
  const { data: sec, error: e3 } = await supabase.auth.admin.updateUserById(
    '958389a5-a400-4bd3-b910-3f2636e052b8',
    { password: '123456', email_confirm: true }
  );
  console.log('Secretaria senha resetada:', e3 ? e3.message : 'OK');

  // Testa login
  const login = await supabase.auth.signInWithPassword({ email: 'webdesigner@cec.com.br', password: '123456' });
  console.log('Login webdesigner:', login.error ? login.error.message : 'SUCESSO: ' + login.data.user.email);
}
setup();
