-- =====================================================================
-- Migration 008 — Colunas extras de lms_courses usadas pela tela Cursos
-- (grade técnica, regras de aprovação, status e preços de retreinamento).
-- =====================================================================

ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS practical_hours            NUMERIC;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS min_attendance            NUMERIC DEFAULT 75;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS min_grade                 NUMERIC DEFAULT 6.0;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS max_instructors           INTEGER DEFAULT 8;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS status                    TEXT DEFAULT 'ativo';
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS price_notes               TEXT;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS asaas_product_id          TEXT;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS retrain_teorico_days      INTEGER DEFAULT 1;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS retrain_teorico_price_day NUMERIC;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS retrain_pratico_days      INTEGER DEFAULT 1;
ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS retrain_pratico_price_day NUMERIC;
