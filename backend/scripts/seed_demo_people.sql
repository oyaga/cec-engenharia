BEGIN;

-- Todas as contas DEMO reutilizam somente no ambiente local o hash da senha admin123.
WITH credential AS (
  SELECT password_hash FROM users WHERE email = 'admin@cec.local' LIMIT 1
)
INSERT INTO users (id, email, password_hash, full_name, role, phone, permissions, is_active)
SELECT id, email, credential.password_hash, full_name, role::user_role, phone, permissions::jsonb, true
FROM credential CROSS JOIN (VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'prof.ana.demo@cec.local', 'Profa. Ana Martins — DEMO QA', 'instrutor', '(21) 99910-1001', '{"access_instrutor_portal":true}'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'prof.bruno.demo@cec.local', 'Prof. Bruno Lima — DEMO QA', 'instrutor', '(21) 99910-1002', '{"access_instrutor_portal":true}'),
  ('b1000000-0000-4000-8000-000000000001'::uuid, 'aluno.joao.demo@cec.local', 'João Almeida — DEMO QA', 'aluno', '(21) 99920-2001', '{}'),
  ('b1000000-0000-4000-8000-000000000002'::uuid, 'aluna.maria.demo@cec.local', 'Maria Oliveira — DEMO QA', 'aluno', '(21) 99920-2002', '{}'),
  ('b1000000-0000-4000-8000-000000000003'::uuid, 'aluno.pedro.demo@cec.local', 'Pedro Santos — DEMO QA', 'aluno', '(21) 99920-2003', '{}'),
  ('b1000000-0000-4000-8000-000000000004'::uuid, 'aluna.larissa.demo@cec.local', 'Larissa Costa — DEMO QA', 'aluno', '(21) 99920-2004', '{}')
) AS demo(id, email, full_name, role, phone, permissions)
ON CONFLICT ((lower(email))) DO UPDATE SET
  full_name = EXCLUDED.full_name, role = EXCLUDED.role, phone = EXCLUDED.phone,
  permissions = EXCLUDED.permissions, is_active = true, updated_at = now();

