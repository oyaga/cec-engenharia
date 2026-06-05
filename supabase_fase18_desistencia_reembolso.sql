-- Adiciona colunas para controle de desistência e reembolso na tabela de estudantes
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS cancellation_date DATE,
  ADD COLUMN IF NOT EXISTS refund_value NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT CHECK (cancellation_reason IN ('arrependimento_7_dias', 'desistencia_apos_7_dias', 'outro')),
  ADD COLUMN IF NOT EXISTS cancellation_note TEXT;

COMMENT ON COLUMN public.students.cancellation_date IS 'Data em que o aluno desistiu/cancelou o curso';
COMMENT ON COLUMN public.students.refund_value IS 'Valor reembolsado ou estornado para o aluno';
COMMENT ON COLUMN public.students.cancellation_reason IS 'Motivo do cancelamento (arrependimento legal 7 dias ou desistência voluntária tardia)';
COMMENT ON COLUMN public.students.cancellation_note IS 'Observações e justificativas detalhadas do cancelamento e estorno';
