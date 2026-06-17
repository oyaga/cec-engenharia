-- =====================================================================
-- ATUALIZAÇÃO E AJUSTE DE PREÇOS DOS CURSOS NO LMS
-- Executar no SQL Editor do Supabase Cloud para alinhar os preços do LMS com os do CMS
-- =====================================================================

-- 1. Inspetor Dimensional Caldeiraria e Tubulação (CD-CL)
UPDATE public.lms_courses 
SET 
  price_pix = 3300.00, 
  price_card = 3800.00, 
  price_boleto = 3800.00 
WHERE title = 'Inspetor Dimensional Caldeiraria e Tubulação (CD-CL)';

-- 2. Estação Total Aplicado a Caldeiraria (CD-GEN)
UPDATE public.lms_courses 
SET 
  price_pix = 4800.00, 
  price_card = 5200.00,
  price_boleto = 5200.00
WHERE title = 'Estação Total Aplicado a Caldeiraria';

-- 3. Retreinamento Teórico CD-CL Abendi
UPDATE public.lms_courses 
SET 
  price_pix = 1550.00, 
  price_card = 1800.00,
  price_boleto = 1800.00
WHERE title = 'Retreinamento Teórico CD-CL Abendi';

-- 4. Retreinamento Prático CD-CL Abendi
UPDATE public.lms_courses 
SET 
  price_pix = 2100.00, 
  price_card = 2400.00,
  price_boleto = 2400.00
WHERE title = 'Retreinamento Prático CD-CL Abendi';

-- 5. Atualizar o cache do schema do PostgREST
NOTIFY pgrst, 'reload schema';
