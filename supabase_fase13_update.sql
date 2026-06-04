-- =====================================================================
-- MIGRAÇÃO DE BANCO DE DADOS: PRIORIDADE 13 - QUADRO DE AVISOS
-- =====================================================================

-- 1. Criar a tabela de avisos
CREATE TABLE IF NOT EXISTS public.lms_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'geral', -- 'urgente' | 'importante' | 'geral'
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE, -- nulo para aviso geral
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.lms_announcements ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar duplicidade e conflitos (idempotência)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lms_announcements' AND policyname = 'Qualquer usuario autenticado pode ver avisos'
    ) THEN
        DROP POLICY "Qualquer usuario autenticado pode ver avisos" ON public.lms_announcements;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lms_announcements' AND policyname = 'Admins e coordenadores gerenciam avisos'
    ) THEN
        DROP POLICY "Admins e coordenadores gerenciam avisos" ON public.lms_announcements;
    END IF;
END
$$;

-- 4. Criar novas políticas de segurança
CREATE POLICY "Qualquer usuario autenticado pode ver avisos" 
ON public.lms_announcements FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins e coordenadores gerenciam avisos" 
ON public.lms_announcements FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'coordenador')
));

-- 5. Inserir dados iniciais de teste (mocks se a tabela estiver vazia)
INSERT INTO public.lms_announcements (title, content, priority, course_id)
SELECT 'Manutenção Programada no LMS 🛠️', 'Caros alunos, no próximo domingo das 02:00 às 04:00 o portal passará por manutenção programada para melhorias de velocidade. Planejem seus estudos!', 'importante', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.lms_announcements);
