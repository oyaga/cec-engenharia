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

## 5. Checklist de Qualidade Pré-Commit / Pré-Push

Antes de rodar `git commit` ou enviar novos códigos para a branch `main`:
- [ ] **Desfazer Bypasses de Teste:** Verificar se códigos de atalho de login temporário foram removidos.
- [ ] **Executar Build de Produção:**
  ```bash
  npm run build
  ```
  Certificar-se de que o bundler do Vite compile o projeto inteiro sem nenhum erro de fechamento de tags JSX, erros de imports ou tipagem.
- [ ] **Validar Responsividade:** Abrir a versão mobile do site no navegador e garantir que os menus e modais se ajustam corretamente a telas menores.
