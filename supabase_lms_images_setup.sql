-- SUPORTE A IMAGENS EM PROVAS (LMS)
-- 1. Adicionar coluna de imagem na pergunta
ALTER TABLE public.lms_questions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Nota: Como 'options' é JSONB, podemos simplesmente começar a salvar objetos:
-- { "text": "...", "image_url": "..." } em vez de apenas strings. 
-- O código do frontend será adaptado para ler ambos.

-- 2. Garantir que o bucket para imagens de provas exista
-- (Rode isto se ainda não tiver um bucket 'lms-quiz-images')
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lms-quiz-images', 'lms-quiz-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage para o novo bucket
CREATE POLICY "Imagens de Provas Publicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'lms-quiz-images');

CREATE POLICY "Admins podem subir imagens de provas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lms-quiz-images' AND
    (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'coordenador')))
);

-- Forçar reload do schema
NOTIFY pgrst, 'reload schema';
