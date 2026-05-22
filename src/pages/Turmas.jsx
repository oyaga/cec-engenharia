import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen, Users, LogIn, LineChart, Calendar as CalendarIcon, Clock, X, Printer, FileText, Edit, Trash2, UploadCloud, GraduationCap, UserPlus, UserMinus } from 'lucide-react'
import { generateDocument } from '../lib/pdfGenerator'
import { useAuth } from '../contexts/AuthContext'

export default function Turmas() {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // list | add
    const [selectedClassData, setSelectedClassData] = useState(null)
    const [classStudents, setClassStudents] = useState([])
    const [modalLoading, setModalLoading] = useState(false)
    const [userProfile, setUserProfile] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [showPast, setShowPast] = useState(false)
    const { session } = useAuth()

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
        create_lms_integration: false
    })
    const [lmsCourses, setLmsCourses] = useState([])

    // Modal de Data Universal
    const [showDateModal, setShowDateModal] = useState(false)
    const [dateModalConfig, setDateModalConfig] = useState({ title: '', initialDate: '', onSave: null, label: '' })
    const [modalDateValue, setModalDateValue] = useState('')

    const fetchLmsCourses = async () => {
        const { data } = await supabase.from('lms_courses').select('id, title').eq('is_published', true)
        if (data) setLmsCourses(data)
    }

    const fetchAvailableInstructors = async () => {
        const { data } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('is_active', true)
            .in('role', ['instrutor', 'coordenador', 'admin'])
            .order('full_name')
        if (data) setAvailableInstructors(data)
    }

    const openInstructorModal = async (turma) => {
        setInstructorModal(turma)
        setNewInstructorId('')
        setNewInstructorRole('titular')
        setInstructorModalLoading(true)
        await fetchAvailableInstructors()
        const { data } = await supabase
            .from('class_instructors')
            .select('id, role, user:users(id, full_name)')
            .eq('class_id', turma.id)
            .order('role')
        setClassInstructors(data || [])
        setInstructorModalLoading(false)
    }

    const handleAddInstructor = async () => {
        if (!newInstructorId) { alert('Selecione um instrutor.'); return }
        const { error } = await supabase
            .from('class_instructors')
            .insert([{ class_id: instructorModal.id, user_id: newInstructorId, role: newInstructorRole }])
        if (error) { alert('Erro: ' + (error.code === '23505' ? 'Este instrutor já está vinculado à turma.' : error.message)); return }
        setNewInstructorId('')
        await openInstructorModal(instructorModal)
        fetchClasses()
    }

    const handleRemoveInstructor = async (linkId) => {
        if (!confirm('Remover este instrutor da turma?')) return
        const { error } = await supabase.from('class_instructors').delete().eq('id', linkId)
        if (error) { alert('Erro ao remover: ' + error.message); return }
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
            const { data, error } = await supabase
                .from('classes')
                .select(`
                    id, name, course_name, start_date, actual_start_date, predicted_end_date, actual_end_date, schedule, duration,
                    lms_course_id, evaluation_pdf_url,
                    price_cash, price_card_10x, price_installments_3x,
                    is_immediate_start,
                    instructor_payment_type, instructor_payment_value,
                    students ( count ),
                    class_instructors ( id, role, user:users(full_name) )
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const formatted = data.map(c => ({
                id: c.id,
                name: c.name,
                course: c.course_name,
                startDate: c.start_date,
                actualStartDate: c.actual_start_date,
                predictedEndDate: c.predicted_end_date,
                actualEndDate: c.actual_end_date,
                schedule: c.schedule,
                duration: c.duration,
                studentsCount: c.students[0]?.count || 0,
                evaluationUrl: c.evaluation_pdf_url,
                priceCash: c.price_cash,
                priceCard10x: c.price_card_10x,
                priceBoleto3x: c.price_installments_3x,
                isImmediateStart: c.is_immediate_start,
                instructor_payment_type: c.instructor_payment_type,
                instructor_payment_value: c.instructor_payment_value,
                instructors: c.class_instructors || []
            }))

            // Reorganizando
            setClasses(formatted)
            // setFormData(prev => ({ ...prev, name: generateNextClassName(formatted) })) // Removido para evitar sobrescritas durante edição
        } catch (error) {
            console.error('Error fetching classes:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchUserProfile = async () => {
        if (!session?.user?.id) return
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()
        
        if (!error && data) {
            setUserProfile(data)
        }
    }

    useEffect(() => {
        fetchClasses()
        fetchUserProfile()
        fetchLmsCourses()
    }, [session])


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
        setFormData(updated)
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.course_name) {
            alert('Por favor, preencha o Nome e Curso.')
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

        // Se o usuário pediu integração automática e não selecionou um curso existente
        if (formData.create_lms_integration && !finalLmsId) {
            const { data: newCourse, error: courseError } = await supabase
                .from('lms_courses')
                .insert([{
                    title: formData.course_name,
                    description: `Curso gerado automaticamente via Turma ${formData.name}`,
                    is_published: true,
                    instructor_payment_type: formData.instructor_payment_type,
                    instructor_payment_value: formData.instructor_payment_value
                }])
                .select()
                .single()
            
            if (courseError) {
                alert('Erro ao criar curso EAD: ' + courseError.message)
                return
            }
            finalLmsId = newCourse.id
        }

        const newClass = {
            name: formData.name,
            course_name: formData.course_name,
            start_date: (formData.is_immediate_start || !formData.start_date) ? null : formData.start_date,
            predicted_end_date: (formData.is_immediate_start || !formData.predicted_end_date) ? null : formData.predicted_end_date,
            schedule: formData.schedule,
            duration: formData.duration,
            lms_course_id: finalLmsId,
            price_cash: formData.price_cash ? parseFloat(formData.price_cash) : 0,
            price_card_10x: formData.price_card_10x ? parseFloat(formData.price_card_10x) : 0,
            price_installments_3x: formData.price_installments_3x ? parseFloat(formData.price_installments_3x) : 0,
            is_immediate_start: formData.is_immediate_start || false,
            instructor_payment_type: formData.instructor_payment_type,
            instructor_payment_value: parseFloat(formData.instructor_payment_value) || 0
        }

        if (isEditing && editingId) {
            const { error } = await supabase.from('classes').update(newClass).eq('id', editingId)
            if (error) {
                alert('Erro ao atualizar no Supabase: ' + error.message)
            } else {
                alert('Turma atualizada com sucesso!')
                finishEditing()
                fetchClasses()
            }
        } else {
            const { error } = await supabase.from('classes').insert([newClass])
            if (error) {
                alert('Erro ao salvar no Supabase: ' + error.message)
            } else {
                alert('Turma criada com sucesso na Nuvem!')
                setView('list')
                setFormData({ 
                    name: '', course_name: '', start_date: '', predicted_end_date: '', schedule: '', duration: '', lms_course_id: '',
                    price_cash: '', price_card_10x: '', price_installments_3x: '',
                    is_immediate_start: false,
                    instructor_payment_type: 'fixed',
                    instructor_payment_value: 0,
                    create_lms_integration: false
                })
                fetchClasses()
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
            create_lms_integration: !!turma.lms_course_id
        })
        setIsEditing(true)
        setEditingId(turma.id)
        setView('add')
    }

    const handleNewClass = () => {
        setFormData({ 
            name: generateNextClassName(classes), 
            course_name: 'Controle Dimensional – Caldeiraria e Tubulação – (CD-CL)', 
            start_date: '', predicted_end_date: '', schedule: 'Seg a Sex 19h as 21h', duration: '136', 
            lms_course_id: '',
            price_cash: '', price_card_10x: '', price_installments_3x: '',
            is_immediate_start: false,
            instructor_payment_type: 'fixed',
            instructor_payment_value: 0,
            create_lms_integration: false
        })
        setIsEditing(false)
        setEditingId(null)
        setView('add')
    }

    const handleDeleteClass = async (classId, className) => {
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a turma ${className}?\n\nEsta ação não pode ser desfeita.`)) return

        const { error } = await supabase.from('classes').delete().eq('id', classId)
        if (error) {
            alert('Erro ao excluir turma: ' + error.message)
        } else {
            alert('Turma excluída com sucesso!')
            fetchClasses()
        }
    }

    const finishEditing = () => {
        setView('list')
        setIsEditing(false)
        setEditingId(null)
        setFormData({ 
            name: '', course_name: '', start_date: '', predicted_end_date: '', schedule: '', duration: '', lms_course_id: '', 
            price_cash: '', price_card_10x: '', price_installments_3x: '',
            is_immediate_start: false
        })
    }

    const handleStartClass = (classId, className) => {
        setDateModalConfig({
            title: `Iniciar Turma: ${className}`,
            label: 'Data Real de Início',
            initialDate: new Date().toISOString().split('T')[0],
            onSave: async (dateToSave) => {
                const { error } = await supabase.from('classes').update({ actual_start_date: dateToSave }).eq('id', classId)
                if (error) alert('Erro ao iniciar turma: ' + error.message)
                else { alert('Marcada como Em Andamento!'); fetchClasses(); }
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
                const { error } = await supabase.from('classes').update({ start_date: nextDate }).eq('id', classId)
                if (error) alert('Erro ao atualizar: ' + error.message)
                else { alert('Previsão atualizada!'); fetchClasses(); }
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
                const { error } = await supabase.from('classes').update({ actual_end_date: dateToSave }).eq('id', classId)
                if (error) alert('Erro ao encerrar turma: ' + error.message)
                else { alert('Turma finalizada e arquivada!'); fetchClasses(); }
            }
        })
        setModalDateValue(new Date().toISOString().split('T')[0])
        setShowDateModal(true)
    }

    const toggleStudentEad = async (studentId, currentStatus) => {
        const { error } = await supabase
            .from('students')
            .update({ has_lms_access: !currentStatus })
            .eq('id', studentId)
        
        if (error) alert('Erro ao atualizar acesso EAD')
        else {
            setClassStudents(prev => prev.map(s => s.id === studentId ? { ...s, has_lms_access: !currentStatus } : s))
        }
    }

    const handleEvalUpload = async (classId, file) => {
        if (!file) return
        const fileName = `eval_${classId}_${Math.random().toString(36).substring(7)}.pdf`
        const filePath = `evaluations/${fileName}`

        try {
            const { error: uploadError } = await supabase.storage
                .from('class-evaluations')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('class-evaluations')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('classes')
                .update({ evaluation_pdf_url: publicUrl })
                .eq('id', classId)

            if (updateError) throw updateError

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

        // Buscar alunos matriculados e informações vinculadas como faltas e notas.
        const { data, error } = await supabase
            .from('students')
            .select(`
                id, full_name, cpf, manual_signed, has_lms_access, is_online_only,
                attendance_records ( status ),
                academic_records ( grade, final_status )
            `)
            .eq('turma_id', turma.id)
            .order('full_name', { ascending: true })

        if (!error && data) {
            setClassStudents(data)
        } else {
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Gestão de Turmas</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
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
                                    <span style={{
                                        backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.25rem 0.75rem',
                                        borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <Users size={14} /> {turma.studentsCount} Alunos
                                    </span>
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
                                {turma.duration && !turma.actualStartDate && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn" style={{ flex: 3, justifyContent: 'center', backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }} onClick={() => handleStartClass(turma.id, turma.name)}>
                                            <CalendarIcon size={16} /> Marcar Início Oficial
                                        </button>
                                        {(turma.startDate && new Date(turma.startDate + 'T00:00:00') < new Date().setHours(0,0,0,0)) && (
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
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            {selectedClassData && (
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
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
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
                                        <tr key={st.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{st.full_name}</td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{st.cpf}</td>
                                            <td style={{ padding: '0.75rem' }}>{st.manual_signed ? 'Sim' : 'Não'}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <button 
                                                    onClick={() => toggleStudentEad(st.id, st.has_lms_access)}
                                                    className={`btn ${st.has_lms_access ? 'btn-success' : 'btn-secondary'}`}
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                                >
                                                    {st.has_lms_access ? 'Ativado' : 'Inativo'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {classStudents.length === 0 && (
                                        <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum aluno matriculado nesta turma ainda.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: GERENCIAR INSTRUTORES DA TURMA */}
            {instructorModal && (
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
                                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
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
            )}
        </div>
    )

    const renderAddForm = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <button className="btn btn-secondary" style={{ marginBottom: '1rem' }} onClick={finishEditing}>&larr; Voltar</button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? `Editando Turma: ${editingId}` : 'Nova Grade de Turma'}</h2>
                </div>
                <button className="btn btn-primary" onClick={handleSubmit}>{isEditing ? 'Atualizar Alterações' : 'Salvar Turma (Nuvem)'}</button>
            </div>

            <div className="card">
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Dados Básicos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Nome da Turma (Ex: T01/26)</label>
                        <input type="text" className="form-control" name="name" value={formData.name} onChange={handleFormChange} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gerado automaticamente pelo sistema, mas pode ser alterado se necessário.</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nome do Curso / Treinamento</label>
                        <input 
                            list="course-options" 
                            className="form-control" 
                            name="course_name" 
                            value={formData.course_name} 
                            onChange={handleFormChange} 
                            placeholder="Digite ou selecione o curso"
                        />
                        <datalist id="course-options">
                            {/* Sugestões dinâmicas baseadas em turmas já criadas */}
                            {[...new Set(classes.map(c => c.course))].filter(Boolean).map((course, idx) => (
                                <option key={idx} value={course} />
                            ))}
                            {/* Padrões fixos caso o banco esteja vazio */}
                            {classes.length === 0 && (
                                <>
                                    <option value="Controle Dimensional – Caldeiraria e Tubulação – (CD-CL)" />
                                    <option value="Controle Dimensional – Topografia (CD-TO)" />
                                    <option value="Controle Dimensional - Mecânica- (CD-CM)" />
                                </>
                            )}
                        </datalist>
                    </div>
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
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Vincular Conteúdo Online (LMS)</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <select className="form-control" name="lms_course_id" value={formData.lms_course_id} onChange={handleFormChange} style={{ flex: 1 }}>
                                <option value="">Nenhum curso vinculado</option>
                                {lmsCourses.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                            {!formData.lms_course_id && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap', backgroundColor: '#F0F9FF', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #BAE6FD', color: '#0369A1' }}>
                                    <input 
                                        type="checkbox" 
                                        name="create_lms_integration" 
                                        checked={formData.create_lms_integration} 
                                        onChange={handleFormChange} 
                                    />
                                    Criar Curso EAD Automático?
                                </label>
                            )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selecione um curso existente ou marque para criar um novo curso EAD com o nome desta turma.</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Data de Início Programado</label>
                        <input type="date" className="form-control" name="start_date" value={formData.start_date} onChange={handleFormChange} disabled={formData.is_immediate_start} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Previsão de Término</label>
                        <input type="date" className="form-control" name="predicted_end_date" value={formData.predicted_end_date} onChange={handleFormChange} disabled={formData.is_immediate_start} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Horários Base</label>
                        <select className="form-control" name="schedule" value={formData.schedule} onChange={handleFormChange}>
                            <option value="">Selecione (Ou digite se for Treinamento)</option>
                            <option value="Seg a Sex 19h as 21h">Seg a Sex 19h às 21h</option>
                            <option value="Seg a Sex 20h as 22h">Seg a Sex 20h às 22h</option>
                            <option value="Seg a Sex 18h as 22h">Seg a Sex 18h às 22h</option>
                            <option value="Sabado 08h as 17h">Sábado 08h às 17h (Integral)</option>
                        </select>
                        {formData.course_name.toLowerCase().includes('treinamento') && (
                            <input type="text" className="form-control" style={{ marginTop: '0.5rem' }} name="schedule" value={formData.schedule} onChange={handleFormChange} placeholder="Ou digite o horário flexível aqui" />
                        )}
                    </div>
                    <div className="form-group"><label className="form-label">Carga Horária (Duração)</label><input type="text" className="form-control" name="duration" value={formData.duration} onChange={handleFormChange} placeholder="Ex: 80 horas" /></div>
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
                        <label className="form-label">Preço Cartão (10x s/ juros)</label>
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
                        <label className="form-label">Preço Boleto (3x)</label>
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
                </div>

                <h3 style={{ fontSize: '1.125rem', marginTop: '2rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Configuração de Pagamento (Instrutor)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
            {showDateModal && (
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
            )}
        </div>
    )
}
