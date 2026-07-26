import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { classesApi, studentsApi, coursesApi } from '../services/academic'
import { uploadFile } from '../lib/api'
import { BookOpen, Users, LogIn, LineChart, Calendar as CalendarIcon, Clock, X, Printer, FileText, Edit, Trash2, UploadCloud, GraduationCap, UserPlus, UserMinus } from 'lucide-react'
import { generateDocument } from '../lib/pdfGenerator'
import { useAuth } from '../contexts/AuthContext'

export default function Turmas() {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // list | add
    
    // Estados de Agendamento Prático
    const [showSchedulingModal, setShowSchedulingModal] = useState(false)
    const [selectedSchedulingClass, setSelectedSchedulingClass] = useState(null)
    const [scheduledStudents, setScheduledStudents] = useState([])
    const [availableStudents, setAvailableStudents] = useState([])
    const [schedulingSearch, setSchedulingSearch] = useState('')
    const [schedulingCourseFilter, setSchedulingCourseFilter] = useState('todos')
    const [schedulingLoading, setSchedulingLoading] = useState(false)
    const [schedulingActionLoading, setSchedulingActionLoading] = useState(null)
    const [selectedClassData, setSelectedClassData] = useState(null)
    const [classStudents, setClassStudents] = useState([])
    const [modalLoading, setModalLoading] = useState(false)
    const [userProfile, setUserProfile] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [showPast, setShowPast] = useState(false)
    const { session, userProfile: authProfile } = useAuth()

    // Estados do modal de instrutores
    const [instructorModal, setInstructorModal] = useState(null) // turma selecionada
    const [classInstructors, setClassInstructors] = useState([]) // instrutores vinculados
    const [availableInstructors, setAvailableInstructors] = useState([]) // todos com role=instrutor
    const [instructorModalLoading, setInstructorModalLoading] = useState(false)
    const [newInstructorId, setNewInstructorId] = useState('')
    const [newInstructorRole, setNewInstructorRole] = useState('titular')

    const [formData, setFormData] = useState({
        name: '',
        course_name: '',
        start_date: '', predicted_end_date: '', schedule: 'Seg a Sex 18h as 22h', duration: '136',
        lms_course_id: '',
        price_cash: '',
        price_card_10x: '',
        price_installments_3x: '',
        is_immediate_start: false,
        instructor_payment_type: 'fixed',
        instructor_payment_value: 0,
        create_lms_integration: false,
        address: '',
        has_in_person: false,
        in_person_sessions: 0,
        cep: '',
        address_number: '',
        address_complement: '',
        card_installments: 10,
        boleto_installments: 1,
        max_capacity: 10,
        is_past_class: false,
        actual_start_date: '',
        actual_end_date: ''
    })
    const [lmsCourses, setLmsCourses] = useState([])
    const [cepLoading, setCepLoading] = useState(false)

    // Modal de Data Universal
    const [showDateModal, setShowDateModal] = useState(false)
    const [dateModalConfig, setDateModalConfig] = useState({ title: '', initialDate: '', onSave: null, label: '' })
    const [modalDateValue, setModalDateValue] = useState('')

    const fetchLmsCourses = async () => {
        try {
            const { courses } = await coursesApi.list()
            setLmsCourses(courses || [])
        } catch {
            setLmsCourses([])
        }
    }

    const detectMethodFromCourseName = (courseName) => {
        if (!courseName) return 'CD-CL';
        const upper = courseName.toUpperCase();
        if (upper.includes('CD-MC') || upper.includes('MEDI') || upper.includes('ESPESSURA')) return 'CD-MC';
        if (upper.includes('CD-TO') || upper.includes('ULTRA') || upper.includes('SOLD')) return 'CD-TO';
        return 'CD-CL';
    }

    const fetchAvailableInstructors = async (turma) => {
        try {
            const courseName = turma?.course || '';
            const requiredMethod = detectMethodFromCourseName(courseName);

            // Backend marca quem tem habilitação PR-127 ativa no método (qualified).
            const { instructors } = await classesApi.availableInstructors(requiredMethod);
            const mapped = (instructors || []).map(u => ({
                id: u.id,
                full_name: u.qualified
                    ? u.full_name
                    : `⚠️ ${u.full_name} (Sem Habilitação Ativa para ${requiredMethod})`,
            }));
            setAvailableInstructors(mapped);
        } catch (err) {
            console.error('Erro ao buscar instrutores PR-127:', err);
            setAvailableInstructors([]);
        }
    }

    const openInstructorModal = async (turma) => {
        setInstructorModal(turma)
        setNewInstructorId('')
        setNewInstructorRole('titular')
        setInstructorModalLoading(true)
        await fetchAvailableInstructors(turma)
        try {
            const { instructors } = await classesApi.listInstructors(turma.id)
            setClassInstructors(instructors || [])
        } catch {
            setClassInstructors([])
        }
        setInstructorModalLoading(false)
    }

    const handleAddInstructor = async () => {
        if (!newInstructorId) { alert('Selecione um instrutor.'); return }
        try {
            await classesApi.addInstructor(instructorModal.id, newInstructorId, newInstructorRole)
        } catch (err) {
            alert('Erro: ' + (err.status === 409 ? 'Este instrutor já está vinculado à turma.' : err.message)); return
        }
        setNewInstructorId('')
        await openInstructorModal(instructorModal)
        fetchClasses()
    }

    const handleRemoveInstructor = async (linkId) => {
        if (!confirm('Remover este instrutor da turma?')) return
        try {
            await classesApi.removeInstructor(instructorModal.id, linkId)
        } catch (err) { alert('Erro ao remover: ' + err.message); return }
        await openInstructorModal(instructorModal)
        fetchClasses()
    }

    // Função flexível para contar dias do período dependendo da modalidade
    const countCourseDays = (startDateStr, endDateStr, isSaturdayOnly) => {
        let count = 0
        let curDate = new Date(startDateStr + 'T00:00:00')
        const endDate = new Date(endDateStr + 'T00:00:00')

        while (curDate <= endDate) {
            const dayOfWeek = curDate.getDay() // 0 = Domingo, 6 = Sábado
            if (isSaturdayOnly) {
                if (dayOfWeek === 6) count++
            } else {
                if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
            }
            curDate.setDate(curDate.getDate() + 1)
        }
        return count
    }

    // Sincronização automática de Carga Horária por Sigla (Motor Fase 17)
    useEffect(() => {
        const course_name = formData.course_name || '';
        if (course_name.includes('(CD-CL)')) {
            setFormData(prev => ({ ...prev, duration: '136', schedule: 'Seg a Sex 19h as 21h' }));
        } else if (course_name.includes('(CD-TO)')) {
            setFormData(prev => ({ ...prev, duration: '121', schedule: 'Seg a Sex 20h as 22h' }));
        } else if (course_name.includes('(CD-CM)')) {
            setFormData(prev => ({ ...prev, duration: '146', schedule: 'Seg a Sex 19h as 21h' }));
        }

        // Auto-vinculo inteligente: Se o nome do curso bater com um curso EAD existente, selecionar automaticamente
        if (course_name && lmsCourses.length > 0) {
            const match = lmsCourses.find(c => c.title.toLowerCase() === course_name.toLowerCase());
            if (match && !formData.lms_course_id) {
                setFormData(prev => ({ ...prev, lms_course_id: match.id, create_lms_integration: false }));
            }
        }
    }, [formData.course_name, lmsCourses]);

    const generateNextClassName = (existingClasses) => {
        const yearSuffix = new Date().getFullYear().toString().slice(-2) // Ex: "26" p/ 2026

        // Filtrar apenas as turmas que seguem o padrão TXX/YY para o ano atual
        const currentYearClasses = existingClasses.filter(c => {
            const parts = c.name.split('/')
            return parts.length === 2 && parts[1] === yearSuffix && parts[0].startsWith('T')
        })

        if (currentYearClasses.length === 0) {
            return `T01/${yearSuffix}`
        }

        // Extrair os números das turmas e encontrar o maior
        const numbers = currentYearClasses.map(c => {
            const numStr = c.name.split('/')[0].substring(1) // Remove o 'T'
            return parseInt(numStr, 10)
        }).filter(n => !isNaN(n))

        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0
        const nextNumber = (maxNumber + 1).toString().padStart(2, '0')

        return `T${nextNumber}/${yearSuffix}`
    }

    const fetchClasses = async () => {
        setLoading(true)
        try {
            const { classes: data } = await classesApi.list()
            const dateOnly = (v) => (v ? String(v).split('T')[0] : null)

            const formatted = (data || []).map(c => ({
                id: c.id,
                name: c.name,
                course: c.course_name,
                startDate: dateOnly(c.start_date),
                actualStartDate: dateOnly(c.actual_start_date),
                predictedEndDate: dateOnly(c.predicted_end_date),
                actualEndDate: dateOnly(c.actual_end_date),
                schedule: c.schedule,
                duration: c.duration,
                lms_course_id: c.lms_course_id,
                studentsCount: c.students_count || 0,
                evaluationUrl: c.evaluation_pdf_url,
                priceCash: c.price_cash,
                priceCard10x: c.price_card_10x,
                priceBoleto3x: c.price_installments_3x,
                isImmediateStart: c.is_immediate_start,
                instructor_payment_type: c.instructor_payment_type,
                instructor_payment_value: c.instructor_payment_value,
                address: c.address,
                hasInPerson: c.has_in_person,
                inPersonSessions: c.in_person_sessions || 0,
                cep: c.cep || '',
                addressNumber: c.address_number || '',
                addressComplement: c.address_complement || '',
                cardInstallments: c.card_installments || 10,
                boletoInstallments: c.boleto_installments || 1,
                maxCapacity: c.max_capacity || 10,
                practicalStudentsCount: c.practical_confirmed || 0,
                practicalPendingCount: c.practical_pending || 0,
                instructors: c.instructors || []
            }))

            setClasses(formatted)
        } catch (error) {
            console.error('Error fetching classes:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchClasses()
        fetchLmsCourses()
    }, [session])

    // Perfil do usuário vem do contexto de auth (backend Go).
    useEffect(() => {
        if (authProfile) setUserProfile(authProfile)
    }, [authProfile])


    const isWeekend = (dateStr) => {
        if (!dateStr) return false
        const date = new Date(dateStr + 'T12:00:00')
        const day = date.getDay()
        return day === 0 || day === 6
    }

    const handleFormChange = (e) => {
        let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        const name = e.target.name

        // Se for campo de preço, limpar caracteres indesejados (apenas números, ponto e vírgula)
        if (['price_cash', 'price_card_10x', 'price_installments_3x'].includes(name)) {
            // Remove tudo que não for número, ponto ou vírgula
            value = value.replace(/[^0-9.,]/g, '')
            // Substitui vírgula por ponto para o parseFloat do sistema
            value = value.replace(',', '.')
        }

        const updated = { ...formData, [name]: value }

        // Validação reativa do Datepicker para aulas práticas
        if (name === 'start_date' && updated.schedule === 'Aula prática - Final de semana' && value) {
            if (!isWeekend(value)) {
                alert('Atenção: Aulas práticas presenciais só podem ser agendadas aos sábados ou domingos. Selecione um dia válido.')
                updated.start_date = ''
            }
        }
        if (name === 'predicted_end_date' && updated.schedule === 'Aula prática - Final de semana' && value) {
            if (!isWeekend(value)) {
                alert('Atenção: Aulas práticas presenciais só podem ser agendadas aos sábados ou domingos. Selecione um dia válido.')
                updated.predicted_end_date = ''
            }
        }

        // Se o usuário mudar o schedule para "Aula prática - Final de semana", validar se as datas já preenchidas são válidas
        if (name === 'schedule' && value === 'Aula prática - Final de semana') {
            if (updated.start_date && !isWeekend(updated.start_date)) {
                alert('A data de início já preenchida não cai em um fim de semana. Por favor, ajuste-a.')
                updated.start_date = ''
            }
            if (updated.predicted_end_date && !isWeekend(updated.predicted_end_date)) {
                alert('A data de término já preenchida não cai em um fim de semana. Por favor, ajuste-a.')
                updated.predicted_end_date = ''
            }
        }

        if (name === 'lms_course_id') {
            const selectedCourse = lmsCourses.find(course => course.id === value)
            if (selectedCourse) {
                updated.course_name = selectedCourse.title
                const totalHours = (Number(selectedCourse.min_theoretical_hours) || 0) + (Number(selectedCourse.practical_hours) || 0)
                if (totalHours > 0) updated.duration = String(totalHours)
                if (selectedCourse.price_pix) updated.price_cash = String(selectedCourse.price_pix)
                if (selectedCourse.price_card) updated.price_card_10x = String(selectedCourse.price_card)
                if (selectedCourse.price_boleto) updated.price_installments_3x = String(selectedCourse.price_boleto)
                if (selectedCourse.max_installments) updated.card_installments = selectedCourse.max_installments
                if ((Number(selectedCourse.practical_hours) || 0) > 0) updated.has_in_person = true
            } else {
                updated.course_name = ''
            }
        }

        setFormData(updated)
    }

    const handleCepLookup = async () => {
        const cep = String(formData.cep || '').replace(/\D/g, '')
        if (cep.length !== 8) {
            alert('Informe um CEP com 8 números.')
            return
        }
        setCepLoading(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const data = await response.json()
            if (!response.ok || data.erro) throw new Error('CEP não encontrado')
            const address = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean).join(', ')
            setFormData(prev => ({ ...prev, cep, address }))
        } catch (error) {
            alert('Não foi possível localizar o CEP. Você pode preencher o endereço manualmente.')
        } finally {
            setCepLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.course_name || !formData.lms_course_id) {
            alert('Preencha o nome da turma e selecione um curso cadastrado.')
            return
        }

        if (!formData.is_immediate_start && (!formData.start_date || !formData.predicted_end_date)) {
            alert('Informe as datas de início e término ou marque Início imediato.')
            return
        }

        if (formData.has_in_person && (!formData.in_person_sessions || !formData.address)) {
            alert('Informe a quantidade de encontros e o endereço das aulas presenciais.')
            return
        }

        // Verificar se já existe uma turma com o mesmo nome (apenas se for criação nova)
        if (!isEditing) {
            const duplicate = classes.find(c => c.name.trim().toLowerCase() === formData.name.trim().toLowerCase())
            if (duplicate) {
                const proceed = window.confirm(`Já existe uma turma cadastrada com o nome "${formData.name}".\nDeseja continuar mesmo assim?`)
                if (!proceed) return
            }
        }

        // Trava para valores negativos
        if (parseFloat(formData.price_cash) < 0 || parseFloat(formData.price_card_10x) < 0 || parseFloat(formData.price_installments_3x) < 0) {
            alert('Os valores de investimento não podem ser negativos.')
            return
        }

        // Validação estrita para Aulas Práticas de Final de Semana
        if (formData.schedule === 'Aula prática - Final de semana') {
            if (!formData.address || !formData.address.trim()) {
                alert('Erro: O preenchimento manual do endereço é obrigatório para turmas de Aula Prática.')
                return
            }
            if (!formData.is_immediate_start) {
                if (formData.start_date && !isWeekend(formData.start_date)) {
                    alert('Erro: A data de início da aula prática deve ser em um sábado ou domingo.')
                    return
                }
                if (formData.predicted_end_date && !isWeekend(formData.predicted_end_date)) {
                    alert('Erro: A data de término da aula prática deve ser em um sábado ou domingo.')
                    return
                }
            }
        }

        // Validação Inteligente de Carga Horária vs Dias Úteis (Motor Fase 16)
        const isTreinamentoLivre = formData.course_name.toLowerCase().includes('treinamento')

        if (!isTreinamentoLivre && !formData.is_immediate_start && formData.start_date && formData.predicted_end_date && formData.schedule && formData.duration) {
            const isSaturday = formData.schedule.toLowerCase().includes('sabado') || formData.schedule.toLowerCase().includes('sábado')
            const applicableDays = countCourseDays(formData.start_date, formData.predicted_end_date, isSaturday)

            // Seg-Sex tem 4h por dia. Sábado Integral tem 8h líquidas por dia (9h bruto - 1h almoço)
            const hoursPerDay = isSaturday ? 8 : 4
            const availableHours = applicableDays * hoursPerDay
            const targetHours = parseInt(formData.duration.replace(/\D/g, '')) || 0

            if (availableHours < targetHours) {
                const proceed = window.confirm(`ATENÇÃO CONFLITO DE GRADE!\n\nO período selecionado contém apenas ${applicableDays} dias de aula (Grade: ${isSaturday ? 'Sábados' : 'Seg-Sex'}), totalizando ${availableHours} horas (base ${hoursPerDay}h/dia).\nMas a duração do curso exige ${targetHours} horas.\n\nDeseja ignorar o alerta e criar a turma mesmo assim?`)
                if (!proceed) return
            }
        }

        let finalLmsId = formData.lms_course_id || null

        // TODO(LMS): criação automática de curso EAD será religada quando o
        // domínio LMS for migrado para a API Go. Por ora, apenas vincula um
        // curso existente (se selecionado) e ignora a criação automática.

        const toApiDate = value => value ? `${value}T12:00:00Z` : null
        const newClass = {
            name: formData.name,
            course_name: formData.course_name,
            start_date: formData.is_immediate_start ? null : toApiDate(formData.start_date),
            predicted_end_date: formData.is_immediate_start ? null : toApiDate(formData.predicted_end_date),
            schedule: formData.schedule,
            duration: formData.duration,
            lms_course_id: finalLmsId,
            price_cash: formData.price_cash ? parseFloat(formData.price_cash) : 0,
            price_card_10x: formData.price_card_10x ? parseFloat(formData.price_card_10x) : 0,
            price_installments_3x: formData.price_installments_3x ? parseFloat(formData.price_installments_3x) : 0,
            is_immediate_start: formData.is_immediate_start || false,
            instructor_payment_type: formData.instructor_payment_type,
            instructor_payment_value: parseFloat(formData.instructor_payment_value) || 0,
            address: formData.address || null,
            has_in_person: !!formData.has_in_person,
            in_person_sessions: formData.has_in_person ? (parseInt(formData.in_person_sessions) || 0) : 0,
            cep: formData.has_in_person ? String(formData.cep || '').replace(/\D/g, '') || null : null,
            address_number: formData.has_in_person ? formData.address_number || null : null,
            address_complement: formData.has_in_person ? formData.address_complement || null : null,
            card_installments: parseInt(formData.card_installments) || 1,
            boleto_installments: parseInt(formData.boleto_installments) || 1,
            max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : 10,
            actual_start_date: (formData.is_past_class && formData.actual_start_date) ? toApiDate(formData.actual_start_date) : null,
            actual_end_date: (formData.is_past_class && formData.actual_end_date) ? toApiDate(formData.actual_end_date) : null
        }

        if (isEditing && editingId) {
            try {
                await classesApi.update(editingId, newClass)
                alert('Turma atualizada com sucesso!')
                finishEditing()
                fetchClasses()
            } catch (error) {
                alert('Erro ao atualizar turma: ' + error.message)
            }
        } else {
            try {
                await classesApi.create(newClass)
                alert('Turma criada com sucesso!')
                setView('list')
                setFormData({
                    name: '', course_name: '', start_date: '', predicted_end_date: '', schedule: '', duration: '', lms_course_id: '',
                    price_cash: '', price_card_10x: '', price_installments_3x: '',
                    is_immediate_start: false,
                    instructor_payment_type: 'fixed',
                    instructor_payment_value: 0,
                    create_lms_integration: false,
                    address: '',
                    has_in_person: false, in_person_sessions: 0, cep: '', address_number: '', address_complement: '',
                    card_installments: 10, boleto_installments: 1,
                    max_capacity: 10,
                    is_past_class: false,
                    actual_start_date: '',
                    actual_end_date: ''
                })
                fetchClasses()
            } catch (error) {
                alert('Erro ao criar turma: ' + error.message)
            }
        }
    }

    const handleEditClass = (turma) => {
        setFormData({
            name: turma.name,
            course_name: turma.course,
            start_date: turma.startDate || '',
            predicted_end_date: turma.predictedEndDate || '',
            schedule: turma.schedule || '',
            duration: turma.duration || '',
            lms_course_id: turma.lms_course_id || '',
            price_cash: turma.priceCash || '',
            price_card_10x: turma.priceCard10x || '',
            price_installments_3x: turma.priceBoleto3x || '',
            is_immediate_start: turma.isImmediateStart || false,
            instructor_payment_type: turma.instructor_payment_type || 'fixed',
            instructor_payment_value: turma.instructor_payment_value || 0,
            create_lms_integration: !!turma.lms_course_id,
            address: turma.address || '',
            has_in_person: turma.hasInPerson || false,
            in_person_sessions: turma.inPersonSessions || 0,
            cep: turma.cep || '',
            address_number: turma.addressNumber || '',
            address_complement: turma.addressComplement || '',
            card_installments: turma.cardInstallments || 10,
            boleto_installments: turma.boletoInstallments || 1,
            max_capacity: turma.maxCapacity || 10,
            is_past_class: !!(turma.actualStartDate && turma.actualEndDate),
            actual_start_date: turma.actualStartDate || '',
            actual_end_date: turma.actualEndDate || ''
        })
        setIsEditing(true)
        setEditingId(turma.id)
        setView('add')
    }

    const handleNewClass = () => {
        setFormData({
            name: generateNextClassName(classes),
            course_name: '',
            start_date: '', predicted_end_date: '', schedule: 'Seg a Sex 19h as 21h', duration: '',
            lms_course_id: '',
            price_cash: '', price_card_10x: '', price_installments_3x: '',
            is_immediate_start: false,
            instructor_payment_type: 'fixed',
            instructor_payment_value: 0,
            create_lms_integration: false,
            address: '',
            has_in_person: false, in_person_sessions: 0, cep: '', address_number: '', address_complement: '',
            card_installments: 10, boleto_installments: 1,
            max_capacity: 10,
            is_past_class: false,
            actual_start_date: '',
            actual_end_date: ''
        })
        setIsEditing(false)
        setEditingId(null)
        setView('add')
    }

    const handleDeleteClass = async (classId, className) => {
        // O backend bloqueia se houver aluno ativo (409) e desvincula os cancelados.
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a turma "${className}"?\n\nEsta ação não pode ser desfeita.`)) return
        try {
            await classesApi.remove(classId)
            alert('Turma excluída com sucesso!')
            fetchClasses()
        } catch (err) {
            if (err.status === 409) {
                alert(`Não é possível excluir a turma "${className}": existem alunos ativos matriculados. Transfira ou cancele as matrículas primeiro.`)
            } else {
                alert('Erro ao excluir turma: ' + err.message)
            }
        }
    }

    const finishEditing = () => {
        setView('list')
        setIsEditing(false)
        setEditingId(null)
        setFormData({
            name: '', course_name: '', start_date: '', predicted_end_date: '', schedule: '', duration: '', lms_course_id: '',
            price_cash: '', price_card_10x: '', price_installments_3x: '',
            is_immediate_start: false,
            address: '',
            has_in_person: false, in_person_sessions: 0, cep: '', address_number: '', address_complement: '',
            card_installments: 10, boleto_installments: 1,
            max_capacity: 10,
            is_past_class: false,
            actual_start_date: '',
            actual_end_date: ''
        })
    }

    const handleStartClass = (classId, className) => {
        setDateModalConfig({
            title: `Iniciar Turma: ${className}`,
            label: 'Data Real de Início',
            initialDate: new Date().toISOString().split('T')[0],
            onSave: async (dateToSave) => {
                try { await classesApi.update(classId, { actual_start_date: dateToSave }); alert('Marcada como Em Andamento!'); fetchClasses(); }
                catch (error) { alert('Erro ao iniciar turma: ' + error.message) }
            }
        })
        setModalDateValue(new Date().toISOString().split('T')[0])
        setShowDateModal(true)
    }

    const handleDelayClass = (classId, className) => {
        setDateModalConfig({
            title: `Atrasar Turma: ${className}`,
            label: 'Nova Data Prevista para Início',
            initialDate: new Date().toISOString().split('T')[0],
            onSave: async (nextDate) => {
                try { await classesApi.update(classId, { start_date: nextDate }); alert('Previsão atualizada!'); fetchClasses(); }
                catch (error) { alert('Erro ao atualizar: ' + error.message) }
            }
        })
        setModalDateValue(new Date().toISOString().split('T')[0])
        setShowDateModal(true)
    }

    const handleEndClass = (classId, className) => {
        setDateModalConfig({
            title: `Encerrar Turma: ${className}`,
            label: 'Data Real de Término',
            initialDate: new Date().toISOString().split('T')[0],
            onSave: async (dateToSave) => {
                try { await classesApi.update(classId, { actual_end_date: dateToSave }); alert('Turma finalizada e arquivada!'); fetchClasses(); }
                catch (error) { alert('Erro ao encerrar turma: ' + error.message) }
            }
        })
        setModalDateValue(new Date().toISOString().split('T')[0])
        setShowDateModal(true)
    }

    const handleOpenScheduling = async (turma) => {
        setSelectedSchedulingClass(turma)
        setShowSchedulingModal(true)
        setSchedulingLoading(true)
        setSchedulingSearch('')
        setSchedulingCourseFilter('todos')
        await loadSchedulingData(turma.id)
    }

    const loadSchedulingData = async (classId) => {
        try {
            const { students: scheduledData } = await studentsApi.list({ practical_class_id: classId })
            setScheduledStudents(scheduledData || [])

            const { students: availableData } = await studentsApi.list({ status: 'ativa', practical_null: 'true' })
            setAvailableStudents(availableData || [])
        } catch (err) {
            console.error('Erro ao carregar dados de agendamento:', err)
        } finally {
            setSchedulingLoading(false)
        }
    }

    const handleConfirmRequest = async (student, classId, maxCapacity, confirmedCount) => {
        if (confirmedCount >= maxCapacity) {
            const confirmOverbooking = window.confirm(`Atenção: A capacidade máxima desta aula prática (${maxCapacity} alunos) já foi atingida.\n\nDeseja aprovar esta solicitação como overbooking?`)
            if (!confirmOverbooking) return
        }

        setSchedulingActionLoading(student.id)
        try {
            await studentsApi.update(student.id, { practical_class_status: 'confirmado' })
            await loadSchedulingData(classId)
            fetchClasses()
        } catch (err) {
            alert('Erro ao confirmar solicitação: ' + err.message)
        } finally {
            setSchedulingActionLoading(null)
        }
    }

    const handleScheduleStudent = async (student, classId, maxCapacity, confirmedCount, targetStatus = 'confirmado') => {
        if (targetStatus === 'confirmado' && confirmedCount >= maxCapacity) {
            const confirmOverbooking = window.confirm(`Atenção: A capacidade máxima desta aula prática (${maxCapacity} alunos) já foi atingida.\n\nDeseja confirmar este agendamento como overbooking?`)
            if (!confirmOverbooking) return
        }

        setSchedulingActionLoading(student.id)
        try {
            await studentsApi.update(student.id, { practical_class_id: classId, practical_class_status: targetStatus })
            await loadSchedulingData(classId)
            fetchClasses()
        } catch (err) {
            alert('Erro ao agendar: ' + err.message)
        } finally {
            setSchedulingActionLoading(null)
        }
    }

    const handleUnscheduleStudent = async (studentId, classId) => {
        if (!window.confirm('Remover este aluno do agendamento prático deste final de semana?')) return

        setSchedulingActionLoading(studentId)
        try {
            await studentsApi.update(studentId, { practical_class_id: null })
            await loadSchedulingData(classId)
            fetchClasses()
        } catch (err) {
            alert('Erro ao remover agendamento: ' + err.message)
        } finally {
            setSchedulingActionLoading(null)
        }
    }

    const toggleStudentEad = async (studentId, currentStatus) => {
        try {
            await studentsApi.update(studentId, { has_lms_access: !currentStatus })
            setClassStudents(prev => prev.map(s => s.id === studentId ? { ...s, has_lms_access: !currentStatus } : s))
        } catch {
            alert('Erro ao atualizar acesso EAD')
        }
    }

    const handleEvalUpload = async (classId, file) => {
        if (!file) return
        try {
            const { url } = await uploadFile(file, 'evaluations')
            await classesApi.update(classId, { evaluation_pdf_url: url })
            alert('Avaliação da turma enviada com sucesso!')
            fetchClasses()
        } catch (error) {
            console.error('Erro no upload da avaliação:', error)
            alert('Falha ao enviar avaliação: ' + error.message)
        }
    }

    const handleOpenClassStudents = async (turma) => {
        setSelectedClassData(turma)
        setModalLoading(true)
        try {
            const { students } = await classesApi.classStudents(turma.id)
            setClassStudents(students || [])
        } catch {
            alert("Erro ao buscar alunos da turma.")
        }
        setModalLoading(false)
    }

    const printClassReport = (turma, includeGrades) => {
        const payload = {
            name: turma.name,
            course: turma.course,
            startDate: turma.startDate,
            predictedEndDate: turma.predictedEndDate,
            includeGrades: includeGrades,
            students: classStudents
        }
        generateDocument('relatorio_turma', payload)
    }

    const renderList = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Gestão de Turmas</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    <button className={`btn ${showPast ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowPast(!showPast)}>
                        {showPast ? 'Ver Apenas Ativas' : 'Ver Todas (Incluindo Passadas)'}
                    </button>
                    <button className="btn btn-primary" onClick={handleNewClass}>
                        <BookOpen size={16} /> Nova Turma
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando dados da Nuvem...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {classes
                        .filter(t => showPast || !t.actualEndDate)
                        .map(turma => (
                            <div key={turma.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{turma.name}</h3>
                                        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Curso: {turma.course}</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        {turma.schedule === 'Aula prática - Final de semana' ? (
                                            <span style={{
                                                backgroundColor: turma.practicalPendingCount > 0 ? '#FEF3C7' : '#fee2e2',
                                                color: turma.practicalPendingCount > 0 ? '#92400E' : '#991b1b',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                                            }}>
                                                <Users size={14} /> Agendados: {turma.practicalStudentsCount}/{turma.maxCapacity} {turma.practicalPendingCount > 0 ? '(' + turma.practicalPendingCount + ' pendente)' : ''}
                                            </span>
                                        ) : (
                                            <span style={{
                                                backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.25rem 0.75rem',
                                                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                                            }}>
                                                <Users size={14} /> {turma.studentsCount} Alunos
                                            </span>
                                        )}
                                        {(userProfile?.role === 'admin' || userProfile?.role === 'coordenador' || userProfile?.role === 'atendente') && (
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem', height: 'auto' }} onClick={() => handleEditClass(turma)} title="Editar Turma">
                                                    <Edit size={14} />
                                                </button>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem', height: 'auto', color: 'var(--danger)' }} onClick={() => handleDeleteClass(turma.id, turma.name)} title="Excluir Turma">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {turma.duration && (
                                    <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                        {turma.isImmediateStart ? (
                                            <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: '#ECFDF5', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                                                <p style={{ fontWeight: 600, color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                    <Clock size={16} /> Início Imediato (Sem datas fixas)
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <CalendarIcon size={16} className="text-primary" />
                                                    <div>
                                                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Início (Previsto vs Real)</p>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                                            <p className="text-muted" style={{ textDecoration: turma.actualStartDate ? 'line-through' : 'none' }}>
                                                                {turma.startDate ? new Date(turma.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                                            </p>
                                                            {turma.actualStartDate && (
                                                                <span style={{ color: '#065F46', fontWeight: 600 }}>{new Date(turma.actualStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Clock size={16} className={turma.actualEndDate ? "text-success" : "text-warning"} />
                                                    <div>
                                                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Término ({turma.actualEndDate ? 'Real / Fechado' : 'Previsão'})</p>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                                            <p className="text-muted" style={{ textDecoration: turma.actualEndDate ? 'line-through' : 'none' }}>
                                                                {turma.predictedEndDate ? new Date(turma.predictedEndDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                                            </p>
                                                            {turma.actualEndDate && (
                                                                <span style={{ color: '#065F46', fontWeight: 600 }}>{new Date(turma.actualEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {turma.schedule === 'Aula prática - Final de semana' && (
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: '100%', justifyContent: 'center', backgroundColor: 'var(--primary)', color: 'white', fontWeight: 'bold' }}
                                            onClick={() => handleOpenScheduling(turma)}
                                        >
                                            <Users size={16} /> Gerenciar Agendamento ({turma.practicalStudentsCount}/{turma.maxCapacity}){turma.practicalPendingCount > 0 ? ' [' + turma.practicalPendingCount + ' Novo]' : ''}
                                        </button>
                                    )}
                                    {turma.duration && !turma.actualStartDate && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn" style={{ flex: 3, justifyContent: 'center', backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }} onClick={() => handleStartClass(turma.id, turma.name)}>
                                                <CalendarIcon size={16} /> Marcar Início Oficial
                                            </button>
                                            {(turma.startDate && new Date(turma.startDate + 'T00:00:00') < new Date().setHours(0, 0, 0, 0)) && (
                                                <button className="btn" title="Adiar Início" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' }} onClick={() => handleDelayClass(turma.id, turma.name)}>
                                                    <Clock size={16} /> Adiar
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {(turma.actualStartDate && !turma.actualEndDate) && (
                                        <button className="btn" style={{ justifyContent: 'center', backgroundColor: '#FEF2F2', color: '#991B1B', borderColor: '#FECACA' }} onClick={() => handleEndClass(turma.id, turma.name)}>
                                            <Clock size={16} /> Encerrar e Fechar Turma
                                        </button>
                                    )}
                                    {turma.actualEndDate && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {turma.evaluationUrl ? (
                                                <a href={turma.evaluationUrl} target="_blank" rel="noreferrer" className="btn" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0', textDecoration: 'none', fontSize: '0.85rem' }}>
                                                    <FileText size={16} /> Ver Avaliação
                                                </a>
                                            ) : (
                                                <label className="btn" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F8FAFC', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                    <UploadCloud size={16} /> Anexar Avaliação (PDF)
                                                    <input type="file" hidden accept=".pdf" onChange={(e) => handleEvalUpload(turma.id, e.target.files[0])} />
                                                </label>
                                            )}
                                        </div>
                                    )}
                                    {turma.instructors && turma.instructors.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                            {turma.instructors.map(inst => (
                                                <span key={inst.id} style={{
                                                    fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem',
                                                    borderRadius: '999px',
                                                    backgroundColor: inst.role === 'titular' ? '#ECFDF5' : '#FEF3C7',
                                                    color: inst.role === 'titular' ? '#065F46' : '#92400E',
                                                    border: `1px solid ${inst.role === 'titular' ? '#A7F3D0' : '#FDE68A'}`,
                                                    display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                }}>
                                                    <GraduationCap size={11} />
                                                    {inst.user?.full_name} ({inst.role})
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleOpenClassStudents(turma)}>
                                            <Users size={16} /> Alunos
                                        </button>
                                        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                                            <LogIn size={16} /> Fichário
                                        </button>
                                        <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F0F9FF', color: '#0369A1', borderColor: '#BAE6FD' }} onClick={() => openInstructorModal(turma)}>
                                            <GraduationCap size={16} /> Instrutores
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                    <div className="card" onClick={handleNewClass} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <BookOpen size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <p style={{ fontWeight: 600 }}>Abrir Nova Turma</p>
                        <button className="btn btn-secondary" style={{ marginTop: '1rem' }}>Configurar Grade</button>
                    </div>
                </div>
            )}

            {/* MODAL: ALUNOS DA TURMA E RELATÓRIOS */}
            {selectedClassData && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, padding: '1rem', paddingTop: '5vh' }}>
                    <div className="card animate-fade-in" style={{ width: '800px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Relatório da Turma: {selectedClassData.name}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{selectedClassData.course}</p>
                            </div>
                            <button className="btn" style={{ padding: '0.5rem', backgroundColor: '#F1F5F9', color: 'var(--text-secondary)' }} onClick={() => setSelectedClassData(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Ações de Impressão */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }} onClick={() => printClassReport(selectedClassData, false)}>
                                <Printer size={18} /> Relatório Padrão (Sem Notas)
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => printClassReport(selectedClassData, true)}>
                                <FileText size={18} /> Relatório Gerencial (Com Notas e Faltas)
                            </button>
                        </div>

                        {/* Tabela de Preview dos Alunos */}
                        {modalLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando vínculos...</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', minWidth: '480px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '0.75rem' }}>Nome do Aluno(a)</th>
                                        <th style={{ padding: '0.75rem' }}>CPF</th>
                                        <th style={{ padding: '0.75rem' }}>Manual?</th>
                                        <th style={{ padding: '0.75rem' }}>Acesso EAD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classStudents.map(st => (
                                        <tr key={st.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: st.status === 'cancelada' ? 0.65 : 1, backgroundColor: st.status === 'cancelada' ? '#FFF5F5' : 'transparent' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {st.full_name}
                                                {st.status === 'cancelada' && (
                                                    <span style={{
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '999px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        backgroundColor: '#FEE2E2',
                                                        color: '#991B1B',
                                                        border: '1px solid #FCA5A5'
                                                    }}>
                                                        Cancelado
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{st.cpf}</td>
                                            <td style={{ padding: '0.75rem' }}>{st.manual_signed ? 'Sim' : 'Não'}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {st.status === 'cancelada' ? (
                                                    <span style={{
                                                        padding: '0.25rem 0.75rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: '#dc2626',
                                                        backgroundColor: '#fee2e2',
                                                        borderRadius: '6px',
                                                        display: 'inline-block',
                                                        border: '1px solid #fca5a5'
                                                    }}>
                                                        Bloqueado (Cancelado)
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => toggleStudentEad(st.id, st.has_lms_access)}
                                                        className={`btn ${st.has_lms_access ? 'btn-success' : 'btn-secondary'}`}
                                                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                                    >
                                                        {st.has_lms_access ? 'Ativado' : 'Inativo'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {classStudents.length === 0 && (
                                        <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum aluno matriculado nesta turma ainda.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                </div>
            ), document.body)}

            {/* MODAL: GERENCIAR INSTRUTORES DA TURMA */}
            {instructorModal && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, padding: '1rem', paddingTop: '5vh' }}>
                    <div className="card animate-fade-in" style={{ width: '560px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <GraduationCap size={20} /> Instrutores da Turma
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    {instructorModal.name} — {instructorModal.course}
                                </p>
                            </div>
                            <button className="btn" style={{ padding: '0.5rem', backgroundColor: '#F1F5F9', color: 'var(--text-secondary)' }} onClick={() => setInstructorModal(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Adicionar novo instrutor */}
                        <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                            <p style={{ fontWeight: 600, color: '#0369A1', marginBottom: '0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserPlus size={16} /> Vincular Instrutor
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <select
                                    className="form-control"
                                    style={{ flex: 2, minWidth: '180px' }}
                                    value={newInstructorId}
                                    onChange={e => setNewInstructorId(e.target.value)}
                                >
                                    <option value="">Selecione o instrutor...</option>
                                    {availableInstructors.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name}</option>
                                    ))}
                                </select>
                                <select
                                    className="form-control"
                                    style={{ flex: 1, minWidth: '120px' }}
                                    value={newInstructorRole}
                                    onChange={e => setNewInstructorRole(e.target.value)}
                                >
                                    <option value="titular">Titular</option>
                                    <option value="substituto">Substituto</option>
                                </select>
                                <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleAddInstructor}>
                                    <UserPlus size={16} /> Vincular
                                </button>
                            </div>
                        </div>

                        {/* Lista de instrutores vinculados */}
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Instrutores Vinculados
                        </h4>
                        {instructorModalLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando...</div>
                        ) : classInstructors.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                                <GraduationCap size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                <p style={{ fontSize: '0.875rem' }}>Nenhum instrutor vinculado a esta turma.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {classInstructors.map(inst => (
                                    <div key={inst.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                                        backgroundColor: inst.role === 'titular' ? '#ECFDF5' : '#FEF3C7',
                                        border: `1px solid ${inst.role === 'titular' ? '#A7F3D0' : '#FDE68A'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <GraduationCap size={18} style={{ color: inst.role === 'titular' ? '#065F46' : '#92400E' }} />
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{inst.user?.full_name}</p>
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                                    color: inst.role === 'titular' ? '#065F46' : '#92400E'
                                                }}>{inst.role}</span>
                                            </div>
                                        </div>
                                        <button
                                            className="btn"
                                            style={{ padding: '0.3rem 0.6rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA', fontSize: '0.75rem' }}
                                            onClick={() => handleRemoveInstructor(inst.id)}
                                            title="Remover instrutor"
                                        >
                                            <UserMinus size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ), document.body)}
        </div>
    )

    const renderAddForm = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <button className="btn btn-secondary" style={{ marginBottom: '1rem' }} onClick={finishEditing}>&larr; Voltar</button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? `Editando Turma: ${editingId}` : 'Nova Grade de Turma'}</h2>
                </div>
                <button className="btn btn-primary" onClick={handleSubmit}>{isEditing ? 'Atualizar Alterações' : 'Salvar Turma (Nuvem)'}</button>
            </div>

            <div className="card">
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>1. Identificação e Curso</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Nome da Turma (Ex: T01/26)</label>
                        <input type="text" className="form-control" name="name" value={formData.name} onChange={handleFormChange} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gerado automaticamente pelo sistema, mas pode ser alterado se necessário.</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Vincular curso cadastrado *</label>
                        <select className="form-control" name="lms_course_id" value={formData.lms_course_id} onChange={handleFormChange} required>
                            <option value="">Selecione o curso...</option>
                            {lmsCourses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.code ? `${course.code} — ` : ''}{course.title}
                                </option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            A carga horária e os valores serão preenchidos a partir do curso e poderão ser ajustados para esta turma.
                        </span>
                    </div>
                    <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', margin: '1rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>2. Período da Turma</h3>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '1.5rem' }}>
                        <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_immediate_start"
                                checked={formData.is_immediate_start}
                                onChange={handleFormChange}
                                style={{ width: '1.25rem', height: '1.25rem' }}
                            />
                            Turma de Início Imediato?
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Oculta datas de início/fim)</span>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingTop: '1.5rem' }}>
                        <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_past_class"
                                checked={formData.is_past_class}
                                onChange={handleFormChange}
                                style={{ width: '1.25rem', height: '1.25rem' }}
                            />
                            Esta turma já aconteceu (Histórica/Passada)?
                        </label>
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            {formData.schedule === 'Aula prática - Final de semana' ? 'Data da Aula Prática (Sábado ou Domingo)' : 'Data de Início Programado'}
                        </label>
                        <input type="date" className="form-control" name="start_date" value={formData.start_date} onChange={handleFormChange} disabled={formData.is_immediate_start} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            {formData.schedule === 'Aula prática - Final de semana' ? 'Previsão de Término (Sábado ou Domingo)' : 'Previsão de Término'}
                        </label>
                        <input type="date" className="form-control" name="predicted_end_date" value={formData.predicted_end_date} onChange={handleFormChange} disabled={formData.is_immediate_start} />
                    </div>

                    {formData.is_past_class && (
                        <>
                            <div className="form-group animate-fade-in">
                                <label className="form-label" style={{ color: 'var(--danger)', fontWeight: 700 }}>Data Real de Início *</label>
                                <input type="date" className="form-control" name="actual_start_date" value={formData.actual_start_date} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group animate-fade-in">
                                <label className="form-label" style={{ color: 'var(--danger)', fontWeight: 700 }}>Data Real de Término *</label>
                                <input type="date" className="form-control" name="actual_end_date" value={formData.actual_end_date} onChange={handleFormChange} required />
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label className="form-label">Horários Base</label>
                        <select className="form-control" name="schedule" value={formData.schedule} onChange={handleFormChange}>
                            <option value="">Selecione (Ou digite se for Treinamento)</option>
                            <option value="Seg a Sex 19h as 21h">Seg a Sex 19h às 21h</option>
                            <option value="Seg a Sex 20h as 22h">Seg a Sex 20h às 22h</option>
                            <option value="Seg a Sex 18h as 22h">Seg a Sex 18h às 22h</option>
                            <option value="Sabado 08h as 17h">Sábado 08h às 17h (Integral)</option>
                            <option value="Aula prática - Final de semana">Aula prática - Final de semana</option>
                        </select>
                        {formData.course_name.toLowerCase().includes('treinamento') && (
                            <input type="text" className="form-control" style={{ marginTop: '0.5rem' }} name="schedule" value={formData.schedule} onChange={handleFormChange} placeholder="Ou digite o horário flexível aqui" />
                        )}
                    </div>
                    <div className="form-group"><label className="form-label">Carga Horária (Duração)</label><input type="text" className="form-control" name="duration" value={formData.duration} onChange={handleFormChange} placeholder="Ex: 80 horas" /></div>
                    <div className="form-group">
                        <label className="form-label">Capacidade Máxima de Vagas</label>
                        <input 
                            type="number" 
                            className="form-control" 
                            name="max_capacity" 
                            value={formData.max_capacity || ''} 
                            onChange={handleFormChange} 
                            placeholder="Ex: 10" 
                            min="1"
                        />
                    </div>
                    <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', margin: '1rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>3. Aulas Presenciais</h3>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                            <input type="checkbox" name="has_in_person" checked={formData.has_in_person} onChange={handleFormChange} />
                            Esta turma possui aula presencial ou prática
                        </label>
                    </div>
                    {formData.has_in_person && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Quantidade de encontros presenciais *</label>
                                <input type="number" min="1" className="form-control" name="in_person_sessions" value={formData.in_person_sessions || ''} onChange={handleFormChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CEP *</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" inputMode="numeric" maxLength="9" className="form-control" name="cep" value={formData.cep} onChange={handleFormChange} placeholder="00000-000" />
                                    <button type="button" className="btn btn-secondary" onClick={handleCepLookup} disabled={cepLoading}>{cepLoading ? 'Buscando...' : 'Buscar'}</button>
                                </div>
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Endereço *</label>
                                <input type="text" className="form-control" name="address" value={formData.address} onChange={handleFormChange} placeholder="Logradouro, bairro, cidade e UF" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Número</label>
                                <input type="text" className="form-control" name="address_number" value={formData.address_number} onChange={handleFormChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Complemento</label>
                                <input type="text" className="form-control" name="address_complement" value={formData.address_complement} onChange={handleFormChange} placeholder="Sala, bloco ou referência" />
                            </div>
                        </>
                    )}
                    <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', margin: '1rem 0 0', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>4. Pagamento do Aluno</h3>
                    <div className="form-group">
                        <label className="form-label">Preço À Vista (R$)</label>
                        <input
                            type="text"
                            className="form-control"
                            name="price_cash"
                            value={formData.price_cash}
                            onChange={handleFormChange}
                            placeholder="Ex: 3300.00"
                            onKeyDown={(e) => {
                                if (['e', 'E', '+', '-', '*'].includes(e.key)) e.preventDefault();
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Valor total no Cartão (R$)</label>
                        <input
                            type="text"
                            className="form-control"
                            name="price_card_10x"
                            value={formData.price_card_10x}
                            onChange={handleFormChange}
                            placeholder="Ex: 3800.00"
                            onKeyDown={(e) => {
                                if (['e', 'E', '+', '-', '*'].includes(e.key)) e.preventDefault();
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Parcelas no Cartão</label>
                        <input type="number" min="1" max="24" className="form-control" name="card_installments" value={formData.card_installments} onChange={handleFormChange} />
                        {Number(formData.price_card_10x) > 0 && Number(formData.card_installments) > 0 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {formData.card_installments}x de R$ {(Number(formData.price_card_10x) / Number(formData.card_installments)).toFixed(2).replace('.', ',')}
                            </span>
                        )}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Valor total no Boleto (R$)</label>
                        <input
                            type="text"
                            className="form-control"
                            name="price_installments_3x"
                            value={formData.price_installments_3x}
                            onChange={handleFormChange}
                            placeholder="Ex: 3750.00"
                            onKeyDown={(e) => {
                                if (['e', 'E', '+', '-', '*'].includes(e.key)) e.preventDefault();
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Parcelas no Boleto</label>
                        <input type="number" min="1" max="24" className="form-control" name="boleto_installments" value={formData.boleto_installments} onChange={handleFormChange} />
                    </div>
                </div>

                <h3 style={{ fontSize: '1.125rem', marginTop: '2rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>5. Pagamento do Instrutor</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Tipo de Pagamento</label>
                        <select className="form-control" name="instructor_payment_type" value={formData.instructor_payment_type} onChange={handleFormChange}>
                            <option value="fixed">Valor Fixo (Salário/Hora)</option>
                            <option value="split">Rateio de Lucro (50% após despesas)</option>
                        </select>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Defina como o professor titular desta turma será remunerado.</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            {formData.instructor_payment_type === 'fixed' ? 'Valor do Pagamento (R$)' : 'Percentual de Rateio (%)'}
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            name="instructor_payment_value"
                            value={formData.instructor_payment_value}
                            onChange={handleFormChange}
                            placeholder={formData.instructor_payment_type === 'fixed' ? "Ex: 1500" : "Ex: 50"}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setView('list')}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSubmit}>Salvar Turma (Nuvem)</button>
            </div>
        </div>
    )

    return (
        <div className="turmas-container">
            {view === 'list' && renderList()}
            {view === 'add' && renderAddForm()}

            {/* MODAL DE DATA UNIVERSAL */}
            {showDateModal && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: 'auto' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>{dateModalConfig.title}</h3>
                        <div className="form-group">
                            <label className="form-label">{dateModalConfig.label}</label>
                            <input
                                type="date"
                                className="form-control"
                                value={modalDateValue}
                                onChange={e => setModalDateValue(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowDateModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={() => {
                                dateModalConfig.onSave(modalDateValue)
                                setShowDateModal(false)
                            }}>Confirmar Data</button>
                        </div>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL GESTÃO DE AGENDAMENTO PRÁTICO (FIM DE SEMANA) */}
            {showSchedulingModal && selectedSchedulingClass && createPortal((
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', overflow: 'hidden' }} className="animate-scale-up">
                        
                        {/* Header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    👥 Agendamento de Alunos - Aula Prática
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                    Turma: <strong>{selectedSchedulingClass.name}</strong> | Data: {selectedSchedulingClass.startDate ? new Date(selectedSchedulingClass.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Flexível'} | Capacidade: <strong>{selectedSchedulingClass.maxCapacity} vagas</strong>
                                </p>
                            </div>
                            <button onClick={() => setShowSchedulingModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>

                        {/* Corpo do Modal dividido em 2 painéis */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: '400px' }} className="scheduling-layout">
                            
                            {/* Painel Esquerdo: Alunos Agendados (Confirmados e Pendentes) */}
                            {(() => {
                                const pendentes = scheduledStudents.filter(s => s.practical_class_status === 'pendente');
                                const confirmados = scheduledStudents.filter(s => s.practical_class_status === 'confirmado');
                                const totalConfirmados = confirmados.length;
                                
                                return (
                                    <div style={{ width: '45%', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
                                        
                                        {/* Status de Ocupação Geral */}
                                        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '750', color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>Vagas Ocupadas</span>
                                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', backgroundColor: totalConfirmados > selectedSchedulingClass.maxCapacity ? '#fee2e2' : '#e0f2fe', color: totalConfirmados > selectedSchedulingClass.maxCapacity ? '#ef4444' : '#0369a1' }}>
                                                    {totalConfirmados} / {selectedSchedulingClass.maxCapacity} vagas
                                                </span>
                                            </h4>
                                        </div>
                                        
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            
                                            {/* Seção 1: Solicitações Pendentes (Alunos que se agendaram) */}
                                            {pendentes.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        ⚠️ Solicitações Pendentes ({pendentes.length})
                                                    </h5>
                                                    {pendentes.map(st => (
                                                        <div key={st.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                            <div style={{ minWidth: 0 }}>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.full_name}</p>
                                                                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>CPF: {st.cpf}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                                <button 
                                                                    onClick={() => handleUnscheduleStudent(st.id, selectedSchedulingClass.id)}
                                                                    disabled={schedulingActionLoading === st.id}
                                                                    style={{ padding: '3px 8px', fontSize: '0.72rem', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                                >
                                                                    Recusar
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleConfirmRequest(st, selectedSchedulingClass.id, selectedSchedulingClass.maxCapacity, totalConfirmados)}
                                                                    disabled={schedulingActionLoading === st.id}
                                                                    style={{ padding: '3px 8px', fontSize: '0.72rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}
                                                                >
                                                                    {schedulingActionLoading === st.id ? <Loader2 size={10} className="animate-spin" /> : null} Confirmar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Seção 2: Confirmados */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', fontWeight: '850', color: '#475569', textTransform: 'uppercase' }}>
                                                    Confirmados ({totalConfirmados})
                                                </h5>
                                                
                                                {totalConfirmados === 0 ? (
                                                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                                        Nenhum aluno confirmado nesta data.
                                                    </div>
                                                ) : (
                                                    confirmados.map(st => (
                                                        <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.full_name}</p>
                                                                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>CPF: {st.cpf}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleUnscheduleStudent(st.id, selectedSchedulingClass.id)}
                                                                disabled={schedulingActionLoading === st.id}
                                                                style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }}
                                                            >
                                                                {schedulingActionLoading === st.id ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />} Remover
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {scheduledStudents.length === 0 && (
                                                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                    Nenhum aluno agendado ou pendente para este final de semana.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Painel Direito: Buscar e Adicionar Alunos */}
                            <div style={{ width: '55%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '750', color: '#1e293b' }}>Buscar Alunos Aptos</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Buscar por nome ou CPF..." 
                                            value={schedulingSearch}
                                            onChange={e => setSchedulingSearch(e.target.value)}
                                            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                        />
                                        <select
                                            value={schedulingCourseFilter}
                                            onChange={e => setSchedulingCourseFilter(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}
                                        >
                                            <option value="todos">Todos os cursos</option>
                                            <option value="CD-CL">CD-CL</option>
                                            <option value="CD-TO">CD-TO</option>
                                            <option value="CD-CM">CD-CM</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {schedulingLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', flexDirection: 'column', gap: '0.5rem' }}>
                                            <Loader2 size={24} className="animate-spin text-muted" />
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Carregando alunos aptos...</span>
                                        </div>
                                    ) : (
                                        (() => {
                                            const filtered = availableStudents.filter(st => {
                                                const matchesSearch = st.full_name.toLowerCase().includes(schedulingSearch.toLowerCase()) || st.cpf.includes(schedulingSearch);
                                                
                                                let matchesCourse = true;
                                                if (schedulingCourseFilter !== 'todos') {
                                                    const text = (st.classes?.course_name || '').toUpperCase();
                                                    if (schedulingCourseFilter === 'CD-CL') matchesCourse = text.includes('CALDEIRARIA') || text.includes('CD-CL');
                                                    if (schedulingCourseFilter === 'CD-TO') matchesCourse = text.includes('TOPOGRAFIA') || text.includes('CD-TO');
                                                    if (schedulingCourseFilter === 'CD-CM') matchesCourse = text.includes('MECÂNICA') || text.includes('CD-CM') || text.includes('CD-MC') || text.includes('CM');
                                                }
                                                return matchesSearch && matchesCourse;
                                            });

                                            if (filtered.length === 0) {
                                                return (
                                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                        Nenhum aluno apto encontrado para agendamento.
                                                    </div>
                                                );
                                            }

                                            return filtered.map(st => (
                                                <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.full_name}</p>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>CPF: {st.cpf} | Turma: {st.classes?.name || 'S/T'}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleScheduleStudent(st, selectedSchedulingClass.id, selectedSchedulingClass.maxCapacity, scheduledStudents.filter(s => s.practical_class_status === 'confirmado').length, 'confirmado')}
                                                        disabled={schedulingActionLoading === st.id}
                                                        style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }}
                                                    >
                                                        {schedulingActionLoading === st.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Agendar
                                                    </button>
                                                </div>
                                            ));
                                        })()
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowSchedulingModal(false)} style={{ padding: '0.5rem 1.25rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}
