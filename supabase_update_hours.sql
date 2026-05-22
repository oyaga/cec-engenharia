-- Atualização de horários para turmas previstas (que ainda não iniciaram)
-- Modificando horários conforme solicitação: CD-CL/CD-CM (19h-21h) e CD-TO (20h-22h)

-- 1. Atualizar CD-CL (Caldeiraria) e CD-CM (Mecânica) para 19h às 21h
UPDATE public.classes
SET schedule = 'Seg a Sex 19h as 21h'
WHERE actual_start_date IS NULL 
  AND actual_end_date IS NULL
  AND (course_name LIKE '%(CD-CL)%' OR course_name LIKE '%(CD-CM)%');

-- 2. Atualizar CD-TO (Topografia) para 20h às 22h
UPDATE public.classes
SET schedule = 'Seg a Sex 20h as 22h'
WHERE actual_start_date IS NULL 
  AND actual_end_date IS NULL
  AND course_name LIKE '%(CD-TO)%';

-- Log de confirmação (opcional para verificação no console)
-- SELECT name, course_name, schedule FROM public.classes WHERE actual_start_date IS NULL;
