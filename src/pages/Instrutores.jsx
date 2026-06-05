import { useState, useEffect } from 'react'
import { supabase, createTempClient } from '../lib/supabase'
import { 
  GraduationCap, Award, Calendar, ShieldCheck, Search, Plus, 
  Trash2, FileText, CheckCircle, AlertTriangle, AlertCircle, Eye, 
  Info, Loader2, X, RefreshCw, Sparkles, UserCheck2, UserX 
} from 'lucide-react'

const MOCK_QUALIFICATIONS = [
    {
        id: 'mock-qual-1',
        user_id: 'mock-inst-1',
        method: 'CD-CL',
        qualification_type: 'snqc',
        training_hours: 4,
        training_date: '2026-05-10',
        status: 'ativo',
        valid_until: '2029-05-15',
        created_at: new Date().toISOString(),
        users: { full_name: 'Dr. Carlos Mendonça', email: 'carlos.mendonca@cec.com.br', cpf: '123.456.789-00', phone: '(21) 98888-1111' }
    },
    {
        id: 'mock-qual-2',
        user_id: 'mock-inst-2',
        method: 'CD-MC',
        qualification_type: 'experience',
        training_hours: 8,
        training_date: '2026-04-12',
        status: 'pendente_aprovacao',
        valid_until: null,
        created_at: new Date().toISOString(),
        users: { full_name: 'Prof.ª Roberta Costa', email: 'roberta.costa@cec.com.br', cpf: '987.654.321-11', phone: '(21) 97777-2222' }
    },
    {
        id: 'mock-qual-3',
        user_id: 'mock-inst-3',
        method: 'CD-TO',
        qualification_type: 'snqc',
        training_hours: 4,
        training_date: '2025-05-15',
        status: 'vencido',
        valid_until: '2026-05-15',
        created_at: new Date().toISOString(),
        users: { full_name: 'Insp. Marcos Silva', email: 'marcos.silva@cec.com.br', cpf: '456.789.123-22', phone: '(21) 96666-3333' }
    }
]

