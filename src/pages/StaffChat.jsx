import { createPortal } from 'react-dom';
import ChatPanel from '../components/ChatPanel';

// Chat interno da secretaria — usa o mesmo componente do aluno/instrutor.
// As categorias e contatos vêm do backend conforme o papel (staff vê Alunos,
// Professores e Equipe).
export default function StaffChat() {
  return createPortal(
    <div className="staff-chat-window animate-fade-in">
      <ChatPanel />
    </div>,
    document.body
  );
}
