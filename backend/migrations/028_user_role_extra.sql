-- Adiciona os papéis 'financeiro' e 'administrativo' ao enum user_role.
-- Esses valores são usados no frontend (AdminUsers, StaffChat) mas estavam
-- ausentes do enum, causando erros 500 ao listar/filtrar usuários.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'financeiro';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'administrativo';
