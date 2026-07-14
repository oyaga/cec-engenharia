-- =====================================================================
-- Migration 021 — Expõe status e capacity na view upcoming_classes.
-- O Dashboard filtra turmas por status ('scheduled') e usa capacity;
-- a view antiga não trazia esses campos (KPI "Aulas Agendadas" ficava 0).
-- CREATE OR REPLACE preserva as colunas existentes e adiciona no fim.
-- =====================================================================

CREATE OR REPLACE VIEW upcoming_classes AS
SELECT c.id,
    c.name           AS turma_nome,
    c.course_name    AS curso,
    c.start_date,
    c.schedule,
    c.max_capacity,
    co.title         AS course_title,
    co.price_pix,
    co.price_card,
    co.price_boleto,
    c.status,
    c.max_capacity   AS capacity
FROM classes c
LEFT JOIN lms_courses co ON co.id = c.lms_course_id;
