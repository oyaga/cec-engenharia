# Portal CEC Engenharia — Relatório de Evolução do Sistema

> Documento-fonte para gerar uma apresentação ao proprietário do site.
> Cobre: o que era antes, o que mudou, correções feitas, como o sistema
> funciona e um tutorial de uso. Linguagem acessível, foco no valor.

---

## 1. Visão geral em uma frase

O site **cursocec.com.br** deixou de depender de uma plataforma terceirizada
(Supabase) e passou a ter um **sistema próprio, completo e sob controle total
da CEC** — mais rápido, mais seguro, com automação de matrículas e um portal de
ensino a distância (EAD) funcionando de ponta a ponta.

---

## 2. Antes e Depois (a grande mudança)

### ANTES
- Todo o sistema (contas, banco de dados, arquivos, pagamentos) rodava dentro
  do **Supabase**, uma plataforma externa alugada.
- **Chaves de acesso expostas** publicamente (risco de segurança grave).
- Dependência de um serviço de automação externo (n8n) exposto na internet.
- Sem ambiente de testes; mudanças iam direto para o ar.
- O portal do aluno tinha telas com **erros de acentuação** e **menus que não
  funcionavam no celular**.
- Matrícula: o pagamento era registrado, mas **a liberação do acesso do aluno
  era 100% manual** (a secretaria precisava criar tudo à mão).

### DEPOIS
- **Sistema próprio**, hospedado em servidor da CEC, sem mensalidade de
  plataforma terceirizada e sem depender de ninguém.
- **Banco de dados PostgreSQL** próprio + **cache Redis** (páginas abrem mais
  rápido) + **armazenamento de arquivos** no próprio servidor.
- **Atualização automática**: qualquer melhoria no sistema vai para o ar
  sozinha, com segurança, em poucos minutos.
- **Endereços organizados por público**:
  - `aluno.cursocec.com.br` → portal do aluno
  - `secretaria.cursocec.com.br` → painel da secretaria
  - `portal.cursocec.com.br` → portal do professor
- **Matrícula automática**: pagamento confirmado → conta do aluno criada,
  turma vinculada e **curso liberado automaticamente**, com e-mail de
  boas-vindas. A secretaria só supervisiona.
- **Curso EAD completo no ar**: vídeos, apostilas e provas.

---

## 3. Tudo que foi feito (lista de melhorias e correções)

### 3.1 Nova base tecnológica (fundação)
- Backend próprio construído do zero (linguagem Go — rápida e econômica em
  servidor).
- Banco de dados PostgreSQL próprio.
- Cache Redis para acelerar o site público.
- Comunicação em tempo real (chat interno) via WebSocket.
- Armazenamento de arquivos (documentos, vídeos, imagens) no servidor.

### 3.2 Infraestrutura e publicação
- Servidor VPS + Portainer (painel de controle do servidor).
- **Deploy automático** via GitHub: toda melhoria aprovada sobe para o ar
  automaticamente, sem intervenção manual.
- Certificado de segurança HTTPS automático (cadeado no navegador).
- Endereços separados por público (subdomínios).

### 3.3 Segurança
- Remoção dos arquivos que continham chaves de acesso expostas.
- Ambiente de desenvolvimento desligado em produção (sem contas de teste no ar).
- Proteção do recebimento de pagamentos com token de autenticação (impede
  confirmações de pagamento falsas).
- Cada aluno só enxerga os **próprios** dados (notas, financeiro, documentos) —
  antes havia telas travadas que impediam até o aluno de ver o que era dele.

### 3.4 Ensino a Distância (EAD / LMS)
- Curso **"Controle Dimensional – Mecânica (CD-CM)"** publicado, com:
  - **10 módulos**: Desenho Técnico, Instrumentos de Mecânica, Tolerância
    Dimensional, Tolerância Geométrica, Textura Superficial, Dureza,
    Engrenagens, Máquinas Rotativas, Válvulas Industriais, Recebimento.
  - **10 videoaulas** + **10 apostilas em PDF** + **9 questionários** (88
    questões com correção automática).
- **Upload de vídeo direto pela tela de administração** (a secretaria/professor
  sobe a aula sem depender de ninguém).

### 3.5 Certificados
- **Novo design** do certificado (visual profissional: moldura, selo, logo).
- **Código de autenticidade + QR Code** para validação pública (qualquer
  empresa pode conferir se o certificado é verdadeiro).
- **Emissão pelo próprio aluno** ao concluir o curso (além da emissão pela
  secretaria).
- Página pública de validação de certificado.

### 3.6 Matrícula e pagamentos (automação)
- Integração com o **Asaas** (gateway de pagamento) feita de forma segura, com
  a chave protegida no servidor (nunca exposta ao navegador).
