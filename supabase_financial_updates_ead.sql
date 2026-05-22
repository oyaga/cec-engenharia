-- RATEIO PARA CURSOS ONLINE (EAD)
ALTER TABLE public.lms_courses 
ADD COLUMN IF NOT EXISTS instructor_payment_type TEXT DEFAULT 'fixed' CHECK (instructor_payment_type IN ('fixed', 'split')),
ADD COLUMN IF NOT EXISTS instructor_payment_value NUMERIC(10,2) DEFAULT 0;

-- Recarregar schema
NOTIFY pgrst, 'reload schema';
