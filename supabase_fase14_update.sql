-- ==========================================
-- SUPER APP ICC - ATUALIZAÇÃO FASE 14
-- Proteção do Usuário Mestre (Desenvolvedor)
-- ==========================================

-- 1. Criação de uma Trigger Function para impedir a exclusão do usuário Mestre
CREATE OR REPLACE FUNCTION prevent_master_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Impede a exclusão se o nome ou email apontar para o desenvolvedor
    IF OLD.full_name ILIKE '%desenvolvedor%' OR OLD.email ILIKE '%desenvolvedor%' THEN
        RAISE EXCEPTION 'Ação Negada: O usuário Mestre (Desenvolvedor) é protegido pelo sistema e não pode ser deletado.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 2. Anexando a regra à tabela de usuários caso tentem deletar
DROP TRIGGER IF EXISTS protect_master_user ON users;
CREATE TRIGGER protect_master_user
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_master_user_deletion();

-- Nota: Como as senhas do Supabase são criptografadas (Bcrypt), 
-- o Administrador poderá criar o usuário "desenvolvedor" (senha: Mariaclara1)
-- diretamente pela interface "Equipe > Novo Colaborador" do próprio sistema de forma 100% segura.
-- A partir do momento da criação, ele estará blindado de exclusão via Banco de Dados.
