# Deploy no Portainer — imagem ÚNICA

O backend Go serve **tudo numa imagem só**: a API, o WebSocket (chat) e o site (SPA).
Não há nginx nem serviço web separado. O stack tem só **2 serviços**: `db` + `app`.

Imagem publicada:
- `oyaga/cec:latest` — app único (API + WebSocket + frontend)

> Se a imagem for **privada** no Docker Hub, adicione o registry no Portainer (Registries → Docker Hub com login). Se for **pública**, não precisa.

## Passo a passo

1. **Portainer → Stacks → Add stack.**
2. Nome: `cec`.
3. **Web editor** — cole o conteúdo de `stack.portainer.yml`.
4. **Environment variables** — adicione:

| Variável | Obrigatória | Exemplo / observação |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ | `openssl rand -base64 32` |
| `JWT_SECRET` | ✅ | `openssl rand -base64 48` |
| `PUBLIC_URL` | ✅ | `https://cursocec.com.br` |
| `WEB_PORT` | — | porta pública do app (padrão `80`) |
| `DOCKER_USER` | — | padrão `oyaga` |
| `TAG` | — | padrão `latest` |
| `CORS_ORIGINS` | — | opcional (mesma origem não precisa) |
| `SEED_DEV` + `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` | — | só no 1º boot p/ criar o admin |
| `ASAAS_ENV` / `ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN` | — | ou configure em `/config-asaas` |
| `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` / `AI_PROVIDER` / `AI_API_KEY` / `MARIA_ATTENDANT` | — | ou configure em `/agente-maria` |

5. **Deploy the stack.**

## Primeiro boot
- As **migrations rodam sozinhas** no arranque do `app`.
- Com `SEED_DEV=false` não há admin. Para criar o primeiro:
  1. No 1º deploy, defina `SEED_DEV=true` + `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` reais.
  2. Suba, logue.
  3. Edite o stack → `SEED_DEV=false` → re-deploy.

## TLS / HTTPS
O `app` fica em HTTP na porta `WEB_PORT` (80). Coloque HTTPS à frente:
- **Nginx Proxy Manager** (comum no Portainer), **Caddy** ou **Traefik** com Let's Encrypt, encaminhando para o serviço `app:8080`.

## Após subir
- Acesse `https://SEU_DOMINIO` e logue.
- Webhooks: Asaas → `https://SEU_DOMINIO/api/v1/webhooks/asaas`; Evolution → `https://SEU_DOMINIO/api/v1/webhooks/whatsapp`.
- Cutover dos dados: `backend/CUTOVER.md`; go-live: `GO-LIVE.md`.

## Deploy com TRAEFIK (recomendado — TLS automático)

Use o **`stack.traefik.yml`** em vez do `stack.portainer.yml`. O `app` não publica
porta: o Traefik roteia via labels e emite o certificado (Let's Encrypt). O
WebSocket (chat) passa pelo Traefik sem config extra.

Pré-requisitos no seu Traefik:
- A **rede externa** do Traefik já existe (ex.: `traefik` ou `proxy`).
- Existe um **entrypoint HTTPS** (ex.: `websecure`) e um **certResolver** (ex.: `letsencrypt`).
- O DNS do `DOMAIN` aponta para o servidor.

Variáveis (Portainer → Environment variables):

| Variável | Obrigatória | Exemplo |
|---|---|---|
| `DOMAIN` | ✅ | `cursocec.com.br` |
| `POSTGRES_PASSWORD` | ✅ | `openssl rand -base64 32` |
| `JWT_SECRET` | ✅ | `openssl rand -base64 48` |
| `TRAEFIK_NETWORK` | ⚠️ ajuste | nome da rede do Traefik (padrão `traefik`) |
| `TRAEFIK_ENTRYPOINT` | ⚠️ ajuste | padrão `websecure` |
| `TRAEFIK_CERTRESOLVER` | ⚠️ ajuste | padrão `letsencrypt` |
| `SEED_DEV` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | — | só no 1º boot p/ criar o admin |
| `ASAAS_*` / `EVOLUTION_*` / `AI_*` | — | integrações (ou configure nas telas) |

`PUBLIC_URL` é montado automaticamente como `https://${DOMAIN}`.

Deploy: Portainer → Stacks → Add stack → cole o `stack.traefik.yml` → preencha as
variáveis → Deploy. Depois acesse `https://DOMAIN`.

Webhooks: Asaas → `https://DOMAIN/api/v1/webhooks/asaas`; Evolution → `https://DOMAIN/api/v1/webhooks/whatsapp`.

## Publicar / atualizar a imagem (na máquina de dev)
```
docker build -t oyaga/cec:latest -f Dockerfile.unified .
docker push oyaga/cec:latest
```
No Portainer: Stack `cec` → **Update the stack** → **Re-pull image** → deploy.

> **Push dando "insufficient_scope / authorization failed"?** O login atual não tem
> permissão de escrita. Rode no terminal:
> `docker login -u oyaga` e use um **Access Token** com escopo *Read/Write*
> (Docker Hub → Account settings → Security → New Access Token). Depois repita o push.
