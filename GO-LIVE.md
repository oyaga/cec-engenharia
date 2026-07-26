# Go-Live — cursocec.com.br (checklist de produção)

Estado atual: **frontend 100% conectado ao backend Go**; app roda em Docker local com dados de exemplo. Este é o passo a passo para colocar em produção com segurança. Ordem importa.

---

## 0. Pré-requisitos
- Um servidor/VPS com Docker + Docker Compose.
- Domínio apontando para o servidor (ex.: `cursocec.com.br`).
- Acesso ao banco de produção do Supabase (connection string) para o cutover.

## 1. Segredos (NUNCA usar os de dev)
- [ ] `cp backend/.env.prod.example backend/.env` e preencher.
- [ ] `POSTGRES_PASSWORD` forte: `openssl rand -base64 32`
- [ ] `JWT_SECRET` forte: `openssl rand -base64 48`
- [ ] `CORS_ORIGINS` e `PUBLIC_URL` = domínio real (https).
- [ ] Conferir que **nada** de `dev-secret`, `cec_dev_password`, `admin123` ficou.

## 2. Subir a infra de produção
- [ ] `cd backend && docker compose -f docker-compose.prod.yml up -d --build`
  - Sobe `db` (sem porta pública), `api` (interno) e `web` (nginx same-origin com proxy `/api` + WebSocket). Sem Adminer. `SEED_DEV=false`.
- [ ] Se algum segredo faltar, o compose **aborta** (proteção proposital).

## 3. TLS / HTTPS (obrigatório)
- [ ] Terminar HTTPS. Opções:
  - **Caddy/Traefik** na frente do `web` (auto-cert Let's Encrypt) — mais simples.
  - ou **certbot + nginx**: montar certificados e habilitar `443` no `nginx.prod.conf`.
- [ ] Redirecionar `80 → 443`. O HSTS já está setado no nginx de produção.

## 4. Conta admin real
- [ ] Com `SEED_DEV=false`, criar o primeiro admin manualmente (via SQL no banco com hash bcrypt, ou reativar o seed 1x com um e-mail/senha reais e depois desligar).
- [ ] Remover/rotacionar as contas de teste (`admin@cec.local`, `teste@teste.com`) — não existem em prod se o seed estiver off.

## 5. Cutover dos dados (Supabase → Postgres)
- [ ] Seguir `backend/CUTOVER.md` (ETL: users/senhas, alunos, turmas, financeiro, etc.).
- [ ] **Limpar dados DEMO** se tiverem sido semeados: `DELETE ... WHERE ... LIKE 'DEMO %'` (cursos CD-GEN/CD-CL/CD-MC/CD-TO de teste, alunos/leads/orders/financial_records DEMO).
- [ ] Validar contagens (usuários, matrículas, faturamento) contra o esperado.
- [ ] **Migrar mídias do site** que ainda apontam para o Supabase antigo (ex.: o vídeo da home em `xhttwdrxnrbtjbchihji.supabase.co/...mp4`): baixar e re-hospedar (upload na plataforma) e atualizar o `site_content`.

## 6. Integrações
- [ ] **Asaas:** preencher `ASAAS_API_KEY` (produção) + `ASAAS_ENV=production` + `ASAAS_WEBHOOK_TOKEN`; configurar o webhook do Asaas para `https://SEU_DOMINIO/api/v1/webhooks/asaas`. Testar em `/config-asaas` (o teste agora é server-side).
- [ ] **Maria/WhatsApp:** na tela `/agente-maria`, preencher a chave de IA (Anthropic/OpenAI), a URL/chave da Evolution API e o WhatsApp da atendente. Apontar o webhook da Evolution para `https://SEU_DOMINIO/api/v1/webhooks/whatsapp`.

## 7. Segurança — fechar pendências do laudo
- [ ] **Rotacionar** a `service_role` e a `anon` do Supabase (estão comprometidas — expostas no n8n público).
- [ ] **Desligar o n8n público** (`webhook.cursocec.com.br`) e o painel/Evolution expostos, ou pôr atrás de auth forte + IP allowlist. A Maria interna já substitui o n8n.
- [ ] Revisar as portas do host antigo (3306/MariaDB e 65002/SSH expostos no laudo) — não expor o banco à internet.

## 8. Verificação pós-deploy
- [ ] Login com a conta admin real (via HTTPS).
- [ ] Dashboard mostra dados reais (não DEMO).
- [ ] Abrir um modal (novo curso/aluno) — fundo cobre a tela toda.
- [ ] Chat interno em tempo real (indicador "Online").
- [ ] Fluxo de matrícula/checkout Asaas em produção (valor real, webhook confirma).
- [ ] Site público carrega (vídeo/imagens ok, sem depender do Supabase antigo).

## 9. Operação
- [ ] Backup automático do volume `cec_pgdata` (Postgres) e `cec_uploads` (arquivos).
- [ ] Monitorar logs (`docker compose -f docker-compose.prod.yml logs -f api`).
- [ ] Definir manutenção/rotação de chaves recorrente.

---
**Resumo:** não falta código — falta a fase de go-live (segredos reais, HTTPS, cutover dos dados, chaves de integração e fechar as pendências de segurança). Este arquivo é o roteiro.
