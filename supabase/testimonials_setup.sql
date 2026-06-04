-- 1. Criar a tabela de depoimentos/avaliações
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    course TEXT NOT NULL,
    evaluation_date DATE DEFAULT CURRENT_DATE,
    content TEXT,
    image_url TEXT, -- Para os prints enviados pelo admin
    status TEXT DEFAULT 'pending', -- approved, pending, rejected
    type TEXT DEFAULT 'text', -- text, screenshot
    rating INTEGER DEFAULT 5, -- Nota de avaliação em estrelas
    admin_description TEXT, -- Descrição breve do admin para os prints
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
-- Permitir leitura pública apenas de depoimentos APROVADOS
CREATE POLICY "Permitir leitura de aprovados" 
ON public.testimonials FOR SELECT 
USING (status = 'approved');

-- Permitir que qualquer pessoa envie um depoimento (entra como pending)
CREATE POLICY "Permitir envio de depoimentos" 
ON public.testimonials FOR INSERT 
WITH CHECK (status = 'pending' OR auth.role() = 'authenticated');

-- Permitir que apenas admins gerenciem (Update/Delete)
CREATE POLICY "Gerenciamento apenas para admins" 
ON public.testimonials FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Storage Bucket para Imagens (Prints)
-- Nota: Esta parte geralmente requer permissões de superusuário ou via Painel do Supabase.
-- Se falhar via SQL, o usuário pode criar manualmente um bucket chamado 'testimonials_images'.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('testimonials_images', 'testimonials_images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o Bucket
CREATE POLICY "Imagens públicas para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'testimonials_images');

CREATE POLICY "Admin pode subir imagens"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'testimonials_images');
