const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://api.cecnovo-supabase.e0kmyh.easypanel.host',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'
);
async function fix() {
  // Usando service_role para confirmar emails e verificar usuários
  const { data, error } = await supabase.from('users').select('id, email, role');
  console.log('Usuários na tabela pública:', data, error?.message);
  
  // Testar login direto
  const login = await supabase.auth.signInWithPassword({ email: 'webdesigner@cec.com.br', password: '123456' });
  console.log('Login webdesigner:', login.error ? login.error.message : 'SUCESSO!');
}
fix();
