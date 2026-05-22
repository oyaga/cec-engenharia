-- Script de Atualização (Fase 7 - Avaliações, Certificações e Financeiro Seguro)

-- 1. Tabela de Autorização Financeira (Senha do Gestor para Descontos em Frontends Desacoplados)
CREATE TABLE IF NOT EXISTS public.financial_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(20) NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir PIN padrão Mestre "123456" para primeiro acesso e testes do diretor
INSERT INTO public.financial_pins (pin, role) VALUES ('123456', 'admin') ON CONFLICT DO NOTHING;

-- Liberar leitura RLS para conseguir bater o PIN
ALTER TABLE public.financial_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura de Pins Pública" ON public.financial_pins FOR SELECT USING (true);

-- 2. Adiciona a coluna de verificação do Manual do Aluno e Valores Financeiros base
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS manual_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

-- 3. Cria a tabela de Avaliações (Teórica e Prática com tentativas e retreinamento)
CREATE TABLE IF NOT EXISTS public.student_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TEORICA', 'PRATICA')),
  attempt INTEGER NOT NULL CHECK (attempt >= 1 AND attempt <= 3),
  grade NUMERIC CHECK (grade >= 0 AND grade <= 10),
  retraining_hours INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e Politicas
ALTER TABLE public.student_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso as avaliacoes" ON public.student_evaluations FOR ALL USING (true);

-- 4. Adiciona a coluna final de status na tabela academic_records 
ALTER TABLE public.academic_records 
ADD COLUMN IF NOT EXISTS final_status TEXT CHECK (final_status IN ('APROVADO', 'REPROVADO', 'PENDENTE')) DEFAULT 'PENDENTE';

-- 5. Criando Trigger para inserir na tabela users automaticamente (Gestão de Usuários)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    COALESCE(new.raw_user_meta_data->>'role', 'atendente')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
