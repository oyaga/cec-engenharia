-- TABELA DE CURSOS (EAD)
CREATE TABLE IF NOT EXISTS public.lms_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA DE MÓDULOS
CREATE TABLE IF NOT EXISTS public.lms_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INT DEFAULT 0
);

-- TABELA DE AULAS (LIÇÕES)
CREATE TABLE IF NOT EXISTS public.lms_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES public.lms_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    content_text TEXT,
    min_watch_time_sec INT DEFAULT 0, -- Tempo mínimo para liberar próxima aula
    order_index INT DEFAULT 0
);

-- PROGRESSO DO ALUNO
CREATE TABLE IF NOT EXISTS public.lms_student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    watched_seconds INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_accessed TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, lesson_id)
);

-- SISTEMA DE PROVAS (QUIZ)
CREATE TABLE IF NOT EXISTS public.lms_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.lms_modules(id) ON DELETE SET NULL, -- Prova pode ser por módulo ou curso
    title TEXT NOT NULL,
    passing_grade INT DEFAULT 70,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- QUESTÕES DAS PROVAS
CREATE TABLE IF NOT EXISTS public.lms_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Matriz de strings ["Opção A", "Opção B", ...]
    correct_option_index INT NOT NULL
);

-- RESULTADOS DAS PROVAS
CREATE TABLE IF NOT EXISTS public.lms_quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
    score INT NOT NULL,
    attempts_count INT DEFAULT 1,
    is_approved BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ DEFAULT now()
);

-- FÓRUM / DÚVIDAS
CREATE TABLE IF NOT EXISTS public.lms_forum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES public.lms_forum_topics(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- HABILITAR RLS (Segurança básica)
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_forum_replies ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO (Exemplos)
-- Todos podem ver cursos publicados
DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON public.lms_courses;
CREATE POLICY "Public courses are viewable by everyone" ON public.lms_courses
FOR SELECT USING (is_published = true);

-- Apenas o administrador pode inserir aulas/módulos (necessário implementar papel 'admin' no Supabase)
-- (Já existe papel admin via tabela users, mas RLS precisa de polícias complexas ou triggers)
