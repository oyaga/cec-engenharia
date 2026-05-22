-- ============================================================
-- TABELA DE VÍNCULO: INSTRUTORES ↔ TURMAS
-- Suporta 1 titular + N substitutos por turma
-- ============================================================

CREATE TABLE IF NOT EXISTS public.class_instructors (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id    UUID NOT NULL,
    user_id     UUID NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'titular'
                    CHECK (role IN ('titular', 'substituto')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_class_instructors_class ON public.class_instructors(class_id);
CREATE INDEX IF NOT EXISTS idx_class_instructors_user  ON public.class_instructors(user_id);

-- Row Level Security
ALTER TABLE public.class_instructors ENABLE ROW LEVEL SECURITY;

-- Política: todos autenticados podem gerenciar
CREATE POLICY "class_instructors_all" ON public.class_instructors
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

