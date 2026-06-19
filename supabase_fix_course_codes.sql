-- ============================================================
-- FIX: Corrigir codes duplicados/errados na tabela lms_courses
-- 
-- EXECUTE NO SQL EDITOR DO SUPABASE (painel admin)
--
-- PROBLEMAS ENCONTRADOS:
-- 1. "Estação Total" tem code='CD-GEN' mas o slug do site é 'cd-et'
--    → A página /curso/cd-et NÃO encontra os preços no banco
-- 2. "Inspetor de Topografia (CD-TO)" tem code='CD-MC' (errado)
--    → Duplica com Mecânica e pode confundir a query
-- 3. "Retreinamento Teórico CD-CL" tem code='CD-MC' (errado)
--    → Duplica com Mecânica e a query pode retornar preço errado
--
-- RESULTADO ESPERADO:
-- CD-ET  → Estação Total (alinha com slug /curso/cd-et)
-- CD-CL  → Caldeiraria
-- CD-MC  → Mecânica
-- CD-TO  → Topografia
-- RCD-CL → Retreinamento Prático (já correto)
-- RCD-CL-T → Retreinamento Teórico
-- ============================================================

-- 1. Corrigir Estação Total: CD-GEN → CD-ET (alinhar com slug do site)
UPDATE lms_courses 
SET code = 'CD-ET'
WHERE id = '24b08661-977e-4c51-a114-2cea700c1471';

-- 2. Corrigir Topografia: CD-MC → CD-TO
UPDATE lms_courses 
SET code = 'CD-TO'
WHERE id = '13a05bd5-2912-486e-93ea-87c839f8cb57';

-- 3. Corrigir Retreinamento Teórico: CD-MC → RCD-CL-T
UPDATE lms_courses 
SET code = 'RCD-CL-T'
WHERE id = '8e8a38fd-b728-4970-9ee9-38c710ed4fb5';

-- Verificar resultado
SELECT id, title, code, price_pix, price_boleto, price_card 
FROM lms_courses 
ORDER BY code;
