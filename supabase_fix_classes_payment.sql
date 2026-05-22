-- ============================================================
-- FIX URGENTE: Adicionar colunas de pagamento em 'classes'
-- As turmas sumiram porque a query falha sem essas colunas
-- ============================================================

ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS instructor_payment_type  VARCHAR(20)  NOT NULL DEFAULT 'fixed'
        CHECK (instructor_payment_type IN ('fixed', 'split')),
    ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Refresca o schema cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
