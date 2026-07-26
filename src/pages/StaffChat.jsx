import ChatPanel from '../components/ChatPanel';

// Chat interno da secretaria — usa o mesmo componente do aluno/instrutor.
// As categorias e contatos vêm do backend conforme o papel (staff vê Alunos,
// Professores e Equipe).
export default function StaffChat() {
  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{
        height: 'calc(100vh - 130px)',
        minHeight: 500,
        border: '1px solid #e8edf3',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 18px 50px -24px rgba(15, 23, 42, 0.25)',
      }}>
        <ChatPanel />
      </div>
    </div>
  );
}
