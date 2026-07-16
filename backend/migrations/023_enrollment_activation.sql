-- Campos do comprador na pré-matrícula (o formulário do site já os coleta) e
-- marca de processamento, para o webhook do Asaas ativar o aluno automaticamente
-- ao confirmar o pagamento (idempotente por processed_at).
ALTER TABLE enrollments
    ADD COLUMN IF NOT EXISTS cpf            TEXT,
    ADD COLUMN IF NOT EXISTS social_name    TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS turma_id       UUID,
    ADD COLUMN IF NOT EXISTS processed_at   TIMESTAMPTZ;
