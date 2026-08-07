import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usersApi } from '../services/users'
import { staffApi, qualificationsApi } from '../services/staff'
import { useAuth } from '../contexts/AuthContext'
import { 
  Users, Shield, Plus, RefreshCw, Trash2, 
  UserX, UserCheck2, Lock, Edit3, DollarSign, 
  GraduationCap, MessageSquare, FileText, Check, Loader2, Key, Info, X, ShieldAlert, Award, FileCheck, CheckCircle, AlertTriangle, AlertCircle, Eye
} from 'lucide-react'

export default function Equipe() {
    const { session, userProfile } = useAuth()
    const [staffList, setStaffList] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState('colaboradores') // colaboradores | pr127
    const [showModal, setShowModal] = useState(false)
    const [editingStaffId, setEditingStaffId] = useState(null)
    const [filterAccess, setFilterAccess] = useState('all') // all | with | without | active | inactive
    
    // Dados da Habilitação PR-127
    const [qualifications, setQualifications] = useState([])
    const [showQualifyWizard, setShowQualifyWizard] = useState(false)
    const [wizardStep, setWizardStep] = useState(1)
    const [selectedInstructorForQualify, setSelectedInstructorForQualify] = useState(null)
    const [loadingQualifyCapacities, setLoadingQualifyCapacities] = useState(false)
    const [capacities, setCapacities] = useState({ 'CD-MC': 0, 'CD-CL': 0, 'CD-TO': 0 })
    
    // Formulário do Assistente PR-127 em 5 Abas
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

    // Estado do Modal de Julgamento do Coordenador
    const [showApprovalModal, setShowApprovalModal] = useState(false)
    const [selectedQualForApproval, setSelectedQualForApproval] = useState(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [approvalLoading, setApprovalLoading] = useState(false)

    // Formulário de Equipe (staff)
    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        role: 'atendente',
        email: '',
        phone: '',
        admission_date: '',
        salary: '',
        has_platform_access: true,
        password: '', // Senha provisória para quem tem acesso
        is_active: true,
        permissions: {
            access_dashboard: true,
            access_alunos: false,
            access_matriculas: false,
            access_leads: false,
            access_turmas: false,
            access_cursos: false,
            access_financeiro: false,
            access_relatorios: false,
            access_instrutores: false,
            access_certificados: false,
            access_auditoria: false,
            access_ouvidoria: false,
            access_equipe: false,
            access_lms: false,
            access_comunicados: false,
            access_config: false,
            access_config_asaas: false
        }
    })
    
    const [errorMsg, setErrorMsg] = useState('')
    const [currentUser, setCurrentUser] = useState(null)
    const [currentUserProfile, setCurrentUserProfile] = useState(null)

    const isDeveloperAccount = (u) => {
        if (!u) return false
        const email = u.email?.toLowerCase() || ''
        return email === 'piticalyn@cec.com.br'
    }

    const fetchStaff = async () => {
        setLoading(true)
        setErrorMsg('')
        try {
            setCurrentUser(session?.user || null)
            setCurrentUserProfile(userProfile || null)

            // 1. Usuários administrativos (não-alunos)
            let usersData = []
            try {
                const res = await usersApi.list(['admin', 'coordenador', 'atendente', 'instrutor', 'webdesigner', 'financeiro', 'administrativo'])
                usersData = res.users || []
            } catch (e) { console.warn('Erro ao carregar usuários:', e.message) }

            // 2. Tabela staff
            let staffData = []
            try {
                staffData = (await staffApi.list()).staff || []
            } catch (staffErr) {
                console.warn('Erro ao ler tabela staff:', staffErr.message)
            }

            // 3. Qualificações PR-127
            let qualData = []
            try {
                qualData = (await qualificationsApi.list()).qualifications || []
            } catch (qualErr) {
                console.warn('Erro ao carregar qualificações:', qualErr.message)
            }
            setQualifications(qualData)

            // 4. Mesclar as listas de colaboradores
            const mergedList = []
            const addedUserIds = new Set()
            
            // Adiciona todos os registros do staffData
            staffData.forEach(s => {
                mergedList.push({
                    id: s.id,
                    user_id: s.user_id,
                    name: s.name,
                    cpf: s.cpf || '—',
                    role: s.role,
                    email: s.email,
                    phone: s.phone || '—',
                    admission_date: s.admission_date || '',
                    salary: s.salary || 0,
                    has_platform_access: s.has_platform_access,
                    is_active: s.is_active,
                    permissions: s.users?.permissions || s.permissions || null
                })
                if (s.user_id) {
                    addedUserIds.add(s.user_id)
                }
            })

            // Para cada usuário do usersData que possui cargo administrativo e NÃO está na tabela staff, adiciona na lista
            if (usersData && usersData.length > 0) {
                usersData.forEach(u => {
                    if (!addedUserIds.has(u.id)) {
                        mergedList.push({
                            id: u.id, // Usamos o próprio id do user como id temporário do staff
                            user_id: u.id,
                            name: u.full_name,
                            cpf: u.cpf || '—',
                            role: u.role,
                            email: u.email,
                            phone: u.phone || '—',
                            admission_date: u.admission_date || '',
                            salary: u.role === 'admin' ? 8500.00 : (u.role === 'coordenador' ? 4500.00 : 2500.00),
                            has_platform_access: true,
                            is_active: u.is_active !== false,
                            permissions: u.permissions || null
                        })
                        addedUserIds.add(u.id)
                    }
                })
            }

            // Para cada qualificação de instrutor, se o instrutor (user_id) NÃO está na lista, adiciona-o como colaborador
            if (qualData && qualData.length > 0) {
                qualData.forEach(q => {
                    const instUser = q.users
                    const userId = q.user_id
                    if (userId && !addedUserIds.has(userId) && instUser) {
                        mergedList.push({
                            id: userId,
                            user_id: userId,
                            name: instUser.full_name,
                            cpf: instUser.cpf || '—',
                            role: 'instrutor',
                            email: instUser.email,
                            phone: instUser.phone || '—',
                            admission_date: '',
                            salary: 2500.00,
                            has_platform_access: true,
                            is_active: true,
                            permissions: { has_erp_access: true }
                        })
                        addedUserIds.add(userId)
                    }
                })
            }

            setStaffList(mergedList)
        } catch (err) {
            console.warn('Erro geral ao carregar colaboradores:', err)
            setStaffList([])
        }
        setLoading(false)
    }

    const fetchCapacities = async () => {
        setLoadingQualifyCapacities(true)
        try {
            const { qualifications } = await qualificationsApi.list({ status: 'ativo' })

            const counts = { 'CD-MC': 0, 'CD-CL': 0, 'CD-TO': 0 }
            ;(qualifications || []).forEach(item => {
                if (counts[item.method] !== undefined) {
                    counts[item.method]++
                }
            })
            setCapacities(counts)
        } catch (err) {
            console.error('Erro ao buscar capacidades dos métodos:', err)
        } finally {
            setLoadingQualifyCapacities(false)
        }
    }

    useEffect(() => {
        fetchStaff()
    }, [])

    useEffect(() => {
        if (activeSection === 'pr127') {
            fetchCapacities()
        }
    }, [activeSection])

    // Função de carregar dados para edição
    const handleEditStaff = (staff) => {
        setEditingStaffId(staff.id)
        
        const userPermissions = staff.users?.permissions || staff.permissions || {
            access_dashboard: true,
            access_alunos: false,
            access_matriculas: false,
            access_leads: false,
            access_turmas: false,
            access_cursos: false,
            access_financeiro: false,
            access_relatorios: false,
            access_instrutores: false,
            access_certificados: false,
            access_auditoria: false,
            access_ouvidoria: false,
            access_equipe: false,
            access_lms: false,
            access_comunicados: false,
            access_config: false,
            access_config_asaas: false
        }

        setFormData({
            name: staff.name || '',
            cpf: staff.cpf || '',
            role: staff.role || 'atendente',
            email: staff.email || '',
            phone: staff.phone || '',
            admission_date: staff.admission_date || '',
            salary: staff.salary || '',
            has_platform_access: staff.has_platform_access ?? true,
            password: '', // Deixa em branco para edição (não mexe na senha na edição)
            is_active: staff.is_active ?? true,
            permissions: userPermissions
        })
        setShowModal(true)
    }

    // Criar / Editar Colaborador (Membro da Equipe)
    const handleCreateStaff = async (e) => {
        e.preventDefault()
        setErrorMsg('')
        setLoading(true)

        try {
            if (editingStaffId) {
                // MODO EDIÇÃO / ATUALIZAÇÃO
                const isMock = editingStaffId.toString().startsWith('mock-')
                const targetStaff = staffList.find(s => s.id === editingStaffId)

                const staffPayload = {
                    name: formData.name,
                    cpf: formData.cpf,
                    role: formData.role,
                    email: formData.email || null,
                    phone: formData.phone || null,
                    admission_date: formData.admission_date || null,
                    salary: formData.salary ? parseFloat(formData.salary) : null,
                    has_platform_access: formData.has_platform_access,
                    user_id: targetStaff?.user_id || null
                }

                if (!isMock) {
                    // 1. Atualizar/criar na tabela staff
                    try {
                        const isRealStaffRow = targetStaff && targetStaff.id !== targetStaff.user_id
                        if (isRealStaffRow) {
                            await staffApi.update(targetStaff.id, staffPayload)
                        } else {
                            await staffApi.create(staffPayload)
                        }
                    } catch (staffUpdateError) {
                        console.warn('Erro ao atualizar staff:', staffUpdateError.message)
                    }

                    // 2. Se possuir user_id, atualizar o usuário vinculado
                    if (targetStaff && targetStaff.user_id) {
                        try {
                            await usersApi.update(targetStaff.user_id, {
                                full_name: formData.name,
                                role: formData.role,
                                cpf: formData.cpf,
                                phone: formData.phone,
                                permissions: { has_erp_access: true, ...formData.permissions }
                            })
                        } catch (dbUserError) { console.warn('Erro ao atualizar usuário:', dbUserError.message) }
                    }
                }

                alert('Colaborador atualizado com sucesso!')
                setShowModal(false)
                resetForm()
                fetchStaff()
            } else {
                // MODO CRIAÇÃO
                let createdUserId = null

                // Tipo A: Com acesso à plataforma (cria o usuário via API)
                if (formData.has_platform_access) {
                    if (!formData.email || !formData.password) {
                        throw new Error('E-mail de acesso e senha são obrigatórios para colaboradores com acesso à plataforma.')
                    }
                    try {
                        const { user } = await usersApi.create({
                            email: formData.email,
                            password: formData.password,
                            full_name: formData.name,
                            role: formData.role,
                            cpf: formData.cpf,
                            phone: formData.phone,
                            permissions: { has_erp_access: true, ...formData.permissions }
                        })
                        createdUserId = user?.id || null
                    } catch (authError) { throw authError }
                }

                // Inserir na tabela staff
                const staffPayload = {
                    user_id: createdUserId,
                    name: formData.name,
                    cpf: formData.cpf,
                    role: formData.role,
                    email: formData.email || null,
                    phone: formData.phone || null,
                    admission_date: formData.admission_date || null,
                    salary: formData.salary ? parseFloat(formData.salary) : null,
                    has_platform_access: formData.has_platform_access,
                    is_active: true
                }

                try {
                    await staffApi.create(staffPayload)
                } catch (staffInsertError) {
                    console.error('Erro ao inserir na tabela staff:', staffInsertError)
                    if (createdUserId) {
                        try {
                            await usersApi.remove(createdUserId)
                            createdUserId = null
                        } catch (rollbackError) {
                            console.error('Falha ao desfazer usuário após erro no cadastro da Equipe:', rollbackError)
                        }
                    }
                    throw new Error(`Não foi possível concluir o cadastro na Equipe: ${staffInsertError.message}`)
                }

                alert('Colaborador cadastrado com sucesso!')
                setShowModal(false)
                resetForm()
                fetchStaff()
            }
        } catch (err) {
            console.error('Erro ao processar colaborador:', err)
            setErrorMsg(err.message || 'Falha ao salvar o colaborador. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            cpf: '',
            role: 'atendente',
            email: '',
            phone: '',
            admission_date: '',
            salary: '',
            has_platform_access: true,
            password: '',
            is_active: true,
            permissions: {
                access_dashboard: true,
                access_alunos: false,
                access_matriculas: false,
                access_leads: false,
                access_turmas: false,
                access_cursos: false,
                access_financeiro: false,
                access_relatorios: false,
                access_instrutores: false,
                access_certificados: false,
                access_auditoria: false,
                access_ouvidoria: false,
                access_equipe: false,
                access_lms: false,
                access_comunicados: false,
                access_config: false,
                access_config_asaas: false
            }
        })
        setEditingStaffId(null)
    }

    // Toggle de ativação do status do colaborador
    const handleToggleActiveStaff = async (staff) => {
        if (isDeveloperAccount(staff)) return alert("Conta mestre não pode ser desativada.")
        if (!confirm(`Deseja ${staff.is_active ? 'DESATIVAR' : 'ATIVAR'} o cadastro deste colaborador?`)) return
        setLoading(true)
        try {
            const newStatus = !staff.is_active
            
            // 1. Atualizar na tabela staff (se for uma linha real de staff)
            if (!staff.id.toString().startsWith('mock-')) {
                if (staff.id !== staff.user_id) {
                    await staffApi.update(staff.id, { is_active: newStatus })
                }
                // 2. Suspender o usuário vinculado
                if (staff.user_id) {
                    await usersApi.update(staff.user_id, { is_active: newStatus })
                }
            }

            setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: newStatus } : s))
            alert('Status do colaborador atualizado com sucesso!')
        } catch (err) {
            console.error('Erro ao alternar status do colaborador:', err)
            // Fallback local
            setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: !staff.is_active } : s))
        } finally {
            setLoading(false)
        }
    }

    // Deletar funcionário
    const handleDeleteStaff = async (staff) => {
        if (isDeveloperAccount(staff)) return alert("Conta mestre não pode ser excluída.")
        if (!confirm('Excluir este colaborador permanentemente do registro interno?')) return
        setLoading(true)
        try {
            if (!staff.id.toString().startsWith('mock-')) {
                if (staff.id !== staff.user_id) {
                    await staffApi.remove(staff.id)
                }
                // Deletar usuário correspondente se houver
                if (staff.user_id) {
                    await usersApi.remove(staff.user_id)
                }
            }
            setStaffList(prev => prev.filter(s => s.id !== staff.id))
            alert('Colaborador removido com sucesso!')
        } catch (err) {
            console.error('Erro ao remover colaborador:', err)
            // Fallback local
            setStaffList(prev => prev.filter(s => s.id !== staff.id))
        } finally {
            setLoading(false)
        }
    }

    // Métodos Auxiliares PR-127
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    const handleQualifyFileChange = async (fieldName, file) => {
        if (!file) return
        try {
            const base64Data = await convertFileToBase64(file)
            setPrForm(prev => ({ ...prev, [fieldName]: base64Data }))
        } catch (err) {
            console.error('Erro ao converter arquivo:', err)
            alert('Falha ao processar arquivo para upload.')
        }
    }

    const handleOpenQualifyWizard = (staff) => {
        setSelectedInstructorForQualify(staff)
        setPrForm({
            full_name: staff.name,
            cpf: staff.cpf || '',
            rg: '',
            email: staff.email || '',
            phone: staff.phone || '',
            birth_date: '',
            education_level: 'Técnico Nível Médio',
            methods: [],
            methodComprovations: {},
            training_hours: 4,
            training_date: '',
            training_abendi: 'Sim',
            rg_url: '',
            cpf_url: '',
            diploma_url: '',
            snqc_url: '',
            experience_url: '',
            training_url: '',
            photo_url: ''
        })
        setWizardStep(1)
        setShowQualifyWizard(true)
    }

    const handleNextStep = () => {
        if (wizardStep === 1) {
            const invalidSchool = ['Ensino Médio', 'Ensino Fundamental'].includes(prForm.education_level)
            if (invalidSchool) {
                alert('Atenção: A norma ABENDI PR-127 exige que o instrutor possua escolaridade MÍNIMA de Técnico Nível Médio para habilitação técnica.')
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
                alert('Você selecionou a comprovação por SNQC em algum método. Suba o Certificado SNQC correspondente.')
                return
            }
            const needsExperience = prForm.methods.some(m => prForm.methodComprovations[m] === 'experience')
            if (needsExperience && !prForm.experience_url) {
                alert('Você selecionou a comprovação por Experiência em algum método. Suba o Comprovante de Experiência de 5 anos correspondente.')
                return
            }
        }
        setWizardStep(prev => prev + 1)
    }

    const handleSubmitQualify = async () => {
        setLoading(true)
        try {
            for (const method of prForm.methods) {
                const qualPayload = {
                    user_id: selectedInstructorForQualify.user_id || selectedInstructorForQualify.id,
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

                await qualificationsApi.create(qualPayload)
            }

            alert('Qualificações enviadas com sucesso para aprovação do Coordenador!')
            setShowQualifyWizard(false)
            fetchStaff()
        } catch (err) {
            console.error('Erro ao submeter qualificações:', err)
            alert('Falha ao salvar qualificações: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleApproveQualification = async (qual) => {
        if (!confirm(`Aprovar a habilitação técnica no método ${qual.method} para o instrutor ${qual.users?.full_name}?`)) return
        setApprovalLoading(true)
        try {
            const approvedAt = new Date()
            const validUntil = new Date()
            validUntil.setMonth(validUntil.getMonth() + 36)

            await qualificationsApi.update(qual.id, {
                status: 'ativo',
                approved_by: session?.user?.id,
                approved_at: approvedAt.toISOString(),
                valid_until: validUntil.toISOString().split('T')[0],
                rejection_reason: null
            })

            alert('Habilitação técnica aprovada com sucesso! Validade estendida por 36 meses.')
            setShowApprovalModal(false)
            fetchStaff()
        } catch (err) {
            console.error('Erro ao aprovar qualificação:', err)
            alert('Falha ao aprovar qualificação: ' + err.message)
        } finally {
            setApprovalLoading(false)
        }
    }

    const handleReproveQualification = async () => {
        if (!rejectionReason.trim()) {
            alert('O preenchimento do motivo de rejeição é obrigatório.')
            return
        }
        setApprovalLoading(true)
        try {
            await qualificationsApi.update(selectedQualForApproval.id, {
                status: 'reprovado',
                approved_by: session?.user?.id,
                rejection_reason: rejectionReason
            })

            alert('Habilitação reprovada. O instrutor foi notificado com o motivo.')
            setShowApprovalModal(false)
            setRejectionReason('')
            fetchStaff()
        } catch (err) {
            console.error('Erro ao reprovar qualificação:', err)
            alert('Falha ao reprovar qualificação: ' + err.message)
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
    const filteredStaff = staffList.filter(s => {
        const hasAccess = s.has_platform_access
        const isActive = s.is_active

        if (filterAccess === 'with') return hasAccess
        if (filterAccess === 'without') return !hasAccess
        if (filterAccess === 'active') return isActive
        if (filterAccess === 'inactive') return !isActive
        return true
    })

    const isUserAdmin = currentUserProfile?.role === 'admin'

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '4rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* TÍTULO DA SEÇÃO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users color="var(--primary)" /> Gestão de Equipe &amp; Qualificação PR-127
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                        Controle e cadastramento de colaboradores internos, despesas associadas e conformidade técnica de instrutores Abendi.
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={fetchStaff} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {activeSection === 'colaboradores' && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Plus size={16} /> Novo Membro
                        </button>
                    )}
                </div>
            </div>

            {/* ABAS DA SEÇÃO */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
                <button 
                    className={`btn ${activeSection === 'colaboradores' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                    onClick={() => setActiveSection('colaboradores')}
                >
                    <Users size={16} /> Colaboradores ({staffList.length})
                </button>
                <button 
                    className={`btn ${activeSection === 'pr127' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                    onClick={() => setActiveSection('pr127')}
                >
                    <Award size={16} /> Habilitação PR-127 ({qualifications.length})
                </button>
            </div>

            {/* SESSÃO 1: COLABORADORES */}
            {activeSection === 'colaboradores' && (
                <div className="animate-fade-in">
                    
                    {/* FILTROS DE EQUIPE */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <button 
                            className={`btn ${filterAccess === 'all' ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
                            onClick={() => setFilterAccess('all')}
                        >
                            Todos
                        </button>
                        <button 
                            className={`btn ${filterAccess === 'with' ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
                            onClick={() => setFilterAccess('with')}
                        >
                            Com Acesso ERP
                        </button>
                        <button 
                            className={`btn ${filterAccess === 'without' ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
                            onClick={() => setFilterAccess('without')}
                        >
                            Sem Acesso (Cadastro)
                        </button>
                        <button 
                            className={`btn ${filterAccess === 'active' ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
                            onClick={() => setFilterAccess('active')}
                        >
                            Ativos
                        </button>
                        <button 
                            className={`btn ${filterAccess === 'inactive' ? 'btn-primary' : 'btn-secondary'}`} 
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
                            onClick={() => setFilterAccess('inactive')}
                        >
                            Inativos
                        </button>
                    </div>

                    {/* LISTA GRID DE COLABORADORES */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {filteredStaff.map(s => {
                            const hasAccess = s.has_platform_access
                            return (
                                <div key={s.id} className={`card ${!s.is_active ? 'opacity-60 grayscale' : ''}`} style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'space-between', 
                                    borderRadius: '14px', 
                                    border: '1px solid var(--border-color)',
                                    padding: '1.5rem',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <div style={{ 
                                            width: '52px', height: '52px', borderRadius: '50%', 
                                            backgroundColor: s.role === 'admin' ? '#FEE2E2' : 'var(--primary-light)', 
                                            color: s.role === 'admin' ? '#EF4444' : 'var(--primary)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.3rem' 
                                        }}>
                                            {s.name.charAt(0).toUpperCase()}
                                        </div>
                                        
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                                <h3 style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    {s.name}
                                                </h3>
                                                <span style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                    {s.role}
                                                </span>
                                            </div>
                                            
                                            <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.25rem 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {s.email || 'Apenas Cadastro (Sem E-mail)'}
                                            </p>

                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                                                <span>CPF: {s.cpf}</span>
                                                {s.phone && <span>· Tel: {s.phone}</span>}
                                            </div>

                                            {/* Salário: PRIVADO (Visível apenas para Admin) */}
                                            {isUserAdmin && s.salary && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                                                    <DollarSign size={14} /> Salário: R$ {s.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', alignItems: 'center', marginTop: 'auto' }}>
                                        {/* Habilitar PR-127 se cargo for instrutor */}
                                        {s.role === 'instrutor' ? (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                onClick={() => handleOpenQualifyWizard(s)}
                                            >
                                                <Award size={14} /> Habilitação PR-127
                                            </button>
                                        ) : <div />}

                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            {!isDeveloperAccount(s) && (
                                              <>
                                                <button onClick={() => handleEditStaff(s)} className="btn btn-secondary" style={{ padding: '0.4rem 0.65rem' }} title="Editar Informações">
                                                  <Edit3 size={15} color="var(--primary)" />
                                                </button>
                                                <button onClick={() => handleToggleActiveStaff(s)} className="btn btn-secondary" style={{ padding: '0.4rem 0.65rem' }} title={s.is_active ? 'Desativar' : 'Reativar'}>
                                                  {s.is_active ? <UserX size={15} className="text-danger"/> : <UserCheck2 size={15} className="text-success"/>}
                                                </button>
                                                <button onClick={() => handleDeleteStaff(s)} className="btn btn-secondary" style={{ padding: '0.4rem 0.65rem' }} title="Excluir Colaborador">
                                                  <Trash2 size={15} className="text-danger" />
                                                </button>
                                              </>
                                            )}
                                            {isDeveloperAccount(s) && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                    <Lock size={12} /> Desenvolvedor
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* SESSÃO 2: PR-127 HABILITAÇÕES */}
            {activeSection === 'pr127' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Alertas de Vencimento Gerais de Qualificação */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {qualifications.filter(q => q.status === 'ativo' && q.valid_until).map(q => {
                            const today = new Date()
                            const expiry = new Date(q.valid_until)
                            const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
                            
                            if (diffDays <= 0) {
                                return (
                                    <div key={q.id} className="animate-slide-up" style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', fontWeight: '500' }}>
                                        <AlertCircle size={20} />
                                        <span>A qualificação no método <strong>{q.method}</strong> do instrutor <strong>{q.users?.full_name}</strong> está <strong>VENCIDA</strong> desde {new Date(q.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}.</span>
                                    </div>
                                )
                            } else if (diffDays <= 30) {
                                return (
                                    <div key={q.id} className="animate-slide-up" style={{ padding: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', fontWeight: '500' }}>
                                        <AlertTriangle size={20} />
                                        <span>A qualificação no método <strong>{q.method}</strong> do instrutor <strong>{q.users?.full_name}</strong> vencerá em <strong>{diffDays} dias</strong> ({new Date(q.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}).</span>
                                    </div>
                                )
                            }
                            return null
                        })}
                    </div>

                    {/* Tabela de Habilitações Ativas / Pendentes */}
                    <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileCheck size={20} color="var(--primary)" /> Registro de Qualificações
                        </h3>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Instrutor</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Método</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Comprovação</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Treinamento</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Validade</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {qualifications.map(qual => (
                                        <tr key={qual.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{qual.users?.full_name}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '10px' }}>{qual.method}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: '600' }}>
                                                {qual.qualification_type === 'snqc' ? 'Certificado SNQC' : 'Experiência (5 anos)'}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
                                                {qual.training_hours}h em {new Date(qual.training_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                {getQualStatusBadge(qual.status, qual.valid_until)}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                                                {qual.valid_until ? new Date(qual.valid_until + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                {/* Botão de Julgamento para Coordenador / Admin */}
                                                {qual.status === 'pendente_aprovacao' && (currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'coordenador') ? (
                                                    <button 
                                                        className="btn btn-primary" 
                                                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: '700' }}
                                                        onClick={() => openApprovalModal(qual)}
                                                    >
                                                        Revisar &amp; Avaliar
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                        onClick={() => {
                                                            setSelectedQualForApproval(qual)
                                                            setShowApprovalModal(true)
                                                        }}
                                                    >
                                                        <Eye size={14} /> Ficha
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {qualifications.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                                Nenhum instrutor cadastrou habilitação técnica na norma PR-127 até o momento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: NOVO COLABORADOR / MEMBRO DA EQUIPE */}
            {showModal && createPortal((
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div className="card animate-slide-up" style={{ maxWidth: 'min(520px, 92vw)', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {editingStaffId ? (
                                    <>
                                        <Edit3 color="var(--primary)" size={20} /> Editar Colaborador / Membro
                                    </>
                                ) : (
                                    <>
                                        <Plus color="var(--primary)" /> Novo Colaborador / Membro
                                    </>
                                )}
                            </h3>
                            <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Nome Completo *</label>
                                <input type="text" required className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>CPF *</label>
                                <input type="text" required className="form-control" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Telefone</label>
                                <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(21) 99999-9999" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Data de Admissão</label>
                                <input type="date" className="form-control" value={formData.admission_date} onChange={e => setFormData({...formData, admission_date: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            </div>

                            {/* Salário: PRIVADO (Somente Admin vê no cadastro) */}
                            {isUserAdmin && (
                                <div className="form-group animate-slide-up">
                                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#047857' }}>Salário Mensal (R$) *</label>
                                    <input type="number" step="0.01" className="form-control" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} placeholder="Valor em R$" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid #a7f3d0' }} />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Cargo / Função *</label>
                                <select className="form-control" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <option value="admin">Administrador (Master)</option>
                                    <option value="atendente">Atendente (Secretaria)</option>
                                    <option value="coordenador">Coordenador Pedagógico</option>
                                    <option value="financeiro">Gestor Financeiro</option>
                                    <option value="webdesigner">Marketing / Webdesigner</option>
                                    <option value="instrutor">Instrutor Técnico (PR-127)</option>
                                    <option value="administrativo">Administrativo Interno</option>
                                    <option value="financeiro">Financeiro Externo</option>
                                    <option value="administrativo">Outro Cargo Interno</option>
                                </select>
                            </div>

                            {/* TOGGLE: TEM ACESSO À PLATAFORMA? */}
                            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>Acesso ao Sistema</span>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '500', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="has_platform_access" 
                                            checked={formData.has_platform_access === true} 
                                            onChange={() => setFormData({ ...formData, has_platform_access: true })} 
                                        />
                                        <span>Sim (Criar Usuário/Auth)</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: '500', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="has_platform_access" 
                                            checked={formData.has_platform_access === false} 
                                            onChange={() => setFormData({ ...formData, has_platform_access: false })} 
                                        />
                                        <span>Não (Apenas Cadastro Interno)</span>
                                    </label>
                                </div>
                            </div>
                            
                            {/* CAMPOS DE CREDENCIAIS ADICIONAIS SE HOUVER ACESSO */}
                            {formData.has_platform_access && (
                                <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>E-mail de Login *</label>
                                        <input type="email" required={formData.has_platform_access} className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@cursocec.com.br" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                    </div>
                                    
                                    {!editingStaffId && (
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Senha Provisória *</label>
                                            <input type="password" required={formData.has_platform_access && !editingStaffId} minLength={6} className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Mínimo 6 caracteres" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                        </div>
                                    )}

                                    {/* SEÇÃO DE PERMISSÕES GRANULARES */}
                                    <div style={{ 
                                        padding: '1rem', 
                                        backgroundColor: '#f8fafc', 
                                        borderRadius: '8px', 
                                        border: '1px solid var(--border-color)', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '0.75rem' 
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>Permissões de Módulos</span>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Escolha quais módulos o colaborador poderá acessar no painel.</span>
                                        </div>
                                        
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(2, 1fr)', 
                                            gap: '0.5rem', 
                                            maxHeight: '220px', 
                                            overflowY: 'auto', 
                                            paddingRight: '0.25rem',
                                            marginTop: '0.25rem' 
                                        }}>
                                            {[
                                                { key: 'access_dashboard', label: 'Painel / Dashboard' },
                                                { key: 'access_alunos', label: 'Alunos' },
                                                { key: 'access_matriculas', label: 'Matrículas' },
                                                { key: 'access_leads', label: 'Leads de Contato' },
                                                { key: 'access_turmas', label: 'Turmas' },
                                                { key: 'access_cursos', label: 'Cursos' },
                                                { key: 'access_financeiro', label: 'Financeiro' },
                                                { key: 'access_relatorios', label: 'Relatórios' },
                                                { key: 'access_instrutores', label: 'Instrutores (PR-127)' },
                                                { key: 'access_certificados', label: 'Certificados' },
                                                { key: 'access_auditoria', label: 'Auditoria' },
                                                { key: 'access_ouvidoria', label: 'Ouvidoria' },
                                                { key: 'access_equipe', label: 'Equipe / Funcionários' },
                                                { key: 'access_lms', label: 'Plataforma EAD' },
                                                { key: 'access_comunicados', label: 'Comunicados' },
                                                { key: 'access_config', label: 'Configurações' },
                                                { key: 'access_config_asaas', label: 'Config. Asaas' }
                                            ].map(item => (
                                                <label 
                                                    key={item.key} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.4rem', 
                                                        fontSize: '0.78rem', 
                                                        fontWeight: '500', 
                                                        color: '#334155',
                                                        cursor: 'pointer',
                                                        padding: '0.35rem 0.5rem',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#ffffff',
                                                        border: '1px solid #e2e8f0',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    className="permission-item-hover"
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={formData.permissions?.[item.key] === true}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            permissions: {
                                                                ...formData.permissions,
                                                                [item.key]: e.target.checked
                                                            }
                                                        })}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <span>{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <style>{`
                                            .permission-item-hover:hover {
                                                background-color: #f1f5f9 !important;
                                                border-color: #cbd5e1 !important;
                                            }
                                        `}</style>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                                    {loading ? 'Salvando...' : (editingStaffId ? 'Salvar Alterações' : 'Salvar Colaborador')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL 2: ASSISTENTE DE CADASTRO HABILITAÇÃO PR-127 (5 ABAS) */}
            {showQualifyWizard && selectedInstructorForQualify && createPortal((
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                }}>
                    <div className="card animate-slide-up" style={{ maxWidth: 'min(650px, 92vw)', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Award color="var(--primary)" /> Habilitação PR-127 — {selectedInstructorForQualify.name}
                            </h3>
                            <button onClick={() => setShowQualifyWizard(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Barra de Progresso do Assistente */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', backgroundColor: '#F1F5F9', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700' }}>
                            <span style={{ color: wizardStep === 1 ? 'var(--primary)' : '#64748B' }}>1. Pessoal</span>
                            <span style={{ color: wizardStep === 2 ? 'var(--primary)' : '#64748B' }}>2. Técnicos</span>
                            <span style={{ color: wizardStep === 3 ? 'var(--primary)' : '#64748B' }}>3. Abendi</span>
                            <span style={{ color: wizardStep === 4 ? 'var(--primary)' : '#64748B' }}>4. Uploads</span>
                            <span style={{ color: wizardStep === 5 ? 'var(--primary)' : '#64748B' }}>5. Revisão</span>
                        </div>

                        {/* ABA 1: DADOS PESSOAIS E ESCOLARIDADE */}
                        {wizardStep === 1 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Escolaridade Mínima Exigida</h4>
                                <div className="form-group">
                                    <label className="form-label">Escolaridade do Instrutor *</label>
                                    <select 
                                        className="form-control" 
                                        value={prForm.education_level}
                                        onChange={(e) => setPrForm({ ...prForm, education_level: e.target.value })}
                                        style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    >
                                        <option value="Ensino Fundamental">Ensino Fundamental (Inferior)</option>
                                        <option value="Ensino Médio">Ensino Médio (Inferior)</option>
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
                                <div className="form-group">
                                    <label className="form-label">CPF *</label>
                                    <input type="text" className="form-control" value={prForm.cpf} onChange={e => setPrForm({...prForm, cpf: e.target.value})} placeholder="000.000.000-00" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">RG / Documento *</label>
                                    <input type="text" className="form-control" value={prForm.rg} onChange={e => setPrForm({...prForm, rg: e.target.value})} placeholder="Apenas números" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Telefone / WhatsApp *</label>
                                    <input type="text" className="form-control" value={prForm.phone} onChange={e => setPrForm({...prForm, phone: e.target.value})} placeholder="(21) 99999-9999" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                            </div>
                        )}

                        {/* ABA 2: HABILITAÇÃO TÉCNICA E MÉTODOS */}
                        {wizardStep === 2 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Método(s) Habilitado(s)</h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {['CD-MC', 'CD-CL', 'CD-TO'].map(method => {
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

                        {/* ABA 3: TREINAMENTO ABENDI */}
                        {wizardStep === 3 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Treinamento Teórico/Prático (Mín. 4h)</h4>
                                
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
                                    {prForm.training_abendi === 'Não' && (
                                        <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: 600 }}>
                                            ⚠️ A habilitação técnica Abendi exige obrigatoriamente a comprovação do treinamento mínimo de 4h.
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Carga Horária Realizada (Horas) *</label>
                                    <input type="number" min="4" className="form-control" value={prForm.training_hours} onChange={e => setPrForm({...prForm, training_hours: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Data de Realização do Treinamento *</label>
                                    <input type="date" className="form-control" value={prForm.training_date} onChange={e => setPrForm({...prForm, training_date: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                            </div>
                        )}

                        {/* ABA 4: UPLOAD DE DOCUMENTOS */}
                        {wizardStep === 4 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Anexar Documentos Obrigatórios (Base64)</h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>RG ou CNH Anexo *</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Identidade com foto</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.rg_url ? '✓ Atualizar' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleQualifyFileChange('rg_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>CPF Anexo *</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Documento ou Comprovante</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.cpf_url ? '✓ Atualizar' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleQualifyFileChange('cpf_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>Diploma de Escolaridade *</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Certificado Técnico ou Superior</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.diploma_url ? '✓ Atualizar' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleQualifyFileChange('diploma_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    {prForm.methods.some(m => prForm.methodComprovations[m] === 'snqc') && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', color: 'var(--primary)' }}>Certificado SNQC *</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Habilitação há 2 anos ou menos</span>
                                            </div>
                                            <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                                {prForm.snqc_url ? '✓ Atualizar' : 'Selecionar Arquivo'}
                                                <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleQualifyFileChange('snqc_url', e.target.files[0])} />
                                            </label>
                                        </div>
                                    )}

                                    {prForm.methods.some(m => prForm.methodComprovations[m] === 'experience') && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', color: 'var(--primary)' }}>Comprovante de Experiência (5 anos) *</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Carteira de Trabalho / Contratos</span>
                                            </div>
                                            <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                                {prForm.experience_url ? '✓ Atualizar' : 'Selecionar Arquivo'}
                                                <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleQualifyFileChange('experience_url', e.target.files[0])} />
                                            </label>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>Treinamento 4h Abendi Anexo *</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Certificado do Anexo A</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.training_url ? '✓ Atualizar' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*, application/pdf" style={{ display: 'none' }} onChange={(e) => handleQualifyFileChange('training_url', e.target.files[0])} />
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>Foto 3x4 do Instrutor *</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Imagem nítida para crachá</span>
                                        </div>
                                        <label className="btn btn-secondary" style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                            {prForm.photo_url ? '✓ Atualizar' : 'Selecionar Arquivo'}
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleQualifyFileChange('photo_url', e.target.files[0])} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ABA 5: REVISÃO E ENVIO */}
                        {wizardStep === 5 && (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Revisão de Qualificação ABENDI</h4>
                                
                                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                                    <span><strong>Instrutor:</strong> {prForm.full_name}</span>
                                    <span><strong>Escolaridade:</strong> {prForm.education_level}</span>
                                    <span><strong>Treinamento Abendi:</strong> {prForm.training_hours}h em {prForm.training_date ? new Date(prForm.training_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</span>
                                    
                                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                                        <strong>Métodos a serem credenciados:</strong>
                                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.25rem' }}>
                                            {prForm.methods.map(m => (
                                                <li key={m}>
                                                    <strong>{m}</strong> — Comprovação por: {prForm.methodComprovations[m] === 'snqc' ? 'Certificado SNQC' : 'Experiência'}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', margin: '0.5rem 0', padding: '1rem', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.4', border: '1px solid #BFDBFE' }}>
                                    <Info size={20} style={{ flexShrink: 0 }} />
                                    <div>Ao clicar em enviar, a habilitação técnica mudará para "Pendente de Aprovação" e o Coordenador receberá os documentos digitais em Base64 para validação de assinatura física.</div>
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
                                <button type="button" className="btn btn-primary" onClick={handleSubmitQualify} disabled={loading}>
                                    {loading ? 'Salvando...' : 'Enviar para o Coordenador'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL 3: JULGAMENTO DA APROVAÇÃO PR-127 */}
            {showApprovalModal && selectedQualForApproval && createPortal((
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                }}>
                    <div className="card animate-slide-up" style={{ maxWidth: 'min(600px, 92vw)', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Award color="var(--primary)" /> Revisão Técnica PR-127
                            </h3>
                            <button onClick={() => setShowApprovalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
                            <div>
                                <strong>Instrutor Candidato:</strong> {selectedQualForApproval.users?.full_name}
                            </div>
                            <div>
                                <strong>Método Solicitado:</strong> <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '10px' }}>{selectedQualForApproval.method}</span>
                            </div>
                            <div>
                                <strong>Tipo de Comprovação:</strong> {selectedQualForApproval.qualification_type === 'snqc' ? 'Certificado SNQC' : 'Experiência Comprovada (5 anos)'}
                            </div>
                            <div>
                                <strong>Treinamento ABENDI 4h:</strong> Habilitado com carga horária de {selectedQualForApproval.training_hours}h em {new Date(selectedQualForApproval.training_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>

                            <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <strong style={{ display: 'block', marginBottom: '0.75rem' }}>📂 Pasta Digital de Documentos (Assinatura ABENDI):</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.rg_url)}>
                                        <span>Documento de Identidade (RG/CNH)</span> <Eye size={14} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.cpf_doc_url)}>
                                        <span>Documento CPF</span> <Eye size={14} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.diploma_url)}>
                                        <span>Diploma / Comprovante Escolaridade</span> <Eye size={14} />
                                    </button>
                                    <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.training_url)}>
                                        <span>Comprovante de Treinamento ABENDI</span> <Eye size={14} />
                                    </button>
                                    {selectedQualForApproval.snqc_url && (
                                        <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.snqc_url)}>
                                            <span>Certificado SNQC</span> <Eye size={14} />
                                        </button>
                                    )}
                                    {selectedQualForApproval.experience_url && (
                                        <button className="btn btn-secondary" style={{ justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.45rem 1rem', width: '100%', display: 'flex', alignItems: 'center' }} onClick={() => handleViewDocument(selectedQualForApproval.experience_url)}>
                                            <span>Comprovante de Experiência (5 anos)</span> <Eye size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedQualForApproval.status === 'reprovado' && (
                                <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B' }}>
                                    <strong>Motivo da Reprovação Anterior:</strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>"{selectedQualForApproval.rejection_reason}"</p>
                                </div>
                            )}

                            {selectedQualForApproval.status === 'pendente_aprovacao' && (
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">Caso reprovar, digite o motivo detalhado *</label>
                                    <textarea 
                                        rows="2"
                                        className="form-control"
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        placeholder="Ex: Falta comprovante de 5 anos de CLT..."
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                <button type="button" onClick={() => setShowApprovalModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Voltar</button>
                                
                                {selectedQualForApproval.status === 'pendente_aprovacao' && (
                                    <>
                                        <button type="button" onClick={handleReproveQualification} disabled={approvalLoading} className="btn btn-danger" style={{ flex: 1, backgroundColor: '#EF4444', color: '#fff' }}>
                                            Reprovar Habilitação
                                        </button>
                                        <button type="button" onClick={() => handleApproveQualification(selectedQualForApproval)} disabled={approvalLoading} className="btn btn-primary" style={{ flex: 1 }}>
                                            Aprovar Habilitação
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ), document.body)}

        </div>
    )
}
