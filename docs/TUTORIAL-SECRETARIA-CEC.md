# Tutorial da Secretaria — Portal CEC Engenharia

Guia completo de uso do painel administrativo (`secretaria.cursocec.com.br`).
Explica **para que serve** cada item do menu e **como usar** no dia a dia.

> **Como o menu está organizado:** os itens ficam agrupados por área de
> trabalho — **Início, Comercial, Acadêmico, Financeiro, Equipe, Sistema** e
> **Pré-visualização**. Você só vê os grupos e itens que o seu acesso permite.

---

## Conceitos que evitam confusão (leia primeiro)

- **Lead ≠ Aluno.**
  - **Lead** = *interessado* que só preencheu um formulário no site (contato ou
    newsletter). **Não pagou nada** e não tem acesso a nada. É pré-venda.
  - **Aluno** = quem **efetivou a matrícula e pagou**. Aí sim vira uma conta com
    acesso ao portal, turma e curso EAD.
  - O caminho é: **Lead → (equipe atende e vende) → Matrícula → pagamento → Aluno.**

- **As três "peças" que ligam venda e ensino:**
  1. **Curso** (menu Cursos) — a ficha comercial. O botão **Publicado** decide se
     ele aparece na vitrine do site.
  2. **Turma** (menu Turmas) — a instância com datas. O campo **"Curso EAD"** liga
     a turma ao conteúdo online.
  3. **Aluno** (menu Alunos) — quando o aluno tem uma turma com Curso EAD e o
     acesso liberado, ele passa a ver as aulas online.

- **Quem pode o quê:** o acesso é por **cargo** (admin, coordenador, atendente,
  instrutor) e por **permissões** definidas em *Funcionários*. Não há senha/PIN
  numérico — o que "protege" é o cargo. Ex.: o **atendente** não vê receita/PIX no
  painel e precisa de autorização de um gestor para cancelar matrícula ou dar
  desconto.

---

# INÍCIO

## Painel (Dashboard)
**Para que serve:** a visão geral do negócio e os alertas do dia.

**O que mostra:** 4 indicadores — Receita do mês, Alunos ativos, Matrículas do
mês e Aulas agendadas (próximos 30 dias). Faixas de alerta no topo: cobranças
vencidas, turmas com poucas vagas e PIX pendente. Para admin/coordenador, ainda
mostra gráficos de faturamento (6 meses) e cursos mais vendidos.

**Como usar no dia a dia:**
1. Abra o painel e leia os **alertas** no topo.
2. Recebeu um PIX? Clique em **Confirmar** direto no alerta para dar baixa.
3. Confira as **aulas práticas** do próximo fim de semana.
4. Use os atalhos "Ir para o Financeiro" e "Ver Alunos" para aprofundar.

---

# COMERCIAL

## Matrículas
**Para que serve:** a fila de todas as inscrições, com controle de status,
cobrança e cancelamento.

**Como usar:**
- **Buscar/filtrar** por nome, CPF, número, turma, curso, status ou período.
- **Ver Detalhes** (ícone de olho) para conferir a ficha da matrícula.
- **Nova Matrícula** para uma venda presencial (cadastra aluno + turma +
  financeiro num modal rápido).
- **Gerar Boleto (Asaas)** (ícone verde de cifrão): cria uma cobrança de boleto
  real no Asaas com o valor da matrícula e abre o link de pagamento em nova aba
  para você enviar ao aluno. Requer a integração do Asaas configurada em
  **Sistema → Pagamentos**.
- **Cancelar Matrícula** (X vermelho): um gestor cancela direto; o **atendente**
  precisa digitar o e-mail/senha de um coordenador ou admin para autorizar.

## Leads de contato
**Para que serve:** o CRM simples — todos os interessados que entraram em contato
pelo site, para a equipe atender e converter.

**De onde vêm (automático):** formulário de Contato do site e a newsletter do
rodapé. Se a pessoa manda contato de novo com o mesmo telefone, o sistema
**atualiza** o lead em vez de duplicar.

**Como usar:**
1. Abra e veja os leads em cards (nome, telefone, curso de interesse, mensagem).
2. Clique em **Chamar no WhatsApp** para atender (abre o WhatsApp com o número).
3. Mova pelo funil: **Iniciado** (em atendimento) → **Concluir**.
4. Use **Filtros** (status/curso) e **Busca** (nome/telefone) para achar.
5. **Baixar Planilha** exporta a lista para Excel.

## Depoimentos
**Para que serve:** moderar os depoimentos de alunos que aparecem no site (prova
social).

