import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function Login({ title = "Acesso ao Sistema", isSecretaria = false, isWebdesigner = false, redirectTo = null }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [rememberMe, setRememberMe] = useState(false)
    const navigate = useNavigate()

    // Sessão ativa vem do contexto (backend Go), não mais do Supabase.
    const { session, userProfile, login, logout } = useAuth()
    const isAlreadyLoggedIn = !!session
    const currentSessionUser = session?.user
    const currentUserProfile = userProfile

    const handleLogout = () => {
        logout()
    }

    const redirectByRole = (role) => {
        if (redirectTo && redirectTo !== '/') return navigate(redirectTo)
        if (role === 'aluno') return window.location.replace('/meus-cursos')
        if (role === 'instrutor') return window.location.replace('/professor')
        if (redirectTo === '/') return window.location.replace('/')
        return window.location.replace('/dashboard')
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const user = await login(email, password, rememberMe)

            if (user?.must_change_password) {
                navigate('/trocar-senha')
                return
            }
            redirectByRole(user?.role)
        } catch (err) {
            setError(err.status === 401 || err.status === 403
                ? 'E-mail ou senha incorretos.'
                : (err.message || 'Falha ao entrar.'))
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-color)',
            padding: '1rem'
        }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>
                <div className="text-center" style={{ marginBottom: '2rem' }}>
                    <div style={{ margin: '0 auto 1rem auto', display: 'flex', justifyContent: 'center' }}>
                        <img src="/assets/logo.png" alt="C&C Engenharia Logo" style={{ maxWidth: '180px', height: 'auto', objectFit: 'contain' }} />
                    </div>
                    <h2 style={{ color: 'var(--text-color)', fontSize: '1.25rem', fontWeight: '500', marginBottom: '0.5rem' }}>{title}</h2>
                    {isSecretaria && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Acesso exclusivo para administradores e secretaria.</p>}
                </div>

                {isAlreadyLoggedIn && currentSessionUser && (
                    <div className="animate-fade-in" style={{
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'left'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '600', marginBottom: '0.5rem' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', animation: 'pulse 2s infinite' }}></span>
                            Sessão Ativa Detectada
                        </div>
                        <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-muted)' }}>
                            Conectado como: <strong style={{ color: 'var(--text-color)' }}>{currentSessionUser.email}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={() => {
                                    if (currentUserProfile?.role === 'aluno') {
                                        window.location.replace('/meus-cursos')
                                    } else if (currentUserProfile?.role === 'instrutor') {
                                        window.location.replace('/professor')
                                    } else {
                                        window.location.replace('/dashboard')
                                    }
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', fontWeight: '500' }}
                            >
                                Acessar Painel
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
                            >
                                Sair
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem',
                        borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} autoComplete="off">
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">E-mail</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                required
                                autoComplete="new-email"
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ position: 'relative', marginBottom: '2rem' }}>
                        <label className="form-label">Senha</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ 
                                    position: 'absolute', 
                                    top: '50%', 
                                    right: '12px', 
                                    transform: 'translateY(-50%)', 
                                    color: 'var(--text-muted)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    padding: 0
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="rememberMe" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                            Lembrar de mim (Mantenha-me conectado)
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar no Sistema'}
                    </button>
                </form>
            </div>
        </div>
    )
}
