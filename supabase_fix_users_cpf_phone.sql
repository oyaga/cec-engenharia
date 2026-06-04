-- Correção de Estrutura da Tabela public.users
-- Adiciona as colunas cpf e phone que estão ausentes no banco de dados remoto e quebrando as consultas/cadastros de instrutores e equipe.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Garantir permissões de acesso para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
