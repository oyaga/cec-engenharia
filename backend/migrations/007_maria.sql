-- =====================================================================
-- Migration 007 — Maria Antônia (bot WhatsApp interno).
-- Estado de handoff humano por sessão (substitui o n8n).
-- =====================================================================

CREATE TABLE IF NOT EXISTS atendimentos (
    session_id      TEXT PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'bot',   -- bot | humano
    nome_cliente    TEXT,
    ultimo_contato  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
