import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import ProfessorLayout from './professor/ProfessorLayout'

export default function Layout() {
    const { userProfile, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSignOut = async () => {
        logout()
        navigate('/login')
    }

    const userInitial = userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : (userProfile?.email ? userProfile.email.charAt(0).toUpperCase() : 'U');

    if (location.pathname.startsWith('/professor')) return <ProfessorLayout />

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <header className="topbar">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Visão Geral
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <NotificationBell />
                        <div 
                            ref={menuRef}
                            style={{ position: 'relative' }}
                        >
                            <div 
                                onClick={() => setMenuOpen(!menuOpen)}
                                style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    backgroundColor: 'var(--primary-light)', 
                                    color: 'var(--primary)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                            >
                                {userInitial}
                            </div>

                            {menuOpen && (
                                <div style={{ 
                                    position: 'absolute', 
                                    right: 0, 
                                    top: '48px', 
                                    backgroundColor: '#FFFFFF', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', 
                                    borderRadius: '8px', 
                                    border: '1px solid #E2E8F0',
                                    padding: '0.5rem', 
                                    zIndex: 9999, 
                                    minWidth: '220px' 
                                }}>
                                    {/* Info do usuário */}
                                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', marginBottom: '0.25rem' }}>
                                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1E293B', margin: 0 }}>{userProfile?.full_name || 'Usuário CEC'}</p>
                                        <p style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#64748B', margin: '2px 0 0 0' }}>{userProfile?.email || 'email@exemplo.com'}</p>
                                    </div>

                                    {/* Opções */}
                                    <button 
                                        onClick={() => {
                                            setMenuOpen(false);
                                            if (!userProfile?.role) return navigate('/secretaria/perfil');
                                            
                                            if (['admin', 'coordenador', 'atendente'].includes(userProfile.role)) {
                                                navigate('/secretaria/perfil');
                                            } else if (userProfile.role === 'instrutor') {
                                                navigate('/professor/perfil');
                                            } else if (userProfile.role === 'aluno') {
                                                navigate('/aluno/perfil');
                                            } else {
                                                navigate('/secretaria/perfil');
                                            }
                                        }}
                                        style={{ 
                                            width: '100%', 
                                            textAlign: 'left', 
                                            padding: '0.5rem 1rem', 
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            color: '#334155',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                        className="hover-bg-gray"
                                    >
                                        👤 Meu Perfil
                                    </button>
                                    <button 
                                        onClick={() => { setMenuOpen(false); navigate('/trocar-senha'); }}
                                        style={{ 
                                            width: '100%', 
                                            textAlign: 'left', 
                                            padding: '0.5rem 1rem', 
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            color: '#334155',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                        className="hover-bg-gray"
                                    >
                                        🔒 Alterar Senha
                                    </button>

                                    {/* Separador + Sair */}
                                    <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                                        <button
                                            onClick={handleSignOut}
                                            style={{ 
                                                width: '100%', 
                                                textAlign: 'left', 
                                                padding: '0.5rem 1rem', 
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                borderRadius: '6px',
                                                color: '#EF4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}
                                            className="hover-bg-red"
                                        >
                                            🚪 Sair
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
            
            <style>{`
                .hover-bg-gray:hover {
                    background-color: #F1F5F9 !important;
                }
                .hover-bg-red:hover {
                    background-color: #FEF2F2 !important;
                }
            `}</style>
        </div>
    )
}
