# Diretrizes de Desenvolvimento e Guardrails do Projeto CEC

Este documento serve como um guia de arquitetura e boas práticas ("Guardrails") para o projeto da **CEC Engenharia**. O objetivo é garantir que futuras manutenções, correções ou novas implementações não quebrem funcionalidades cruciais que já foram validadas e estão em perfeito funcionamento.

---

## 1. Segurança e Controle de Acesso (Dashboard / LMS)

### 🔑 Perfis de Acesso e Permissões
- O sistema possui regras específicas para cargos de equipe (Admin, Coordenador, Atendente, Professor).
- **Master Admin:** Usuários com os e-mails `piticalyn@cec.com.br`, `webdesigner@cec.com.br` e `secretaria@cursocec.com.br` possuem privilégios Master concedidos diretamente via código (no contexto de autenticação).
- **Criação de novos Administradores:** Ao cadastrar novos membros da equipe que precisam do mesmo nível de acesso visual da conta master (como dados de faturamento, Asaas e relatórios gráficos completos), selecione a opção **"Administrador (Master)"** (que atribui a role `admin` na tabela `staff`).

> [!WARNING]
> **Nunca remova ou comente** as validações de login e permissões no arquivo `src/components/site/AdminToolbar.jsx` ou no `src/context/EditContext.jsx` ao enviar alterações para o ambiente de produção. Essas validações garantem que apenas administradores autenticados possam acessar e salvar alterações no banco de dados.

---

## 2. Editor de Conteúdo (Site Institucional)

### 🖼️ Imagens Editáveis (`EditableImage.jsx`)
- O site institucional possui um modo de edição em tempo real (CMS visual).
- **Imagens Grandes (Banners/Hero):** Usam o comportamento padrão com overlay escuro e texto "Trocar / Vídeo" centralizado.
- **Mídias Pequenas (Logos, Avatares, Selos e Ícones):** **Sempre** utilize a propriedade `compact={true}` no componente `<EditableImage>` para evitar obstrução visual.
  - O modo compacto substitui a sobreposição escura de 100% por um pequeno botão verde circular com ícone de câmera no canto superior direito do elemento.

```jsx
// Exemplo de uso correto para Logotipos ou Ícones
<EditableImage 
  path="navbar.logo_img" 
  initialValue={navbar.logo_img} 
  className="logo-img-main"
  alt="CEC Logo"
  compact={true} // Mantém a logo 100% visível na edição
/>
```

### ⚓ Correção de Modais (React Portals)
- Elementos do cabeçalho (`Navbar.jsx`) usam estilos com `backdrop-filter: blur(...)`. No CSS, filtros e transformações agem como blocos de contenção e impedem que elementos filhos com `position: fixed` sejam posicionados em relação ao viewport principal do navegador.
- **Regra:** Todos os modais de tela inteira chamados de dentro do cabeçalho ou cards editáveis **devem** ser renderizados fora de seu pai original, utilizando o **React Portal** (`createPortal`) anexado ao `document.body`. Isso garante que o modal fique centralizado e utilizável.

```javascript
// Exemplo de modal renderizado via Portal no EditableImage.jsx
import { createPortal } from 'react-dom';

{isOpen && createPortal(
  <div className="modal-overlay-fixed">
    <div className="modal-content">
      {/* Conteúdo do Modal */}
    </div>
  </div>,
  document.body
)}
```

### 📝 Edição na Página de Matrículas (`Enrollment.jsx`)
- Os textos explicativos, avisos de prazos de conclusão, manuais e o botão de confirmação na página de matrículas são editáveis pelo administrador através do componente `<EditableText>` com caminhos mapeados sob a chave `enrollment_page`.
- **Prevenção de Envio de Formulário:** No `handleSubmit` de `Enrollment.jsx`, a lógica de validação deve verificar o estado de `isEditing` obtido de `useEdit()`. Se `isEditing` for verdadeiro (ou seja, o administrador está no Modo Edição ajustando o conteúdo), a submissão do formulário **deve ser interrompida imediatamente** (`if (isEditing) return;`). Isso impede o envio de dados de teste ou cliques acidentais que disparariam processos no Asaas.

---

## 3. Prevenção de Quebras de Layout (Responsividade)

