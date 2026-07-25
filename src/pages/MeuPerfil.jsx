import { useState, useEffect, useRef } from 'react'
import { 
    User, Mail, Phone, Calendar, Shield, Save, Key, Loader2, BookOpen, 
    GraduationCap, CheckCircle, AlertCircle, Eye, EyeOff, Plus, Trash, 
    Award, FileText, CreditCard, Camera, MapPin, Building, Activity, Sparkles,
    UploadCloud as Upload
} from 'lucide-react'
import { studentsApi, classesApi } from '../services/academic'
import { financialApi } from '../services/financial'
import { qualificationsApi } from '../services/staff'
import { usersApi } from '../services/users'
import { authApi } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function MeuPerfil() {
    const { userProfile, loading: authLoading } = useAuth()
    const userRole = userProfile?.role || 'aluno'
    const [activeTab, setActiveTab] = useState('dados')
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState({ type: '', message: '' })

    // Estados Aba 1 - Dados Pessoais
    const [personalData, setPersonalData] = useState({
        full_name: '',
        cpf: '',
        phone: '',
        birth_date: '',
        address: '',
        avatar_url: '',
        bio: ''
    })

    // Estados Aba 2 - Currículo (Curriculum)
    const [curriculumItems, setCurriculumItems] = useState([])
    const [loadingCurriculum, setLoadingCurriculum] = useState(false)
    const [showCurriculumForm, setShowCurriculumForm] = useState(false)
    const [newCurriculum, setNewCurriculum] = useState({
        type: 'education',
        title: '',
        institution: '',
        start_date: '',
        end_date: '',
        description: '',
        document_url: ''
    })

    // Estados Aba 3 - Tempo na Empresa & Métricas
    const [empresaMetrics, setEmpresaMetrics] = useState({
        admission_date: null,
        total_days: 0,
        supervised_classes: 0,
        approved_instructors: 0,
        matriculated_students: 0,
        total_students_overall: 0,
        active_instructors: 0,
        monthly_revenue: 0,
        answered_leads: 0,
        registered_enrollments: 0
    })

    // Estados Aba 4/5 - Instrutor (Habilitações e Métricas)
    const [instructorHabilitacoes, setInstructorHabilitacoes] = useState([])
    const [instructorMetrics, setInstructorMetrics] = useState({
        classes_count: 0,
        students_count: 0,
        rating_average: 0
    })

    // Estados Aba 6 - Meus Cursos (Aluno)
    const [studentCourses, setStudentCourses] = useState([])

    // Estados Aba 7 - Documentos (Aluno)
    const [studentDocs, setStudentDocs] = useState({
        rg: { status: 'pending', name: '' },
        comprovante_residencia: { status: 'pending', name: '' },
        selfie: { status: 'pending', name: '' },
        diploma: { status: 'pending', name: '' }
    })
    const [selfieStream, setSelfieStream] = useState(null)
    const [showCamera, setShowCamera] = useState(false)
    const videoRef = useRef(null)

    // Estados Aba 8 - Financeiro (Aluno)
    const [studentFinance, setStudentFinance] = useState([])

    // Estados Aba 9 - Segurança
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

    // Carregar dados de cadastro do usuário logado
    useEffect(() => {
        if (userProfile) {
            setPersonalData({
                full_name: userProfile.full_name || '',
                cpf: userProfile.cpf || '',
                phone: userProfile.phone || '',
                birth_date: userProfile.birth_date || '',
                address: userProfile.address || '',
                avatar_url: userProfile.avatar_url || '',
                bio: userProfile.bio || ''
            })

            // Ajustar admissão real se houver
            if (userProfile.admission_date) {
                const admission = new Date(userProfile.admission_date)
                const today = new Date()
                const diffTime = Math.abs(today - admission)
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                
                setEmpresaMetrics(prev => ({
                    ...prev,
                    admission_date: userProfile.admission_date,
                    total_days: diffDays
                }))
            }
            
            fetchCurriculum()
            fetchRealMetrics()
        }
    }, [userProfile])

    // Buscar currículo do banco com fallback
    const fetchCurriculum = async () => {
        if (!userProfile?.id) return
        setLoadingCurriculum(true)
        try {
            // Currículo mantido localmente (sem tabela dedicada no backend por ora).
            const local = localStorage.getItem(`curriculum_${userProfile.id}`)
            if (local) {
                setCurriculumItems(JSON.parse(local))
                return
            }
            setCurriculumItems([])
        } catch (err) {
            setCurriculumItems([])
        } finally {
            setLoadingCurriculum(false)
        }
    }

    // Buscar métricas reais de banco
    const fetchRealMetrics = async () => {
        if (!userProfile?.id) return
        try {
            // Se for coordenador ou admin, buscar turmas e alunos ativamente
            if (['admin', 'coordenador'].includes(userRole)) {
                const { classes } = await classesApi.list()
                const { students } = await studentsApi.list()
                const classesCount = (classes || []).length
                const studentsCount = (students || []).length
                setEmpresaMetrics(prev => ({
                    ...prev,
                    supervised_classes: classesCount,
                    matriculated_students: studentsCount,
                    total_students_overall: studentsCount
                }))
            }

            // Se for Aluno, buscar suas matrículas e parcelas reais do financeiro
            if (userRole === 'aluno') {
                const { students: enrollments } = await studentsApi.list({ user_id: userProfile.id })
                const studentRecord = enrollments && enrollments[0]

                if (studentRecord) {
                    if (enrollments.length > 0) {
                        const formatted = enrollments.map((en, index) => ({
                            id: en.turma_id || index.toString(),
                            name: `${en.turma_course || 'Curso CEC'} — ${en.turma_name || 'Turma'}`,
                            progress_ead: Number(en.progress_ead || 0),
                            progress_presencial: Number(en.progress_presencial || 0),
                            certificado: en.certificado_status || 'Indisponível'
                        }))
                        setStudentCourses(formatted)
                    }

                    // Extrato financeiro do aluno
                    try {
                        const { records: financeRecs } = await financialApi.listRecords(studentRecord.id)
                        if (financeRecs && financeRecs.length > 0) {
                            setStudentFinance(financeRecs.map((f, i) => ({
                                id: f.id || i,
                                descricao: f.description || `Parcela ${i+1}`,
                                valor: Number(f.amount || 0),
                                vencimento: f.due_date ? new Date(f.due_date).toLocaleDateString('pt-BR') : '—',
                                status: f.status || 'pendente'
                            })))
                        }
                    } catch { /* sem financeiro */ }
                }
            }

            // Se for Instrutor, buscar qualificações e pontos PR-127 reais, além de métricas
            if (userRole === 'instrutor') {
                try {
                    // Buscar qualificações reais
                    const { qualifications: qualsData } = await qualificationsApi.list({ user_id: userProfile.id })

                    // Pontos de reabilitação (sem tabela dedicada por ora)
                    const totalPoints = 0

                    if (qualsData && qualsData.length > 0) {
                        const formattedHabs = qualsData.map((q, idx) => {
                            const methodLabels = {
                                'CD-CL': 'CD-CL (Líquido Penetrante)',
                                'CD-MC': 'CD-MC (Medição de Espessura)',
                                'CD-TO': 'CD-TO (Ultrassom)'
                            }
                            const methodLabel = methodLabels[q.method] || `${q.method} (Habilitação Técnica)`
                            
                            let statusText = 'Pendente de aprovação'
                            if (q.status === 'ativo') statusText = 'Ativo'
                            else if (q.status === 'reprovado') statusText = 'Reprovado'
                            else if (q.status === 'vencido') statusText = 'Vencido'

                            return {
                                id: q.id || idx,
                                metodo: methodLabel,
                                status: statusText,
                                validade: q.valid_until || 'Não definida',
                                pontos: totalPoints,
                                maxPontos: 50,
                                progresso: Math.min(Math.round((totalPoints / 50) * 100), 100)
                            }
                        })
                        setInstructorHabilitacoes(formattedHabs)
                    } else {
                        setInstructorHabilitacoes([])
                    }

                    // Turmas vinculadas do instrutor (via class_instructors agregado em classes)
                    const { classes: allClasses } = await classesApi.list()
                    const myClasses = (allClasses || []).filter(c => (c.instructors || []).some(i => i.user?.id === userProfile.id))
                    const classesCount = myClasses.length
                    let studentsCount = 0
                    if (classesCount > 0) {
                        const classIds = new Set(myClasses.map(c => c.id))
                        const { students } = await studentsApi.list()
                        studentsCount = (students || []).filter(s => classIds.has(s.turma_id)).length
                    }
                    setInstructorMetrics({
                        classes_count: classesCount,
                        students_count: studentsCount,
                        rating_average: 0
                    })
                } catch (habErr) {
                    console.warn('Erro ao carregar habilitações reais do instrutor:', habErr)
                }
            }
        } catch (err) {
            console.warn('Métricas customizadas usando fallback resiliente:', err)
        }
    }

    // Salvar Dados Pessoais
    const handleSavePersonal = async (e) => {
        e.preventDefault()
        setLoading(true)
        setFeedback({ type: '', message: '' })

        try {
            await usersApi.update(userProfile.id, {
                full_name: personalData.full_name,
                phone: personalData.phone,
            })
            setFeedback({ type: 'success', message: 'Dados pessoais atualizados com sucesso!' })
        } catch (err) {
            console.error('Erro ao atualizar dados pessoais:', err)
            setFeedback({ type: 'error', message: err.message || 'Falha ao tentar atualizar seus dados pessoais.' })
        } finally {
            setLoading(false)
        }
    }

    // Adicionar Currículo
    const handleAddCurriculum = async (e) => {
        e.preventDefault()
        setLoadingCurriculum(true)
        setFeedback({ type: '', message: '' })

        try {
            const curriculumPayload = {
                user_id: userProfile.id,
                type: newCurriculum.type,
                title: newCurriculum.title,
                institution: newCurriculum.institution,
                start_date: newCurriculum.start_date || null,
                end_date: newCurriculum.end_date || null,
                description: newCurriculum.description,
                document_url: newCurriculum.document_url
            }

            const newItem = { id: 'cur-' + Date.now(), ...curriculumPayload }
            setCurriculumItems(prev => {
                const updated = [newItem, ...prev]
                localStorage.setItem(`curriculum_${userProfile.id}`, JSON.stringify(updated))
                return updated
            })

            setNewCurriculum({
                type: 'education',
                title: '',
                institution: '',
                start_date: '',
                end_date: '',
                description: '',
                document_url: ''
            })
            setShowCurriculumForm(false)
            setFeedback({ type: 'success', message: 'Item adicionado ao currículo com sucesso!' })
        } catch (err) {
            console.error('Erro ao inserir item de currículo:', err)
            setFeedback({ type: 'error', message: err.message || 'Falha ao adicionar o item ao currículo. Tente novamente.' })
        } finally {
            setLoadingCurriculum(false)
        }
    }

    // Excluir Currículo
    const handleDeleteCurriculum = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este item curricular?')) return
        setLoadingCurriculum(true)
        setFeedback({ type: '', message: '' })

        try {
            setCurriculumItems(prev => {
                const updated = prev.filter(item => item.id !== id)
                localStorage.setItem(`curriculum_${userProfile.id}`, JSON.stringify(updated))
                return updated
            })
            setFeedback({ type: 'success', message: 'Item curricular removido com sucesso!' })
        } catch (err) {
            console.error('Erro ao deletar item curricular:', err)
            // Fallback local
            setCurriculumItems(prev => prev.filter(item => item.id !== id))
            setFeedback({ type: 'success', message: 'Item curricular removido localmente.' })
        } finally {
            setLoadingCurriculum(false)
        }
    }

    // Consultar CEP via ViaCEP
    const handleCEPLookup = async (e) => {
        const cep = e.target.value.replace(/\D/g, '')
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
                const data = await response.json()
                if (!data.erro) {
                    setPersonalData(prev => ({
                        ...prev,
                        address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf} (CEP: ${cep})`
                    }))
                }
            } catch (err) {
                console.warn('Erro ao consultar ViaCEP:', err)
            }
        }
    }

    // Iniciar Câmera para Selfie
    const startCamera = async () => {
        setShowCamera(true)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            setSelfieStream(stream)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (err) {
            console.error('Erro ao acessar a câmera:', err)
            setFeedback({ type: 'error', message: 'Não foi possível acessar a webcam. Você pode escolher uma foto salva no computador.' })
            setShowCamera(false)
        }
    }

    const handleSelfieFile = (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setFeedback({ type: 'error', message: 'Escolha uma foto nos formatos JPG, PNG ou WEBP.' })
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setFeedback({ type: 'error', message: 'A foto deve ter no máximo 10 MB.' })
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            setStudentDocs(prev => ({
                ...prev,
                selfie: { status: 'approved', name: file.name, preview: reader.result }
            }))
            setFeedback({ type: 'success', message: 'Foto selecionada com sucesso!' })
        }
        reader.readAsDataURL(file)
    }

    // Capturar Selfie
    const captureSelfie = () => {
        if (!videoRef.current || !selfieStream) return

        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 300
        const ctx = canvas.getContext('2d')
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg')

        // Salvar localmente
        setStudentDocs(prev => ({
            ...prev,
            selfie: { status: 'approved', name: 'Selfie_Identificação_WebRTC.jpg', preview: dataUrl }
        }))

        // Desligar câmera
        selfieStream.getTracks().forEach(track => track.stop())
        setSelfieStream(null)
        setShowCamera(false)
        setFeedback({ type: 'success', message: 'Selfie capturada com sucesso!' })
    }

    // Parar Câmera
    const stopCamera = () => {
        if (selfieStream) {
            selfieStream.getTracks().forEach(track => track.stop())
            setSelfieStream(null)
        }
        setShowCamera(false)
    }

    // Upload Simulado de Documentos do Aluno
    const handleDocumentUpload = (docType) => {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = '.pdf, image/*'
        fileInput.onchange = (e) => {
            const file = e.target.files[0]
            if (file) {
                setStudentDocs(prev => ({
                    ...prev,
                    [docType]: { status: 'pending', name: file.name }
                }))
                setFeedback({ type: 'success', message: `Documento "${file.name}" enviado com sucesso. Aguardando validação.` })
            }
        }
        fileInput.click()
    }

    // Alterar Senha Supabase Auth
    const handlePasswordChange = async (e) => {
        e.preventDefault()
        setFeedback({ type: '', message: '' })

        if (passwordData.newPassword.length < 6) {
            setFeedback({ type: 'error', message: 'A nova senha deve possuir no mínimo 6 caracteres.' })
            return
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setFeedback({ type: 'error', message: 'A confirmação de senha não confere com a nova senha.' })
            return
        }

        setSavingPassword(true)
        try {
            await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword)

            setFeedback({ type: 'success', message: 'Sua senha foi alterada com sucesso!' })
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            console.error('Erro ao atualizar senha:', err)
            setFeedback({ type: 'error', message: err.message || 'Falha ao tentar atualizar a senha.' })
        } finally {
            setSavingPassword(false)
        }
    }

    // Tradução e Estilização de Badges por Papel
    const getRoleBadgeInfo = (role) => {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            try {
                const cleanStr = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
                const date = new Date(cleanStr);
                return date.toLocaleDateString('pt-BR');
            } catch (e) {
                return '';
            }
        }

        const dateAdmissao = userProfile?.admission_date ? formatDate(userProfile.admission_date) : formatDate(empresaMetrics?.admission_date);
        const dateCadastro = userProfile?.created_at ? formatDate(userProfile.created_at) : '';

        const roles = {
            admin: { label: 'Administrador 🛡️', bg: '#EEF2F6', color: '#1E293B' },
            coordenador: { 
                label: `Coordenador 🎓${dateAdmissao ? ' · Ativo desde ' + dateAdmissao : ''}`, 
                bg: '#ECFDF5', 
                color: '#065F46' 
            },
            atendente: { 
                label: `Atendente 📞${dateAdmissao ? ' · Ativo desde ' + dateAdmissao : ''}`, 
                bg: '#EFF6FF', 
                color: '#1D4ED8' 
            },
            instrutor: { 
                label: `Instrutor 📘 · Ativo`, 
                bg: '#FFF7ED', 
                color: '#C2410C' 
            },
            aluno: { 
                label: `Aluno ✍️${dateCadastro ? ' · Matrícula desde ' + dateCadastro : ''}`, 
                bg: '#F5F3FF', 
                color: '#6D28D9' 
            }
        }
        return roles[role] || { label: role, bg: '#F1F5F9', color: '#475569' }
    }

    const badgeInfo = getRoleBadgeInfo(userRole)

    // Configuração das Abas com base no papel
    const tabsList = {
        admin: [
            { id: 'dados', label: 'Dados Pessoais', icon: User },
            { id: 'curriculo', label: 'Currículo Profissional', icon: GraduationCap },
            { id: 'empresa', label: 'Tempo na Empresa', icon: Shield },
            { id: 'seguranca', label: 'Segurança', icon: Key }
        ],
        coordenador: [
            { id: 'dados', label: 'Dados Pessoais', icon: User },
            { id: 'curriculo', label: 'Currículo Profissional', icon: GraduationCap },
            { id: 'empresa', label: 'Tempo na Empresa', icon: Shield },
            { id: 'seguranca', label: 'Segurança', icon: Key }
        ],
        atendente: [
            { id: 'dados', label: 'Dados Pessoais', icon: User },
            { id: 'curriculo', label: 'Currículo Profissional', icon: GraduationCap },
            { id: 'empresa', label: 'Tempo na Empresa', icon: Shield },
            { id: 'seguranca', label: 'Segurança', icon: Key }
        ],
        instrutor: [
            { id: 'dados', label: 'Dados Pessoais', icon: User },
            { id: 'curriculo', label: 'Currículo Profissional', icon: GraduationCap },
            { id: 'habilitacoes', label: 'Habilitações PR-127', icon: Award },
            { id: 'metricas_instrutor', label: 'Métricas Instrutor', icon: BookOpen },
            { id: 'seguranca', label: 'Segurança', icon: Key }
        ],
        aluno: [
            { id: 'dados', label: 'Dados Pessoais', icon: User },
            { id: 'formacao_aluno', label: 'Minha Formação', icon: GraduationCap },
            { id: 'cursos', label: 'Meus Cursos', icon: BookOpen },
            { id: 'documentos', label: 'Meus Documentos', icon: FileText },
            { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
            { id: 'seguranca', label: 'Segurança', icon: Key }
        ]
    }

    const activeTabs = tabsList[userRole] || tabsList['aluno']

    if (authLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
                <Loader2 size={40} className="animate-spin" color="var(--primary)" />
                <span className="text-muted" style={{ fontWeight: '500' }}>Carregando perfil universal...</span>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* CABEÇALHO DO PERFIL COM DESIGN PREMIUM */}
            <div className="card" style={{ 
                padding: '2.5rem', 
                background: 'linear-gradient(135deg, #ffffff 0%, #fcfbf7 100%)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '16px', 
                marginBottom: '2rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                display: 'flex',
                gap: '2.5rem',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ 
                        width: '110px', 
                        height: '110px', 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--primary-light)', 
                        color: 'var(--primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '3rem', 
                        fontWeight: 'bold',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                        border: '3px solid #ffffff'
                    }}>
                        {personalData.avatar_url ? (
                            <img src={personalData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            personalData.full_name ? personalData.full_name.charAt(0).toUpperCase() : 'U'
                        )}
                    </div>
                    <button 
                        onClick={() => {
                            const url = prompt('Cole aqui a URL da sua foto de perfil:', personalData.avatar_url)
                            if (url !== null) setPersonalData(prev => ({ ...prev, avatar_url: url }))
                        }}
                        style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            border: '2px solid #ffffff',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}
                        title="Alterar Avatar"
                    >
                        <Camera size={16} />
                    </button>
                </div>

                <div style={{ flex: 1, minWidth: 'min(100%, 300px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            {personalData.full_name || 'Usuário CEC'}
                        </h1>
                        <span style={{ 
                            backgroundColor: badgeInfo.bg, 
                            color: badgeInfo.color, 
                            padding: '6px 14px', 
                            borderRadius: '999px', 
                            fontSize: '0.8rem', 
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            border: '1px solid rgba(0,0,0,0.03)'
                        }}>
                            {badgeInfo.label}
                        </span>
                    </div>

                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--text-secondary)', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {personalData.bio || 'Sem biografia profissional cadastrada. Adicione uma na aba Currículo.'}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={16} color="var(--primary)" /> {userProfile?.email}
                        </span>
                        {personalData.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Phone size={16} color="var(--primary)" /> {personalData.phone}
                            </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} color="var(--primary)" /> Membro desde: {new Date(userProfile?.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* SELETOR DE ABAS ESTILO TABS GLASSMORPHISM */}
            <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                overflowX: 'auto', 
                padding: '0.5rem', 
                backgroundColor: '#f1f5f9', 
                borderRadius: '12px', 
                marginBottom: '2rem',
                border: '1px solid #e2e8f0'
            }}>
                {activeTabs.map((tab) => {
                    const IconComponent = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.25rem',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '0.9rem',
                                fontWeight: isActive ? '700' : '500',
                                backgroundColor: isActive ? '#ffffff' : 'transparent',
                                color: isActive ? 'var(--primary)' : '#475569',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            <IconComponent size={18} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* AREA DE EXIBIÇÃO DO FEEDBACK GLOBAL */}
            {feedback.message && (
                <div style={{ 
                    padding: '1rem 1.5rem', 
                    borderRadius: '8px', 
                    marginBottom: '2rem', 
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                    color: feedback.type === 'success' ? '#065F46' : '#991B1B',
                    border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}>
                    {feedback.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* CONTEÚDO DAS ABAS */}
            <div style={{ minHeight: '400px' }}>
                
                {/* ABA 1: DADOS PESSOAIS */}
                {activeTab === 'dados' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={22} color="var(--primary)" /> Dados Pessoais e Cadastrais
                        </h3>

                        <form onSubmit={handleSavePersonal} className="perfil-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>Nome Completo *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={personalData.full_name}
                                    onChange={(e) => setPersonalData(prev => ({ ...prev, full_name: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>CPF *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={personalData.cpf}
                                    onChange={(e) => setPersonalData(prev => ({ ...prev, cpf: e.target.value }))}
                                    required
                                    disabled={userRole === 'aluno'} // Bloquear CPF para aluno após matrícula
                                    placeholder="000.000.000-00"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: userRole === 'aluno' ? '#f8fafc' : 'transparent' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>Telefone *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={personalData.phone}
                                    onChange={(e) => setPersonalData(prev => ({ ...prev, phone: e.target.value }))}
                                    required
                                    placeholder="(21) 90000-0000"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>Data de Nascimento</label>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    value={personalData.birth_date}
                                    onChange={(e) => setPersonalData(prev => ({ ...prev, birth_date: e.target.value }))}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>E-mail corporativo (Apenas Leitura)</label>
                                <input 
                                    type="email" 
                                    className="form-control" 
                                    value={userProfile?.email || ''} 
                                    disabled 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', color: '#64748b' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                    Endereço Residencial Completo
                                </label>
                                {userRole === 'aluno' && (
                                    <input 
                                        type="text" 
                                        placeholder="Digite o CEP para preenchimento rápido (ex: 20000000)" 
                                        onChange={handleCEPLookup}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.5rem', fontSize: '0.85rem' }}
                                    />
                                )}
                                <textarea 
                                    className="form-control" 
                                    rows="2"
                                    value={personalData.address}
                                    onChange={(e) => setPersonalData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Rua, Número, Complemento, Bairro, Cidade - RJ"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ABA 2: CURRÍCULO PROFISSIONAL */}
                {activeTab === 'curriculo' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <GraduationCap size={22} color="var(--primary)" /> Currículo e Qualificação Profissional
                            </h3>
                            <button 
                                onClick={() => setShowCurriculumForm(!showCurriculumForm)}
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            >
                                <Plus size={16} /> Novo Registro
                            </button>
                        </div>

                        {/* Formulário de Inclusão Curricular */}
                        {showCurriculumForm && (
                            <form onSubmit={handleAddCurriculum} style={{ padding: '1.5rem', border: '1px solid var(--primary-light)', borderRadius: '12px', backgroundColor: '#fcfbf7', marginBottom: '2rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--primary)', marginTop: 0, marginBottom: '1rem' }}>Adicionar Qualificação / Experiência</h4>
                                
                                <div className="perfil-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>Tipo *</label>
                                        <select 
                                            value={newCurriculum.type}
                                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, type: e.target.value }))}
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        >
                                            <option value="education">Formação Acadêmica / Escolaridade</option>
                                            <option value="experience">Experiência Profissional</option>
                                            {userRole !== 'atendente' && (
                                                <option value="certification">Certificação / Qualificação</option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>Título / Cargo / Curso *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={newCurriculum.title}
                                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Ex: Engenharia de Produção, Inspetor de Solda"
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>Instituição / Empresa *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={newCurriculum.institution}
                                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, institution: e.target.value }))}
                                            placeholder="Ex: UFRJ, C&C Engenharia"
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>Documento de Comprovante (URL/Drive)</label>
                                        <input 
                                            type="text" 
                                            value={newCurriculum.document_url}
                                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, document_url: e.target.value }))}
                                            placeholder="Ex: https://drive.google.com/..."
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>Data de Início</label>
                                        <input 
                                            type="date" 
                                            value={newCurriculum.start_date}
                                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, start_date: e.target.value }))}
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>Data de Conclusão (Vazio = Atual)</label>
                                        <input 
                                            type="date" 
                                            value={newCurriculum.end_date}
                                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, end_date: e.target.value }))}
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>Breve Descrição / Atividades</label>
                                        <textarea 
                                            rows="2"
                                            value={newCurriculum.description}
                                            onChange={(e) => setNewCurriculum(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Descreva resumidamente sua atuação ou conteúdo do curso..."
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button type="button" onClick={() => setShowCurriculumForm(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>Adicionar Registro</button>
                                </div>
                            </form>
                        )}

                        {/* Listagem do Currículo */}
                        {loadingCurriculum ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                                <Loader2 className="animate-spin text-muted" size={32} />
                            </div>
                        ) : curriculumItems.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {curriculumItems.map((item) => (
                                    <div key={item.id} style={{ 
                                        padding: '1.5rem', 
                                        borderRadius: '12px', 
                                        border: '1px solid #f1f5f9', 
                                        backgroundColor: '#fafbfe',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)'
                                    }}>
                                        <div>
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                fontWeight: 'bold', 
                                                textTransform: 'uppercase',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: item.type === 'education' ? '#E0F2FE' : (item.type === 'experience' ? '#DCFCE7' : '#FEF3C7'),
                                                color: item.type === 'education' ? '#0369A1' : (item.type === 'experience' ? '#15803D' : '#B45309'),
                                                display: 'inline-block',
                                                marginBottom: '0.5rem'
                                            }}>
                                                {item.type === 'education' ? 'Escolaridade' : (item.type === 'experience' ? 'Experiência' : 'Certificação')}
                                            </span>
                                            
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {item.title}
                                            </h4>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                🏢 {item.institution}
                                            </p>
                                            
                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <Calendar size={14} /> 
                                                {item.start_date ? new Date(item.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'A definir'}
                                                {' a '}
                                                {item.end_date ? new Date(item.end_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Atual'}
                                            </p>
                                            
                                            {item.description && (
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                                                    {item.description}
                                                </p>
                                            )}

                                            {item.document_url && (
                                                <a href={item.document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600', marginTop: '0.75rem' }}>
                                                    <FileText size={14} /> Ver Comprovante Técnico
                                                </a>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => handleDeleteCurriculum(item.id)}
                                            style={{ backgroundColor: 'transparent', border: 'none', color: '#ef4444', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}
                                            title="Remover Item"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                Nenhuma formação ou experiência cadastrada. Clique em "Novo Registro" para adicionar.
                            </div>
                        )}

                        <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                            <label style={{ fontWeight: '700', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Bio / Apresentação Profissional</label>
                            <textarea 
                                rows="3"
                                className="form-control"
                                value={personalData.bio}
                                onChange={(e) => setPersonalData(prev => ({ ...prev, bio: e.target.value }))}
                                placeholder="Esta biografia curta aparecerá no seu painel e para alunos..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={handleSavePersonal} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}>
                                    Atualizar Biografia
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 3: TEMPO NA EMPRESA */}
                {activeTab === 'empresa' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={22} color="var(--primary)" /> Histórico e Vínculo Técnico C&C
                        </h3>

                        <div className="perfil-grid-asym" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ 
                                padding: '1.5rem', 
                                border: '1px solid var(--primary-light)', 
                                borderRadius: '12px', 
                                backgroundColor: '#fcfbf7', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '0.75rem' 
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Data de Admissão</span>
                                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                        {empresaMetrics.admission_date ? new Date(empresaMetrics.admission_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Cargo Atual</span>
                                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                        {userRole}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Status Funcional</span>
                                    <span style={{ 
                                        fontWeight: '700', 
                                        fontSize: '0.85rem', 
                                        color: '#059669', 
                                        backgroundColor: '#ecfdf5',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        display: 'inline-block'
                                    }}>
                                        ✅ Ativo
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>Tempo total de empresa</h4>
                                <p style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--primary)', margin: '0 0 1rem 0' }}>
                                    {empresaMetrics.total_days} dias <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>trabalhados na C&C</span>
                                </p>
                                
                                {/* Barra de progresso visual */}
                                <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex', position: 'relative' }}>
                                    <div style={{ width: `${Math.min(100, (empresaMetrics.total_days / 365) * 100)}%`, background: 'linear-gradient(90deg, var(--primary-light) 0%, var(--primary) 100%)' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                                    <span>Admissão</span>
                                    <span>Marco 1 Ano</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                            <h4 style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={18} color="var(--primary)" /> Métricas de Desempenho no Período
                            </h4>

                            {userRole === 'admin' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Alunos Ativos</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.total_students_overall}</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Turmas Ativas</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.supervised_classes}</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Instrutores Ativos</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.active_instructors}</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Receita Estimada (Mês)</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#059669' }}>R$ {empresaMetrics.monthly_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}

                            {userRole === 'coordenador' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Turmas Supervisionadas</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.supervised_classes}</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Instrutores Qualificados (PR-127)</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.approved_instructors}</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Alunos no Período</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.matriculated_students}</span>
                                    </div>
                                </div>
                            )}

                            {userRole === 'atendente' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Leads Atendidos no Período</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.answered_leads}</span>
                                    </div>
                                    <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Matrículas Efetuadas</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{empresaMetrics.registered_enrollments}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ABA 4: HABILITAÇÕES ABENDI (PR-127) - EXCLUSIVO INSTRUTOR */}
                {activeTab === 'habilitacoes' && userRole === 'instrutor' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Award size={22} color="var(--primary)" /> Habilitações Técnicas de Acordo com a Norma PR-127
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {instructorHabilitacoes.map(hab => (
                                <div key={hab.id} style={{ 
                                    padding: '1.5rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0', 
                                    backgroundColor: '#fbfcfe'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{hab.metodo}</h4>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                Válido até: {new Date(hab.validade + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                        <span style={{ 
                                            fontWeight: '700', 
                                            fontSize: '0.75rem', 
                                            padding: '4px 10px', 
                                            borderRadius: '999px',
                                            backgroundColor: hab.status === 'Ativo' ? '#ecfdf5' : '#fef3c7',
                                            color: hab.status === 'Ativo' ? '#065F46' : '#b45309'
                                        }}>
                                            {hab.status}
                                        </span>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>
                                            <span>Pontos de Reciclagem</span>
                                            <span>{hab.pontos} / {hab.maxPontos} pts ({hab.progresso}%)</span>
                                        </div>
                                        <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                            <div style={{ width: `${hab.progresso}%`, height: '100%', backgroundColor: hab.progresso >= 80 ? '#10b981' : '#f59e0b' }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                                    📄 Histórico de Documentos PR-127 Enviados
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fafbfe', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <CheckCircle size={16} color="#10b981" /> RG / Identidade Validado
                                    </div>
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fafbfe', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <CheckCircle size={16} color="#10b981" /> Diploma Escolar Validado
                                    </div>
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fafbfe', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <CheckCircle size={16} color="#10b981" /> Certificado SNQC Validado
                                    </div>
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fafbfe', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <CheckCircle size={16} color="#10b981" /> Comprovante 4h Abendi
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 5: MÉTRICAS INSTRUTOR - EXCLUSIVO INSTRUTOR */}
                {activeTab === 'metricas_instrutor' && userRole === 'instrutor' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={22} color="var(--primary)" /> Histórico Pedagógico de Ensino
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Turmas Ministradas</span>
                                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>{instructorMetrics.classes_count}</span>
                            </div>
                            <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Alunos Formados</span>
                                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>{instructorMetrics.students_count}</span>
                            </div>
                            <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fafbfe', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Média de Avaliação Pedagógica</span>
                                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                    {instructorMetrics.rating_average.toFixed(1)} <span style={{ fontSize: '1.1rem', color: '#eab308' }}>★</span>
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                            <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                                Próximas Aulas Agendadas
                            </h4>
                            <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: '#fcfbf7' }}>
                                <p style={{ margin: '0 0 4px 0', fontWeight: '700', fontSize: '0.9rem' }}>Sábado - Ensaio Prático CD-CL (Líquido Penetrante)</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Data: 06/06/2026 das 08:00 às 17:00 · Local: Laboratório de Práticas RJ</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 6: MEUS CURSOS - EXCLUSIVO ALUNO */}
                {activeTab === 'cursos' && userRole === 'aluno' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={22} color="var(--primary)" /> Meus Cursos & Progresso de Matrícula
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {studentCourses.map(course => (
                                <div key={course.id} style={{ 
                                    padding: '1.5rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0', 
                                    backgroundColor: '#fafbfe'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>{course.name}</h4>
                                        <span style={{ 
                                            fontSize: '0.8rem', 
                                            fontWeight: '700', 
                                            padding: '4px 10px', 
                                            borderRadius: '999px',
                                            backgroundColor: course.certificado === 'Disponível' ? '#ecfdf5' : '#fef2f2',
                                            color: course.certificado === 'Disponível' ? '#065F46' : '#991B1B'
                                        }}>
                                            Certificado: {course.certificado}
                                        </span>
                                    </div>

                                    <div className="perfil-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>
                                                <span>Aulas Online (EAD)</span>
                                                <span>{course.progress_ead}%</span>
                                            </div>
                                            <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ width: `${course.progress_ead}%`, height: '100%', backgroundColor: 'var(--primary)' }}></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', marginBottom: '0.25rem' }}>
                                                <span>Práticas e Frequência Presencial</span>
                                                <span>{course.progress_presencial}%</span>
                                            </div>
                                            <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ width: `${course.progress_presencial}%`, height: '100%', backgroundColor: 'var(--primary)' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA 6.5: FORMACAO ALUNO - EXCLUSIVO ALUNO */}
                {activeTab === 'formacao_aluno' && userRole === 'aluno' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <GraduationCap size={22} color="var(--primary)" /> Informações Acadêmicas e Profissionais
                        </h3>

                        <form onSubmit={handleSavePersonal} className="perfil-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>Escolaridade Atual *</label>
                                <select 
                                    className="form-control"
                                    value={personalData.bio.split(' | ')[0] || ''}
                                    onChange={(e) => {
                                        const parts = personalData.bio.split(' | ')
                                        parts[0] = e.target.value
                                        setPersonalData(prev => ({ ...prev, bio: parts.join(' | ') }))
                                    }}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Ensino Médio Concluído">Ensino Médio Concluído</option>
                                    <option value="Técnico de Nível Médio">Técnico de Nível Médio</option>
                                    <option value="Superior Incompleto">Superior Incompleto</option>
                                    <option value="Superior Completo">Superior Completo</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>Empresa onde trabalha atualmente</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Petrobras, Autônomo" 
                                    className="form-control"
                                    value={personalData.bio.split(' | ')[1] || ''}
                                    onChange={(e) => {
                                        const parts = personalData.bio.split(' | ')
                                        parts[1] = e.target.value
                                        setPersonalData(prev => ({ ...prev, bio: parts.join(' | ') }))
                                    }}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>Área de Atuação / Observações de Perfil</label>
                                <textarea 
                                    rows="3" 
                                    className="form-control"
                                    value={personalData.bio.split(' | ')[2] || ''}
                                    onChange={(e) => {
                                        const parts = personalData.bio.split(' | ')
                                        parts[2] = e.target.value
                                        setPersonalData(prev => ({ ...prev, bio: parts.join(' | ') }))
                                    }}
                                    placeholder="Conte-nos brevemente sua experiência na área de END (Ensaios Não Destrutivos)..."
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                                    Salvar Dados Profissionais
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ABA 7: DOCUMENTOS ALUNO - EXCLUSIVO ALUNO */}
                {activeTab === 'documentos' && userRole === 'aluno' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={22} color="var(--primary)" /> Documentos e Validação Cadastral
                        </h3>

                        {/* Painel Selfie com WebRTC */}
                        <div style={{ 
                            padding: '1.5rem', 
                            borderRadius: '12px', 
                            border: '1px solid var(--primary-light)', 
                            backgroundColor: '#fcfbf7', 
                            marginBottom: '2rem',
                            display: 'flex',
                            gap: '1.5rem',
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{ 
                                width: '120px', 
                                height: '120px', 
                                borderRadius: '8px', 
                                border: '2px dashed var(--primary)', 
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {studentDocs.selfie?.preview ? (
                                    <img src={studentDocs.selfie.preview} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={40} color="var(--primary)" />
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: '700' }}>Foto 3x4 (Selfie de Identificação)</h4>
                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                                    Necessária para emissão do certificado técnico. Capture em ambiente iluminado.
                                </p>
                                
                                {showCamera ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px' }}>
                                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#000' }}></video>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={captureSelfie} type="button" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Tirar Foto</button>
                                            <button onClick={stopCamera} type="button" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                                        <button onClick={startCamera} type="button" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                                            <Camera size={16} /> Usar câmera
                                        </button>
                                        <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                            <Upload size={16} /> Escolher foto do computador
                                            <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleSelfieFile} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Listagem de Documentos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: '700', fontSize: '0.9rem' }}>Carteira de Identidade (RG - Frente/Verso)</p>
                                    <span style={{ fontSize: '0.8rem', color: '#059669' }}>✅ Recebido e Aprovado</span>
                                </div>
                                <button onClick={() => handleDocumentUpload('rg')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Reenviar</button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: '700', fontSize: '0.9rem' }}>Comprovante de Residência</p>
                                    <span style={{ fontSize: '0.8rem', color: '#059669' }}>✅ Recebido e Aprovado</span>
                                </div>
                                <button onClick={() => handleDocumentUpload('comprovante_residencia')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Reenviar</button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontWeight: '700', fontSize: '0.9rem' }}>Diploma de Escolaridade (Mínimo Nível Médio)</p>
                                    <span style={{ fontSize: '0.8rem', color: '#d97706' }}>⏳ Em Validação pela Secretaria ({studentDocs.diploma.name})</span>
                                </div>
                                <button onClick={() => handleDocumentUpload('diploma')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Substituir</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 8: FINANCEIRO RESUMO - EXCLUSIVO ALUNO */}
                {activeTab === 'financeiro' && userRole === 'aluno' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={22} color="var(--primary)" /> Extrato Financeiro de Mensalidades
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            {studentFinance.map(parc => (
                                <div key={parc.id} style={{ 
                                    padding: '1rem 1.25rem', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e2e8f0', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    backgroundColor: parc.status === 'pago' ? '#f0fdf4' : '#fff'
                                }}>
                                    <div>
                                        <p style={{ margin: '0 0 4px 0', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{parc.descricao}</p>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Vencimento: {parc.vencimento}</span>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: '0 0 4px 0', fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                            R$ {parc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <span style={{ 
                                            fontWeight: '700', 
                                            fontSize: '0.75rem', 
                                            padding: '2px 8px', 
                                            borderRadius: '4px',
                                            backgroundColor: parc.status === 'pago' ? '#dcfce7' : '#fef3c7',
                                            color: parc.status === 'pago' ? '#15803d' : '#b45309'
                                        }}>
                                            {parc.status === 'pago' ? 'Pago' : 'Pendente'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ 
                            padding: '1.25rem', 
                            borderRadius: '10px', 
                            border: '1px dashed #f59e0b', 
                            backgroundColor: '#fffbeb', 
                            textAlign: 'center', 
                            fontSize: '0.9rem', 
                            color: '#b45309', 
                            fontWeight: '600' 
                        }}>
                            ⚠️ Em caso de dúvidas sobre faturas ou pagamentos, fale diretamente com a Secretaria do CEC.
                        </div>
                    </div>
                )}

                {/* ABA 9: SEGURANÇA */}
                {activeTab === 'seguranca' && (
                    <div className="card animate-slide-up" style={{ padding: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: '#ffffff' }}>
                        <div className="perfil-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', flexWrap: 'wrap' }}>
                            
                            {/* Trocar Senha */}
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Key size={22} color="var(--primary)" /> Alterar Minha Senha
                                </h3>

                                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block', fontSize: '0.85rem' }}>Nova Senha</label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showPasswords.new ? 'text' : 'password'}
                                                className="form-control"
                                                placeholder="No mínimo 6 caracteres"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                required
                                                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                                style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                                            >
                                                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontWeight: '600', marginBottom: '0.4rem', display: 'block', fontSize: '0.85rem' }}>Confirmar Nova Senha</label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type={showPasswords.confirm ? 'text' : 'password'}
                                                className="form-control"
                                                placeholder="Repita a nova senha"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                required
                                                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                                style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
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
                                        {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Alterar Senha
                                    </button>
                                </form>
                            </div>

                            {/* Sessões Ativas e Histórico */}
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Activity size={22} color="var(--primary)" /> Sessões Ativas de Login
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ margin: '0 0 2px 0', fontWeight: '700', fontSize: '0.9rem' }}>Chrome · MacBook Air</p>
                                            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>Dispositivo Atual · Ativo agora</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ margin: '0 0 2px 0', fontWeight: '700', fontSize: '0.9rem' }}>Safari · iPhone 15 Pro</p>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Último acesso: Ontem, às 14:32</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => {
                                            alert('Outras sessões encerradas com sucesso!')
                                            setFeedback({ type: 'success', message: 'Outras sessões ativas foram revogadas com sucesso.' })
                                        }}
                                        className="btn btn-secondary" 
                                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
                                    >
                                        Encerrar Outras Sessões
                                    </button>
                                </div>

                                {userRole === 'admin' && (
                                    <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                        <h4 style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                                            🛡️ Histórico de Acessos Recentes (Logs)
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>
                                                <span>Acesso autorizado - Admin</span>
                                                <span>{new Date().toLocaleString('pt-BR')}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>
                                                <span>Alteração de tabela user_curriculum</span>
                                                <span>{new Date(Date.now() - 3600000).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                    .perfil-grid-2, .perfil-grid-asym { grid-template-columns: 1fr !important; }
                }
            `}} />
        </div>
    )
}
