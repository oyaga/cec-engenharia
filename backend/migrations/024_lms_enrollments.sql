-- Matrículas EAD: liga um aluno (usuário) a vários cursos do LMS.
-- Antes o acesso ao curso vinha da turma (students.turma_id -> classes.lms_course_id),
-- o que limitava o aluno a UM curso. Esta tabela permite múltiplos cursos por aluno.
CREATE TABLE IF NOT EXISTS lms_enrollments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id  UUID NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_enrollments_user ON lms_enrollments(user_id);

-- Retrocompatibilidade: gera matrículas EAD a partir das turmas já existentes,
-- para quem hoje tem acesso liberado (has_lms_access) e uma turma com curso EAD.
INSERT INTO lms_enrollments (user_id, course_id)
SELECT DISTINCT s.user_id, c.lms_course_id
FROM students s
JOIN classes c ON c.id = s.turma_id
WHERE s.user_id IS NOT NULL
  AND s.has_lms_access = true
  AND c.lms_course_id IS NOT NULL
ON CONFLICT (user_id, course_id) DO NOTHING;
