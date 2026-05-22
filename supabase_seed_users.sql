-- =========================================================================
-- SEED DE USUÁRIOS INICIAIS (WEBDESIGNER E SECRETARIA)
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  webdesigner_id UUID := gen_random_uuid();
  secretaria_id UUID := gen_random_uuid();
BEGIN
  -- 1. Criação do usuário Webdesigner no Auth
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
    webdesigner_id, 'authenticated', 'authenticated', 'webdesigner@cec.com.br', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), webdesigner_id::text, webdesigner_id, format('{"sub":"%s","email":"%s"}', webdesigner_id::text, 'webdesigner@cec.com.br')::jsonb, 'email', now(), now()
  ) ON CONFLICT DO NOTHING;

  -- Insere na tabela public.users
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (webdesigner_id, 'webdesigner@cec.com.br', 'Master Webdesigner', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';


  -- 2. Criação do usuário Secretaria (Admin) no Auth
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES (
    secretaria_id, 'authenticated', 'authenticated', 'secretaria@cursocec.com.br', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    gen_random_uuid(), secretaria_id::text, secretaria_id, format('{"sub":"%s","email":"%s"}', secretaria_id::text, 'secretaria@cursocec.com.br')::jsonb, 'email', now(), now()
  ) ON CONFLICT DO NOTHING;

  -- Insere na tabela public.users
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (secretaria_id, 'secretaria@cursocec.com.br', 'Secretaria CEC', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

  -- 3. Criação do usuário Piticalyn (Master Admin)
  DECLARE
    piticalyn_id UUID := gen_random_uuid();
  BEGIN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (piticalyn_id, 'authenticated', 'authenticated', 'piticalyn@cec.com.br', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO public.users (id, email, full_name, role)
    VALUES (piticalyn_id, 'piticalyn@cec.com.br', 'Piticalyn Admin', 'admin')
    ON CONFLICT (email) DO UPDATE SET role = 'admin';
  END;

END $$;
