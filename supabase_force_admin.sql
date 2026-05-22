-- 1. Garante que o usuário piticalyn@cec.com.br seja um ADMIN no banco
INSERT INTO public.users (id, email, full_name, role, permissions, is_active)
SELECT id, email, 'Administrador Master', 'admin', '{"edit_site": true, "view_finance": true, "manage_classes": true, "manage_leads": true, "manage_team": true, "manage_legal_docs": true}'::jsonb, true
FROM auth.users
WHERE email = 'piticalyn@cec.com.br'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', 
    permissions = '{"edit_site": true, "view_finance": true, "manage_classes": true, "manage_leads": true, "manage_team": true, "manage_legal_docs": true}'::jsonb,
    is_active = true;
