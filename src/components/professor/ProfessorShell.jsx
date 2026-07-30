import './professor-portal.css'

export default function ProfessorShell({ activeTab, children }) {
  return (
    <section className="professor-portal">
      {activeTab !== 'messages' && (
        <header className="professor-portal__heading">
          <h1>{activeTab === 'duvidasEad' ? 'Comentários dos vídeos' : activeTab === 'aulasPresenciais' ? 'Aulas presenciais' : 'Portal do Instrutor / Professor'}</h1>
          <p>{activeTab === 'duvidasEad' ? 'Responda às dúvidas publicadas pelos alunos nas videoaulas.' : activeTab === 'aulasPresenciais' ? 'Consulte a agenda definida pela secretaria, registre o diário e faça a chamada.' : 'Acompanhe suas turmas e atividades acadêmicas.'}</p>
        </header>
      )}
      <div className="professor-portal__content">{children}</div>
    </section>
  )
}
