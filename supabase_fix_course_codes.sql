-- ============================================================
-- FIX: Corrigir codes duplicados na tabela lms_courses
-- 
-- PROBLEMA ENCONTRADO:
-- 1. O curso "Inspetor Dimensional de Topografia (CD-TO)" 
--    está com code = 'CD-MC' quando deveria ser 'CD-TO'
-- 2. O curso "Retreinamento Teórico CD-CL Abendi" 
--    está com code = 'CD-MC' quando deveria ter um code próprio
--
-- RESULTADO: A página /curso/cd-mc mostrava preços errados
--            porque 3 cursos compartilhavam o mesmo code.
-- ============================================================

-- 1. Corrigir o code do curso de Topografia (CD-TO)
UPDATE lms_courses 
SET code = 'CD-TO'
WHERE id = '13a05bd5-2912-486e-93ea-87c839f8cb57'
  AND title ILIKE '%Topografia%';

-- 2. Corrigir o code do Retreinamento Teórico (deve ter code próprio)
UPDATE lms_courses 
SET code = 'RCD-CL-T'
WHERE id = '8e8a38fd-b728-4970-9ee9-38c710ed4fb5'
  AND title ILIKE '%Retreinamento Teórico%';

-- Verificar o resultado
SELECT id, title, code, status, price_pix, price_card 
FROM lms_courses 
ORDER BY code;
