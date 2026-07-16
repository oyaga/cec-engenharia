import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users as UsersIcon, GraduationCap, DollarSign, LogOut, BookOpen, ShieldCheck, Settings, Video, PlayCircle, Menu, X, MessageSquare, Award, ClipboardList, Megaphone, Bot } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar() {
    const { session, userProfile: authProfile, logout } = useAuth()
    const [userRole, setUserRole] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    // Fecha o menu ao trocar de rota no mobile
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    const isDeveloperAccount = (email) => {
        if (!email) return false
        const emailLower = email.toLowerCase()
        return emailLower.includes('desenvolvedor') || emailLower.includes('carlos')
    }

    useEffect(() => {
        const profile = authProfile
        if (profile) {
            const email = (profile.email || session?.user?.email || '').toLowerCase()
            setUserProfile(profile)
            if (isDeveloperAccount(email) || profile.role === 'admin') {
                setUserRole('admin')
            } else {
                setUserRole(profile.role)
            }
        }
    }, [authProfile, session])

    const hasAccess = (permissionKey, defaultAllowedRoles = []) => {
        if (!userProfile && !userRole) return false
        
        const email = userProfile?.email || ''
        // 1. Bypass total para admins/desenvolvedores
        if (userRole === 'admin' || userProfile?.role === 'admin' || isDeveloperAccount(email)) {
            return true
        }
        // 2. Se a permissão estiver explicitamente definida no JSONB como true
        if (userProfile?.permissions?.[permissionKey] === true) {
            return true
        }
        // 3. Se não tiver nada no JSONB para a chave, mas o cargo padrão do usuário estiver na lista de cargos permitidos (retrocompatibilidade)
        if (userRole && defaultAllowedRoles.includes(userRole)) {
            return true
        }
        return false
    }

    const handleLogout = async () => {
        logout()
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

            <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
                
                {/* Menus Visíveis para Todos */}
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
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Área do Aluno)</span>
                </NavLink>

                {/* Menus Administrativos e Coordenação */}
                {hasAccess('access_dashboard', ['admin', 'coordenador', 'atendente']) && (
                    <NavLink
                        to="/dashboard"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500',
                            marginTop: '1rem'
                        })}
                    >
                        <LayoutDashboard size={20} />
                        Painel Administrativo
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Dashboard)</span>
                    </NavLink>
                )}

                {hasAccess('access_dashboard', ['admin', 'coordenador', 'atendente', 'administrativo']) && (
                    <NavLink
                        to="/secretaria/chat"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <MessageSquare size={20} />
                        Chat Interno
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Equipe)</span>
                    </NavLink>
                )}

                {hasAccess('access_alunos', ['admin', 'coordenador', 'atendente']) && (
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
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Portal do Aluno)</span>
                    </NavLink>
                )}

                {hasAccess('access_matriculas', ['admin', 'coordenador', 'atendente']) && (
                    <NavLink
                        to="/secretaria/matriculas"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <ClipboardList size={20} />
                        Matrículas
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Fila / Inscrições)</span>
                    </NavLink>
                )}

                {hasAccess('access_leads', ['admin', 'coordenador', 'atendente']) && (
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
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Mensagens do Site)</span>
                    </NavLink>
                )}

                {hasAccess('access_dashboard', ['admin', 'coordenador', 'atendente']) && (
                    <NavLink
                        to="/admin/testimonials"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <MessageSquare size={20} />
                        Depoimentos / Prova Social
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Avaliações Site)</span>
                    </NavLink>
                )}

                {/* 
                {hasAccess('access_turmas', ['admin', 'coordenador', 'atendente']) && (
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
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Calendário do Site)</span>
                    </NavLink>
                )}
                */}

                {hasAccess('access_cursos', ['admin', 'coordenador']) && (
                    <NavLink
                        to="/secretaria/cursos"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <BookOpen size={20} />
                        Cursos
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Maria Antônia)</span>
                    </NavLink>
                )}

                {hasAccess('access_financeiro', ['admin', 'coordenador']) && (
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
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Faturamento & Caixa)</span>
                    </NavLink>
                )}

                {hasAccess('access_relatorios', ['admin', 'coordenador']) && (
                    <NavLink
                        to="/relatorios"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500'
                        })}
                    >
                        <ShieldCheck size={20} />
                        Relatórios
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Analytics)</span>
                    </NavLink>
                )}

                {hasAccess('access_instrutores', ['admin', 'coordenador']) && (
                    <NavLink
                        to="/secretaria/instrutores"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500',
                            marginTop: '0.5rem'
                        })}
                    >
                        <Award size={20} />
                        Instrutores
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Abendi PR-127)</span>
                    </NavLink>
                )}

                {hasAccess('access_certificados', ['admin', 'coordenador']) && (
                    <NavLink
                        to="/secretaria/certificados"
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? '600' : '500',
                            marginTop: '0.5rem'
                        })}
                    >
                        <Award size={20} />
                        Certificados
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Geração & Assinatura)</span>
                    </NavLink>
                )}

                {hasAccess('access_instrutor_portal', ['admin', 'coordenador', 'instrutor']) && (
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
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Lançar Freq/Notas)</span>
                    </NavLink>
                )}

                {hasAccess('access_auditoria', ['admin', 'coordenador']) && (
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
                        Auditoria
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Logs de Ações)</span>
                    </NavLink>
                )}
                
                {hasAccess('access_ouvidoria', ['admin', 'coordenador']) && (
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
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Reclamações Site)</span>
                    </NavLink>
                )}

                {(hasAccess('access_equipe', ['admin', 'coordenador', 'administrativo']) || 
                  hasAccess('access_lms', ['admin', 'coordenador', 'administrativo']) || 
                  hasAccess('access_comunicados', ['admin', 'coordenador', 'administrativo']) ||
                  hasAccess('access_config', ['admin', 'coordenador', 'administrativo']) ||
                  hasAccess('access_config_asaas', ['admin', 'coordenador', 'administrativo'])) && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        {hasAccess('access_equipe', ['admin', 'coordenador']) && (
                            <NavLink
                                to="/secretaria/funcionarios"
                                style={({ isActive }) => ({
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                                    fontWeight: isActive ? '600' : '500'
                                })}
                            >
                                <UsersIcon size={20} />
                                Funcionários
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Acessos Painel)</span>
                            </NavLink>
                        )}

                        {hasAccess('access_lms', ['admin', 'coordenador', 'administrativo']) && (
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
                                Plataforma EAD
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Videoaulas & Provas)</span>
                            </NavLink>
                        )}

                        {hasAccess('access_comunicados', ['admin', 'coordenador']) && (
                            <NavLink
                                to="/secretaria/comunicados"
                                style={({ isActive }) => ({
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                                    fontWeight: isActive ? '600' : '500',
                                    marginTop: '0.5rem'
                                })}
                            >
                                <Megaphone size={20} />
                                Comunicados
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Avisos no Portal)</span>
                            </NavLink>
                        )}

                        {hasAccess('access_config', ['admin', 'coordenador']) && (
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
                                Configurações
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Modelos PDF/Contrato)</span>
                            </NavLink>
                        )}


                        {hasAccess('access_config_asaas', ['admin', 'coordenador']) && (
                            <NavLink
                                to="/config-asaas"
                                style={({ isActive }) => ({
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                                    fontWeight: isActive ? '600' : '500',
                                    marginTop: '0.5rem'
                                })}
                            >
                                <Settings size={20} />
                                Configurações Asaas
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(API Gateway)</span>
                            </NavLink>
                        )}

                        {hasAccess('access_config', ['admin', 'coordenador']) && (
                            <NavLink
                                to="/agente-maria"
                                style={({ isActive }) => ({
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                                    fontWeight: isActive ? '600' : '500',
                                    marginTop: '0.5rem'
                                })}
                            >
                                <Bot size={20} />
                                Agente Maria
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto', fontWeight: 'normal' }}>(Chatbot WhatsApp)</span>
                            </NavLink>
                        )}
                    </div>
                )}
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