### 📏 Logotipo da Navbar
- No modo de edição, o menu da Navbar ganha campos extras de entrada de dados e botões que expandem a largura total do menu.
- Para evitar que o logotipo da marca seja esmagado para largura 0 pelo flexbox, o contêiner `.logo-container-liquid` possui a regra `flex-shrink: 0;`.
- **Regra:** Nunca remova a propriedade `flex-shrink: 0;` do logotipo para garantir que ele permaneça visível em todas as telas e durante os estados de edição.

---

## 4. Gestão de Vídeos de Fundo (Hero / Banner)

### 📹 Formatos e Detecção
- A detecção de tipo de mídia (imagem vs. vídeo) deve suportar tanto arquivos remotos (pelo sufixo da URL) quanto arquivos locais selecionados do computador (que utilizam URLs do tipo `blob:` geradas pelo navegador).
- O `EditableImage.jsx` utiliza o arquivo físico (`File`) para validar o tipo MIME (`file.type.startsWith('video/')`). Qualquer alteração nesta lógica deve preservar a validação de URLs blob para evitar que a prévia de vídeo quebre.

### 🔇 Auto-reprodução e Áudio
- Navegadores modernos bloqueiam o início automático (`autoplay`) de qualquer vídeo que possua som.
- **Regra:** Para que o vídeo do Hero da página inicial toque sozinho ao carregar a página, as opções no banco de dados devem estar configuradas como:
  - **Mudo (Sem Som):** Habilitado.
  - **Auto-reproduzir:** Habilitado.
  - Se o usuário desativar o mudo, o vídeo requererá que o visitante clique no play para iniciar a reprodução.

---

## 5. Sistema da Secretaria (Painel Administrativo)

A secretaria é o núcleo operacional da escola, lidando com informações acadêmicas e financeiras críticas. As seguintes regras impedem regressões no painel administrativo:

### 👤 Cadastro e Edição de Alunos (`Alunos.jsx`)
- **Validação de Duplicidade:** CPF e E-mail do aluno devem ser verificados contra a base de dados antes de concluir a inserção para impedir registros duplicados que quebrem os logins no portal do aluno.
- **Senhas Temporárias:** Na **criação** de novos alunos, o campo `requires_password_change` deve ser salvo como `true` no banco de dados. Isso força o aluno a alterar sua senha logo no primeiro acesso. Na **edição** de perfis existentes, este campo **não deve ser sobrescrito** para evitar que alunos ativos sejam forçados a mudar suas senhas repentinamente.

### 💳 Integração Financeira Asaas (`Financeiro.jsx` e `ConfigAsaas.jsx`)
- O faturamento e geração de cobranças (PIX, Boleto, Cartão) dependem de chaves de API salvas na tabela `system_settings`.
- **Regra:** Mudanças no código de integração com o Asaas não devem alterar a URL de produção (`https://api.asaas.com/v3`) para sandbox (`https://sandbox.asaas.com/v3`), a não ser sob verificação explícita de ambiente local (`development`).
- **Gatilhos de Matrícula:** A alteração do status de pagamento de uma matrícula no painel financeiro para "Paga" deve, de forma automática e síncrona, liberar o acesso do aluno ao curso correspondente na tabela `student_courses` / `enrollments`.

### 🎓 Geração e Validação de Certificados (`Certificados.jsx`)
- A verificação de autenticidade dos certificados é um recurso público acessado via QR Code na rota `/validar-certificado/:id`.
- **Regra:** A lógica de geração do código hash/identificador único do certificado e o layout de impressão em PDF **não devem ser modificados**. Mudanças no formato de identificação quebrarão instantaneamente a validação por QR Code de todos os certificados impressos emitidos anteriormente para ex-alunos.

### 📅 Grade de Turmas e Cursos
- O menu "Turmas (Grade do Site)" foi ocultado na barra lateral da secretaria e do site porque todos os cursos são 100% online com acesso imediato e sem data de turma fixa. Mas a página `/turmas` ainda é usada internamente pela secretaria para controle.
- Se a secretaria for criar turmas, deve-se atentar que a vinculação de alunos à turma precisa atualizar a tabela de histórico acadêmico.

---

## 7. Plataforma EAD / LMS e Visualização de Mídias

