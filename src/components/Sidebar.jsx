import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users as UsersIcon, GraduationCap, DollarSign, LogOut, BookOpen, ShieldCheck, Settings, Video, PlayCircle, Menu, X, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Sidebar() {
    const [userRole, setUserRole] = useState(null)
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    // Fecha o menu ao trocar de rota no mobile
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('users').select('role, full_name').eq('id', user.id).single()
                const email = user.email?.toLowerCase() || ''
                const metadataRole = user.user_metadata?.role

                // Bypass absoluto para Desenvolvedor ou se o metadado do Auth disser que é admin
                if (email.includes('desenvolvedor') || email.includes('carlos') || metadataRole === 'admin') {
                    setUserRole('admin')
                } else if (profile) {
                    setUserRole(profile.role)
                } else if (metadataRole) {
                    setUserRole(metadataRole)
                }
            }
        }
        fetchRole()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <>
            {/* Botão Hamburguer - Mobile */}
            <button
                onClick={() => setMobileOpen(true)}
                style={{
                    display: 'none',
                    position: 'fixed',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 1100,
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                className="sidebar-hamburger"
                aria-label="Abrir menu"
            >
                <Menu size={22} color="var(--primary)" />
            </button>

            {/* Overlay Mobile */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        zIndex: 1150,
                        display: 'none'
                    }}
                    className="sidebar-overlay"
                />
            )}

            <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <img src="/assets/logo.png" alt="C&C Engenharia Logo" style={{ maxWidth: '130px', height: 'auto', objectFit: 'contain' }} />
                    {/* Botão fechar no mobile */}
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="sidebar-close-btn"
                        style={{ display: 'none', padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        aria-label="Fechar menu"
                    >
                        <X size={22} color="var(--text-secondary)" />
                    </button>
                </div>

            <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <NavLink
                    to="/"
                    style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                        fontWeight: isActive ? '600' : '500'
                    })}
                >
                    <LayoutDashboard size={20} />
                    Painel Geral
                </NavLink>

                <NavLink
                    to="/meus-cursos"
                    style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                        fontWeight: isActive ? '600' : '500'
                    })}
                >
                    <PlayCircle size={20} />
                    Meus Cursos
                </NavLink>

                <>
                    <NavLink
                        to="/alunos"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <UsersIcon size={20} />
                        Listagem de Alunos
                    </NavLink>

                    <NavLink
                        to="/leads-admin"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <MessageSquare size={20} />
                        Leads de Contato
                    </NavLink>

                    <NavLink
                        to="/turmas"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <GraduationCap size={20} />
                        Turmas
                    </NavLink>

                    <NavLink
                        to="/financeiro"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <DollarSign size={20} />
                        Financeiro
                    </NavLink>

                    <NavLink
                        to="/professor"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <BookOpen size={20} />
                        Portal do Instrutor
                    </NavLink>

                    <NavLink
                        to="/auditoria"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <ShieldCheck size={20} />
                        Auditoria (Logs)
                    </NavLink>
                    
                    <NavLink
                        to="/ouvidoria-admin"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <ShieldCheck size={20} />
                        Ouvidoria
                    </NavLink>
                </>

                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <>
                        <NavLink
                            to="/equipe"
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                                fontWeight: isActive ? '600' : '500'
                            })}
                        >
                            <ShieldCheck size={20} />
                            Equipe (Auth)
                        </NavLink>

                        <NavLink
                            to="/lms"
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                                fontWeight: isActive ? '600' : '500',
                                marginTop: '0.5rem'
                            })}
                        >
                            <Video size={20} />
                            Plataforma EAD (LMS)
                        </NavLink>

                        <NavLink
                            to="/config"
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                                fontWeight: isActive ? '600' : '500',
                                marginTop: '0.5rem'
                            })}
                        >
                            <Settings size={20} />
                            Modelos de Texto
                        </NavLink>
                    </>
                </div>
            </nav>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500, letterSpacing: '0.05em' }}>
                    App-CEC v1.15.0 (EAD & Docs)
                </div>
                <button
                    onClick={handleLogout}
                    className="btn"
                    style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                    <LogOut size={20} />
                    Sair do Sistema
                </button>
            </div>
            </aside>
        </>
    )
}
