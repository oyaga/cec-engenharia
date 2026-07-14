import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ClipboardList, Plus, Search, Filter, Eye, XCircle, DollarSign, Loader2, Save, X, Lock, Unlock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { classesApi, coursesApi, studentsApi } from '../services/academic'
import { authApi } from '../lib/api'
import { auditApi } from '../services/financial'
import { useAuth } from '../contexts/AuthContext'

export default function Matriculas() {
    const { userProfile } = useAuth()
    const isGerencial = ['admin', 'coordenador'].includes(userProfile?.role)
    
    const [enrollments, setEnrollments] = useState([])
    const [classes, setClasses] = useState([])
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    
    // Filtros
    const [searchTerm, setSearchTerm] = useState('')
    const [classFilter, setClassFilter] = useState('todas')
    const [courseFilter, setCourseFilter] = useState('todos')
    const [statusFilter, setStatusFilter] = useState('todas')
    const [periodFilter, setPeriodFilter] = useState('todos') // todos | 30 | 90 | ano

    // Modais
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [selectedEnrollment, setSelectedEnrollment] = useState(null)
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // Form Nova Matrícula
    const [form, setForm] = useState({
        full_name: '',
        cpf: '',
        rg: '',
        email: '',
        phone: '',
        turma_id: '',
        base_value: 0,
        discount_value: 0,
        payment_method: 'À Vista (PIX/Dinheiro)'
    })

    // Estado de Autorização para Cancelamento (se Atendente)
    const [authEmail, setAuthEmail] = useState('')
    const [authPassword, setAuthPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [enrollmentToCancel, setEnrollmentToCancel] = useState(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Turmas
            const { classes: clsData } = await classesApi.list()
            if (clsData) setClasses(clsData)

            // 2. Cursos
            const { courses: crsData } = await coursesApi.list()
            if (crsData) setCourses(crsData)

            // 3. Matrículas (students)
            const { students: stdData } = await studentsApi.list()

            const formatted = (stdData || []).map(s => {
                const totalValue = (s.base_value || 0) - (s.discount_value || 0)
                return {
                    id: s.id,
                    matricula_numero: s.matricula_numero || s.id.slice(0, 8).toUpperCase(),
                    student_name: s.full_name || 'Sem Nome',
                    cpf: s.cpf || '',
                    email: s.email || '',
                    phone: s.phone || '',
                    rg: s.rg || '',
                    class_name: s.turma_name || 'Sem Turma',
                    class_id: s.turma_id || '',
                    course_name: s.turma_course || 'Sem Curso',
                    created_at: s.created_at,
                    value: totalValue >= 0 ? totalValue : 0,
                    payment_method: s.payment_method || 'À Vista (PIX/Dinheiro)',
                    payment_status: s.payment_status || (s.payment_method === 'À Vista (PIX/Dinheiro)' ? 'pago' : 'pendente'),
                    status: s.status || 'ativa', // ativa | cancelada | concluída
                    originalData: s
                }
            })
            setEnrollments(formatted)
        } catch (err) {
            console.error('Erro ao buscar matrículas:', err)
            setEnrollments([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleFormChange = (e) => {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))

        if (name === 'turma_id' && value) {
            const selectedClass = classes.find(c => c.id === value)
            if (selectedClass) {
                setForm(prev => ({
                    ...prev,
                    base_value: selectedClass.course_value || 0
                }))
            }
        }
    }

    const handleOpenCreate = () => {
        setForm({
            full_name: '',
            cpf: '',
            rg: '',
            email: '',
            phone: '',
            turma_id: classes[0]?.id || '',
            base_value: classes[0]?.course_value || 0,
            discount_value: 0,
            payment_method: 'À Vista (PIX/Dinheiro)'
        })
        setErrorMsg('')
        setShowCreateModal(true)
    }

    const handleCreateEnrollment = async (e) => {
        e.preventDefault()
        if (!form.full_name || !form.cpf || !form.turma_id) {
            setErrorMsg('Nome completo, CPF e Turma são obrigatórios.')
            return
        }

        setSaving(true)
        setErrorMsg('')

        try {
            const payload = {
                full_name: form.full_name,
                cpf: form.cpf,
                rg: form.rg,
                email: form.email,
                phone: form.phone,
                turma_id: form.turma_id,
                base_value: parseFloat(form.base_value) || 0,
                discount_value: parseFloat(form.discount_value) || 0,
                payment_method: form.payment_method,
                status: 'ativa',
                payment_status: form.payment_method === 'À Vista (PIX/Dinheiro)' ? 'pago' : 'pendente'
            }

            await studentsApi.create(payload)

            fetchData()
            setShowCreateModal(false)
            alert('Matrícula efetuada com sucesso!')
        } catch (err) {
            console.error('Erro ao matricular aluno:', err)
            setErrorMsg(err.message || 'Falha ao criar registro de matrícula.')
        } finally {
            setSaving(false)
        }
    }

    const triggerCancel = (enrollment) => {
        setEnrollmentToCancel(enrollment)
        if (isGerencial) {
            confirmCancel(enrollment.id)
        } else {
            setAuthError('')
            setAuthEmail('')
            setAuthPassword('')
            setShowAuthModal(true)
        }
    }

    const confirmCancel = async (id) => {
        const confirm = window.confirm('Deseja realmente cancelar esta matrícula de forma definitiva?')
        if (!confirm) return

        try {
            if (id.toString().startsWith('mock-')) {
                setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: 'cancelada', payment_status: 'cancelado' } : e))
            } else {
                await studentsApi.update(id, { status: 'cancelada', payment_status: 'cancelado' })
            }
            alert('Matrícula cancelada com sucesso.')
            fetchData()
        } catch (err) {
            alert('Erro ao cancelar matrícula: ' + err.message)
        }
    }

    const handleAuthCancel = async (e) => {
        e.preventDefault()
        setAuthError('')

        if (!authEmail || !authPassword) {
            setAuthError('Preencha e-mail e senha de autorização.')
            return
        }

        try {
            // Valida o gestor no backend (sem trocar a sessão atual).
            const result = await authApi.verifyManager(authEmail, authPassword)
            if (!result?.valid) {
                setAuthError('E-mail/senha do gestor incorretos ou papel insuficiente (admin/coordenador).')
                return
            }

            // Autorizado!
            setShowAuthModal(false)

            // Log de auditoria
            try {
                await auditApi.record('cancel_enrollment', 'students', enrollmentToCancel.id, {
                    requester: userProfile?.email || 'atendente',
                    authorizer: authEmail,
                })
            } catch { /* auditoria não bloqueia */ }

            confirmCancel(enrollmentToCancel.id)
        } catch (err) {
            console.error('Erro na autorização do cancelamento:', err)
            setAuthError('Erro interno de validação. Tente novamente.')
        }
    }

    const handleGenerateInvoice = (enrollment) => {
        alert(`[Asaas - Sprint B] Boleto Bancário gerado com sucesso para a matrícula ${enrollment.matricula_numero} no valor de R$ ${enrollment.value.toFixed(2)}. link de pagamento enviado para o e-mail: ${enrollment.email}`)
    }

    // Filtragem de Matrículas
    const filteredEnrollments = enrollments.filter(e => {
        const matchesSearch = e.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              e.cpf.includes(searchTerm) ||
                              e.matricula_numero.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesClass = classFilter === 'todas' || e.class_id === classFilter
        const matchesCourse = courseFilter === 'todos' || e.course_name.toLowerCase().includes(courseFilter.toLowerCase())
        const matchesStatus = statusFilter === 'todas' || e.status === statusFilter
        
        // Filtro de período
        let matchesPeriod = true
        if (periodFilter !== 'todos') {
            const date = new Date(e.created_at)
            const today = new Date()
            const diffTime = Math.abs(today - date)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (periodFilter === '30' && diffDays > 30) matchesPeriod = false
            if (periodFilter === '90' && diffDays > 90) matchesPeriod = false
            if (periodFilter === 'ano' && diffDays > 365) matchesPeriod = false
        }

        return matchesSearch && matchesClass && matchesCourse && matchesStatus && matchesPeriod
    })

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'system-ui, -apple-system, sans-serif' }} className="animate-fade-in">
            {/* CABEÇALHO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📋 Console de Matrículas
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                        Visão consolidada de registros de inscrições, cobranças, controle de status e cancelamentos seguros.
                    </p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'brightness 0.2s'
                    }}
                >
                    <Plus size={18} /> Nova Matrícula
                </button>
            </div>

            {/* FILTROS E BUSCA */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome do aluno, CPF ou número de matrícula..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>Filtrar Turma</label>
                        <select
                            value={classFilter}
                            onChange={e => setClassFilter(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                        >
                            <option value="todas">Todas as Turmas</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>Filtrar Método/Curso</label>
                        <select
                            value={courseFilter}
                            onChange={e => setCourseFilter(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                        >
                            <option value="todos">Todos os Cursos</option>
                            {courses.map(c => <option key={c.id} value={c.title}>{c.code} - {c.title}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>Status Matrícula</label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                        >
                            <option value="todas">Todas</option>
                            <option value="ativa">Ativas</option>
                            <option value="cancelada">Canceladas</option>
                            <option value="concluída">Concluídas</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '0.25rem' }}>Período Matrícula</label>
                        <select
                            value={periodFilter}
                            onChange={e => setPeriodFilter(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                        >
                            <option value="todos">Todo o histórico</option>
                            <option value="30">Últimos 30 dias</option>
                            <option value="90">Últimos 90 dias</option>
                            <option value="ano">Último Ano</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* TABELA DE MATRICULAS */}
            <div className="card" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'white' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '1.2rem 1rem' }}>Número</th>
                                <th style={{ padding: '1.2rem 1rem' }}>Aluno</th>
                                <th style={{ padding: '1.2rem 1rem' }}>Curso / Método</th>
                                <th style={{ padding: '1.2rem 1rem' }}>Turma</th>
                                <th style={{ padding: '1.2rem 1rem' }}>Data Matrícula</th>
                                <th style={{ padding: '1.2rem 1rem' }}>Valor</th>
                                <th style={{ padding: '1.2rem 1rem' }}>Status Pgto</th>
                                <th style={{ padding: '1.2rem 1rem' }}>Status Matr.</th>
                                <th style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '0.88rem' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: '3rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                                            <Loader2 className="animate-spin" size={20} color="var(--primary)" />
                                            <span>Carregando matrículas da base...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEnrollments.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                        Nenhuma matrícula encontrada para os filtros selecionados.
                                    </td>
                                </tr>
                            ) : filteredEnrollments.map(e => {
                                const isCancelado = e.status === 'cancelada';
                                const isConcluido = e.status === 'concluída';
                                
                                return (
                                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', backgroundColor: isCancelado ? '#f8fafc' : 'transparent' }}>
                                        <td style={{ padding: '1rem', fontWeight: '700', color: '#475569' }}>{e.matricula_numero}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <strong style={{ color: '#0f172a', display: 'block' }}>{e.student_name}</strong>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>CPF: {e.cpf}</span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{e.course_name}</td>
                                        <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}>{e.class_name}</td>
                                        <td style={{ padding: '1rem' }}>{new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td style={{ padding: '1rem', fontWeight: '750' }}>R$ {e.value.toFixed(2)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800',
                                                backgroundColor: e.payment_status === 'pago' ? '#dcfce7' : e.payment_status === 'cancelado' ? '#f1f5f9' : '#fee2e2',
                                                color: e.payment_status === 'pago' ? '#15803d' : e.payment_status === 'cancelado' ? '#64748b' : '#ef4444',
                                                textTransform: 'uppercase'
                                            }}>
                                                {e.payment_status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800',
                                                backgroundColor: isConcluido ? '#dbeafe' : isCancelado ? '#fee2e2' : '#dcfce7',
                                                color: isConcluido ? '#1d4ed8' : isCancelado ? '#ef4444' : '#15803d',
                                                textTransform: 'uppercase'
                                            }}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={() => { setSelectedEnrollment(e); setShowDetailsModal(true); }}
                                                    style={{ padding: '0.4rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye size={15} color="#475569" />
                                                </button>
                                                {!isCancelado && !isConcluido && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleGenerateInvoice(e)}
                                                            style={{ padding: '0.4rem', backgroundColor: '#ecfdf5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                            title="Gerar Boleto (Asaas)"
                                                        >
                                                            <DollarSign size={15} color="#059669" />
                                                        </button>
                                                        <button 
                                                            onClick={() => triggerCancel(e)}
                                                            style={{ padding: '0.4rem', backgroundColor: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                                            title="Cancelar Matrícula"
                                                        >
                                                            <XCircle size={15} color="#ef4444" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DETALHES MATRICULA */}
            {showDetailsModal && selectedEnrollment && createPortal((
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', overflow: 'hidden' }} className="animate-scale-up">
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                                Ficha de Matrícula #{selectedEnrollment.matricula_numero}
                            </h3>
                            <button onClick={() => setShowDetailsModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Aluno</span>
                                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: '750' }}>{selectedEnrollment.student_name}</h4>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>CPF: {selectedEnrollment.cpf} | RG: {selectedEnrollment.rg}</p>
                                <p style={{ margin: '2px 0 0 0', color: '#64748b' }}>E-mail: {selectedEnrollment.email} | WhatsApp: {selectedEnrollment.phone}</p>
                            </div>
                            
                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Curso & Turma</span>
                                <p style={{ margin: '4px 0 0 0', fontWeight: '700', color: '#0f172a' }}>{selectedEnrollment.course_name}</p>
                                <p style={{ margin: '2px 0 0 0', fontWeight: '600', color: 'var(--primary)' }}>Turma vinculada: {selectedEnrollment.class_name}</p>
                            </div>

                            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Data de Matrícula</span>
                                    <strong>{new Date(selectedEnrollment.created_at).toLocaleString('pt-BR')}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Método de Pagamento</span>
                                    <strong>{selectedEnrollment.payment_method}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Valor Líquido Inscrição</span>
                                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary-dark)' }}>R$ {selectedEnrollment.value.toFixed(2)}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block' }}>Status da Cobrança</span>
                                    <strong style={{ textTransform: 'uppercase', color: selectedEnrollment.payment_status === 'pago' ? 'green' : 'orange' }}>{selectedEnrollment.payment_status}</strong>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowDetailsModal(false)} style={{ padding: '0.5rem 1.25rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                                Fechar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL NOVA MATRICULA */}
            {showCreateModal && createPortal((
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }} className="animate-scale-up">
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ClipboardList size={20} color="var(--primary)" /> Nova Matrícula em Turma
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateEnrollment} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {errorMsg && (
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991B1B', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={16} /> {errorMsg}
                                </div>
                            )}

                            <div>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--primary)', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>1. Prontuário do Aluno</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Nome Completo *</label>
                                        <input type="text" name="full_name" value={form.full_name} onChange={handleFormChange} required placeholder="Nome do Estudante" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>CPF *</label>
                                        <input type="text" name="cpf" value={form.cpf} onChange={handleFormChange} required placeholder="000.000.000-00" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Identidade (RG)</label>
                                        <input type="text" name="rg" value={form.rg} onChange={handleFormChange} placeholder="RG" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>E-mail corporativo</label>
                                        <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="exemplo@cec.com.br" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Telefone / WhatsApp</label>
                                        <input type="text" name="phone" value={form.phone} onChange={handleFormChange} placeholder="(21) 90000-0000" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--primary)', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>2. Turma Alvo & Financeiro</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Vincular à Turma *</label>
                                        <select name="turma_id" value={form.turma_id} onChange={handleFormChange} required style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white' }}>
                                            <option value="">Selecione uma Turma</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.course_name})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Forma de Pagamento</label>
                                        <select name="payment_method" value={form.payment_method} onChange={handleFormChange} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white' }}>
                                            <option>À Vista (PIX/Dinheiro)</option>
                                            <option>Cartão de Crédito (até 10x)</option>
                                            <option>Boleto Parcelado (3x)</option>
                                            <option>Empresa Faturado</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Valor Bruto do Curso (R$)</label>
                                        <input type="number" name="base_value" value={form.base_value} onChange={handleFormChange} placeholder="0.00" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>Desconto Aplicado (R$)</label>
                                        <input type="number" name="discount_value" value={form.discount_value} onChange={handleFormChange} placeholder="0.00" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.6rem 1.25rem', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '750', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Finalizar Matrícula
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL DE AUTORIZACAO PARA CANCELAMENTO */}
            {showAuthModal && createPortal((
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} className="animate-scale-up">
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Lock size={18} /> Autorização de Supervisor
                            </h3>
                            <button onClick={() => setShowAuthModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAuthCancel} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                                O cancelamento de matrículas ativas exige autorização de um **Coordenador** ou **Administrador** da C&C Engenharia.
                            </p>
                            
                            {authError && (
                                <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '600', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px' }}>
                                    {authError}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.25rem' }}>E-mail do Gestor *</label>
                                <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required placeholder="coordenador@cec.com.br" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', marginBottom: '0.25rem' }}>Senha de Segurança *</label>
                                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required placeholder="••••••" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                            </div>

                            <button type="submit" style={{ width: '100%', padding: '0.6rem', backgroundColor: '#991b1b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '750', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.5rem' }}>
                                <Unlock size={16} /> Liberar Acesso e Cancelar
                            </button>
                        </form>
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}
