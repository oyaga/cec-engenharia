# Contexto do Projeto cursocec.com.br

## 📊 Informações Gerais

- **Cliente:** C&C Engenharia e Capacitação
- **Domínio:** cursocec.com.br
- **Framework:** React + Vite
- **Deploy:** Hostinger (auto-deploy do GitHub)
- **Repo:** github.com/PITICALYN/cec-site (PRIVADO 🔒)

## 🏗️ Arquitetura

O projeto tem 4 áreas dentro do mesmo build:

- `/` → Site público (Home, Cursos, Sobre)
- `/secretaria` → Painel da secretaria
- `/webdesigner` → Modo de edição visual do site
- `/aluno` → Portal do aluno (LMS)

Todas usam o MESMO Supabase configurado em variáveis de ambiente.

## 🗄️ Banco de Dados

### Em PRODUÇÃO (Supabase Cloud):
- **Projeto:** SITE CEC
- **Ref técnico:** `xhttwdrxnrbtjbchihji`
- **URL:** `https://xhttwdrxnrbtjbchihji.supabase.co`
- **Região:** us-east-1

### Tabelas atuais no SITE CEC:
- class_instructors
- complaints
- enrollments
- leads
- site_content
- testimonials

### ⚠️ Tabelas que FALTAM (a criar):
- academic_records, attendance_records, audit_logs
- class_logs, classes, course_prices
- financial_costs, financial_records, invoices_tracking
- lms_certificate_configs, lms_courses, lms_forum_replies
- lms_forum_topics, lms_lesson_questions, lms_lessons
- lms_modules, lms_question_bank, lms_questions
- lms_quiz_results, lms_quizzes, lms_student_progress
- lms_time_logs, student_documents, students
- system_settings, upcoming_classes, users

### 🗑️ Projeto Supabase obsoleto (manter por enquanto):
- **C&C CURSO** (ref `sedwwagwrkfaiptoemsp`) — dados fictícios, será deletado depois.

### 🪣 Buckets de Storage (a criar no SITE CEC):
- `site_assets` → PÚBLICO
- `student_documents` → PRIVADO
- `lms-docs` → PRIVADO

## 🔐 Variáveis de Ambiente

### Em produção (Hostinger):
- `VITE_SUPABASE_URL` = configurado no painel
- `VITE_SUPABASE_ANON_KEY` = configurado no painel

### Local (.env):
- Mesmas variáveis no `.env` (já no `.gitignore`)
- ⚠️ NUNCA commitar o `.env`!

## 🚨 Regras Importantes

1. **NUNCA usar `git add .`** — sempre adicionar arquivos específicos
2. **SEMPRE `git status` antes de commitar** — confirmar que `.env` não vai
3. **NUNCA commitar:** `.env`, `.env.local`, `.env.production`
4. **NÃO mexer em:** `.gitignore`, `package.json`, `vite.config.js` sem confirmar
5. **Mudanças no banco:** SEMPRE no SITE CEC (não no C&C CURSO!)

## 📋 Pendências

- [ ] Criar tabelas faltantes no SITE CEC
- [ ] Criar buckets de Storage (`site_assets`, `student_documents`, `lms-docs`)
- [ ] Rodar SQL de policies do Storage
- [ ] Testar /webdesigner (login + modo edição)
- [ ] Testar /secretaria (login + dashboard)
- [ ] Testar /aluno (login + cursos)
- [ ] Verificar RLS das tabelas UNRESTRICTED (no C&C CURSO atual)
- [ ] Deletar projeto C&C CURSO depois de validar tudo
- [ ] Rotacionar Anon Keys que foram expostas no chat

## 🛠️ Comandos Úteis

```bash
# Rodar local
cd ~/"site cec" && npm run dev

# Ver status do Git
git status

# Adicionar arquivo específico
git add src/components/Hero.jsx

# Commit e push
git commit -m "feat: descrição da mudança"
git push origin main
```

## 📞 Suporte e Decisões

Decisões importantes do projeto e como contornar problemas estão documentadas
no chat com Piticalyn (proprietário do projeto).