- **Ativação automática**: quando o pagamento é confirmado, o sistema cria a
  conta do aluno, vincula à turma e libera o curso EAD sozinho, com e-mail de
  boas-vindas. A secretaria pode revisar e ajustar quando quiser.
- Tela de configuração do Asaas modernizada: o admin conecta o pagamento e
  define o token de segurança pela própria tela, sem mexer no servidor.

### 3.7 Correções de bugs (o que estava quebrado e foi resolvido)
- **Acentuação corrompida** ("FrequÃªncia" em vez de "Frequência") na área do
  aluno — corrigido.
- **Menu do celular transparente** no site (dava para ver o vídeo através do
  menu) — corrigido.
- **Menu do painel não rolava** no celular (não dava para chegar aos últimos
  itens) — corrigido.
- **Rolagem horizontal indevida** em várias telas no celular — corrigido.
- **Mapa do rodapé** aparecia quebrado — corrigido.
- **Página de curso** com informações espremidas no celular — corrigido.
- **Erro no identificador da matrícula** que impediria a automação de
  pagamento de funcionar — corrigido.

---

## 4. Como o sistema funciona (visão simples)

O site é dividido em **4 áreas**, cada uma para um público:

| Área | Endereço | Para quem | O que faz |
|---|---|---|---|
| Site público | cursocec.com.br | Visitantes | Apresenta os cursos, capta matrículas |
| Painel da Secretaria | secretaria.cursocec.com.br | Equipe/Admin | Gerencia alunos, turmas, financeiro, cursos |
| Portal do Professor | portal.cursocec.com.br | Instrutores | Turmas, notas, mensagens |
| Área do Aluno | aluno.cursocec.com.br | Alunos | Assiste às aulas, faz provas, baixa certificado |

**Fluxo de uma matrícula, do início ao fim:**
1. O visitante vê o curso no site e clica em "Matricule-se".
2. Preenche os dados e paga (PIX, cartão ou boleto) via Asaas.
3. Pagamento confirmado → o sistema **cria a conta do aluno automaticamente**,
   vincula à turma e libera o curso.
4. O aluno recebe um e-mail para definir a senha e já acessa as aulas.
5. Ao concluir, o aluno **gera o próprio certificado** com QR de validação.
6. A secretaria acompanha tudo pelo painel e pode ajustar quando necessário.

---

## 5. Tutorial rápido de uso

### Para a Secretaria / Administração (secretaria.cursocec.com.br)
- **Dashboard**: visão geral de matrículas, faturamento e turmas.
- **Alunos**: cadastrar, editar, ver documentos, liberar acesso EAD.
- **Turmas**: criar turma e, no campo **"Curso EAD"**, escolher o curso do LMS
  (é o que liga a venda ao conteúdo que o aluno assiste).
- **Financeiro**: contratos, parcelas, custos.
- **Cursos / LMS**: montar cursos EAD (módulos, aulas, provas), subir vídeos.
- **Certificados**: emitir individual ou em lote; editar o modelo.
- **Configurações → Asaas**: conectar o pagamento (chave + token do webhook).
- **Chat da Equipe**: conversa interna em tempo real.

### Para o Professor (portal.cursocec.com.br)
- Ver suas turmas, lançar notas, receber mensagens dos alunos.

### Para o Aluno (aluno.cursocec.com.br)
- **Meus Cursos**: acessa as videoaulas e apostilas.
- **Aulas Presenciais / Frequência**: agenda e presença.
- **Desempenho**: notas das provas.
- **Financeiro**: parcelas.
- **Certificados**: baixa o certificado ao concluir.
- **Mensagens**: fala com o instrutor.

### Para editar o conteúdo do site público
- Acesso "webdesigner": permite editar textos, imagens e a vitrine de cursos
  da página inicial, direto na tela, sem programação.

---

## 6. O que ainda falta (para o lançamento oficial)

Estes são passos finais que dependem de decisões/credenciais do proprietário:
1. **Conectar a conta Asaas de produção** (chave real + token) na tela de
   configuração, para os pagamentos reais ativarem as matrículas.
2. **Configurar o envio de e-mails** (provedor Resend) para os e-mails de
   boas-vindas e recuperação de senha saírem.
3. **Cadastrar as turmas oficiais** de cada curso, vinculando ao conteúdo EAD.
4. **Migrar/cadastrar os alunos e dados reais** (o sistema começou "do zero").
5. **Rotacionar as chaves antigas** do Supabase e desligar o serviço antigo.
6. **Backup automático** do banco de dados e dos arquivos.

---

## 7. Resumo do valor entregue

- Independência total: sistema próprio, sem aluguel de plataforma.
- Segurança: dados protegidos, acessos separados, pagamentos verificados.
- Automação: matrícula e liberação de curso sem trabalho manual.
- Experiência: site rápido, funciona bem no celular, EAD completo.
- Manutenção fácil: melhorias sobem sozinhas, com ambiente de testes.