**Como usar:**
- Abra na aba **Pendentes**, leia cada um e clique **Aprovar** (vira público) ou
  **Rejeitar**.
- Recebeu um elogio por WhatsApp? Use **Novo Depoimento** e cole o texto (já entra
  aprovado, com estrelas e nome).

---

# ACADÊMICO

## Alunos
**Para que serve:** a ficha completa do aluno — cadastro, documentos, pagamentos,
notas, PDFs e acesso ao EAD. É a tela mais rica do painel.

**Como usar (principais tarefas):**
- **Cadastrar/editar:** "Nova Ficha de Matrícula" (ou Editar). O formulário tem 6
  blocos: dados pessoais, contato/endereço (busca por CEP), como conheceu,
  financeiro (o **desconto fica bloqueado** e exige autorização de gestor), turma
  e aula prática, e histórico.
- **Documentos:** anexe Foto 3x4, RG, CPF, Escolaridade, Comprovante de Residência
  e provas em PDF. O botão **Ver** abre o arquivo com segurança.
- **Gerar PDFs:** botões de **Manual, Matrícula, Recibo, Contrato** e
  **Certificado**. O certificado sai como **Conclusão** (se as médias forem ≥ 70)
  ou **Participação**.
- **Liberar o acesso EAD:** ao registrar o pagamento, o sistema gera o
  login e uma senha provisória — você pode **Copiar Credenciais** ou
  **Enviar por WhatsApp**. Há também **Resetar Senha (CPF)** na lista.

**Dica:** buscar aluno → abrir o Perfil → anexar documentos → registrar pagamento
e enviar as credenciais → lançar notas → emitir os PDFs.

## Turmas
**Para que serve:** criar e administrar as turmas (teóricas e práticas), vincular
instrutores e alunos, e controlar o andamento.

**Como usar:**
- **Nova Turma:** o nome é gerado automático (padrão `Txx/AA`). Ao escolher o
  curso, a **carga horária e o horário** já vêm preenchidos.
- **Campo "Curso EAD":** aqui você **liga a turma ao curso online** — é o que faz o
  aluno da turma ver as videoaulas. Se o nome bater com um curso EAD, ele já é
  selecionado sozinho.
- **Alunos da turma:** veja a lista, ligue/desligue o **acesso EAD** por aluno, e
  imprima o relatório da turma (com ou sem notas).
- **Aula prática:** agende as datas de fim de semana, confirme solicitações e
  gerencie vagas (avisa quando lota).
- **Instrutores:** adicione um instrutor **habilitado** (o sistema avisa se ele
  não tem habilitação ativa no método).
- **Ciclo de vida:** Iniciar, Atrasar (nova previsão), Encerrar. *Não dá para
  excluir turma com aluno ativo.*

## Cursos
**Para que serve:** o **catálogo comercial** — a ficha de cada curso (ementa,
cargas, regras de aprovação e **preços**). É o que alimenta a **vitrine do site**.

**Como usar:**
1. **Novo Curso** (ou Editar) → preencha ementa, cargas e frequência mínima.
2. Defina os **preços** (Cartão, PIX/à vista com desconto automático, Boleto,
   Financiamento).
3. Marque **Publicado** para o curso aparecer no site público.

> Este "Cursos" é o **marketing**. O conteúdo das aulas online fica em
> **Plataforma EAD** (abaixo). São coisas diferentes.

## Plataforma EAD
**Para que serve:** montar o **conteúdo dos cursos online** — módulos, aulas
(vídeo/PDF), exercícios e provas, banco de questões, dúvidas e avisos.

**Como usar:**
1. Crie/selecione um curso EAD → adicione **Módulos**.
2. Em cada módulo, crie **Aulas**: cole o link do YouTube/Vimeo **ou** faça
   **upload do vídeo** (e da apostila em PDF). Defina o tempo mínimo de vídeo.
3. Monte **Exercícios de Fixação** e a **Prova Final** no *Question Builder*
   (enunciado, opções, resposta certa, imagens e símbolos matemáticos).
4. Acompanhe a **barra de carga horária** e clique em **Publicar**.
5. Responda dúvidas na **Central de Dúvidas** e poste no **Quadro de Avisos**.

## Certificados
**Para que serve:** emitir os certificados (individual ou em lote) e configurar os
modelos.

**Como usar (3 abas):**
- **Pendentes de Emissão:** o sistema lista quem está apto; selecione os alunos e
  clique **Emitir em Lote** (cada um recebe um **código único de validação**).
