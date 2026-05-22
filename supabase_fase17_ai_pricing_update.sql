-- ====================================================================
-- SCRIPT PARA ATUALIZAÇÃO DE PREÇOS E VIEW DE IA (FASE 17 - V2)
-- Execute este script no SQL Editor do seu painel Supabase.
-- ====================================================================

-- 1. Adicionar novas colunas de preço na tabela public.classes
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS price_cash NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_card_10x NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_installments_3x NUMERIC(10,2);

-- 2. Atualizar a View para o Agente de IA (n8n WhatsApp)
-- Nota: O PostgreSQL não permite mudar o nome ou número de colunas com "CREATE OR REPLACE VIEW" 
-- se a estrutura antiga for diferente. Por isso, usamos o DROP primeiro.

DROP VIEW IF EXISTS public.upcoming_classes;

CREATE VIEW public.upcoming_classes AS
SELECT 
    name as turma_nome,
    course_name as curso,
    start_date as data_inicio,
    schedule as horario,
    duration as carga_horaria,
    price_cash as valor_a_vista,
    price_card_10x as valor_cartao_10x,
    price_installments_3x as valor_boleto_3x,
    CASE 
        WHEN actual_start_date IS NOT NULL THEN 'Iniciada (Inscrições Abertas)'
        WHEN start_date < CURRENT_DATE THEN 'Atrasada/Adiada (Consultar nova data)'
        ELSE 'Prevista'
    END as status
FROM public.classes
WHERE 
    (actual_start_date IS NULL AND (start_date >= (CURRENT_DATE - INTERVAL '30 days') OR start_date IS NULL))
    OR 
    (actual_start_date >= (CURRENT_DATE - INTERVAL '7 days'));

-- 3. Garantir permissões
GRANT SELECT ON public.upcoming_classes TO anon;
GRANT SELECT ON public.upcoming_classes TO authenticated;

COMMENT ON VIEW public.upcoming_classes IS 'Lista de turmas disponíveis para venda com preços detalhados para o Agente de IA.';
