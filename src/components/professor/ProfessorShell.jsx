import './professor-portal.css'

export default function ProfessorShell({ activeTab, children }) {
  return (
    <section className="professor-portal">
      {activeTab !== 'messages' && (
        <header className="professor-portal__heading">
          <h1>{activeTab === 'duvidasEad' ? 'Comentários dos vídeos' : 'Portal do Instrutor / Professor'}</h1>
          <p>{activeTab === 'duvidasEad' ? 'Responda às dúvidas publicadas pelos alunos nas videoaulas.' : 'Gerencie suas aulas presenciais, faça chamadas e acompanhe suas turmas.'}</p>
        </header>
      )}
      <div className="professor-portal__content">{children}</div>
    </section>
  )
}
