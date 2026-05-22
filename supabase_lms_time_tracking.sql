-- CONTROLE DE TEMPO LMS (CARGA HORÁRIA)
-- 1. Tabela para logs de tempo de estudo
CREATE TABLE IF NOT EXISTS public.lms_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE SET NULL,
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE SET NULL,
    duration_seconds INT NOT NULL DEFAULT 30,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas RLS (Todos os usuários autenticados podem inserir seus próprios logs)
ALTER TABLE public.lms_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes podem enviar seus próprios logs" ON public.lms_time_logs
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Gestores podem ver todos os logs" ON public.lms_time_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'coordenador', 'atendente')
        )
    );

CREATE POLICY "Alunos podem ver seus próprios logs" ON public.lms_time_logs
    FOR SELECT USING (auth.uid() = student_id);

-- Recarregar schema (PostgREST)
NOTIFY pgrst, 'reload schema';