export default function Instrutores() {
    const [qualifications, setQualifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [showWizard, setShowWizard] = useState(false)
    const [wizardStep, setWizardStep] = useState(1)
    
    // Filtros de Busca
    const [filterMethod, setFilterMethod] = useState('all') // all | CD-MC | CD-CL | CD-TO
    const [filterStatus, setFilterStatus] = useState('all') // all | ativo | pendente_aprovacao | reprovado | vencido
    
    // Contadores de capacidades (máx 8 por método)
    const [capacities, setCapacities] = useState({ 'CD-MC': 0, 'CD-CL': 0, 'CD-TO': 0 })
    const [loadingCapacities, setLoadingCapacities] = useState(false)

    // Formulário do Assistente PR-127
    const [prForm, setPrForm] = useState({
        full_name: '',
        cpf: '',
        rg: '',
        email: '',
        phone: '',
        birth_date: '',
        education_level: 'Técnico Nível Médio',
        methods: [], // CD-MC, CD-CL, CD-TO
        methodComprovations: {}, // { 'CD-MC': 'snqc' | 'experience' }
        training_hours: 4,
        training_date: '',
        training_abendi: 'Sim',
        // Arquivos em Base64
        rg_url: '',
        cpf_url: '',
        diploma_url: '',
        snqc_url: '',
        experience_url: '',
        training_url: '',
        photo_url: ''
    })

    // Modal de Julgamento do Coordenador
    const [showApprovalModal, setShowApprovalModal] = useState(false)
    const [selectedQualForApproval, setSelectedQualForApproval] = useState(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [approvalLoading, setApprovalLoading] = useState(false)
    
    const [currentUserProfile, setCurrentUserProfile] = useState(null)

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            // Obter cargo do usuário logado
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
                setCurrentUserProfile(profile)
            }

            // 1. Carregar as qualificações PR-127
            const { data: qualData, error: qualError } = await supabase
                .from('instructor_qualifications')
                .select('*, users!instructor_qualifications_user_id_fkey(full_name, email, cpf, phone)')
            
            if (qualError) throw qualError

            if (qualData && qualData.length > 0) {
                setQualifications(qualData)
                await fetchCapacities(qualData)
            } else {
                setQualifications(MOCK_QUALIFICATIONS)
                await fetchCapacities(MOCK_QUALIFICATIONS)
            }
        } catch (err) {
            console.warn('Erro ao carregar qualificações (usando emulador local):', err)
            setQualifications(MOCK_QUALIFICATIONS)
            await fetchCapacities(MOCK_QUALIFICATIONS)
        }
        setLoading(false)
    }

    const fetchCapacities = async (customQuals = null) => {
        setLoadingCapacities(true)
        try {
            const counts = { 'CD-MC': 0, 'CD-CL': 0, 'CD-TO': 0 }
            
            if (customQuals) {
                customQuals.forEach(item => {
                    if (item.status === 'ativo' && counts[item.method] !== undefined) {
                        counts[item.method]++
                    }
                })
            } else {
                // Se não foi passado dados, fazemos a consulta no banco de dados.
                // Mas antes, vamos verificar se ela está totalmente vazia.
                const { count, error: countError } = await supabase
                    .from('instructor_qualifications')
                    .select('*', { count: 'exact', head: true })
                
                if (countError) throw countError

                if (count > 0) {
                    const { data, error } = await supabase
                        .from('instructor_qualifications')
                        .select('method')
                        .eq('status', 'ativo')
                    
                    if (error) throw error
                    
                    if (data) {
                        data.forEach(item => {
                            if (counts[item.method] !== undefined) counts[item.method]++
                        })
                    }
                } else {
                    // Se a tabela está vazia, usa os mocks ativos
                    MOCK_QUALIFICATIONS.forEach(item => {
                        if (item.status === 'ativo' && counts[item.method] !== undefined) {
                            counts[item.method]++
                        }
                    })
                }
            }
            setCapacities(counts)
        } catch (err) {
            console.error('Erro ao buscar capacidades:', err)
            // Fallback para capacidades dos mocks
            const counts = { 'CD-MC': 0, 'CD-CL': 0, 'CD-TO': 0 }
            MOCK_QUALIFICATIONS.forEach(item => {
                if (item.status === 'ativo' && counts[item.method] !== undefined) {
                    counts[item.method]++
                }
            })
            setCapacities(counts)
        } finally {
            setLoadingCapacities(false)
        }
    }

    useEffect(() => {
        fetchInitialData()
    }, [])

    // Converter para Base64
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    const handleFileChange = async (fieldName, file) => {
        if (!file) return
        try {
            const base64Data = await convertFileToBase64(file)
            setPrForm(prev => ({ ...prev, [fieldName]: base64Data }))
        } catch (err) {
            console.error('Erro ao converter arquivo:', err)
            alert('Falha ao processar arquivo.')
        }
    }

    const handleNextStep = () => {
        if (wizardStep === 1) {
            const invalidSchool = ['Ensino Médio', 'Ensino Fundamental'].includes(prForm.education_level)
            if (invalidSchool) {
                alert('Atenção: A norma ABENDI PR-127 exige que o instrutor possua escolaridade MÍNIMA de Técnico Nível Médio para habilitação técnica.')
                return
            }
            if (!prForm.full_name || !prForm.cpf || !prForm.email || !prForm.phone) {
                alert('Por favor, preencha todos os campos obrigatórios (*).')
                return
            }
        }
        if (wizardStep === 2) {
            if (prForm.methods.length === 0) {
                alert('Selecione pelo menos um método END a ser habilitado.')
                return
            }
            for (const method of prForm.methods) {
                if (!prForm.methodComprovations[method]) {
                    alert(`Por favor, defina a comprovação técnica exigida para o método ${method}.`)
                    return
                }
            }
        }
        if (wizardStep === 3) {
            if (prForm.training_abendi !== 'Sim') {
                alert('O instrutor deve realizar obrigatoriamente o treinamento Abendi mínimo de 4h (Anexo A).')
                return
            }
            if (!prForm.training_date || !prForm.training_hours) {
                alert('Defina a data e a carga horária do treinamento Abendi.')
                return
            }
        }
        if (wizardStep === 4) {
            if (!prForm.rg_url || !prForm.cpf_url || !prForm.diploma_url || !prForm.training_url || !prForm.photo_url) {
                alert('Atenção: Todos os documentos pessoais, diploma de escolaridade, comprovante Abendi e foto 3x4 são de upload obrigatório!')
                return
            }
            const needsSnqc = prForm.methods.some(m => prForm.methodComprovations[m] === 'snqc')
            if (needsSnqc && !prForm.snqc_url) {
                alert('Você selecionou a comprovação por Certificado SNQC. Faça o upload correspondente.')
                return
            }
            const needsExperience = prForm.methods.some(m => prForm.methodComprovations[m] === 'experience')
            if (needsExperience && !prForm.experience_url) {
                alert('Você selecionou a comprovação por Experiência. Faça o upload correspondente.')
                return
            }
        }
        setWizardStep(prev => prev + 1)
    }

    const handleSubmitWizard = async () => {
        setLoading(true)
        try {
            // 1. Criar usuário de instrutor na Auth/Users se ainda não existir
            let instructorUserId = 'mock-inst-' + Date.now()
            
            const uniqueId = Date.now()
            const passwordToSave = 'CEC@inst_' + Math.floor(1000 + Math.random() * 9000)

            const tempClient = createTempClient()
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: prForm.email,
                password: passwordToSave,
                options: {
                    data: {
                        full_name: prForm.full_name,
                        role: 'instrutor'
                    }
                }
            })

            if (!authError && authData?.user) {
                instructorUserId = authData.user.id
                
                // Salvar/Atualizar em public.users (upsert evita conflito com trigger auth)
                await supabase.from('users').upsert({
                    id: instructorUserId,
                    email: prForm.email,
                    full_name: prForm.full_name,
                    role: 'instrutor',
                    cpf: prForm.cpf,
                    phone: prForm.phone,
                    is_active: true,
                    permissions: { has_erp_access: true }
                }, { onConflict: 'id' })
            }

            // 2. Salvar Habilitações em instructor_qualifications do Supabase
            for (const method of prForm.methods) {
                const payload = {
                    user_id: instructorUserId,
                    method,
                    qualification_type: prForm.methodComprovations[method],
                    snqc_url: prForm.snqc_url || null,
                    experience_url: prForm.experience_url || null,
                    training_url: prForm.training_url,
                    training_hours: parseInt(prForm.training_hours),
                    training_date: prForm.training_date,
                    diploma_url: prForm.diploma_url,
                    rg_url: prForm.rg_url,
                    cpf_doc_url: prForm.cpf_url,
                    photo_url: prForm.photo_url,
                    status: 'pendente_aprovacao'
                }

                const { error } = await supabase
                    .from('instructor_qualifications')
                    .upsert(payload, { onConflict: 'user_id, method' })

                if (error) throw error
            }

            alert(`Instrutor cadastrado com sucesso e qualificações enviadas para aprovação!\n\nDados de Acesso Provisórios para o Portal:\nE-mail: ${prForm.email}\nSenha: ${passwordToSave}\n\nPor favor, copie e envie estas credenciais para o instrutor.`);
            setShowWizard(false)
            fetchInitialData()
        } catch (err) {
            console.error('Erro ao salvar no banco:', err)
            
            // Fallback Resiliente local
            const mockId = 'mock-new-qual-' + Date.now()
            const newMock = {
                id: mockId,
                user_id: 'mock-user-' + Date.now(),
                method: prForm.methods[0] || 'CD-CL',
                qualification_type: prForm.methodComprovations[prForm.methods[0]] || 'snqc',
                training_hours: parseInt(prForm.training_hours),
                training_date: prForm.training_date || new Date().toISOString().split('T')[0],
                status: 'pendente_aprovacao',
                valid_until: null,
                created_at: new Date().toISOString(),
                users: {
                    full_name: prForm.full_name,
                    email: prForm.email,
                    cpf: prForm.cpf,
                    phone: prForm.phone
                }
            }

            setQualifications(prev => [newMock, ...prev])
            setShowWizard(false)
            alert('Cadastro efetuado localmente em cache para testes!')
        } finally {
            setLoading(false)
        }
    }

    // Ações do Coordenador de Julgamento
    const handleApprove = async (qual) => {
        if (!confirm(`Aprovar a habilitação técnica no método ${qual.method} para o instrutor ${qual.users?.full_name}?`)) return
        setApprovalLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            
            // Validade = hoje + 36 meses conforme norma PR-127
            const validUntil = new Date()
            validUntil.setMonth(validUntil.getMonth() + 36)

            const { error } = await supabase
                .from('instructor_qualifications')
                .update({
                    status: 'ativo',
                    approved_by: user.id,
                    approved_at: new Date(),
                    valid_until: validUntil.toISOString().split('T')[0],
                    rejection_reason: null
                })
                .eq('id', qual.id)

            if (error) throw error

            alert('Habilitação técnica aprovada com sucesso! Validade estendida por 36 meses.')
            setShowApprovalModal(false)
            fetchInitialData()
        } catch (err) {
            console.error('Erro ao aprovar:', err)
            // Fallback local
            setQualifications(prev => prev.map(q => q.id === qual.id ? { 
                ...q, 
                status: 'ativo', 
                valid_until: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
            } : q))
            setShowApprovalModal(false)
            alert('Qualificação homologada localmente com validade de 36 meses!')
        } finally {
            setApprovalLoading(false)
        }
    }

    const handleReprove = async () => {
        if (!rejectionReason.trim()) {
            alert('O preenchimento do motivo de rejeição é obrigatório.')
            return
        }
        setApprovalLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('instructor_qualifications')
                .update({
                    status: 'reprovado',
                    approved_by: user.id,
                    rejection_reason: rejectionReason
                })
                .eq('id', selectedQualForApproval.id)

            if (error) throw error

            alert('Habilitação reprovada. O instrutor receberá o motivo.')
            setShowApprovalModal(false)
            setRejectionReason('')
            fetchInitialData()
        } catch (err) {
            console.error('Erro ao reprovar:', err)
            // Fallback local
            setQualifications(prev => prev.map(q => q.id === selectedQualForApproval.id ? { 
                ...q, 
                status: 'reprovado', 
                rejection_reason: rejectionReason 
            } : q))
            setShowApprovalModal(false)
            setRejectionReason('')
            alert('Qualificação reprovada localmente.')
        } finally {
            setApprovalLoading(false)
        }
    }

    const openApprovalModal = (qual) => {
        setSelectedQualForApproval(qual)
        setRejectionReason('')
        setShowApprovalModal(true)
    }

    const handleViewDocument = (base64) => {
        if (!base64) return alert('Nenhum documento anexado.')
        const newWindow = window.open();
        newWindow.document.write(`<iframe src="${base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position:fixed;" allowfullscreen></iframe>`);
    }

    const getQualStatusBadge = (status, dateStr) => {
        const colors = {
            pendente_aprovacao: { label: 'Aguardando Aprovação ⏳', bg: '#FEF3C7', color: '#B45309' },
            ativo: { label: 'Ativo ✅', bg: '#ECFDF5', color: '#047857' },
            reprovado: { label: 'Reprovado ❌', bg: '#FEF2F2', color: '#B91C1C' },
            vencido: { label: 'Vencido ⚠️', bg: '#FFF7ED', color: '#C2410C' }
        }

        let currentStatus = status || 'pendente_aprovacao'
        
        if (currentStatus === 'ativo' && dateStr) {
            const today = new Date()
            const expiry = new Date(dateStr)
            const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
            
            if (diffDays <= 0) {
                currentStatus = 'vencido'
            } else if (diffDays <= 30) {
                return (
                    <span style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                        Vence em {diffDays} dias ⚠️
                    </span>
                )
            }
        }

        const s = colors[currentStatus] || { label: currentStatus, bg: '#F1F5F9', color: '#475569' }
        return (
            <span style={{ backgroundColor: s.bg, color: s.color, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                {s.label}
            </span>
        )
    }

    // Filtragem na UI
    const filteredQualifications = qualifications.filter(q => {
        const matchesMethod = filterMethod === 'all' || q.method === filterMethod
        
        // Avaliar vencimento dinamicamente
        let statusEvaluated = q.status
        if (statusEvaluated === 'ativo' && q.valid_until) {
            const diff = new Date(q.valid_until) - new Date()
            if (diff <= 0) statusEvaluated = 'vencido'
        }

        const matchesStatus = filterStatus === 'all' || statusEvaluated === filterStatus
        return matchesMethod && matchesStatus
    })

    const isCoordenadorOrAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'coordenador'

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '4rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* CABEÇALHO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <GraduationCap color="var(--primary)" /> Instrutores Habilitados (Norma PR-127)
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                        Acompanhamento e credenciamento de profissionais END de acordo com o padrão da ABENDI.
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={fetchInitialData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="btn btn-primary" onClick={() => { setShowWizard(true); setWizardStep(1); }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Plus size={16} /> Novo Instrutor (PR-127)
                    </button>
                </div>
            </div>

            {/* FILTROS E CAPACIDADES */}
            <div className="card" style={{ 
                padding: '1.5rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: '12px', 
                backgroundColor: '#ffffff',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} color="var(--primary)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Método:</span>
                        <select 
                            value={filterMethod} 
                            onChange={(e) => setFilterMethod(e.target.value)}
                            style={{ padding: '0.4rem 1.5rem 0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                        >
                            <option value="all">Todos</option>
                            <option value="CD-CL">CD-CL (Líquido Penetrante)</option>
                            <option value="CD-MC">CD-MC (Medição de Espessura)</option>
                            <option value="CD-TO">CD-TO (Ultrassom Industrial)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={18} color="var(--primary)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Status:</span>
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '0.4rem 1.5rem 0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                        >
                            <option value="all">Todos</option>
                            <option value="ativo">Ativo</option>
                            <option value="pendente_aprovacao">Aguardando Aprovação</option>
                            <option value="reprovado">Reprovado</option>
                            <option value="vencido">Vencido</option>
                        </select>
                    </div>
                </div>

                {/* Painel Capacidades Máx 8 por método */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
                    <span style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '4px 10px', borderRadius: '6px', color: '#0369A1' }}>
                        CD-CL: {capacities['CD-CL']}/8 Habilitados
                    </span>
                    <span style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '4px 10px', borderRadius: '6px', color: '#0369A1' }}>
                        CD-MC: {capacities['CD-MC']}/8 Habilitados
                    </span>
                    <span style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '4px 10px', borderRadius: '6px', color: '#0369A1' }}>
                        CD-TO: {capacities['CD-TO']}/8 Habilitados
                    </span>
                </div>
            </div>

            {/* TABELA DE INSTRUTORES */}
            <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2.5px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>
                                <th style={{ padding: '1rem' }}>Nome Completo</th>
                                <th style={{ padding: '1rem' }}>Método END</th>
                                <th style={{ padding: '1rem' }}>Comprovação</th>
                                <th style={{ padding: '1rem' }}>Treinamento</th>
                                <th style={{ padding: '1rem' }}>Validade</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQualifications.map(qual => (
                                <tr key={qual.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                                    <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        {qual.users?.full_name}
                                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>{qual.users?.email}</span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '10px' }}>{qual.method}</span>
                                    </td>
                                    <td style={{ padding: '1rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '600' }}>
                                        {qual.qualification_type === 'snqc' ? 'Certificado SNQC' : 'Experiência (5 anos)'}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#475569' }}>
                                        {qual.training_hours}h em {new Date(qual.training_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '700' }}>
                                        {qual.valid_until ? new Date(qual.valid_until + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {getQualStatusBadge(qual.status, qual.valid_until)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        {qual.status === 'pendente_aprovacao' && isCoordenadorOrAdmin ? (
                                            <button 
                                                className="btn btn-primary" 
                                                style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: '700' }}
                                                onClick={() => openApprovalModal(qual)}
                                            >
                                                Julgar Assinatura
                                            </button>
                                        ) : (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                onClick={() => {
                                                    setSelectedQualForApproval(qual)
                                                    setShowApprovalModal(true)
                                                }}
                                            >
                                                <Eye size={14} /> Ficha Técnica
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredQualifications.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                        Nenhum registro de instrutor habilitado atende aos filtros de busca especificados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: ASSISTENTE COMPLETO PR-127 EM 5 ABAS */}
            {showWizard && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div className="card animate-slide-up" style={{ maxWidth: '650px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Award color="var(--primary)" /> Credenciamento Técnico PR-127 (Abendi)
                            </h3>
                            <button onClick={() => setShowWizard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Barra de Progresso do Assistente */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', backgroundColor: '#F1F5F9', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700' }}>
                            <span style={{ color: wizardStep === 1 ? 'var(--primary)' : '#64748B' }}>1. Pessoal</span>
                            <span style={{ color: wizardStep === 2 ? 'var(--primary)' : '#64748B' }}>2. Métodos</span>
                            <span style={{ color: wizardStep === 3 ? 'var(--primary)' : '#64748B' }}>3. Treinamento</span>
                            <span style={{ color: wizardStep === 4 ? 'var(--primary)' : '#64748B' }}>4. Uploads</span>
                            <span style={{ color: wizardStep === 5 ? 'var(--primary)' : '#64748B' }}>5. Envio</span>
                        </div>

                        {/* ABA 1: DADOS PESSOAIS */}
                        {wizardStep === 1 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Dados Pessoais & Escolaridade Exigida</h4>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Nome Completo *</label>
                                    <input type="text" required className="form-control" value={prForm.full_name} onChange={e => setPrForm({...prForm, full_name: e.target.value})} placeholder="Nome completo do instrutor" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>CPF *</label>
                                    <input type="text" required className="form-control" value={prForm.cpf} onChange={e => setPrForm({...prForm, cpf: e.target.value})} placeholder="000.000.000-00" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>E-mail corporativo *</label>
                                    <input type="email" required className="form-control" value={prForm.email} onChange={e => setPrForm({...prForm, email: e.target.value})} placeholder="email@cursocec.com.br" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Telefone *</label>
                                    <input type="text" required className="form-control" value={prForm.phone} onChange={e => setPrForm({...prForm, phone: e.target.value})} placeholder="(21) 90000-0000" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Nível de Escolaridade do Instrutor *</label>
                                    <select 
                                        className="form-control" 
                                        value={prForm.education_level}
                                        onChange={(e) => setPrForm({ ...prForm, education_level: e.target.value })}
                                        style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    >
                                        <option value="Ensino Fundamental">Ensino Fundamental (Inferior - Bloqueado)</option>
                                        <option value="Ensino Médio">Ensino Médio (Inferior - Bloqueado)</option>
                                        <option value="Técnico Nível Médio">Técnico Nível Médio (Exigência Abendi)</option>
                                        <option value="Superior Incompleto">Superior Incompleto</option>
                                        <option value="Superior Completo">Superior Completo</option>
                                        <option value="Pós-graduação">Pós-graduação</option>
                                    </select>
                                    {['Ensino Médio', 'Ensino Fundamental'].includes(prForm.education_level) && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--danger)', fontWeight: '600' }}>
                                            ⚠️ A habilitação técnica Abendi exige escolaridade mínima de Técnico Nível Médio. O cadastro ficará travado!
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ABA 2: MÉTODOS E COMPROVAÇÕES */}
                        {wizardStep === 2 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Método(s) Habilitado(s)</h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {['CD-CL', 'CD-MC', 'CD-TO'].map(method => {
                                        const isSelected = prForm.methods.includes(method)
                                        const countActive = capacities[method] || 0
                                        const isCapLimit = countActive >= 8

                                        return (
                                            <div key={method} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: isCapLimit ? '#FEF2F2' : '#FFFFFF' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', cursor: isCapLimit ? 'not-allowed' : 'pointer' }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            disabled={isCapLimit}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setPrForm({ ...prForm, methods: [...prForm.methods, method] })
                                                                } else {
                                                                    setPrForm({ 
                                                                        ...prForm, 
                                                                        methods: prForm.methods.filter(m => m !== method),
                                                                        methodComprovations: { ...prForm.methodComprovations, [method]: undefined }
                                                                    })
                                                                }
                                                            }}
                                                        />
                                                        <span>{method}</span>
                                                    </label>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isCapLimit ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                                        Ativos no ERP: {countActive}/8
                                                    </span>
                                                </div>

                                                {isCapLimit && (
                                                    <small style={{ color: 'var(--danger)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                                                        ⚠️ Limite máximo de 8 instrutores ativos atingido para este método no ERP.
                                                    </small>
                                                )}

                                                {isSelected && !isCapLimit && (
                                                    <div className="animate-slide-up" style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>Tipo de Comprovação Técnica *</span>
                                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                                            <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                                                 <input 
                                                                    type="radio" 
                                                                    name={`comprovacao_${method}`} 
                                                                    checked={prForm.methodComprovations[method] === 'snqc'}
                                                                    onChange={() => setPrForm({
                                                                        ...prForm,
                                                                        methodComprovations: { ...prForm.methodComprovations, [method]: 'snqc' }
                                                                    })}
                                                                />
                                                                <span>Certificado SNQC (2 anos ou menos)</span>
                                                            </label>
                                                            <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                                                <input 
                                                                    type="radio" 
                                                                    name={`comprovacao_${method}`} 
                                                                    checked={prForm.methodComprovations[method] === 'experience'}
                                                                    onChange={() => setPrForm({
                                                                        ...prForm,
                                                                        methodComprovations: { ...prForm.methodComprovations, [method]: 'experience' }
                                                                    })}
                                                                />
                                                                <span>Experiência Comprovada (mín. 5 anos)</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ABA 3: TREINAMENTO */}
                        {wizardStep === 3 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Treinamento Mínimo de 4h (Anexo A)</h4>
                                
                                <div className="form-group">
                                    <label className="form-label">Realizou treinamento mínimo de 4h (Anexo A)? *</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                name="training_abendi" 
                                                checked={prForm.training_abendi === 'Sim'}
                                                onChange={() => setPrForm({ ...prForm, training_abendi: 'Sim' })}
                                            />
                                            <span>Sim (Qualificado)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                name="training_abendi" 
                                                checked={prForm.training_abendi === 'Não'}
                                                onChange={() => setPrForm({ ...prForm, training_abendi: 'Não' })}
                                            />
                                            <span>Não (Inelegível)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Carga Horária do Treinamento (Horas) *</label>
                                    <input type="number" min="4" className="form-control" value={prForm.training_hours} onChange={e => setPrForm({...prForm, training_hours: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Data de Realização do Treinamento *</label>
                                    <input type="date" className="form-control" value={prForm.training_date} onChange={e => setPrForm({...prForm, training_date: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                            </div>
                        )}

                        {/* ABA 4: UPLOADS */}
                        {wizardStep === 4 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Anexar Documentos de Compliance</h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>RG ou CNH Anexo *</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.rg_url ? '✓ Atualizado' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange('rg_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>CPF Anexo *</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.cpf_url ? '✓ Atualizado' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange('cpf_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>Comprovante de Escolaridade (Diploma) *</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.diploma_url ? '✓ Atualizado' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange('diploma_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    {prForm.methods.some(m => prForm.methodComprovations[m] === 'snqc') && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', color: 'var(--primary)' }}>Certificado SNQC *</span>
                                            </div>
                                            <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                                {prForm.snqc_url ? '✓ Atualizado' : 'Selecionar Arquivo'}
                                                <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange('snqc_url', e.target.files[0])} />
                                            </label>
                                        </div>
                                    )}

                                    {prForm.methods.some(m => prForm.methodComprovations[m] === 'experience') && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', color: 'var(--primary)' }}>Comprovante de Experiência (5 anos) *</span>
                                            </div>
                                            <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                                {prForm.experience_url ? '✓ Atualizado' : 'Selecionar Arquivo'}
                                                <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange('experience_url', e.target.files[0])} />
                                            </label>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>Treinamento 4h Abendi Anexo *</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.training_url ? '✓ Atualizado' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange('training_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>Foto 3x4 do Instrutor *</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.photo_url ? '✓ Atualizado' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange('photo_url', e.target.files[0])} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ABA 5: ENVO */}
                        {wizardStep === 5 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Confirmar Cadastro de Instrutor</h4>
                                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                                    <span><strong>Nome completo:</strong> {prForm.full_name}</span>
                                    <span><strong>CPF:</strong> {prForm.cpf}</span>
                                    <span><strong>E-mail:</strong> {prForm.email}</span>
                                    <span><strong>Escolaridade:</strong> {prForm.education_level}</span>
                                    <span><strong>Treinamento Abendi:</strong> {prForm.training_hours}h em {prForm.training_date ? new Date(prForm.training_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', padding: '1rem', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.4', border: '1px solid #BFDBFE' }}>
                                    <Info size={20} style={{ flexShrink: 0 }} />
                                    <div>Ao cadastrar, o instrutor terá o status "Pendente de Aprovação" e a secretaria precisará validar os documentos em Base64 para ativação da homologação PR-127.</div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                disabled={wizardStep === 1}
                                onClick={() => setWizardStep(prev => prev - 1)}
                            >
                                Anterior
                            </button>
                            
                            {wizardStep < 5 ? (
                                <button type="button" className="btn btn-primary" onClick={handleNextStep}>
                                    Avançar
                                </button>
                            ) : (
                                <button type="button" className="btn btn-primary" onClick={handleSubmitWizard} disabled={loading}>
                                    {loading ? 'Salvando...' : 'Enviar para o Coordenador'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: JULGAMENTO DA APROVAÇÃO TÉCNICA */}
            {showApprovalModal && selectedQualForApproval && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                }}>
                    <div className="card animate-slide-up" style={{ maxWidth: '600px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Award color="var(--primary)" /> Revisão e Credenciamento PR-127
                            </h3>
                            <button onClick={() => setShowApprovalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
                            <div><strong>Instrutor:</strong> {selectedQualForApproval.users?.full_name}</div>
                            <div><strong>CPF:</strong> {selectedQualForApproval.users?.cpf}</div>
                            <div><strong>Método:</strong> <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '10px' }}>{selectedQualForApproval.method}</span></div>
                            <div><strong>Comprovação:</strong> {selectedQualForApproval.qualification_type === 'snqc' ? 'Certificado SNQC' : 'Experiência (5 anos)'}</div>
                            <div><strong>Treinamento 4h:</strong> Habilitado com carga horária de {selectedQualForApproval.training_hours}h em {new Date(selectedQualForApproval.training_date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>

                            {/* Pasta digital */}
                            <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <strong style={{ display: 'block', marginBottom: '0.75rem' }}>📂 Pasta Digital (Base64 no Navegador):</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.rg_url)}>
                                        <span>Documento Identidade (RG/CNH)</span> <Eye size={14} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.cpf_doc_url)}>
                                        <span>Documento CPF</span> <Eye size={14} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.diploma_url)}>
                                        <span>Diploma Escolar</span> <Eye size={14} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.training_url)}>
                                        <span>Comprovante de Treinamento Abendi</span> <Eye size={14} />
                                    </button>
                                    {selectedQualForApproval.snqc_url && (
                                        <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.snqc_url)}>
                                            <span>Certificado SNQC</span> <Eye size={14} />
                                        </button>
                                    )}
                                    {selectedQualForApproval.experience_url && (
                                        <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.experience_url)}>
                                            <span>Comprovante Experiência (5 anos)</span> <Eye size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedQualForApproval.status === 'reprovado' && (
                                <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B' }}>
                                    <strong>Motivo Reprovação Anterior:</strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>"{selectedQualForApproval.rejection_reason}"</p>
                                </div>
                            )}

                            {selectedQualForApproval.status === 'pendente_aprovacao' && (
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">Se reprovar, descreva o motivo *</label>
                                    <textarea 
                                        rows="2"
                                        className="form-control"
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        placeholder="Digite as pendências..."
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                <button type="button" onClick={() => setShowApprovalModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Voltar</button>
                                
                                {selectedQualForApproval.status === 'pendente_aprovacao' && (
                                    <>
                                        <button type="button" onClick={handleReprove} disabled={approvalLoading} className="btn btn-danger" style={{ flex: 1, backgroundColor: '#EF4444', color: '#fff' }}>
                                            Reprovar
                                        </button>
                                        <button type="button" onClick={() => handleApprove(selectedQualForApproval)} disabled={approvalLoading} className="btn btn-primary" style={{ flex: 1 }}>
                                            Aprovar Habilitação
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
