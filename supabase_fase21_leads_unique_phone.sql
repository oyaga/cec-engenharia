-- Adiciona a restrição UNIQUE na coluna phone da tabela public.leads
-- Isso permite que a Maria Antônia (N8N) realize UPSERT (inserção/atualização) de leads baseada no telefone do WhatsApp.
ALTER TABLE public.leads ADD CONSTRAINT leads_phone_key UNIQUE (phone);
