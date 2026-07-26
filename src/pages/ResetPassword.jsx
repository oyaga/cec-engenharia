import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function ResetPassword() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()
    const { userProfile, refresh } = useAuth()

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        if (password !== confirmPassword) return setError('As senhas não coincidem')
        if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres')

        setLoading(true)
        setError(null)

        try {
            // Define a senha definitiva (backend Go) e limpa must_change_password.
            await authApi.setInitialPassword(password)
            await refresh()

            alert('Senha atualizada com sucesso! Bem-vindo ao portal.')

            const role = userProfile?.role
            if (role === 'aluno') {
                window.location.replace('/meus-cursos')
            } else if (['admin', 'coordenador', 'atendente'].includes(role)) {
                window.location.replace('/dashboard')
            } else {
                navigate('/')
            }
        } catch (err) {
            setError(err.message || 'Falha ao atualizar senha.')
        } finally {
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
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem 2rem' }}>
                <div className="text-center" style={{ marginBottom: '2rem' }}>
                    <div style={{ 
                        width: '64px', height: '64px', backgroundColor: '#FEF3C7', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', margin: '0 auto 1.5rem auto' 
                    }}>
                        <Lock size={32} color="#D97706" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Primeiro Acesso</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Para sua segurança, você deve escolher uma nova senha pessoal antes de continuar.
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem',
                        borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword}>
                    <div className="form-group">
                        <label className="form-label">Nova Senha</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Digite sua nova senha"
                                required
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="form-label">Confirme a Nova Senha</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <ShieldCheck size={18} />
                            </div>
                            <input
                                type="password"
                                className="form-control"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repita a nova senha"
                                required
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Atualizando...' : 'Definir Senha e Entrar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