- **Configurar Templates:** escolha o curso e o tipo (Conclusão/Participação),
  edite o texto com as variáveis (`{{nome}}`, `{{cpf}}`, `{{curso}}`, `{{nota}}`),
  informe a assinatura e use **Visualizar Preview**.
- **Emitidos:** busque e **Reemita** (baixa o PDF) certificados já gerados.

## Instrutores
**Para que serve:** credenciar e homologar instrutores conforme a norma **ABENDI
PR-127**, com pasta digital de documentos e validade de 36 meses.

**Como usar:**
- **Novo Instrutor:** assistente de 5 passos (dados/escolaridade, métodos e
  comprovação, treinamento ABENDI, uploads obrigatórios, envio). Ao concluir, cria
  o login do instrutor.
- **Julgar Assinatura** (coordenador/admin): abra a Ficha Técnica, confira os
  documentos e **Aprove** (validade +36 meses) ou **Reprove** com motivo.
- Acompanhe validades e o **limite de 8 instrutores ativos por método**.

## Portal do instrutor
**Para que serve:** é a área do **professor** (chamada, diário, dúvidas, chat com
alunos). Aparece aqui porque o admin também acessa, mas o uso é do instrutor.

**Como usar:** abrir o **Fichário** → escolher a turma → registrar conteúdo da
aula e fazer a **chamada** (presente/falta/justificada) → salvar (depois fica
travado; correção passa pela coordenação). Também responde dúvidas do EAD e
conversa com alunos.

---

# FINANCEIRO

## Financeiro
**Para que serve:** a central de caixa — cobrança, despesas, validação de PIX,
rateio de turmas e notas fiscais.

**Como usar (abas principais):**
1. **Sincronizar Asaas** (topo) para trazer os pagamentos atualizados.
2. **Inadimplência:** clique em **Cobrar WhatsApp** (mensagem pronta com valor e
   dias de atraso).
3. **Inscrições Pendentes (Site):** **Consultar Asaas** e, se estiver pago,
   **dar baixa**; ou **Aprovar** a matrícula manualmente.
4. **Validação PIX:** ao receber, **Dar Baixa (Compensado)**.
5. **Despesas:** **Nova Despesa** → depois **Liquidar** quando pagar (anexe
   comprovante).
6. **Fluxo de Caixa:** filtre por mês e **Exporte a Planilha (CSV)**.
7. **Emissão NFs:** aba de **registro fiscal manual**. Clique **Emitir Nova NF**,
   informe CPF, valor e número da NF e **Salvar NF** — o registro fica gravado e
   vinculado ao aluno quando o CPF corresponde a um cadastro. As notas registradas
   aparecem na lista da própria aba.

**KPIs:** Receita confirmada, Receita pendente, Despesas pagas e Saldo.

## Relatórios
**Para que serve:** os indicadores gerenciais — para reunião mensal e prestação de
contas.

**Como usar:** escolha o **período** (30/90/365 dias) e o **curso** → **Aplicar
Filtros**. Mostra Alunos ativos, Taxa de aprovação e Receita, além de gráficos de
matrículas e do desempenho por curso/instrutor.

---

# EQUIPE

## Chat interno
**Para que serve:** conversa privada, em tempo real, entre a equipe.

**Como usar:** escolha o colega na lista (ou busque por nome), digite e envie
(Enter envia; Shift+Enter quebra linha). As mensagens chegam sozinhas; o contador
vermelho mostra as não lidas. Um indicador no topo mostra **Online/Reconectando**.

## Funcionários
**Para que serve:** cadastrar a equipe interna, dar **acesso ao painel** e definir
as **permissões** de cada um.

**Como usar:**
1. **Novo Membro** → preencha dados (nome, CPF, cargo, e-mail, telefone).
2. Marque **"tem acesso à plataforma"**, defina o e-mail e a **senha provisória**.
3. Marque as **permissões** por módulo (Alunos, Financeiro, Turmas, etc.) — é o
   que decide o que a pessoa vê no menu.
4. Depois, use **Editar**, **Ativar/Desativar** ou **Excluir** conforme precisar.

*(Esta tela também tem a aba de Habilitação PR-127, que se sobrepõe à tela de
Instrutores.)*

## Comunicados
**Para que serve:** publicar avisos oficiais nos portais (aluno, instrutor, etc.).

**Como usar:** **Novo Comunicado** → título + texto → marque o **público-alvo** →
(opcional) **Fixar no topo** e **data de expiração** → Publicar. Editáveis e
removíveis a qualquer momento.

---

# SISTEMA