### 📁 Controle de Download de Materiais (`allow_download`)
- Todos os materiais de aula (PDFs, imagens e vídeos) carregados no LMS pelo painel administrativo (`LMSAdmin.jsx`) possuem a propriedade `allow_download` configurada no banco de dados.
- **Regra:** Os botões de "Abrir em Nova Guia" ou links externos que permitam ao aluno baixar/salvar o arquivo **devem sempre respeitar a propriedade `allow_download` da lição**. Caso `allow_download` seja falso, esses links e botões devem ser ocultados no player do aluno para proteger o direito autoral do material de estudo.

### 📺 Visualização em Tela Cheia (Fullscreen)
- Ao expandir mídias (PDFs/Imagens) para tela cheia na plataforma EAD, o contêiner `pdf-fullscreen-container` entra em modo fullscreen nativo do navegador.
- **Regra:** Para evitar que a tela fique branca ou colapso de layout nas diferentes implementações de navegadores (Chrome, Safari/iOS, Firefox), utilize sempre os seletores CSS `:fullscreen`, `-webkit-full-screen` e `-moz-full-screen` forçando o dimensionamento para `100vw !important` e `100vh !important`, com fundo escuro (`#0f172a`).

### 📜 Reset de Rolagem ao Carregar Lição
- Devido à estrutura de layout em colunas com rolagem interna (`overflowY: 'auto'`) no painel de lições do `LessonPlayer.jsx`, a navegação do React Router não reseta automaticamente a posição vertical da tela interna.
- **Regra:** Sempre resete a propriedade `scrollTop` do contêiner de conteúdo principal para `0` programaticamente através de uma referência `useRef` ao disparar o efeito colateral de mudança de lição (`lessonId`).

### 📝 Construtor de Exercícios de Fixação (Quiz)
- O construtor de questionários em [LMSAdmin.jsx](file:///Users/piticalyn/site%20cec/src/pages/LMSAdmin.jsx) lida com o gerenciamento de provas e enunciados de questões com anexação opcional de imagens (para perguntas e alternativas).
- **Regra de Edição:** Certifique-se de que o botão de editar questão (`Edit`) preencha todos os campos do formulário `questionForm`, incluindo o ID da questão em `editingQuestionId` (que deve ser redefinido para `null` no sucesso ou cancelamento).
- **Upload e Pré-visualização de Imagens:** Sempre exiba feedback em tempo real ("Enviando imagem...") monitorando os estados `uploadingImageQuestion` (enunciado) e `uploadingImageOptionIdx` (alternativas) durante o upload de mídia para o Supabase. Adicione controles explícitos para o usuário pré-visualizar a imagem enviada e removê-la, caso necessário.
- **Funções Auxiliares de Upload:** Evite embutir inputs ou lógica complexa de manipulação do DOM de forma inline no JSX (como a geração e clique de inputs de file). Sempre utilize funções auxiliares isoladas (ex: `handleOptionImageClick`) para prevenir problemas de compilação com o bundler/esbuild decorrentes do parser do JSX lendo o caractere `/` como delimitador de expressão regular.
- **Inserção de Símbolos Rápidos:** A barra de símbolos matemáticos e técnicos utiliza a função `insertSymbol` que lê o `document.activeElement` e injeta o caractere correspondente diretamente na posição atual do cursor (`selectionStart` / `selectionEnd`), tanto no `textarea` do enunciado quanto nos `inputs` de alternativas. Para que isso funcione, os campos editáveis devem possuir os atributos `data-field-type="question"` ou `data-field-type="option"` com seu respectivo `data-option-idx={oidx}`. Ao adicionar novos símbolos no painel de atalhos, utilize eventos `onMouseDown` com `preventDefault()` para impedir que o navegador retire o foco do campo de texto em edição.

---

## 6. Checklist de Qualidade Pré-Commit / Pré-Push

Antes de rodar `git commit` ou enviar novos códigos para a branch `main`:
- [ ] **Desfazer Bypasses de Teste:** Verificar se códigos de atalho de login temporário foram removidos.
- [ ] **Executar Build de Produção:**
  ```bash
  npm run build
  ```
  Certificar-se de que o bundler do Vite compile o projeto inteiro sem nenhum erro de fechamento de tags JSX, erros de imports ou tipagem.
- [ ] **Validar Responsividade:** Abrir a versão mobile do site no navegador e garantir que os menus e modais se ajustam corretamente a telas menores.
