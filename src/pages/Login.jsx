import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'

export default function Login({ title = "Acesso ao Sistema", isSecretaria = false, isWebdesigner = false, redirectTo = null }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState(false)
    const navigate = useNavigate()

    // Verificar se já está logado ao carregar
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setIsAlreadyLoggedIn(true)
        })
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        sessionStorage.clear()
        localStorage.clear()
        window.location.href = '/'
    }

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            try {
                // Tenta buscar se precisa trocar senha, mas não deixa isso travar o login
                const { data: { user } } = await supabase.auth.getUser()
                
                if (user) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('must_change_password')
                        .eq('id', user.id)
                        .maybeSingle()

                    if (profile?.must_change_password) {
                        navigate('/trocar-senha')
                        setLoading(false)
                        return
                    }
                }

                // Se chegou aqui, redireciona conforme planejado
                if (redirectTo === '/') {
                    window.location.replace('/')
                } else if (redirectTo) {
                    navigate(redirectTo)
                } else {
                    window.location.replace('/')
                }
            } catch (err) {
                console.warn("Erro ao buscar perfil pós-login, seguindo para Home:", err)
                window.location.replace('/')
            }
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

                {isAlreadyLoggedIn ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                            Você já está autenticado no sistema. Se estiver enfrentando problemas de carregamento, clique no botão abaixo para deslogar.
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                        >
                            Sair do Sistema (Log Out)
                        </button>
                        <button 
                            onClick={() => navigate('/')}
                            style={{ width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                        >
                            Voltar para a Home
                        </button>
                    </div>
                ) : (
                    <>
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

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar no Sistema'}
                    </button>
                </form>
                </>
                )}
            </div>
        </div>
    )
}
