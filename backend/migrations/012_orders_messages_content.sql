-- =====================================================================
-- Migration 012 — Pedidos (orders), mensagens internas (messages),
-- comunicados gerais (announcements), conteúdo do site (site_content)
-- e a view upcoming_classes (turmas + preços) usada por vários painéis.
-- =====================================================================

CREATE TABLE IF NOT EXISTS orders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID REFERENCES students(id) ON DELETE SET NULL,
    course_id        UUID,
    customer_name    TEXT,
    amount           NUMERIC(10,2),
    status           TEXT DEFAULT 'pendente',
    payment_method   TEXT,
    asaas_payment_id TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_student_idx ON orders (student_id);

CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_id    UUID REFERENCES classes(id) ON DELETE SET NULL,
    content     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages (receiver_id);

CREATE TABLE IF NOT EXISTS announcements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at   TIMESTAMPTZ,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_content (
    key        TEXT PRIMARY KEY,
    value      JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- View de turmas disponíveis com preços (para painéis e site).
CREATE OR REPLACE VIEW upcoming_classes AS
SELECT
    c.id,
    c.name          AS turma_nome,
    c.course_name   AS curso,
    c.start_date,
    c.schedule,
    c.max_capacity,
    co.title        AS course_title,
    co.price_pix,
    co.price_card,
    co.price_boleto
FROM classes c
LEFT JOIN lms_courses co ON co.id = c.lms_course_id;
