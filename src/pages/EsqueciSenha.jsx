import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { authApi } from '../lib/api'

export default function EsqueciSenha() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            await authApi.forgotPassword(email.trim())
            setSent(true)
        } catch (err) {
            setError(err.message || 'Não foi possível enviar o e-mail. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem 2rem' }}>
                <div className="text-center" style={{ marginBottom: '2rem' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: '#DBEAFE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                        <Mail size={32} color="#2563EB" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Recuperar Senha</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Informe o e-mail da sua conta. Enviaremos um link para você definir uma nova senha.
                    </p>
                </div>

                {sent ? (
                    <div>
                        <div style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes. Verifique também a caixa de spam.
                        </div>
                        <Link to="/login" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={18} /> Voltar ao login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">E-mail</label>
                            <input
                                type="email"
                                className="form-control"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                        </button>
                        <div className="text-center" style={{ marginTop: '1.5rem' }}>
                            <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Voltar ao login</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
