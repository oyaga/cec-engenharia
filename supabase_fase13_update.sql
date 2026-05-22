-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 13
-- Permissões de Usuário e Configurações
-- ==========================================

-- 1. Adicionando permissões avançadas nos usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"upload_manual": false}'::jsonb;
COMMENT ON COLUMN users.permissions IS 'Permissões granulares de acesso a funcionalidades específicas';

-- 2. Tabela de configurações globais (Para URL do Manual)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insere se não existir
INSERT INTO system_settings (key, value) VALUES ('manual_aluno_url', '') ON CONFLICT (key) DO NOTHING;

-- 3. Inserir permissão padrão p/ admin existente (Para evitar travamentos)
UPDATE users SET permissions = '{"upload_manual": true}'::jsonb WHERE role = 'admin' OR role = 'coordenador';
