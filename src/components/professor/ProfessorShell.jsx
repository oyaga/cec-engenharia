import { BarChart3, BookOpen, List, MessageCircle } from 'lucide-react'
import './professor-portal.css'

const tabs = [
  { id: 'minhasTurmas', label: 'Fichário Eletrônico (Presencial)', icon: List },
  { id: 'duvidasEad', label: 'Dúvidas Pedagógicas (EAD)', icon: BookOpen },
  { id: 'messages', label: 'Mensagens Diretas (Chats)', icon: MessageCircle },
  { id: 'analytics', label: 'Aproveitamento & Analytics', icon: BarChart3 },
]

export default function ProfessorShell({ activeTab, onTabChange, children }) {
  const selectedTab = activeTab === 'diario' ? 'minhasTurmas' : activeTab

  return (
    <section className="professor-portal">
      <header className="professor-portal__heading">
        <h1>Portal do Instrutor / Professor</h1>
        <p>Gerencie suas aulas presenciais, faça chamadas e responda às dúvidas do EAD.</p>
      </header>

      <nav className="professor-portal__tabs" aria-label="Áreas do portal do professor" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`professor-portal__tab${selectedTab === id ? ' is-active' : ''}`}
            onClick={() => onTabChange(id)}
            role="tab"
            aria-selected={selectedTab === id}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="professor-portal__content">{children}</div>
    </section>
  )
}
