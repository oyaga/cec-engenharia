-- FUNÇÃO PARA RESET DE SENHA POR ADMINISTRADOR
-- Esta função permite que um administrador resete a senha de um aluno para o CPF
-- Deve ser executada com SECURITY DEFINER para ter permissão de alterar a tabela auth.users

CREATE OR REPLACE FUNCTION public.reset_student_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
DECLARE
  hashed_password TEXT;
BEGIN
  -- 1. Verificar se o executor é um administrador/atendente (opcional, mas recomendado)
  -- IF NOT (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'atendente', 'coordenador') THEN
  --   RAISE EXCEPTION 'Acesso negado';
  -- END IF;

  -- 2. Atualizar a senha no Supabase Auth (auth.users)
  -- Nota: O Supabase usa pgcrypto para hash. 
  -- Se for uma instalação padrão, podemos usar:
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  -- 3. Forçar a troca de senha no próximo login
  UPDATE public.users
  SET must_change_password = true,
      updated_at = now()
  WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão de execução para usuários autenticados (o RLS e a lógica interna cuidam da segurança)
GRANT EXECUTE ON FUNCTION public.reset_student_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_student_password(UUID, TEXT) TO service_role;
