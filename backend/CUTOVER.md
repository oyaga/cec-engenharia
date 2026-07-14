# Runbook de Cutover — Supabase → Backend Go + PostgreSQL

Este documento descreve os passos finais para colocar o novo backend em produção.
Os passos marcados **[VOCÊ]** exigem credenciais/decisões que só o responsável tem.

---

## 0. Pré-requisitos [VOCÊ]
- **Connection string do Postgres do Supabase** do projeto vivo `sedwwagwrkfaiptoemsp` (não só a anon key — o banco).
- **Decisão de senhas:** A) exportar hashes bcrypt do schema `auth` do Supabase, ou B) reset forçado de senha para todos no primeiro acesso.
- **Chave Asaas de produção** + token de webhook.
- **Credenciais da Evolution API** (URL + apikey da instância) e **provedor de IA + key** para a Maria.
- **Servidor de produção** (VPS) para rodar o binário Go + Postgres (o easypanel `cecnovo-supabase` está 503).

## 1. Subir a infra nova
```bash
cd backend
cp .env.example .env         # preencher os segredos reais (ver §5)
docker compose up -d --build # Postgres + API (migrations 001–019 aplicam sozinhas)
```

## 2. Migração de dados (Supabase → Postgres novo)
1. `pg_dump` do banco Supabase (somente dados das tabelas de `public`).
2. Rodar o ETL (a escrever conforme o dump real) mapeando para o schema canônico:
   - `auth.users` + `public.users` → `users` (com `password_hash`).
     - **Opção A:** importar `encrypted_password` (bcrypt) direto para `users.password_hash`.
     - **Opção B:** deixar `password_hash` com hash aleatório e `must_change_password = true`.
   - Consolidar duplicatas de `users` (havia 3 defs no Supabase).
   - **Apagar o registro de teste** `leads.id = ea7f6257-2a7c-41f2-a2ee-a12afe48efcc` (pendência aberta).
3. Conferir contagens (18 users, ~200 leads, etc.).

## 3. Frontend
- Definir `VITE_API_BASE_URL` para a URL pública da API Go.
- `npm run build` e publicar o `dist/`. Headers de segurança são aplicados tanto no
  nginx (`nginx.conf`) quanto pela própria API Go (X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy e HSTS em produção).
- **Frontend 100% migrado:** nenhum uso de Supabase (clients `lib/supabase*.js` removidos);
  todas as telas, componentes e o checkout Asaas consomem o backend Go.
- Configurar o **webhook do Asaas** para `https://SUA_API/api/v1/webhooks/asaas` com o token de `ASAAS_WEBHOOK_TOKEN`.
- Apontar o webhook da **Evolution API** para `https://SUA_API/api/v1/webhooks/whatsapp`.

## 4. Validação pós-cutover
- Login de cada papel (admin/coordenador/atendente/instrutor/aluno).
- Captação de lead pública → aparece no painel.
- Um checkout de teste no Asaas (sandbox) → webhook marca matrícula paga.
- Mensagem no WhatsApp → Maria responde / handoff funciona.
- Reteste dos achados: nenhum acesso anônimo a `users/leads/system_settings`.

## 5. Segredos (.env de produção)
```
JWT_SECRET=<openssl rand -base64 48>
DATABASE_URL=postgres://...            # banco de produção
ASAAS_API_KEY=<chave produção>         # ou configurar via tela ConfigAsaas
ASAAS_ENV=production
ASAAS_WEBHOOK_TOKEN=<token forte>
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=<...>
AI_PROVIDER=anthropic                  # ou openai
AI_API_KEY=<...>
MARIA_ATTENDANT=5521XXXXXXXXX@s.whatsapp.net
SEED_DEV=false
```

## 6. Limpeza de segredos do histórico git (C6) [VOCÊ autoriza]
Rodar `scripts/git-clean-secrets.sh` (reescreve histórico — destrutivo, exige force-push
e recoordenar clones). Depois **rotacionar** toda credencial que passou pelo git.
