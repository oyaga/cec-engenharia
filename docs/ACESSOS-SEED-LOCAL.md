# Acessos do seed local — CEC Engenharia

Este arquivo reúne exclusivamente as credenciais de demonstração usadas no ambiente Docker local. Não utilize estas senhas em produção.

## Endereços locais

| Área | Endereço |
|---|---|
| Site público | <http://localhost> |
| Secretaria / Administração | <http://secretaria.localhost> |
| Portal do professor | <http://portal.localhost> |
| Área do aluno | <http://aluno.localhost> |
| API | <http://localhost:8080> |
| Adminer (banco de dados) | <http://localhost:8081> |

## Secretaria / administrador

| Perfil | E-mail | Senha local |
|---|---|---|
| Administrador | `admin@cec.local` | `admin123` |

O seed administrativo pode solicitar a troca da senha no primeiro acesso. Caso a senha tenha sido alterada durante um teste, será necessário usar a nova senha ou recriar o banco local.

## Professores

Todos os professores de demonstração usam a senha local `admin123`.

| Nome | E-mail | Senha local |
|---|---|---|
| Profa. Ana Martins — DEMO QA | `prof.ana.demo@cec.local` | `admin123` |
| Prof. Bruno Lima — DEMO QA | `prof.bruno.demo@cec.local` | `admin123` |

## Alunos

Todos os alunos de demonstração usam a senha local `admin123`.

| Nome | E-mail | Senha local |
|---|---|---|
| João Almeida — DEMO QA | `aluno.joao.demo@cec.local` | `admin123` |
| Maria Oliveira — DEMO QA | `aluna.maria.demo@cec.local` | `admin123` |
| Pedro Santos — DEMO QA | `aluno.pedro.demo@cec.local` | `admin123` |
| Larissa Costa — DEMO QA | `aluna.larissa.demo@cec.local` | `admin123` |

## Banco de dados local (Adminer)

| Campo | Valor |
|---|---|
| Sistema | `PostgreSQL` |
| Servidor | `db` |
| Usuário | `cec` |
| Senha | `cec_dev_password` |
| Banco | `cec` |

## Origem das credenciais

- Administrador: variáveis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` em `backend/docker-compose.yml`.
- Professores e alunos: `backend/scripts/seed_demo_people.sql`.
- As contas de professores e alunos reutilizam, no seed local, o hash da senha do administrador existente no momento em que o script é executado.

> Segurança: mantenha este arquivo apenas para desenvolvimento local. Antes de um deploy real, use senhas fortes, remova contas de demonstração e não copie as configurações locais do banco para produção.
