-- ============================================================
-- SCRIPT DE USUÁRIOS SIMPLIFICADO E SEGURO
-- ============================================================

DO $$
DECLARE
  new_admin_email TEXT := 'piticalyn@cec.com.br';
  web_admin_email TEXT := 'webdesigner@cec.com.br';
  sec_admin_email TEXT := 'secretaria@cursocec.com.br';
BEGIN
  -- 1. Garantir que as extensões necessárias existam
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  -- 2. Inserir/Atualizar seu usuário na tabela pública como ADMIN
  -- Nota: Isso pressupõe que você já se cadastrou ou vai se cadastrar com esse email no Auth.
  -- Se o ID no auth ainda não existir, este bloco abaixo pode falhar se houver FK.
  -- Por isso, vamos usar uma abordagem que ignore erros de FK caso o usuário ainda não tenha feito o primeiro login.

  -- Vamos apenas garantir que se o usuário existir no auth, ele vire admin no public.
  INSERT INTO public.users (id, email, full_name, role)
  SELECT id, email, 'Piticalyn Admin', 'admin'
  FROM auth.users
  WHERE email = new_admin_email
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  INSERT INTO public.users (id, email, full_name, role)
  SELECT id, email, 'Master Webdesigner', 'admin'
  FROM auth.users
  WHERE email = web_admin_email
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  INSERT INTO public.users (id, email, full_name, role)
  SELECT id, email, 'Secretaria CEC', 'admin'
  FROM auth.users
  WHERE email = sec_admin_email
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

END $$;
