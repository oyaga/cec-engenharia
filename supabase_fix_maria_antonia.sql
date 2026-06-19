-- ====================================================================
-- SCRIPT DE CORREÇÃO PARA A MARIA ANTÔNIA (CHATBOT E PREÇOS DO SITE)
-- Execute este script no SQL Editor do seu painel Supabase.
-- ====================================================================

-- 1. CRIAR A TABELA DE ATENDIMENTOS (Necessária para controlar o Handoff/Parada do Bot)
CREATE TABLE IF NOT EXISTS public.atendimentos (
    session_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'bot',
    nome_cliente TEXT,
    ultimo_contato TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) na tabela de atendimentos
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir SELECT público para anon" ON public.atendimentos;
DROP POLICY IF EXISTS "Permitir INSERT público para anon" ON public.atendimentos;
DROP POLICY IF EXISTS "Permitir UPDATE público para anon" ON public.atendimentos;
DROP POLICY IF EXISTS "Permitir DELETE público para anon" ON public.atendimentos;

-- Criar políticas públicas de acesso para a anon key (usada pela Maria Antônia no n8n)
CREATE POLICY "Permitir SELECT público para anon" ON public.atendimentos 
    FOR SELECT TO anon USING (true);

CREATE POLICY "Permitir INSERT público para anon" ON public.atendimentos 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Permitir UPDATE público para anon" ON public.atendimentos 
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir DELETE público para anon" ON public.atendimentos 
    FOR DELETE TO anon USING (true);

-- Conceder permissões explícitas na tabela atendimentos para anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimentos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimentos TO authenticated;


-- 2. RECRIAR A VIEW 'upcoming_classes' PARA TRAZER OS PREÇOS REAIS DO SITE (lms_courses)
-- Nota: Usamos DROP VIEW ... CASCADE para evitar erros de dependência do PostgreSQL.
DROP VIEW IF EXISTS public.upcoming_classes CASCADE;

CREATE OR REPLACE VIEW public.upcoming_classes AS
SELECT 
    c.name as turma_nome,
    co.title as curso,
    c.start_date as data_inicio,
    c.schedule as horario,
    co.min_theoretical_hours as carga_horaria,
    co.price_pix as valor_a_vista,
    co.price_card as valor_cartao_10x,
    co.price_boleto as valor_boleto_3x,
    -- Colunas do lms_courses para total compatibilidade com prompts baseados em cursos
    co.title as title,
    co.code as code,
    co.price_pix as price_pix,
    co.price_card as price_card,
    co.price_boleto as price_boleto,
    co.price_financing as price_financing,
    co.max_installments as max_installments,
    co.financing_installments as financing_installments,
    CASE 
        WHEN c.actual_start_date IS NOT NULL THEN 'Iniciada (Inscrições Abertas)'
        WHEN c.start_date < CURRENT_DATE THEN 'Atrasada/Adiada (Consultar nova data)'
        ELSE 'Prevista'
    END as status
FROM public.classes c
LEFT JOIN public.lms_courses co ON c.lms_course_id = co.id
WHERE 
    (c.actual_start_date IS NULL AND (c.start_date >= (CURRENT_DATE - INTERVAL '30 days') OR c.start_date IS NULL))
    OR 
    (c.actual_start_date >= (CURRENT_DATE - INTERVAL '7 days'));

-- Conceder permissões de leitura na View para o n8n
GRANT SELECT ON public.upcoming_classes TO anon;
GRANT SELECT ON public.upcoming_classes TO authenticated;

COMMENT ON VIEW public.upcoming_classes IS 'Lista de turmas disponíveis para venda com preços e colunas sincronizadas do lms_courses.';
