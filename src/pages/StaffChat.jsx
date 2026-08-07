import ChatPanel from '../components/ChatPanel';

// Chat interno da secretaria — usa o mesmo componente do aluno/instrutor.
// As categorias e contatos vêm do backend conforme o papel (staff vê Alunos,
// Professores e Equipe).
export default function StaffChat() {
  return (
    <div className="staff-chat-page animate-fade-in">
      <div className="staff-chat-frame">
        <ChatPanel />
      </div>
    </div>
  );
}
