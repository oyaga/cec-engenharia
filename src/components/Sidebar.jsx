import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users as UsersIcon, GraduationCap, DollarSign, LogOut, BookOpen, ShieldCheck, Settings, Video, PlayCircle, Menu, X, MessageSquare, Award, ClipboardList, Megaphone, Bot, Inbox, Star, UserCheck, Presentation, BarChart3, CreditCard, LifeBuoy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// Estilo de um link de menu (ativo x inativo).
const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.85rem',
    borderRadius: '8px', textDecoration: 'none', fontSize: '0.92rem',
    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
    fontWeight: isActive ? 600 : 500,
})

function NavItem({ to, icon: Icon, label, hint, end = false }) {
    return (
        <NavLink to={to} end={end} style={linkStyle}>
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{label}</span>
            {hint && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>{hint}</span>}
        </NavLink>
    )
}

function NavSection({ label }) {
    return (
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--text-muted)', fontWeight: 700, padding: '1rem 0.85rem 0.35rem' }}>
            {label}
        </div>
    )
}

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
        // 3. Retrocompatibilidade: cargo padrão na lista de cargos permitidos
        if (userRole && defaultAllowedRoles.includes(userRole)) {
            return true
        }
        return false
    }

    // Só o admin (e desenvolvedor) pode abrir a Área do Aluno para pré-visualizar.
    const isAdmin = userRole === 'admin' || userProfile?.role === 'admin' || isDeveloperAccount(userProfile?.email || '')

    // Atalhos de permissão para condicionar cada grupo (título só aparece com item).
    const staff = ['admin', 'coordenador', 'atendente']
    const gest = ['admin', 'coordenador']
    const can = {
        painel: hasAccess('access_dashboard', staff),
        matriculas: hasAccess('access_matriculas', staff),
        leads: hasAccess('access_leads', staff),
        depoimentos: hasAccess('access_dashboard', staff),
        alunos: hasAccess('access_alunos', staff),
        turmas: hasAccess('access_turmas', staff),
        cursos: hasAccess('access_cursos', gest),
        ead: hasAccess('access_lms', ['admin', 'coordenador', 'administrativo']),
        certificados: hasAccess('access_certificados', gest),
        instrutores: hasAccess('access_instrutores', gest),
        professor: hasAccess('access_instrutor_portal', ['admin', 'coordenador', 'instrutor']),
        financeiro: hasAccess('access_financeiro', gest),
        relatorios: hasAccess('access_relatorios', gest),
        chat: hasAccess('access_dashboard', ['admin', 'coordenador', 'atendente', 'administrativo']),
        funcionarios: hasAccess('access_equipe', gest),
        comunicados: hasAccess('access_comunicados', gest),
        config: hasAccess('access_config', gest),
        asaas: hasAccess('access_config_asaas', gest),
        auditoria: hasAccess('access_auditoria', gest),
        ouvidoria: hasAccess('access_ouvidoria', gest),
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

                <nav style={{ padding: '0.5rem 0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1, overflowY: 'auto', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>

                    {/* ── Início ── */}
                    {can.painel && <>
                        <NavSection label="Início" />
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="Painel" hint="Visão geral" />
                    </>}

                    {/* ── Comercial ── */}
                    {(can.matriculas || can.leads || can.depoimentos) && <>
                        <NavSection label="Comercial" />
                        {can.matriculas && <NavItem to="/secretaria/matriculas" icon={ClipboardList} label="Matrículas" hint="Inscrições" />}
                        {can.leads && <NavItem to="/leads-admin" icon={Inbox} label="Leads de contato" />}
                        {can.depoimentos && <NavItem to="/admin/testimonials" icon={Star} label="Depoimentos" />}
                    </>}

                    {/* ── Acadêmico ── */}
                    {(can.alunos || can.turmas || can.cursos || can.ead || can.certificados || can.instrutores || can.professor) && <>
                        <NavSection label="Acadêmico" />
                        {can.alunos && <NavItem to="/alunos" icon={UsersIcon} label="Alunos" />}
                        {can.turmas && <NavItem to="/turmas" icon={GraduationCap} label="Turmas" />}
                        {can.cursos && <NavItem to="/secretaria/cursos" icon={BookOpen} label="Cursos" hint="Catálogo" />}
                        {can.ead && <NavItem to="/lms" icon={Video} label="Plataforma EAD" hint="Aulas & provas" />}
                        {can.certificados && <NavItem to="/secretaria/certificados" icon={Award} label="Certificados" />}
                        {can.instrutores && <NavItem to="/secretaria/instrutores" icon={UserCheck} label="Instrutores" />}
                        {can.professor && <NavItem to="/professor" end icon={Presentation} label="Minhas turmas" hint="Notas & freq." />}
                        {can.professor && <NavItem to="/professor/chat" icon={MessageSquare} label="Chat" hint="Alunos & secretaria" />}
                        {can.professor && <NavItem to="/professor/comentarios" icon={Video} label="Comentários dos vídeos" />}
                    </>}

                    {/* ── Financeiro ── */}
                    {(can.financeiro || can.relatorios) && <>
                        <NavSection label="Financeiro" />
                        {can.financeiro && <NavItem to="/financeiro" icon={DollarSign} label="Financeiro" />}
                        {can.relatorios && <NavItem to="/relatorios" icon={BarChart3} label="Relatórios" />}
                    </>}

                    {/* ── Equipe ── */}
                    {(can.chat || can.funcionarios || can.comunicados) && <>
                        <NavSection label="Equipe" />
                        {can.chat && <NavItem to="/secretaria/chat" icon={MessageSquare} label="Chat interno" />}
                        {can.funcionarios && <NavItem to="/secretaria/funcionarios" icon={UsersIcon} label="Funcionários" hint="Acessos" />}
                        {can.comunicados && <NavItem to="/secretaria/comunicados" icon={Megaphone} label="Comunicados" />}
                    </>}

                    {/* ── Sistema ── */}
                    {(can.config || can.asaas || can.auditoria || can.ouvidoria) && <>
                        <NavSection label="Sistema" />
                        {can.config && <NavItem to="/config" icon={Settings} label="Configurações" hint="Documentos" />}
                        {can.asaas && <NavItem to="/config-asaas" icon={CreditCard} label="Pagamentos" hint="Asaas" />}
                        {can.config && <NavItem to="/agente-maria" icon={Bot} label="Agente Maria" hint="WhatsApp" />}
                        {can.ouvidoria && <NavItem to="/ouvidoria-admin" icon={LifeBuoy} label="Ouvidoria" />}
                        {can.auditoria && <NavItem to="/auditoria" icon={ShieldCheck} label="Auditoria" hint="Registros" />}
                    </>}

                    {/* ── Pré-visualização (só admin) ── */}
                    {isAdmin && <>
                        <NavSection label="Pré-visualização" />
                        <NavItem to="/meus-cursos" icon={PlayCircle} label="Área do aluno" hint="Ver como aluno" />
                    </>}

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
