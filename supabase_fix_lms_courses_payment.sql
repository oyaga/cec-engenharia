-- ============================================================
-- FIX: Adicionar colunas de pagamento de instrutor em lms_courses
-- Erro: Could not find 'instructor_payment_type' column
-- ============================================================

ALTER TABLE public.lms_courses
    ADD COLUMN IF NOT EXISTS instructor_payment_type  VARCHAR(20)  NOT NULL DEFAULT 'fixed'
        CHECK (instructor_payment_type IN ('fixed', 'split')),
    ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Refresca o schema cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
