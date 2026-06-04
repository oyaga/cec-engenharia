-- =====================================================================
-- MIGRAÇÃO DE BANCO DE DADOS: PRIORIDADE 14 - CERTIFICADOS EMITIDOS
-- =====================================================================

-- 1. Criar a tabela de certificados emitidos
CREATE TABLE IF NOT EXISTS public.lms_issued_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    student_cpf TEXT,
    course_name TEXT NOT NULL,
    hours INTEGER NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.lms_issued_certificates ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar duplicidade e conflitos (idempotência)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lms_issued_certificates' AND policyname = 'Qualquer pessoa pode validar certificados emitidos'
    ) THEN
        DROP POLICY "Qualquer pessoa pode validar certificados emitidos" ON public.lms_issued_certificates;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lms_issued_certificates' AND policyname = 'Qualquer usuario autenticado pode emitir certificados'
    ) THEN
        DROP POLICY "Qualquer usuario autenticado pode emitir certificados" ON public.lms_issued_certificates;
    END IF;
END
$$;

-- 4. Criar novas políticas de segurança
CREATE POLICY "Qualquer pessoa pode validar certificados emitidos" 
ON public.lms_issued_certificates FOR SELECT 
USING (true); -- Acesso público necessário para permitir a validação por terceiros através do QR Code

CREATE POLICY "Qualquer usuario autenticado pode emitir certificados" 
ON public.lms_issued_certificates FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