## Configurações
**Para que serve:** editar os **modelos de documentos** (Contrato, Declaração,
Recibo), o papel timbrado, o Manual do Aluno e os assets do site (logo/banner).

**Como usar:** escolha o tipo de documento → edite o texto usando as **variáveis**
(`{{NOME_ALUNO}}`, `{{CPF}}`, `{{NOME_CURSO}}`, `{{VALOR_CURSO}}`, `{{DATA_HOJE}}`…)
→ **Prévia PDF** para conferir → **Salvar Modelo** para gravar. A partir daí, os
PDFs gerados para os alunos (Contrato, Declaração, Recibo em **Alunos → Gerar
PDFs**) passam a usar o texto que você salvou, com as variáveis preenchidas
automaticamente. Use **Subir Timbre** se quiser um papel timbrado de fundo. Em
"Assets do Site" troque logo e banner.

## Pagamentos (Asaas)
**Para que serve:** conectar o **gateway de pagamento** — é o que liga a matrícula
automática. Restrito a admin/coordenador.

**Como usar (passo a passo):**
1. Cole a **API Key** da conta Asaas e escolha **Produção**.
2. Clique em **Testar Conexão** (confirma o nome da conta).
3. Defina o **Token do Webhook** (um segredo — a tela sugere gerar um).
4. **Copie a Webhook URL** e cadastre no painel do Asaas (Integrações → Webhooks),
   com o **mesmo token**, marcando os eventos de pagamento recebido/confirmado.
5. Ajuste parcelas e desconto PIX → **Salvar**.

> Feito isso, quando um pagamento é confirmado, o aluno é **criado, matriculado na
> turma e com o curso liberado automaticamente**, recebendo um e-mail de
> boas-vindas.

## Agente Maria
**Para que serve:** configurar a atendente virtual de **WhatsApp** (a "Maria"):
liga/desliga, personalidade, modelo de IA e transbordo para humano. Admin/coord.

**Como usar:** ligue o **atendimento automático** → ajuste o **prompt** (ou
restaure o padrão) → escolha o **modelo de IA** e cole a chave → informe o
**WhatsApp da atendente** e as **palavras que chamam humano** → informe a
**Evolution API** (URL/chave) → Salvar.

## Ouvidoria
**Para que serve:** a caixa de reclamações/sugestões enviadas pelo site.

**Como usar:** somente leitura — **busque e leia** as manifestações (podem ser
anônimas) e trate o contato por fora.

## Auditoria
**Para que serve:** o **registro (log)** de tudo que foi feito no sistema — para
conferência e segurança.

**Como usar:** **busque** por usuário ou ação. A tabela mostra o tipo (login,
impressão, modificação, exclusão), quem fez, quando e os detalhes.

---

# PRÉ-VISUALIZAÇÃO

## Área do aluno *(só admin)*
**Para que serve:** o admin abre a **visão do aluno** para conferir como o portal
aparece para quem estuda. Não é uma função de secretaria — é só uma janela de
pré-visualização.

---

# O menu do seu usuário (canto superior direito)

Clicando no **círculo com a sua inicial** (topo direito), abre:
- **Meu Perfil** — seus dados.
- **Alterar Senha** — trocar a senha.
- **Sair** — encerrar a sessão.

Ao lado fica o **sino de notificações**.

---

# Fluxos completos (juntando tudo)

### Vender um curso do zero, com EAD
1. **Cursos** → cadastre o curso e marque **Publicado** (aparece no site).
2. **Plataforma EAD** → monte módulos, aulas e provas do conteúdo online.
3. **Turmas** → crie a turma e, no campo **"Curso EAD"**, escolha esse curso.
4. O cliente compra pelo site → paga → (com o **Asaas** configurado) o aluno é
   criado e liberado **automaticamente**. Ou a secretaria cria em **Alunos** e
   libera o acesso.
5. **Certificados** → ao concluir, emita o certificado.

### Atender um interessado (sem automação)
1. **Leads** → atenda pelo WhatsApp e mova para "em atendimento".
2. Fechou? **Matrículas → Nova Matrícula** (ou **Alunos → Nova Ficha**).
3. Registre o pagamento e **envie as credenciais** por WhatsApp.
4. **Turmas** → confirme a turma e o acesso EAD do aluno.

---

*Documento gerado para a equipe da CEC Engenharia. Dúvidas sobre qualquer tela:
comece pelo grupo do menu a que ela pertence — a organização segue o fluxo de
trabalho (Comercial → Acadêmico → Financeiro → Equipe → Sistema).*
