import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { authApi } from '../lib/api'

export default function RedefinirSenha() {
    const [params] = useSearchParams()
    const token = params.get('token') || ''
    const navigate = useNavigate()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        if (!token) return setError('Link inválido — solicite uma nova recuperação de senha.')
        if (password !== confirmPassword) return setError('As senhas não coincidem.')
        if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
        setLoading(true)
        try {
            await authApi.resetPassword(token, password)
            alert('Senha redefinida com sucesso! Faça login com a nova senha.')
            navigate('/login')
        } catch (err) {
            setError(err.message || 'Não foi possível redefinir a senha.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem 2rem' }}>
                <div className="text-center" style={{ marginBottom: '2rem' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <Lock size={32} color="#D97706" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Definir Nova Senha</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Escolha uma nova senha para a sua conta.
                    </p>
                </div>

                {!token && (
                    <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        Link inválido ou incompleto. <Link to="/esqueci-senha" style={{ color: 'white', textDecoration: 'underline' }}>Solicitar novo link</Link>.
                    </div>
                )}

                {error && (
                    <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nova Senha</label>
                        <input type="password" className="form-control" placeholder="Digite sua nova senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirme a Nova Senha</label>
                        <input type="password" className="form-control" placeholder="Repita a nova senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading || !token}>
                        {loading ? 'Salvando...' : 'Redefinir senha'}
                    </button>
                    <div className="text-center" style={{ marginTop: '1.5rem' }}>
                        <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Voltar ao login</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
