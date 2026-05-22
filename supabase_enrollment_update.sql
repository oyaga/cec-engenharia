-- ADICIONA VÍNCULO DE TURMA COM CURSO LMS
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS lms_course_id UUID REFERENCES public.lms_courses(id);

-- ADICIONA CAMPOS DE CONTROLE EAD NO ALUNO
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS has_lms_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_online_only BOOLEAN DEFAULT false;

-- COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.classes.lms_course_id IS 'ID do curso online vinculado a esta turma presencial';
COMMENT ON COLUMN public.students.has_lms_access IS 'Habilita o acesso do aluno ao portal de cursos EAD';
COMMENT ON COLUMN public.students.is_online_only IS 'Marca se o aluno é exclusivamente EAD (não conta para presença física)';
