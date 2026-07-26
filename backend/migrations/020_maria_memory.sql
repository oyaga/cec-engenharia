-- =====================================================================
-- Migration 020 — Memória de conversa da Maria Antônia.
-- Guarda o histórico de mensagens por sessão para o agente ter contexto
-- (substitui a "memória" do nó AI Agent do n8n).
-- =====================================================================

CREATE TABLE IF NOT EXISTS maria_messages (
    id          BIGSERIAL PRIMARY KEY,
    session_id  TEXT NOT NULL,
    role        TEXT NOT NULL,          -- user | assistant
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maria_messages_session
    ON maria_messages (session_id, created_at);
