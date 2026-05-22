-- ====================================================================
-- SCRIPT PARA EXPOR TURMAS PARA O AGENTE n8n (WHATSAPP)
-- Execute este script no SQL Editor do seu painel Supabase.
-- ====================================================================

-- 1. Criar a View para turmas futuras ou iniciadas há menos de 7 dias
-- Esta view simplifica os dados para o agente de IA e aplica a lógica de disponibilidade real.
CREATE OR REPLACE VIEW public.upcoming_classes AS
SELECT 
    name as turma_nome,
    course_name as curso,
    start_date as data_inicio,
    schedule as horario,
    duration as carga_horaria,
    CASE 
        WHEN actual_start_date IS NOT NULL THEN 'Iniciada (Inscrições Abertas)'
        WHEN start_date < CURRENT_DATE THEN 'Atrasada/Adiada (Consultar nova data)'
        ELSE 'Prevista'
    END as status
FROM public.classes
WHERE 
    (actual_start_date IS NULL AND (start_date >= (CURRENT_DATE - INTERVAL '30 days') OR start_date IS NULL)) -- Turmas previstas ou com atraso recente
    OR 
    (actual_start_date >= (CURRENT_DATE - INTERVAL '7 days')); -- Iniciadas há menos de uma semana

-- 2. Conceder permissões de leitura
-- Isso permite que a API do Supabase (usada pelo n8n) acesse esses dados.
GRANT SELECT ON public.upcoming_classes TO anon;
GRANT SELECT ON public.upcoming_classes TO authenticated;

-- Comentário para documentação na API
COMMENT ON VIEW public.upcoming_classes IS 'Lista de turmas disponíveis para venda via Agente de IA.';
