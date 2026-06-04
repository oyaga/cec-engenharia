import { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Shield, Save, Key, Loader2, BookOpen, GraduationCap, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function UserProfile() {
    const { userProfile, loading: authLoading } = useAuth()
    
    // Estados do formulário de senha
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' })

    // Estados para dados específicos por role
    const [extraData, setExtraData] = useState(null)
    const [loadingExtra, setLoadingExtra] = useState(false)

    const userRole = userProfile?.role || 'aluno'

    // Formatar data de cadastro
    const formatJoinDate = (dateStr) => {
        if (!dateStr) return 'Não informada'
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    // Tradução amigável do papel (role)
    const getRoleBadge = (role) => {
        const roles = {
            admin: { label: 'Administrador ⚙️', bg: '#EEF2F6', color: '#1E293B' },
            coordenador: { label: 'Coordenador 🎓', bg: '#ECFDF5', color: '#065F46' },
            atendente: { label: 'Atendente 📞', bg: '#EFF6FF', color: '#1D4ED8' },
            instrutor: { label: 'Instrutor 📘', bg: '#FFF7ED', color: '#C2410C' },
            aluno: { label: 'Aluno ✍️', bg: '#F5F3FF', color: '#6D28D9' }
        }
        const r = roles[role] || { label: role, bg: '#F1F5F9', color: '#475569' }
        return (
            <span style={{ 
                backgroundColor: r.bg, 
                color: r.color, 
                padding: '4px 10px', 
                borderRadius: '999px', 
                fontSize: '0.75rem', 
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center'
            }}>
                {r.label}
            </span>
        )
    }

    // Carregar dados adicionais baseado na role
    useEffect(() => {
        if (!userProfile?.id) return

        const fetchExtraData = async () => {
            setLoadingExtra(true)
            try {
                if (userRole === 'aluno') {
                    // Buscar as matrículas/turmas do aluno
                    const { data, error } = await supabase
                        .from('students')
                        .select('id, how_knew, base_value, payment_method, classes(id, name, course_name, start_date)')
                        .eq('user_id', userProfile.id)
                    
                    if (!error && data) setExtraData(data)
                } else if (userRole === 'instrutor') {
                    // Buscar turmas em que é o instrutor titular
                    const { data, error } = await supabase
                        .from('classes')
                        .select('id, name, course_name, start_date, schedule, address')
                        .eq('instructor_id', userProfile.id)

                    if (!error && data) setExtraData(data)
                }
            } catch (err) {
                console.error('Erro ao buscar dados específicos do perfil:', err)
            } finally {
                setLoadingExtra(false)
            }
        }

        fetchExtraData()
    }, [userProfile, userRole])

    // Manipular alteração de senha
    const handlePasswordChange = async (e) => {
        e.preventDefault()
        setPasswordFeedback({ type: '', message: '' })

        if (passwordData.newPassword.length < 6) {
            setPasswordFeedback({ type: 'error', message: 'A nova senha deve possuir no mínimo 6 caracteres.' })
            return
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordFeedback({ type: 'error', message: 'A confirmação de senha não confere com a nova senha.' })
            return
        }

        setSavingPassword(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            })

            if (error) throw error

            setPasswordFeedback({ type: 'success', message: 'Sua senha foi alterada com sucesso!' })
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            console.error('Erro ao atualizar senha:', err)
            setPasswordFeedback({ type: 'error', message: err.message || 'Falha ao tentar atualizar a senha.' })
        } finally {
            setSavingPassword(false)
        }
    }

    if (authLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
                <Loader2 size={40} className="animate-spin" color="var(--primary)" />
                <span className="text-muted" style={{ fontWeight: '500' }}>Carregando perfil...</span>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Cabeçalho do Perfil */}
            <div className="card animate-slide-up" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
                <div style={{ 
                    width: '90px', 
                    height: '90px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--primary-light)', 
                    color: 'var(--primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '2.5rem', 
                    fontWeight: 'bold',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                }}>
                    {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            {userProfile?.full_name || 'Usuário CEC'}
                        </h2>
                        {getRoleBadge(userRole)}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={16} /> {userProfile?.email}
                        </span>
                        {userProfile?.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} /> {userProfile.phone}
                            </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} /> Membro desde: {formatJoinDate(userProfile?.created_at)}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Lado Esquerdo: Dados Específicos por Papel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Aluno - Painel de Cursos / Matrículas */}
                    {userRole === 'aluno' && (
                        <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BookOpen size={20} color="var(--primary)" /> Minhas Matrículas
                            </h3>
                            
                            {loadingExtra ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="animate-spin text-muted" size={24} />
                                </div>
                            ) : extraData && extraData.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {extraData.map((enrollment) => (
                                        <div key={enrollment.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#FAF9F6' }}>
                                            <h4 style={{ fontWeight: '700', fontSize: '0.95rem', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                                                {enrollment.classes?.course_name || 'Curso em Andamento'}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span><strong>Turma:</strong> {enrollment.classes?.name || 'Não informada'}</span>
                                                <span><strong>Início:</strong> {enrollment.classes?.start_date ? new Date(enrollment.classes.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}</span>
                                                <span><strong>Método de Pagamento:</strong> {enrollment.payment_method || 'Presencial'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Nenhuma matrícula ativa localizada na plataforma.</p>
                            )}
                        </div>
                    )}

                    {/* Instrutor - Painel de Turmas */}
                    {userRole === 'instrutor' && (
                        <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <GraduationCap size={20} color="var(--primary)" /> Minhas Turmas
                            </h3>
                            
                            {loadingExtra ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <Loader2 className="animate-spin text-muted" size={24} />
                                </div>
                            ) : extraData && extraData.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {extraData.map((cls) => (
                                        <div key={cls.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#F0F9FF' }}>
                                            <h4 style={{ fontWeight: '700', fontSize: '0.95rem', margin: '0 0 6px 0', color: '#0369A1' }}>
                                                {cls.name}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span><strong>Curso:</strong> {cls.course_name}</span>
                                                <span><strong>Horário:</strong> {cls.schedule || 'Sábados e Domingos'}</span>
                                                <span><strong>Local:</strong> {cls.address || 'Sede C&C'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>Você não possui turmas ativas vinculadas ao seu perfil.</p>
                            )}
                        </div>
                    )}

                    {/* Administrador / Coordenador / Atendente - Nível Administrativo */}
                    {['admin', 'coordenador', 'atendente'].includes(userRole) && (
                        <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Shield size={20} color="var(--primary)" /> Nível de Acesso
                            </h3>
                            
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                                Seu usuário está configurado com permissões de nível <strong>{userRole.toUpperCase()}</strong>.
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#059669' }}>
                                    <CheckCircle size={16} /> Acesso ao ERP do CEC habilitado
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#059669' }}>
                                    <CheckCircle size={16} /> Visualização da base de alunos ativa
                                </div>
                                {userRole === 'admin' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#059669' }}>
                                        <CheckCircle size={16} /> Configurações críticas e DDL liberadas
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Lado Direito: Alteração de Senha */}
                <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Key size={20} color="var(--primary)" /> Alterar Minha Senha
                    </h3>

                    {passwordFeedback.message && (
                        <div style={{ 
                            padding: '0.75rem 1rem', 
                            borderRadius: '6px', 
                            marginBottom: '1rem', 
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            backgroundColor: passwordFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                            color: passwordFeedback.type === 'success' ? '#065F46' : '#991B1B',
                            border: `1px solid ${passwordFeedback.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            {passwordFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            <span>{passwordFeedback.message}</span>
                        </div>
                    )}

                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        
                        {/* Nova Senha */}
                        <div>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block', fontSize: '0.85rem' }}>
                                Nova Senha
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="No mínimo 6 caracteres"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.65rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                                >
                                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirmar Nova Senha */}
                        <div>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block', fontSize: '0.85rem' }}>
                                Confirmar Nova Senha
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="Repita a nova senha"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.65rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                                >
                                    {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={savingPassword}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', padding: '0.75rem' }}
                        >
                            {savingPassword ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Alterando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} /> Alterar Minha Senha
                                </>
                            )}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    )
}
