-- Create the question bank table to store questions from all quizzes/exams
CREATE TABLE IF NOT EXISTS public.lms_question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT,
    image_url TEXT,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL,
    category TEXT, -- course_title or module_title
    difficulty TEXT DEFAULT 'medium',
    original_quiz_id UUID REFERENCES public.lms_quizzes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster searching/filtering
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON public.lms_question_bank(category);

-- Enable RLS
ALTER TABLE public.lms_question_bank ENABLE ROW LEVEL SECURITY;
