# CEC Engenharia e Capacitação — Website & LMS

Este é o repositório do site público institucional e sistema administrativo de gerenciamento de depoimentos, Ouvidoria, inscrições e leads da **CEC Engenharia**.

---

## 🤖 DIRETRIZES MANDATÓRIAS PARA AGENTES DE IA (AI AGENTS INSTRUCTIONS)

> [!IMPORTANT]
> **REGRAS DE INICIALIZAÇÃO DE TAREFA (Obrigatório para IAs / Antigravity):**
> Toda vez que uma nova conversa, tarefa ou sessão de desenvolvimento for iniciada, você **DEVE** executar os seguintes passos de sincronização antes de analisar ou modificar qualquer código:
> 
> 1. **Sincronizar Git:** Execute `git pull origin main` para garantir que o repositório local está na última versão do GitHub.
> 2. **Sincronizar Banco de Dados (Supabase):** Execute `node pull_content.js`. Esse comando puxará o conteúdo dinâmico mais recente salvo no banco de dados de produção (Supabase) através da interface administrativa e sincronizará com o arquivo local `src/data/content.json`.
> 
> *Esses passos garantem que você nunca trabalhe sobre códigos ou conteúdos desatualizados.*

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Vite, TailwindCSS (opcional/onde aplicável), Lucide React, Framer Motion.
- **Banco de Dados & Storage:** Supabase (PostgreSQL) para leads, depoimentos, Ouvidoria e armazenamento de mídias (fotos/vídeos).
- **Servidor:** Hostinger (deploy automatizado via integração com GitHub).

---

## 🚀 Como Executar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Certifique-se de que o arquivo `.env` está presente na raiz com as chaves do Supabase configuradas:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```

3. **Execute o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Sincronize o conteúdo dinâmico (opcional):**
   Para baixar a versão mais recente dos textos, imagens e vídeos da página inicial salvos no Supabase:
   ```bash
   node pull_content.js
   ```

---

## 📁 Estrutura de Pastas Principais

- `src/components/site/` — Componentes dinâmicos e editáveis da página pública (Hero, Footer, Courses, etc.).
- `src/data/content.json` — Arquivo estático contendo os dados padrão do site.
- `pull_content.js` — Script utilitário de sincronização Supabase -> Local.

