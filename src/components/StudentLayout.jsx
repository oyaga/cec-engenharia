import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
    Home,
    BookOpen,
    PlayCircle,
    Calendar,
    TrendingUp,
    MessageSquare,
    HelpCircle,
    DollarSign,
    FileText,
    Award,
    User,
    LogOut,
    Menu,
    X,
    Sparkles
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

export default function StudentLayout() {
    const { session } = useAuth()
    const navigate = useNavigate()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [userName, setUserName] = useState('')

    useEffect(() => {
        if (session?.user?.id) {
            supabase.from('users').select('full_name').eq('id', session.user.id).single()
                .then(({ data }) => {
                    if (data?.full_name) setUserName(data.full_name)
                    else setUserName(session.user.email.split('@')[0])
                })
        }
    }, [session])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    const navLinkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
        backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
        fontWeight: isActive ? 600 : 500,
        textDecoration: 'none',
        transition: 'all 0.2s'
    })

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            {/* TOP NAVIGATION BAR */}
            <header style={{
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 1001,
                padding: '0 1rem'
            }}>
                <div style={{
                    maxWidth: '100%',
                    height: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    {/* Logo e Nome */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Mobile Toggle Button */}
                        <button 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#475569', 
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            className="md:none"
                            aria-label="Alternar menu"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>

                        <img 
                            src="/assets/logo.png" 
                            alt="CEC Logo" 
                            style={{ height: '40px', objectFit: 'contain', cursor: 'pointer' }} 
                            onClick={() => navigate('/area-aluno')}
                        />
                    </div>

                    {/* User Menu Desktop */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <NotificationBell />
                        <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            <div style={{ textAlign: 'right', display: 'none' }} className="md:block">
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>{userName || 'Aluno'}</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Estudante</p>
                            </div>
                            <div style={{ 
                                width: '40px', height: '40px', borderRadius: '50%', 
                                backgroundColor: 'var(--primary)', color: 'white', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
                            }}>
                                {userName ? userName.charAt(0).toUpperCase() : 'A'}
                            </div>
                        </div>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                minWidth: '200px',
                                padding: '0.5rem',
                                zIndex: 1010
                            }}>
                                <button 
                                    onClick={() => { setDropdownOpen(false); navigate('/aluno/perfil'); }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem 1rem', border: 'none', backgroundColor: 'transparent',
                                        color: '#334155', fontWeight: 500, cursor: 'pointer', borderRadius: '6px',
                                        textAlign: 'left', fontSize: '0.875rem', marginBottom: '0.25rem'
                                    }}
                                    className="hover-bg-slate"
                                >
                                    <User size={18} />
                                    Meu Perfil
                                </button>
                                <button 
                                    onClick={handleLogout}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem 1rem', border: 'none', backgroundColor: 'transparent',
                                        color: '#ef4444', fontWeight: 500, cursor: 'pointer', borderRadius: '6px',
                                        textAlign: 'left', fontSize: '0.875rem'
                                    }}
                                    className="hover-bg-rose"
                                >
                                    <LogOut size={18} />
                                    Sair da Conta
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MAIN LAYOUT CONTAINER */}
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                
                {/* SIDEBAR DO ALUNO */}
                <aside 
                    style={{
                        width: '260px',
                        backgroundColor: '#ffffff',
                        borderRight: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                    className={`student-sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}
                >
                    <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
                        <NavLink to="/area-aluno" end style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <Home size={18} /> Início
                        </NavLink>
                        <NavLink to="/area-aluno/cursos" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <BookOpen size={18} /> Meus Cursos
                        </NavLink>
                        <NavLink to="/area-aluno/ead" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <PlayCircle size={18} /> Aulas EAD
                        </NavLink>
                        <NavLink to="/area-aluno/presencial" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <Calendar size={18} /> Aulas Presenciais
                        </NavLink>
                        <NavLink to="/area-aluno/desempenho" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <TrendingUp size={18} /> Meu Desempenho
                        </NavLink>
                        <NavLink to="/area-aluno/mensagens" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <MessageSquare size={18} /> Mensagens
                        </NavLink>
                        <NavLink to="/area-aluno/forum" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <HelpCircle size={18} /> Dúvidas / Fórum
                        </NavLink>
                        <NavLink to="/area-aluno/financeiro" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <DollarSign size={18} /> Financeiro
                        </NavLink>
                        <NavLink to="/area-aluno/documentos" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <FileText size={18} /> Documentos
                        </NavLink>
                        <NavLink to="/area-aluno/certificados" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <Award size={18} /> Certificados
                        </NavLink>
                        <NavLink 
                            to="/area-aluno/vitrine" 
                            style={({ isActive }) => ({
                                ...navLinkStyle({ isActive }),
                                background: isActive ? 'var(--primary-light)' : 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 100%)',
                                color: isActive ? 'var(--primary)' : '#7c3aed',
                                border: '1px solid rgba(139,92,246,0.15)',
                                marginTop: '0.5rem'
                            })}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Sparkles size={18} /> Vitrine de Cursos
                        </NavLink>
                        <NavLink to="/aluno/perfil" style={navLinkStyle} onClick={() => setMobileMenuOpen(false)}>
                            <User size={18} /> Meu Perfil
                        </NavLink>
                    </nav>
                    
                    <div style={{ padding: '1.25rem 1rem', borderTop: '1px solid #e2e8f0' }}>
                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.65rem 1rem', border: 'none', backgroundColor: 'transparent',
                                color: '#ef4444', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
                                textAlign: 'left', fontSize: '0.875rem', transition: 'background-color 0.2s'
                            }}
                            className="hover-bg-rose"
                        >
                            <LogOut size={18} /> Sair da Conta
                        </button>
                    </div>
                </aside>
                
                {/* Overlay Mobile */}
                {mobileMenuOpen && (
                    <div 
                        onClick={() => setMobileMenuOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(15, 23, 42, 0.4)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 999,
                        }}
                        className="sidebar-overlay-student"
                    />
                )}

                {/* CONTENT CONTAINER */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* MAIN CONTENT AREA */}
                    <main style={{ flex: 1, padding: '2rem 1.5rem' }}>
                        <Outlet />
                    </main>

                    {/* FOOTER */}
                    <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                        &copy; {new Date().getFullYear()} C&C Engenharia. Todos os direitos reservados.
                    </footer>
                </div>
            </div>

            {/* Estilos adicionais injetados para suporte responsivo e hover states */}
            <style dangerouslySetInnerHTML={{__html: `
                .hover-bg-slate:hover {
                    background-color: #f1f5f9 !important;
                }
                .hover-bg-rose:hover {
                    background-color: #fef2f2 !important;
                }
                @media (max-width: 768px) {
                    .student-sidebar {
                        position: fixed !important;
                        top: 71px !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        transform: translateX(-100%);
                        z-index: 1000 !important;
                    }
                    .student-sidebar.sidebar-open {
                        transform: translateX(0) !important;
                        box-shadow: 4px 0 20px rgba(15, 23, 42, 0.15) !important;
                    }
                    .sidebar-overlay-student {
                        display: block !important;
                        top: 71px !important;
                    }
                    .md\\:none {
                        display: flex !important;
                    }
                    .md\\:block {
                        display: none !important;
                    }
                }
                @media (min-width: 769px) {
                    .student-sidebar {
                        transform: translateX(0) !important;
                    }
                    .sidebar-overlay-student {
                        display: none !important;
                    }
                    .md\\:none {
                        display: none !important;
                    }
                    .md\\:block {
                        display: block !important;
                    }
                }
            `}} />
        </div>
    )
}