INSERT INTO students (id, user_id, turma_id, full_name, cpf, email, phone, education_level, status, has_lms_access, manual_signed, terms_accepted, payment_status, progress_percent)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'd511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'João Almeida — DEMO QA', '90000000001', 'aluno.joao.demo@cec.local', '(21) 99920-2001', 'Técnico Nível Médio', 'ativa', true, true, true, 'pago', 65),
  ('c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'd511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'Maria Oliveira — DEMO QA', '90000000002', 'aluna.maria.demo@cec.local', '(21) 99920-2002', 'Superior Completo', 'ativa', true, true, true, 'pago', 85),
  ('c1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', 'd511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'Pedro Santos — DEMO QA', '90000000003', 'aluno.pedro.demo@cec.local', '(21) 99920-2003', 'Técnico Nível Médio', 'ativa', true, true, true, 'pendente', 30),
  ('c1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000004', 'd511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'Larissa Costa — DEMO QA', '90000000004', 'aluna.larissa.demo@cec.local', '(21) 99920-2004', 'Superior Incompleto', 'ativa', true, true, true, 'pago', 50)
ON CONFLICT (cpf) DO UPDATE SET
  turma_id = EXCLUDED.turma_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email,
  phone = EXCLUDED.phone, has_lms_access = true, status = 'ativa', updated_at = now();

INSERT INTO class_instructors (class_id, user_id, role) VALUES
  ('d511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'a1000000-0000-4000-8000-000000000001', 'titular'),
  ('d511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'a1000000-0000-4000-8000-000000000002', 'auxiliar')
ON CONFLICT (class_id, user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO instructor_qualifications (id, user_id, method, status, qualification_type, training_hours, training_date, valid_until, approved_at)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'CD-CL', 'ativo', 'experience', 8, CURRENT_DATE - 60, CURRENT_DATE + 900, now()),
  ('d1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'CD-CL', 'ativo', 'snqc', 8, CURRENT_DATE - 45, CURRENT_DATE + 1000, now())
ON CONFLICT (id) DO UPDATE SET status = 'ativo', valid_until = EXCLUDED.valid_until, updated_at = now();

INSERT INTO instructor_categories (instructor_id, category) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Caldeiraria e Tubulação'),
  ('a1000000-0000-4000-8000-000000000002', 'Controle Dimensional')
ON CONFLICT (instructor_id, category) DO NOTHING;

INSERT INTO instructor_courses (instructor_id, course_id) VALUES
  ('a1000000-0000-4000-8000-000000000001', '10a2043a-436e-43ad-a381-e493600e6aae'),
  ('a1000000-0000-4000-8000-000000000002', '10a2043a-436e-43ad-a381-e493600e6aae')
ON CONFLICT (instructor_id, course_id) DO NOTHING;

INSERT INTO lms_enrollments (user_id, course_id) VALUES
  ('b1000000-0000-4000-8000-000000000001', '10a2043a-436e-43ad-a381-e493600e6aae'),
  ('b1000000-0000-4000-8000-000000000002', '10a2043a-436e-43ad-a381-e493600e6aae'),
  ('b1000000-0000-4000-8000-000000000003', '10a2043a-436e-43ad-a381-e493600e6aae'),
  ('b1000000-0000-4000-8000-000000000004', '10a2043a-436e-43ad-a381-e493600e6aae')
ON CONFLICT (user_id, course_id) DO NOTHING;

INSERT INTO lms_modules (id, course_id, title, order_index, is_in_person)
VALUES ('e1000000-0000-4000-8000-000000000001', '10a2043a-436e-43ad-a381-e493600e6aae', 'Fundamentos de Caldeiraria — DEMO QA', 90, false)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO lms_modules (id, course_id, title, order_index, is_in_person, in_person_date, start_time, end_time, cep, street, address_number, neighborhood, city, state, whatsapp_url, attendance_open_at, attendance_close_at)
VALUES ('e1000000-0000-4000-8000-000000000002', '10a2043a-436e-43ad-a381-e493600e6aae', 'Prática de Inspeção — DEMO QA', 91, true, CURRENT_DATE + 7, '08:00', '17:00', '20040-020', 'Avenida Rio Branco', '100', 'Centro', 'Rio de Janeiro', 'RJ', 'https://chat.whatsapp.com/demo-cec-qa', now() - interval '1 day', now() + interval '6 days')
ON CONFLICT (id) DO UPDATE SET
  in_person_date = EXCLUDED.in_person_date, attendance_open_at = EXCLUDED.attendance_open_at,
  attendance_close_at = EXCLUDED.attendance_close_at;

INSERT INTO lms_lessons (id, module_id, title, content_text, min_watch_time_sec, order_index, type)
VALUES
  ('f1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'Leitura e interpretação de desenho — DEMO QA', 'Material demonstrativo para validação do progresso.', 900, 1, 'video'),
  ('f1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'Instrumentos de medição — DEMO QA', 'Material demonstrativo com apoio em PDF.', 1200, 2, 'video')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content_text = EXCLUDED.content_text;

INSERT INTO attendance_records (class_id, student_id, module_id, date, status, confirmed_by_student, student_confirmed_at, professor_confirmed_at, recorded_by)
VALUES
  ('d511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', CURRENT_DATE + 7, 'presente', true, now(), now(), 'a1000000-0000-4000-8000-000000000001'),
  ('d511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'c1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000002', CURRENT_DATE + 7, 'presente', true, now(), NULL, NULL),
  ('d511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'c1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002', CURRENT_DATE + 7, 'ausente', false, NULL, now(), 'a1000000-0000-4000-8000-000000000001'),
  ('d511466e-eb68-4b6f-a8fd-fb9e572c0e6d', 'c1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000002', CURRENT_DATE + 7, 'justificado', true, now(), now(), 'a1000000-0000-4000-8000-000000000001')
ON CONFLICT (class_id, student_id, module_id, date) DO UPDATE SET
  status = EXCLUDED.status, confirmed_by_student = EXCLUDED.confirmed_by_student,
  student_confirmed_at = EXCLUDED.student_confirmed_at, professor_confirmed_at = EXCLUDED.professor_confirmed_at,
  recorded_by = EXCLUDED.recorded_by, updated_at = now();

INSERT INTO lms_lesson_questions (id, lesson_id, student_id, question_text, created_at)
VALUES ('fa000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Professor, como identifico a tolerancia correta neste desenho?', now())
ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text;

COMMIT;
