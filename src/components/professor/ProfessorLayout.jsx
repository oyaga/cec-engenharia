import { useEffect, useRef, useState } from 'react'
import { GraduationCap, LogOut, Menu, MessageSquare, User, Video, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../NotificationBell'
import './professor-layout.css'

const links = [
  { to: '/professor', label: 'Minhas turmas', hint: 'Notas & freq.', icon: GraduationCap, end: true },
  { to: '/professor/chat', label: 'Chat', hint: 'Alunos & secretaria', icon: MessageSquare },
  { to: '/professor/comentarios', label: 'Comentários dos vídeos', hint: 'EAD', icon: Video },
]

export default function ProfessorLayout() {
  const { userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    const close = (event) => menuRef.current && !menuRef.current.contains(event.target) && setAccountOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const initial = (userProfile?.full_name || userProfile?.email || 'P').charAt(0).toUpperCase()
  const signOut = () => { logout(); navigate('/login') }

  return (
    <div className="figma-prof-layout">
      <button className="figma-prof-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
      {sidebarOpen && <button className="figma-prof-overlay" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}

      <aside className={`figma-prof-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="figma-prof-logo">
          <img src="/assets/logo.png" alt="C&C Engenharia e Capacitação" />
          <button onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
        </div>
        <nav>
          <p>Acadêmico</p>
          {links.map(({ to, label, hint, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}>
              <Icon size={19} />
              <span><strong>{label}</strong><small>{hint}</small></span>
            </NavLink>
          ))}
        </nav>
        <footer>C&amp;C Engenharia e Capacitação</footer>
      </aside>

      <div className="figma-prof-workspace">
        <header className="figma-prof-topbar">
          <h2>Visão Geral</h2>
          <div className="figma-prof-account" ref={menuRef}>
            <NotificationBell />
            <button className="figma-prof-avatar" onClick={() => setAccountOpen((open) => !open)}>{initial}</button>
            {accountOpen && (
              <div className="figma-prof-dropdown">
                <div><strong>{userProfile?.full_name || 'Professor'}</strong><small>{userProfile?.email}</small></div>
                <button onClick={() => navigate('/professor/perfil')}><User size={16} /> Meu perfil</button>
                <button className="danger" onClick={signOut}><LogOut size={16} /> Sair</button>
              </div>
            )}
          </div>
        </header>
        <main className="figma-prof-content"><Outlet /></main>
      </div>
    </div>
  )
}
