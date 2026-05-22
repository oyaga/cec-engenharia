-- SCRIPT PARA AUTOMAÇÃO DE ACESSO DOS ALUNOS
-- Este script prepara o banco para o fluxo de "Primeiro Acesso" e roles de estudante

-- 1. Adicionar coluna para controle de troca de senha no primeiro login
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Atualizar a restrição de "role" para incluir o papel de 'student'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'coordenador', 'atendente', 'instrutor', 'student'));

-- 3. (Opcional) Vincular Aluno ao Usuário do Auth
-- Caso queira que a tabela de students tenha referência direta ao ID do Auth
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Garantir que o RLS permita que o aluno veja seu próprio perfil de usuário
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.users;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar sua própria senha_flag" ON public.users;
CREATE POLICY "Usuários podem atualizar sua própria senha_flag" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
