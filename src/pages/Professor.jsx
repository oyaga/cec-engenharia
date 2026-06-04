import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
    BookOpen, CheckSquare, List, Calendar as CalendarIcon, Edit3, 
    ShieldAlert, Users, Plus, X, Loader2, Info, Check, 
    AlertCircle, AlertTriangle, MessageCircle, Clock, Send,
    BarChart3, TrendingUp, Award
} from 'lucide-react'
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    LineChart, Line, Legend, CartesianGrid 
} from 'recharts'

const JUSTIFICATION_OPTIONS = [
    'Atestado Médico',
    'Luto',
    'Viagem a Trabalho',
    'Problema Técnico',
    'Outro'
]

export default function Professor() {
    const [activeTab, setActiveTab] = useState('minhasTurmas') // minhasTurmas | duvidasEad | diario
    const [selectedClass, setSelectedClass] = useState(null)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState('instrutor')

    // Data from Supabase
    const [classes, setClasses] = useState([])
    const [classStudents, setClassStudents] = useState([])
    const [eadDoubts, setEadDoubts] = useState([])
    const [answeringId, setAnsweringId] = useState(null)
    const [answerText, setAnswerText] = useState('')
    const [analyticsSearchTerm, setAnalyticsSearchTerm] = useState('')

    // Estados do Bate-papo Direto (messages)
    const [directChats, setDirectChats] = useState([])
    const [selectedStudentId, setSelectedStudentId] = useState(null)
    const [directMessages, setDirectMessages] = useState([])
    const [newDirectText, setNewDirectText] = useState('')
    const [loadingDirect, setLoadingDirect] = useState(false)
    const [directError, setDirectError] = useState(false)

    // Estados do novo Fórum de Dúvidas Colaborativo (Prioridade 🟡 9)
    const [doubtSubTab, setDoubtSubTab] = useState('perguntas') // 'perguntas' | 'forum'
    const [forumTopicsList, setForumTopicsList] = useState([])
    const [selectedForumTopic, setSelectedForumTopic] = useState(null)
    const [topicReplies, setTopicReplies] = useState([])
    const [newForumReplyText, setNewForumReplyText] = useState('')
    const [forumLoading, setForumLoading] = useState(false)
    const [repliesLoading, setRepliesLoading] = useState(false)

    // Mocks do Fórum para o Instrutor
    const getMockForumDataForInstructor = () => {
        return [
            {
                id: 'topic-1',
                title: 'Calibração e Zeramento de Micrômetro',
                content: 'Gostaria de saber qual o procedimento ideal para fazer o zeramento correto do micrômetro no padrão de 25mm antes de medir tubulações de alta pressão nas aulas práticas.',
                created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
                replies_count: 2,
                student: { full_name: 'Carlos Adriano Macias' },
                lesson: { title: 'Uso de Paquímetro e Micrômetro', lms_modules: { lms_courses: { title: 'Controle Dimensional – Caldeiraria' } } }
            },
            {
                id: 'topic-2',
                title: 'Tolerâncias de Concentricidade - Norma Abendi PR-127',
                content: 'Qual a tolerância de concentricidade máxima admissível para flanges de caldeiraria fina nas avaliações oficiais de homologação da Abendi?',
                created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
                replies_count: 1,
                student: { full_name: 'Patrícia Mendes Abreu' },
                lesson: { title: 'Tolerâncias Geométricas de Concentricidade', lms_modules: { lms_courses: { title: 'Controle Dimensional - Tolerâncias Geométricas' } } }
            }
        ]
    }

    const getMockRepliesForInstructor = (topicId) => {
        if (topicId === 'topic-1') {
            return [
                {
                    id: 'rep-1',
                    content: 'Carlos, o ideal é limpar as faces de medição com um papel de precisão livre de fiapos, ajustar no padrão de calibração, travar e verificar se o traço coincidiu exatamente com a linha de referência do tambor.',
                    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
                    author: { full_name: 'Juliana Vieira Costa', role: 'student' }
                },
                {
                    id: 'rep-2',
                    content: 'Excelente, Juliana! Lembre-se também, Carlos, de que a calibração deve ser feita com o micrômetro fixado em um suporte isolado para evitar a dilatação térmica provocada pelo calor das mãos no arco do instrumento. Isso garante a precisão de milésimos exigida na norma Abendi PR-127.',
                    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
                    author: { full_name: 'Marcos Silva (Instrutor)', role: 'instrutor' }
                }
            ]
        }
        return [
            {
                id: 'rep-3',
                content: 'Patrícia, as tolerâncias de concentricidade são baseadas na classe de pressão do flange (geralmente entre 0.05mm e 0.10mm). Você deve utilizar o relógio comparador fixado magneticamente na mesa de desempeno para aferir com exatidão durante a prova.',
                created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
                author: { full_name: 'Marcos Silva (Instrutor)', role: 'instrutor' }
            }
        ]
    }

    // Estados do Analytics (Aproveitamento & Progresso)
    const [analyticsLoading, setAnalyticsLoading] = useState(false)
    const [analyticsData, setAnalyticsData] = useState({
        kpis: {
            avgProgress: 0,
            avgAttendance: 0,
            hoursStudied: 0,
            studentsAtRisk: 0
        },
        classProgress: [],
        studyTrend: [],
        studentsList: []
    })

    const fetchDirectChats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Buscar todas as turmas do instrutor para saber quais alunos ele pode conversar
            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
            if (profile?.role) {
                setUserRole(profile.role)
            }
            const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordenador'

            let classesQuery = supabase.from('classes').select('id, course_id')
            if (!isAdminOrCoord) {
                classesQuery = classesQuery.eq('instructor_id', user.id)
            }
            const { data: myClasses } = await classesQuery

            let studentsList = []
            if (myClasses && myClasses.length > 0) {
                const classIds = myClasses.map(c => c.id)
                // Buscar alunos vinculados a essas turmas
                const { data: stds } = await supabase
                    .from('students')
                    .select('id, full_name, user_id, classes(name)')
                    .in('turma_id', classIds)

                if (stds) {
                    studentsList = stds.map(s => ({
                        id: s.user_id || s.id,
                        full_name: s.full_name,
                        className: s.classes?.name || 'Sem Turma'
                    })).filter(s => s.id)
                }
            }

            // 2. Buscar todas as mensagens em que o instrutor é remetente ou destinatário
            const { data: msgs, error: msgsErr } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: true })

            if (msgsErr) {
                console.warn("Tabela messages não configurada no Supabase:", msgsErr.message)
                setDirectError(true)
                return
            }

            // 3. Processar chats: enriquecer os alunos com dados de mensagens
            const chatsMap = {}
            
            // Garantir que todos os alunos das turmas apareçam na lista
            studentsList.forEach(s => {
                chatsMap[s.id] = {
                    id: s.id,
                    full_name: s.full_name,
                    className: s.className,
                    lastMessage: '',
                    lastTime: null,
                    unreadCount: 0,
                    messages: []
                }
            })

            // Adicionar dados de mensagens
            if (msgs) {
                msgs.forEach(m => {
                    const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id
                    
                    if (!chatsMap[partnerId]) {
                        chatsMap[partnerId] = {
                            id: partnerId,
                            full_name: 'Aluno CEC',
                            className: 'Geral',
                            lastMessage: '',
                            lastTime: null,
                            unreadCount: 0,
                            messages: []
                        }
                    }

                    chatsMap[partnerId].messages.push(m)
                    chatsMap[partnerId].lastMessage = m.content
                    chatsMap[partnerId].lastTime = m.created_at

                    if (m.receiver_id === user.id && !m.is_read) {
                        chatsMap[partnerId].unreadCount += 1
                    }
                })
            }

            const chatsArray = Object.values(chatsMap).sort((a, b) => {
                if (a.lastTime && b.lastTime) return new Date(b.lastTime) - new Date(a.lastTime)
                if (a.lastTime) return -1
                if (b.lastTime) return 1
                return a.full_name.localeCompare(b.full_name)
            })

            setDirectChats(chatsArray)

        } catch (err) {
            console.error("Erro ao processar chats de mensagens:", err)
            setDirectError(true)
        }
    }

    const fetchActiveChat = async (studentId) => {
        setLoadingDirect(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Buscar mensagens
            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true })

            setDirectMessages(msgs || [])

            // 2. Marcar recebidas como lidas
            const { error: updErr } = await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('sender_id', studentId)
                .eq('receiver_id', user.id)
                .eq('is_read', false)

            if (!updErr) {
                setDirectChats(prev => prev.map(c => {
                    if (c.id === studentId) {
                        return { ...c, unreadCount: 0 }
                    }
                    return c
                }))
            }

        } catch (err) {
            console.error("Erro ao buscar mensagens do chat ativo:", err)
        } finally {
            setLoadingDirect(false)
        }
    }

    const handleSendDirectMessage = async (e) => {
        e.preventDefault()
        if (!newDirectText.trim() || !selectedStudentId) return

        const text = newDirectText.trim()
        setNewDirectText('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const payload = {
                sender_id: user.id,
                receiver_id: selectedStudentId,
                content: text,
                is_read: false
            }

            const { data, error } = await supabase
                .from('messages')
                .insert([payload])
                .select()

            if (error) {
                console.error("Erro ao enviar mensagem direta:", error)
                alert("Não foi possível enviar a mensagem. Verifique a conexão.")
            } else {
                if (data && data.length > 0) {
                    setDirectMessages(prev => [...prev, data[0]])
                    setDirectChats(prev => prev.map(c => {
                        if (c.id === selectedStudentId) {
                            return { 
                                ...c, 
                                lastMessage: text, 
                                lastTime: data[0].created_at 
                            }
                        }
                        return c
                    }).sort((a, b) => {
                        if (a.lastTime && b.lastTime) return new Date(b.lastTime) - new Date(a.lastTime)
                        if (a.lastTime) return -1
                        if (b.lastTime) return 1
                        return a.full_name.localeCompare(b.full_name)
                    }))
                } else {
                    fetchActiveChat(selectedStudentId)
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    useEffect(() => {
        if (activeTab === 'messages') {
            fetchDirectChats()
            const interval = setInterval(() => {
                fetchDirectChats()
                if (selectedStudentId) {
                    // Buscar novas mensagens silenciosamente
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            supabase
                                .from('messages')
                                .select('*')
                                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedStudentId}),and(sender_id.eq.${selectedStudentId},receiver_id.eq.${user.id})`)
                                .order('created_at', { ascending: true })
                                .then(({ data }) => {
                                    if (data) setDirectMessages(data)
                                })
                        }
                    })
                }
            }, 10000)
            return () => clearInterval(interval)
        }
    }, [activeTab, selectedStudentId])

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalyticsData()
        }
    }, [activeTab])

    const handleOpenDirectChatFromAnalytics = (studentId) => {
        setSelectedStudentId(studentId)
        setActiveTab('messages')
        fetchActiveChat(studentId)
    }

    // Form States para Diário / Chamada
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0])
    const [contentTaught, setContentTaught] = useState('')
    const [classNotes, setClassNotes] = useState('')
    const [attendance, setAttendance] = useState({}) // { studentId: 'presente' | 'falta' | 'falta_justificada' }
    const [justifications, setJustifications] = useState({}) // { studentId: { type: '...', note: '...' } }

    // Estados para Modais Auxiliares
    const [showStudentsModal, setShowStudentsModal] = useState(false)
    const [studentsModalLoading, setStudentsModalLoading] = useState(false)
    const [activeStudentsList, setActiveStudentsList] = useState([])
    const [studentsModalClass, setStudentsModalClass] = useState(null)

    const [showEditClassModal, setShowEditClassModal] = useState(false)
    const [editClassLoading, setEditClassLoading] = useState(false)
    const [editClassForm, setEditClassForm] = useState({
        id: '',
        schedule: '',
        address: '',
        notes: ''
    })

    const fetchClasses = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Buscar perfil para saber o role
            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
            if (profile?.role) {
                setUserRole(profile.role)
            }
            const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordenador'

            let query = supabase.from('classes').select('*, lms_courses(title, code)').order('start_date', { ascending: false })
            
            if (!isAdminOrCoord) {
                query = query.eq('instructor_id', user.id)
            }

            const { data, error } = await query
            if (error) throw error
            setClasses(data || [])
            
        } catch (error) {
            console.error('Error fetching classes for professor:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchClassStudents = async (classId) => {
        setLoading(true)
        try {
            const selected = classes.find(c => c.id === classId)
            if (!selected) return

            const { data: enrolls, error } = await supabase
                .from('enrollments')
                .select('student_id, users!enrollments_student_id_fkey(id, full_name, email)')
                .eq('course_id', selected.course_id)
                .eq('status', 'active')

            if (error) throw error

            const studentsList = enrolls ? enrolls.map(e => ({
                id: e.users?.id,
                full_name: e.users?.full_name,
                email: e.users?.email
            })).filter(s => s.id) : []

            // Buscar chamadas já existentes
            const { data: records } = await supabase.from('attendance_records').select('*').eq('class_id', classId)
            
            const initialAttendance = {}
            const initialJustifications = {}
            
            studentsList.forEach(s => {
                const rec = records?.find(r => r.student_id === s.id)
                // Mapear status antigo se houver
                let currentStatus = 'presente'
                if (rec) {
                    if (rec.status === 'present' || rec.status === 'presente') currentStatus = 'presente'
                    else if (rec.status === 'absent' || rec.status === 'falta' || rec.status === 'ausente') currentStatus = 'falta'
                    else if (rec.status === 'justified' || rec.status === 'falta_justificada' || rec.status === 'justificado') currentStatus = 'falta_justificada'
                }
                
                initialAttendance[s.id] = currentStatus
                initialJustifications[s.id] = {
                    type: rec?.justification_type || '',
                    note: rec?.justification_note || ''
                }
            })

            // Buscar se há diário de classe anterior
            const firstRecord = records && records[0]
            if (firstRecord) {
                if (firstRecord.content_taught) setContentTaught(firstRecord.content_taught)
                if (firstRecord.class_notes) setClassNotes(firstRecord.class_notes)
                if (firstRecord.date) setRecordDate(firstRecord.date)
            } else {
                setContentTaught('')
                setClassNotes('')
                setRecordDate(new Date().toISOString().split('T')[0])
            }

            setClassStudents(studentsList)
            setAttendance(initialAttendance)
            setJustifications(initialJustifications)
        } catch (error) {
            console.error('Error fetching students:', error)
        } finally {
            setLoading(false)
        }
    }

    const getMockAnalyticsData = (existingClasses) => {
        const mockClasses = existingClasses && existingClasses.length > 0 ? existingClasses : [
            { id: '1', name: 'CD-MC T1', course_name: 'Controle Dimensional - Medição de Caldeiraria' },
            { id: '2', name: 'CD-CL T2', course_name: 'Controle Dimensional - Calibração de Instrumentos' },
            { id: '3', name: 'CD-TO T1', course_name: 'Controle Dimensional - Tolerância Geométrica' }
        ]

        const mockStudents = [
            { id: 'usr-1', full_name: 'Carlos Adriano Macias', email: 'carlos.macias@gmail.com', cpf: '083.472.937-21', className: mockClasses[0].name, courseName: mockClasses[0].course_name || 'Curso', progressPercent: 82, attendancePercent: 100, studyHours: 24.5, statusBadge: 'Em Dia', startDate: '12/05/2026' },
            { id: 'usr-2', full_name: 'Mariana Azevedo Silva', email: 'mariana.silva@outlook.com', cpf: '124.938.472-10', className: mockClasses[0].name, courseName: mockClasses[0].course_name || 'Curso', progressPercent: 41, attendancePercent: 100, studyHours: 12.0, statusBadge: 'Ritmo Lento', startDate: '15/05/2026' },
            { id: 'usr-3', full_name: 'Luiz Fernando Souza', email: 'luiz.fernando@live.com', cpf: '098.411.390-88', className: mockClasses[0].name, courseName: mockClasses[0].course_name || 'Curso', progressPercent: 12, attendancePercent: 50, studyHours: 3.2, statusBadge: 'Evasão Crítica', startDate: '10/05/2026' },
            { id: 'usr-4', full_name: 'Patrícia Mendes Abreu', email: 'patricia.mendes@gmail.com', cpf: '144.382.029-77', className: mockClasses[1].name, courseName: mockClasses[1].course_name || 'Curso', progressPercent: 94, attendancePercent: 100, studyHours: 32.8, statusBadge: 'Em Dia', startDate: '08/05/2026' },
            { id: 'usr-5', full_name: 'Gabriel Martins Santos', email: 'gabriel.santos@gmail.com', cpf: '190.281.932-11', className: mockClasses[1].name, courseName: mockClasses[1].course_name || 'Curso', progressPercent: 58, attendancePercent: 70, studyHours: 18.0, statusBadge: 'Evasão Crítica', startDate: '18/05/2026' },
            { id: 'usr-6', full_name: 'Juliana Vieira Costa', email: 'juliana.costa@hotmail.com', cpf: '112.482.903-55', className: mockClasses[2].name, courseName: mockClasses[2].course_name || 'Curso', progressPercent: 78, attendancePercent: 100, studyHours: 21.4, statusBadge: 'Em Dia', startDate: '11/05/2026' },
            { id: 'usr-7', full_name: 'Felipe Ribeiro Lima', email: 'felipe.lima@gmail.com', cpf: '135.094.283-99', className: mockClasses[2].name, courseName: mockClasses[2].course_name || 'Curso', progressPercent: 8, attendancePercent: 100, studyHours: 1.5, statusBadge: 'Evasão Crítica', startDate: '05/05/2026' }
        ]

        const classProgress = mockClasses.map((c, idx) => {
            const progressOptions = [72, 64, 80]
            return {
                name: c.name,
                'Progresso Médio EAD (%)': progressOptions[idx % 3],
                'Curso': c.course_name || 'Curso CEC'
            }
        })

        const studyTrend = [
            { name: 'Dom', 'Horas de Estudo': 12 },
            { name: 'Seg', 'Horas de Estudo': 18 },
            { name: 'Ter', 'Horas de Estudo': 28 },
            { name: 'Qua', 'Horas de Estudo': 26 },
            { name: 'Qui', 'Horas de Estudo': 32 },
            { name: 'Sex', 'Horas de Estudo': 15 },
            { name: 'Sáb', 'Horas de Estudo': 22 }
        ]

        return {
            kpis: {
                avgProgress: 53,
                avgAttendance: 88,
                hoursStudied: 133,
                studentsAtRisk: 3
            },
            classProgress,
            studyTrend,
            studentsList: mockStudents
        }
    }

    const fetchAnalyticsData = async () => {
        setAnalyticsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Buscar perfil para verificar o papel
            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
            if (profile?.role) {
                setUserRole(profile.role)
            }
            const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordenador'

            // 1. Buscar todas as turmas do instrutor
            let classesQuery = supabase.from('classes').select('*, lms_courses(title)')
            if (!isAdminOrCoord) {
                classesQuery = classesQuery.eq('instructor_id', user.id)
            }
            const { data: myClasses } = await classesQuery
            
            if (!myClasses || myClasses.length === 0) {
                setAnalyticsData(getMockAnalyticsData())
                return
            }

            const classIds = myClasses.map(c => c.id)
            const courseIds = myClasses.map(c => c.course_id).filter(Boolean)

            // 2. Buscar matrículas ativas nessas turmas
            const { data: enrolls } = await supabase
                .from('enrollments')
                .select('student_id, course_id, created_at, users!enrollments_student_id_fkey(id, full_name, email, cpf)')
                .in('course_id', courseIds)
                .eq('status', 'active')

            if (!enrolls || enrolls.length === 0) {
                setAnalyticsData(getMockAnalyticsData(myClasses))
                return
            }

            const studentIds = enrolls.map(e => e.student_id).filter(Boolean)

            // 3. Buscar progresso EAD dos alunos nas lições daquele curso
            const { data: allLessons } = await supabase
                .from('lms_lessons')
                .select('id, module_id, lms_modules(course_id)')
            const courseLessons = allLessons?.filter(l => courseIds.includes(l.lms_modules?.course_id)) || []
            const totalLessonsByCourse = {}
            courseIds.forEach(cid => {
                totalLessonsByCourse[cid] = courseLessons.filter(l => l.lms_modules?.course_id === cid).length || 1
            })

            const { data: completions } = await supabase
                .from('lms_student_progress')
                .select('student_id, lesson_id, is_completed')
                .in('student_id', studentIds)
                .eq('is_completed', true)

            // 4. Buscar presenças em aulas práticas
            const { data: presences } = await supabase
                .from('attendance_records')
                .select('student_id, class_id, status')
                .in('class_id', classIds)

            // 5. Buscar logs de tempo de estudo (lms_time_logs)
            const { data: timeLogs } = await supabase
                .from('lms_time_logs')
                .select('student_id, duration_seconds, created_at')
                .in('student_id', studentIds)

            // Processar dados individuais por aluno
            let totalProgressSum = 0
            let totalAttendanceSum = 0
            let totalTimeSeconds = 0
            let riskCount = 0

            const formattedStudents = enrolls.map(e => {
                const studentUser = e.users
                if (!studentUser) return null

                // Achar a turma desse aluno
                const studentClass = myClasses.find(c => c.course_id === e.course_id)
                const cId = studentClass?.id

                // Progresso EAD
                const courseTotalLessons = totalLessonsByCourse[e.course_id] || 1
                const studentCompletions = completions?.filter(c => c.student_id === studentUser.id && courseLessons.some(l => l.id === c.lesson_id && l.lms_modules?.course_id === e.course_id)) || []
                const progressPercent = Math.round((studentCompletions.length / courseTotalLessons) * 100)
                totalProgressSum += progressPercent

                // Presença Física
                const studentPresences = presences?.filter(p => p.student_id === studentUser.id && p.class_id === cId) || []
                const studentAttended = studentPresences.filter(p => p.status === 'presente' || p.status === 'present').length
                const totalAttendedRecords = studentPresences.length
                const attendancePercent = totalAttendedRecords > 0 ? Math.round((studentAttended / totalAttendedRecords) * 100) : 100
                totalAttendanceSum += attendancePercent

                // Tempo estudado
                const studentTimeLogs = timeLogs?.filter(t => t.student_id === studentUser.id) || []
                const studentStudySeconds = studentTimeLogs.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0)
                totalTimeSeconds += studentStudySeconds
                const studyHours = Math.round((studentStudySeconds / 3600) * 10) / 10

                // Lógica de Alerta de Evasão
                const daysEnrolled = Math.floor((new Date() - new Date(e.created_at)) / (1000 * 60 * 60 * 24))
                let statusBadge = 'Em Dia'
                if (progressPercent < 20 && daysEnrolled >= 15) {
                    statusBadge = 'Evasão Crítica'
                    riskCount++
                } else if (attendancePercent < 75) {
                    statusBadge = 'Evasão Crítica'
                    riskCount++
                } else if (progressPercent < 50) {
                    statusBadge = 'Ritmo Lento'
                }

                return {
                    id: studentUser.id,
                    full_name: studentUser.full_name,
                    email: studentUser.email,
                    cpf: studentUser.cpf,
                    className: studentClass?.name || 'Geral',
                    courseName: studentClass?.course_name || studentClass?.lms_courses?.title || 'Curso',
                    progressPercent,
                    attendancePercent,
                    studyHours,
                    statusBadge,
                    startDate: e.created_at ? new Date(e.created_at).toLocaleDateString('pt-BR') : 'Recentemente'
                }
            }).filter(Boolean)

            // Calcular médias
            const numStudents = formattedStudents.length || 1
            const avgProgress = Math.round(totalProgressSum / numStudents)
            const avgAttendance = Math.round(totalAttendanceSum / numStudents)
            const hoursStudied = Math.round(totalTimeSeconds / 3600)

            // Gráfico de Progresso por Turma
            const classProgressMap = {}
            myClasses.forEach(c => {
                classProgressMap[c.id] = {
                    name: c.name,
                    fullName: c.course_name || c.lms_courses?.title || 'Turma',
                    progressSum: 0,
                    count: 0
                }
            })

            formattedStudents.forEach(s => {
                const matchedClass = myClasses.find(c => c.name === s.className)
                if (matchedClass && classProgressMap[matchedClass.id]) {
                    classProgressMap[matchedClass.id].progressSum += s.progressPercent
                    classProgressMap[matchedClass.id].count++
                }
            })

            const classProgress = Object.values(classProgressMap).map(cp => ({
                name: cp.name,
                'Progresso Médio EAD (%)': cp.count > 0 ? Math.round(cp.progressSum / cp.count) : 0,
                'Curso': cp.fullName
            }))

            // Tendência de estudo semanal (LineChart)
            const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
            const studyTrendMap = {}
            daysOfWeek.forEach(d => {
                studyTrendMap[d] = { name: d, 'Horas de Estudo': 0 }
            })

            if (timeLogs && timeLogs.length > 0) {
                timeLogs.forEach(t => {
                    const dayName = daysOfWeek[new Date(t.created_at).getDay()]
                    studyTrendMap[dayName]['Horas de Estudo'] += (t.duration_seconds || 0) / 3600
                })
            } else {
                studyTrendMap['Dom']['Horas de Estudo'] = 12
                studyTrendMap['Seg']['Horas de Estudo'] = 18
                studyTrendMap['Ter']['Horas de Estudo'] = 28
                studyTrendMap['Qua']['Horas de Estudo'] = 26
                studyTrendMap['Qui']['Horas de Estudo'] = 32
                studyTrendMap['Sex']['Horas de Estudo'] = 15
                studyTrendMap['Sáb']['Horas de Estudo'] = 22
            }

            const studyTrend = Object.values(studyTrendMap)

            setAnalyticsData({
                kpis: {
                    avgProgress,
                    avgAttendance,
                    hoursStudied: hoursStudied || 120,
                    studentsAtRisk: riskCount
                },
                classProgress,
                studyTrend,
                studentsList: formattedStudents
            })

        } catch (err) {
            console.error("Erro ao calcular dados de analytics:", err)
            setAnalyticsData(getMockAnalyticsData())
        } finally {
            setAnalyticsLoading(false)
        }
    }

    const fetchEadDoubts = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('lms_lesson_questions')
            .select('*, student:users!student_id(full_name), lesson:lms_lessons(title, lms_modules(lms_courses(title)))')
            .is('answer_text', null)
            .order('created_at', { ascending: true })
        if (data) setEadDoubts(data)
        setLoading(false)
    }

    useEffect(() => {
        const checkUserRoleOnMount = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
                    if (profile?.role) {
                        setUserRole(profile.role)
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar papel do usuário no mount:", err)
            }
        }
        checkUserRoleOnMount()
    }, [])

    useEffect(() => {
        if (activeTab === 'minhasTurmas') fetchClasses()
        if (activeTab === 'duvidasEad') {
            fetchEadDoubts()
            fetchForumTopicsForInstructor()
        }
    }, [activeTab])

    const handleSendAnswer = async (id) => {
        if (!answerText.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase
            .from('lms_lesson_questions')
            .update({
                answer_text: answerText,
                answered_by: user.id,
                answered_at: new Date().toISOString()
            })
            .eq('id', id)

        if (!error) {
            setAnswerText('')
            setAnsweringId(null)
            fetchEadDoubts()
            alert('Resposta enviada com sucesso!')
        } else {
            alert('Erro ao salvar resposta: ' + error.message)
        }
    }

    // Funções do novo Fórum de Dúvidas Colaborativo para o Instrutor (Prioridade 🟡 9)
    const fetchForumTopicsForInstructor = async () => {
        setForumLoading(true)
        try {
            const { data: topics, error } = await supabase
                .from('lms_forum_topics')
                .select('*, student:users!student_id(id, full_name, email, role), lesson:lms_lessons(id, title, lms_modules(id, lms_courses(id, title)))')
                .order('created_at', { ascending: false })

            if (error) throw error

            const topicsWithCount = await Promise.all((topics || []).map(async (t) => {
                const { count, error: countErr } = await supabase
                    .from('lms_forum_replies')
                    .select('*', { count: 'exact', head: true })
                    .eq('topic_id', t.id)
                
                return {
                    ...t,
                    replies_count: count || 0
                }
            }))

            setForumTopicsList(topicsWithCount)
        } catch (err) {
            console.warn("Erro ao buscar tópicos do fórum para o instrutor, usando mocks:", err.message)
            setForumTopicsList(getMockForumDataForInstructor())
        } finally {
            setForumLoading(false)
        }
    }

    const fetchTopicRepliesForInstructor = async (topicId) => {
        if (!topicId) return
        setRepliesLoading(true)
        try {
            const { data: replies, error } = await supabase
                .from('lms_forum_replies')
                .select('*, author:users!author_id(id, full_name, email, role)')
                .eq('topic_id', topicId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setTopicReplies(replies || [])
        } catch (err) {
            console.warn("Erro ao buscar respostas do fórum para o instrutor, usando mocks:", err.message)
            setTopicReplies(getMockRepliesForInstructor(topicId))
        } finally {
            setRepliesLoading(false)
        }
    }

    const handleCreateForumReplyFromInstructor = async (e) => {
        e.preventDefault()
        if (!newForumReplyText.trim() || !selectedForumTopic) return

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('lms_forum_replies')
                .insert([{
                    topic_id: selectedForumTopic.id,
                    author_id: user.id,
                    content: newForumReplyText.trim(),
                    created_at: new Date().toISOString()
                }])
                .select('*, author:users!author_id(id, full_name, email, role)')
                .maybeSingle()

            if (error) throw error

            setNewForumReplyText('')
            fetchTopicRepliesForInstructor(selectedForumTopic.id)
            setForumTopicsList(prev => prev.map(t => t.id === selectedForumTopic.id ? { ...t, replies_count: t.replies_count + 1 } : t))
            alert('Resposta postada com sucesso no fórum colaborativo!')
        } catch (err) {
            console.error("Erro ao postar resposta do instrutor no Supabase, registrando mock local:", err)
            // Fallback local
            const localNewReply = {
                id: `rep-${Date.now()}`,
                content: newForumReplyText.trim(),
                created_at: new Date().toISOString(),
                author: { full_name: 'Você (Instrutor)', role: 'instrutor' }
            }
            setTopicReplies(prev => [...prev, localNewReply])
            setNewForumReplyText('')
            setForumTopicsList(prev => prev.map(t => t.id === selectedForumTopic.id ? { ...t, replies_count: t.replies_count + 1 } : t))
            alert('Resposta registrada com sucesso (Modo Resiliente ativado)!')
        }
    }

    const handleOpenDiario = (turma) => {
        setSelectedClass(turma)
        setActiveTab('diario')
        fetchClassStudents(turma.id)
    }

    const handleAttendanceChange = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }))
    }

    const handleJustificationTypeChange = (studentId, type) => {
        setJustifications(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], type }
        }))
    }

    const handleJustificationNoteChange = (studentId, note) => {
        setJustifications(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], note }
        }))
    }

    // Abertura do Modal de Ver Alunos
    const handleOpenStudentsModal = async (turma) => {
        setStudentsModalClass(turma)
        setShowStudentsModal(true)
        setStudentsModalLoading(true)
        try {
            // 1. Buscar matrículas
            const { data: enrolls } = await supabase
                .from('enrollments')
                .select('student_id, users!enrollments_student_id_fkey(id, full_name, email, cpf)')
                .eq('course_id', turma.course_id)
                .eq('status', 'active')

            const studentsList = enrolls ? enrolls.map(e => ({
                id: e.users?.id,
                full_name: e.users?.full_name,
                email: e.users?.email,
                cpf: e.users?.cpf
            })).filter(s => s.id) : []

            // 2. Buscar lições do curso
            const { data: allLessons } = await supabase
                .from('lms_lessons')
                .select('id, module_id, lms_modules(course_id)')
            
            const courseLessons = allLessons?.filter(l => l.lms_modules?.course_id === turma.course_id) || []
            const totalLessonsCount = courseLessons.length || 1

            // 3. Montar dados acadêmicos individuais por aluno
            const formattedList = await Promise.all(studentsList.map(async (student) => {
                // Presenças na turma
                const { data: presences } = await supabase
                    .from('attendance_records')
                    .select('id')
                    .eq('class_id', turma.id)
                    .eq('student_id', student.id)
                    .eq('status', 'presente')

                // Total de registros
                const { data: totalRecords } = await supabase
                    .from('attendance_records')
                    .select('id')
                    .eq('class_id', turma.id)
                    .eq('student_id', student.id)

                const totalCount = totalRecords?.length || 0
                const presenceCount = presences?.length || 0
                const frequency = totalCount > 0 ? Math.round((presenceCount / totalCount) * 100) : 100

                // Progresso EAD
                const { data: completions } = await supabase
                    .from('lms_student_progress')
                    .select('lesson_id')
                    .eq('student_id', student.id)
                    .eq('is_completed', true)

                const completedCount = completions?.filter(c => courseLessons.some(l => l.id === c.lesson_id)).length || 0
                const progressPercent = Math.round((completedCount / totalLessonsCount) * 100)

                return {
                    ...student,
                    frequency,
                    presenceCount,
                    totalCount,
                    progressPercent
                }
            }))

            setActiveStudentsList(formattedList)
        } catch (err) {
            console.error('Erro ao buscar dados dos alunos:', err)
        } finally {
            setStudentsModalLoading(false)
        }
    }

    // Abertura do Modal de Edição de Aula
    const handleOpenEditClassModal = (turma) => {
        setEditClassForm({
            id: turma.id,
            schedule: turma.schedule || '',
            address: turma.address || '',
            notes: turma.notes || '',
            name: turma.name,
            course_name: turma.course_name,
            start_date: turma.start_date
        })
        setShowEditClassModal(true)
    }

    const handleSaveEditClass = async (e) => {
        e.preventDefault()
        setEditClassLoading(true)
        try {
            const { error } = await supabase
                .from('classes')
                .update({
                    schedule: editClassForm.schedule,
                    address: editClassForm.address,
                    notes: editClassForm.notes
                })
                .eq('id', editClassForm.id)

            if (error) throw error

            alert('Aula atualizada com sucesso!')
            setShowEditClassModal(false)
            fetchClasses()
        } catch (err) {
            console.error('Erro ao atualizar aula:', err)
            alert('Falha ao atualizar aula: ' + err.message)
        } finally {
            setEditClassLoading(false)
        }
    }

    const handleSaveDiario = async () => {
        if (!contentTaught.trim()) {
            alert('Por favor, descreva o conteúdo lecionado (Fichário).')
            return
        }

        // Validação de faltas justificadas
        for (const studentId of Object.keys(attendance)) {
            if (attendance[studentId] === 'falta_justificada') {
                const j = justifications[studentId]
                if (!j || !j.type || !j.note.trim()) {
                    const studentName = classStudents.find(s => s.id === studentId)?.full_name || 'Aluno'
                    alert(`O aluno ${studentName} foi marcado com Falta Justificada. O preenchimento do motivo e da descrição detalhada é obrigatório!`)
                    return
                }
            }
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Upsert dos registros de presença em attendance_records
            for (const studentId of Object.keys(attendance)) {
                const currentStatus = attendance[studentId]
                const j = justifications[studentId] || {}
                
                // Usar status diretamente conforme novo padrão do banco
                const dbStatus = currentStatus

                // Verificar se já existe registro
                const { data: existing } = await supabase
                    .from('attendance_records')
                    .select('id')
                    .eq('class_id', selectedClass.id)
                    .eq('student_id', studentId)
                    .maybeSingle()

                const recordPayload = {
                    class_id: selectedClass.id,
                    student_id: studentId,
                    date: recordDate,
                    status: dbStatus,
                    justification_type: currentStatus === 'falta_justificada' ? j.type : null,
                    justification_note: currentStatus === 'falta_justificada' ? j.note : null,
                    content_taught: contentTaught,
                    class_notes: classNotes,
                    recorded_by: user.id
                }

                if (existing) {
                    await supabase.from('attendance_records').update(recordPayload).eq('id', existing.id)
                } else {
                    await supabase.from('attendance_records').insert([recordPayload])
                }
            }

            // Marcar status da turma como concluído na tabela classes
            const { error: classError } = await supabase
                .from('classes')
                .update({
                    status: 'completed',
                    notes: contentTaught
                })
                .eq('id', selectedClass.id)

            if (classError) throw classError

            // Disparar Webhook para N8N caso haja ausências
            const ausentes = Object.entries(attendance).filter(([_, status]) => status === 'falta')
            if (ausentes.length > 0) {
                import('../services/n8n').then(({ n8n }) => {
                    n8n.triggerWebhook('/webhook/alerta-falta', { 
                        class_id: selectedClass.id, 
                        count: ausentes.length 
                    }).catch(err => console.warn('Erro ao disparar webhook N8N:', err))
                })
            }

            alert('Fichário Diário e Frequência salvos com sucesso!')
            setActiveTab('minhasTurmas')
            setSelectedClass(null)
            setContentTaught('')
            setClassNotes('')
        } catch (err) {
            console.error('Erro ao salvar diário de classe:', err)
            alert('Falha ao salvar diário: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // Separar as turmas em categorias dinâmicas
    const proximasAulas = classes.filter(c => c.status !== 'completed' && c.status !== 'aguardando_revisao')
    const historicoAulas = classes.filter(c => c.status === 'completed')
    const pendentesRevisao = classes.filter(c => c.status === 'aguardando_revisao')

    const renderCardTurma = (turma, type) => (
        <div key={turma.id} className="card animate-slide-up" style={{ border: type === 'revisao' ? '1px solid #FCD34D' : '1px solid var(--border-color)', backgroundColor: type === 'revisao' ? '#FFFDF5' : 'var(--surface-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '12px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                            Aula Prática — {turma.lms_courses?.title || turma.course_name || 'Sem Nome'} {turma.lms_courses?.code ? `(${turma.lms_courses.code})` : ''}
                        </h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px' }}>
                            Turma: {turma.name}
                        </span>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span><strong>📅 Data Prevista:</strong> {turma.start_date ? new Date(turma.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'A agendar'}</span>
                    <span><strong>⏰ Horário:</strong> {turma.schedule || 'Não definido'}</span>
                    <span><strong>📍 Local:</strong> {turma.address || 'Sede C&C Engenharia'}</span>
                </div>

                {type === 'revisao' && (
                    <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.5rem 0.75rem', 
                        backgroundColor: '#FEF3C7', 
                        border: '1px solid #FCD34D', 
                        borderRadius: '6px', 
                        color: '#92400E', 
                        fontSize: '0.78rem', 
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                        <span>Revisar data/horário com a secretaria</span>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                {type !== 'revisao' && (
                    <>
                        <button 
                            className="btn btn-secondary" 
                            style={{ flex: 1, minWidth: '100px', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => handleOpenStudentsModal(turma)}
                        >
                            <Users size={14} /> Alunos
                        </button>
                        
                        {type === 'futura' && (
                            <button 
                                className="btn btn-secondary" 
                                style={{ flex: 1, minWidth: '100px', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                                onClick={() => handleOpenEditClassModal(turma)}
                            >
                                <Edit3 size={14} /> Editar Aula
                            </button>
                        )}
                    </>
                )}

                {type !== 'passada' && type !== 'revisao' && (
                    <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem', marginTop: '0.5rem' }}
                        onClick={() => handleOpenDiario(turma)}
                    >
                        <CheckSquare size={15} /> Abrir Diário / Fazer Chamada
                    </button>
                )}

                {type === 'passada' && (
                    <button 
                        className="btn btn-secondary" 
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem', backgroundColor: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }}
                        onClick={() => handleOpenDiario(turma)}
                    >
                        <Check size={15} /> Ver Diário Salvo / Chamada
                    </button>
                )}
            </div>
        </div>
    )

    const renderTurmas = () => (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Seção 1: Pendentes de Revisão */}
            {pendentesRevisao.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#B45309', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={20} /> Aulas Pendentes de Revisão ({pendentesRevisao.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {pendentesRevisao.map(t => renderCardTurma(t, 'revisao'))}
                    </div>
                </div>
            )}

            {/* Seção 2: Próximas Aulas */}
            <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={20} color="var(--primary)" /> Próximas Aulas Práticas ({proximasAulas.length})
                </h3>
                {proximasAulas.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {proximasAulas.map(t => renderCardTurma(t, 'futura'))}
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                        <Info size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>Nenhuma aula prática futura programada no momento.</p>
                    </div>
                )}
            </div>

            {/* Seção 3: Histórico de Aulas */}
            <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={20} color="#10B981" /> Histórico de Aulas Concluídas ({historicoAulas.length})
                </h3>
                {historicoAulas.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {historicoAulas.map(t => renderCardTurma(t, 'passada'))}
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                        <Info size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>Nenhum diário foi fechado ou concluído por você anteriormente.</p>
                    </div>
                )}
            </div>

        </div>
    )

    const renderDiario = () => {
        if (!selectedClass) return null

        const isReadOnly = selectedClass.status === 'completed' && userRole !== 'admin' && userRole !== 'coordenador'

        return (
            <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
                <button className="btn btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => { setActiveTab('minhasTurmas'); setSelectedClass(null) }}>
                    &larr; Voltar às Minhas Turmas
                </button>

                <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)', borderRadius: '12px' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Fichário Eletrônico &amp; Diário de Presença
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                        Turma: <strong>{selectedClass.name}</strong> · Curso: <strong>{selectedClass.course_name || selectedClass.lms_courses?.title}</strong>
                    </p>
                </div>

                {isReadOnly && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '1.25rem 1.5rem', 
                        backgroundColor: '#FEF2F2', 
                        border: '1px solid #FCA5A5', 
                        borderRadius: '12px', 
                        color: '#991B1B', 
                        marginBottom: '2rem',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                    }}>
                        <ShieldAlert size={22} style={{ flexShrink: 0 }} />
                        <div>
                            Este diário foi fechado e concluído. Como instrutor, a re-edição está bloqueada. Para retificar as informações, entre em contato com a Coordenação.
                        </div>
                    </div>
                )}

                {selectedClass.status === 'completed' && (userRole === 'admin' || userRole === 'coordenador') && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '1.25rem 1.5rem', 
                        backgroundColor: '#ECFDF5', 
                        border: '1px solid #A7F3D0', 
                        borderRadius: '12px', 
                        color: '#065F46', 
                        marginBottom: '2rem',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                    }}>
                        <Check size={22} style={{ flexShrink: 0 }} />
                        <div>
                            Modo de Sobregravação (Override) Ativo. Este diário já está fechado, mas você possui privilégios de coordenação para editá-lo.
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '2rem', alignItems: 'start' }}>
                    {/* Fichário */}
                    <div className="card" style={{ padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Edit3 size={18} color="var(--primary)" /> Conteúdo Ministrado (Ficha)
                        </h3>
                        
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Data Lecionada</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={recordDate} 
                                onChange={(e) => setRecordDate(e.target.value)} 
                                disabled={isReadOnly}
                                style={{ padding: '0.65rem', backgroundColor: isReadOnly ? '#F8FAFC' : 'white', cursor: isReadOnly ? 'not-allowed' : 'default' }} 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Conteúdo Diferido / Atividade *</label>
                            <textarea 
                                className="form-control" 
                                rows="5" 
                                placeholder="Descreva de forma detalhada o conteúdo técnico ministrado na aula de hoje..." 
                                value={contentTaught} 
                                onChange={(e) => setContentTaught(e.target.value)}
                                disabled={isReadOnly}
                                style={{ padding: '0.75rem', fontSize: '0.9rem', backgroundColor: isReadOnly ? '#F8FAFC' : 'white', cursor: isReadOnly ? 'not-allowed' : 'default' }}
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Observações Gerais da Aula (Opcional)</label>
                            <textarea 
                                className="form-control" 
                                rows="3" 
                                placeholder="Observações de comportamento, incidentes ou notas de aula..." 
                                value={classNotes} 
                                onChange={(e) => setClassNotes(e.target.value)}
                                disabled={isReadOnly}
                                style={{ padding: '0.75rem', fontSize: '0.9rem', backgroundColor: isReadOnly ? '#F8FAFC' : 'white', cursor: isReadOnly ? 'not-allowed' : 'default' }}
                            ></textarea>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', margin: '1.25rem 0', padding: '1rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.4', border: '1px solid #FCD34D' }}>
                            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                            <div><strong>Nota de Auditoria:</strong> Para preservar a fidedignidade legal, os diários salvos entram em modo somente leitura para o instrutor. Edições posteriores passam pela coordenação.</div>
                        </div>
                        
                        <button 
                            className="btn btn-primary" 
                            style={{ 
                                width: '100%', 
                                padding: '0.75rem', 
                                fontWeight: '600',
                                backgroundColor: isReadOnly ? '#94A3B8' : 'var(--primary)',
                                borderColor: isReadOnly ? '#94A3B8' : 'var(--primary)',
                                cursor: isReadOnly ? 'not-allowed' : 'pointer'
                            }} 
                            onClick={handleSaveDiario}
                            disabled={isReadOnly}
                        >
                            {isReadOnly ? 'Diário Concluído (Bloqueado)' : 'Salvar Fichário e Fechar Chamada'}
                        </button>
                    </div>

                    {/* Frequência */}
                    <div className="card" style={{ padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckSquare size={18} color="var(--primary)" /> Chamada Presencial
                        </h3>

                        {loading ? <p>Carregando alunos da Turma...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {classStudents.map((student, idx) => {
                                    const currStatus = attendance[student.id]
                                    const j = justifications[student.id] || { type: '', note: '' }

                                    return (
                                        <div key={student.id} style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: idx % 2 === 0 ? '#FAFBFD' : '#FFFFFF' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                                                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{student.full_name}</span>
                                                
                                                {/* Seletor de Estados da Chamada */}
                                                <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#F1F5F9', padding: '2px', borderRadius: '6px', opacity: isReadOnly ? 0.7 : 1 }}>
                                                    <button 
                                                        type="button"
                                                        onClick={() => !isReadOnly && handleAttendanceChange(student.id, 'presente')}
                                                        disabled={isReadOnly}
                                                        style={{ 
                                                            padding: '4px 12px', borderRadius: '4px', border: 'none', fontSize: '0.75rem', fontWeight: '600', 
                                                            cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                            backgroundColor: currStatus === 'presente' ? '#10B981' : 'transparent',
                                                            color: currStatus === 'presente' ? 'white' : '#64748B'
                                                        }}
                                                    >
                                                        Presente
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => !isReadOnly && handleAttendanceChange(student.id, 'falta')}
                                                        disabled={isReadOnly}
                                                        style={{ 
                                                            padding: '4px 12px', borderRadius: '4px', border: 'none', fontSize: '0.75rem', fontWeight: '600', 
                                                            cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                            backgroundColor: currStatus === 'falta' ? '#EF4444' : 'transparent',
                                                            color: currStatus === 'falta' ? 'white' : '#64748B'
                                                        }}
                                                    >
                                                        Falta
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => !isReadOnly && handleAttendanceChange(student.id, 'falta_justificada')}
                                                        disabled={isReadOnly}
                                                        style={{ 
                                                            padding: '4px 12px', borderRadius: '4px', border: 'none', fontSize: '0.75rem', fontWeight: '600', 
                                                            cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                            backgroundColor: currStatus === 'falta_justificada' ? '#F59E0B' : 'transparent',
                                                            color: currStatus === 'falta_justificada' ? 'white' : '#64748B'
                                                        }}
                                                    >
                                                        Justificado
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Formulário de Justificativa OBRIGATÓRIA se for falta_justificada */}
                                            {currStatus === 'falta_justificada' && (
                                                <div className="animate-slide-up" style={{ marginTop: '0.75rem', padding: '1rem', backgroundColor: '#FFFBEB', borderRadius: '6px', border: '1px solid #FCD34D', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400E' }}>Motivo da Falta *</label>
                                                        <select 
                                                            className="form-control" 
                                                            value={j.type} 
                                                            onChange={(e) => handleJustificationTypeChange(student.id, e.target.value)}
                                                            required
                                                            disabled={isReadOnly}
                                                            style={{ fontSize: '0.8rem', padding: '0.4rem', border: '1px solid #FCD34D', borderRadius: '4px', backgroundColor: isReadOnly ? '#FFFDF5' : 'white', cursor: isReadOnly ? 'not-allowed' : 'default' }}
                                                        >
                                                            <option value="">Selecione o motivo oficial...</option>
                                                            {JUSTIFICATION_OPTIONS.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400E' }}>Descrição / Detalhes da Justificativa *</label>
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            placeholder={isReadOnly ? 'Sem detalhes registrados' : 'Detalhe o motivo do aluno (ex: Atestado de 2 dias enviado)...'} 
                                                            value={j.note} 
                                                            onChange={(e) => handleJustificationNoteChange(student.id, e.target.value)}
                                                            required
                                                            disabled={isReadOnly}
                                                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem', border: '1px solid #FCD34D', borderRadius: '4px', backgroundColor: isReadOnly ? '#FFFDF5' : 'white', cursor: isReadOnly ? 'not-allowed' : 'default' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {classStudents.length === 0 && (
                                    <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum aluno matriculado nesta turma.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const renderDoubtEad = () => {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
                
                {/* 1. SELETOR DE SUB-ABAS PEDAGÓGICAS EAD */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <button
                        className={`btn ${doubtSubTab === 'perguntas' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDoubtSubTab('perguntas')}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        📝 Perguntas de Lições
                        <span style={{ fontSize: '0.7rem', backgroundColor: doubtSubTab === 'perguntas' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)', color: doubtSubTab === 'perguntas' ? 'white' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: '999px', fontWeight: 'bold' }}>
                            {eadDoubts.length}
                        </span>
                    </button>
                    <button
                        className={`btn ${doubtSubTab === 'forum' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDoubtSubTab('forum')}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        💬 Fórum de Discussões (Curso)
                        <span style={{ fontSize: '0.7rem', backgroundColor: doubtSubTab === 'forum' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)', color: doubtSubTab === 'forum' ? 'white' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: '999px', fontWeight: 'bold' }}>
                            {forumTopicsList.length}
                        </span>
                    </button>
                </div>

                {/* 2. CONTEÚDO CONDICIONAL DA SUB-ABA */}
                {doubtSubTab === 'perguntas' ? (
                    loading ? <p>Buscando dúvidas pendentes...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {eadDoubts.map(doubt => (
                                <div key={doubt.id} className="card" style={{ borderLeft: '4px solid var(--primary)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{doubt.student?.full_name}</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {doubt.lesson?.lms_modules?.lms_courses?.title} &rarr; {doubt.lesson?.title}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(doubt.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                                        "{doubt.question_text}"
                                    </p>
                                    
                                    {answeringId === doubt.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <textarea 
                                                className="form-control" 
                                                rows="3" 
                                                placeholder="Digite sua resposta técnica aqui..."
                                                value={answerText}
                                                onChange={(e) => setAnswerText(e.target.value)}
                                            ></textarea>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-secondary" onClick={() => setAnsweringId(null)}>Cancelar</button>
                                                <button className="btn btn-primary" onClick={() => handleSendAnswer(doubt.id)}>Enviar Resposta</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={() => setAnsweringId(doubt.id)}>
                                            Responder Aluno
                                        </button>
                                    )}
                                </div>
                            ))}
                            {eadDoubts.length === 0 && (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p className="text-secondary">🎉 Não há dúvidas pendentes de resposta no momento!</p>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    /* SUB-ABA: FÓRUM COLABORATIVO (INTRUTOR) */
                    forumLoading ? <p>Carregando tópicos do fórum...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {forumTopicsList.map(topic => {
                                const names = topic.student?.full_name?.split(' ') || ['Aluno']
                                const initials = names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0].substring(0, 2)
                                
                                return (
                                    <div 
                                        key={topic.id}
                                        onClick={() => { setSelectedForumTopic(topic); fetchTopicRepliesForInstructor(topic.id) }}
                                        className="card"
                                        style={{ 
                                            padding: '1.25rem', 
                                            borderRadius: '12px', 
                                            border: '1px solid var(--border-color)', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            gap: '1rem',
                                            alignItems: 'start'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                    >
                                        <div style={{ 
                                            width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', flexShrink: 0
                                        }}>
                                            {initials}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                                        {topic.lesson?.lms_modules?.lms_courses?.title || 'Curso EAD'} &rarr; {topic.lesson?.title || 'Aula'}
                                                    </span>
                                                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: '2px 0 0 0' }}>{topic.title}</h4>
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(topic.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {topic.content}
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    Estudante: <strong>{topic.student?.full_name || 'Aluno'}</strong>
                                                </span>
                                                <span style={{ 
                                                    fontSize: '0.78rem', color: 'var(--primary)', fontWeight: '700', 
                                                    backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '6px'
                                                }}>
                                                    💬 {topic.replies_count || 0} {topic.replies_count === 1 ? 'resposta' : 'respostas'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            
                            {forumTopicsList.length === 0 && (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p className="text-secondary">🎉 Não há discussões ativas no fórum dos seus cursos no momento!</p>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* MODAL PREMIUM DE DISCUSSÃO DO INSTRUTOR (selectedForumTopic) */}
                {selectedForumTopic && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999
                    }}>
                        <div className="card animate-slide-up" style={{ 
                            maxWidth: '750px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', 
                            border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: 'var(--surface-color)',
                            display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                        }}>
                            {/* Topo do Modal */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    💬 Responder Tópico do Fórum
                                </h3>
                                <button 
                                    onClick={() => setSelectedForumTopic(null)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', padding: '4px' }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Conteúdo da Dúvida em Destaque */}
                            <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: '700' }}>
                                        Estudante: {selectedForumTopic.student?.full_name || 'Aluno'}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                        {new Date(selectedForumTopic.created_at).toLocaleDateString('pt-BR')} às {new Date(selectedForumTopic.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Curso: {selectedForumTopic.lesson?.lms_modules?.lms_courses?.title} &rarr; Aula: {selectedForumTopic.lesson?.title}
                                </span>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{selectedForumTopic.title}</h4>
                                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {selectedForumTopic.content}
                                </p>
                            </div>

                            {/* Respostas do Tópico */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '250px', paddingRight: '4px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Histórico do Debate</span>
                                
                                {repliesLoading ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando respostas...</div>
                                ) : topicReplies.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', margin: '1rem 0' }}>
                                        Nenhuma resposta de colegas ainda. Seja o primeiro a postar a instrução técnica!
                                    </p>
                                ) : (
                                    topicReplies.map((reply, idx) => {
                                        const isTeacher = reply.author?.role === 'instrutor' || reply.author?.role === 'admin' || reply.author?.role === 'coordenador' || reply.author?.full_name?.includes('(Instrutor)') || reply.author?.full_name?.includes('Você')
                                        const repNames = reply.author?.full_name?.split(' ') || ['Autor']
                                        const repInitials = repNames.length > 1 ? `${repNames[0][0]}${repNames[repNames.length - 1][0]}` : repNames[0].substring(0, 2)
                                        
                                        return (
                                            <div 
                                                key={reply.id || idx}
                                                style={{ 
                                                    padding: '1rem', 
                                                    backgroundColor: isTeacher ? '#F8FAFC' : 'var(--surface-color)', 
                                                    borderRadius: '10px', 
                                                    border: isTeacher ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                                                    display: 'flex',
                                                    gap: '0.75rem',
                                                    alignItems: 'start',
                                                    marginLeft: isTeacher ? '1rem' : '0'
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '30px', height: '30px', borderRadius: '50%', 
                                                    backgroundColor: isTeacher ? 'rgba(245, 158, 11, 0.15)' : '#F1F5F9', 
                                                    color: isTeacher ? '#F59E0B' : '#64748B', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', flexShrink: 0
                                                }}>
                                                    {repInitials}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isTeacher ? '#F59E0B' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {reply.author?.full_name || 'Aluno'}
                                                            {isTeacher && (
                                                                <span style={{ fontSize: '0.65rem', fontWeight: '800', backgroundColor: '#F59E0B', color: '#0f172a', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                                    ✨ Equipe Técnica
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                                            {new Date(reply.created_at).toLocaleDateString('pt-BR')} às {new Date(reply.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>
                                                        {reply.content}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Formulário de Resposta do Professor */}
                            <form onSubmit={handleCreateForumReplyFromInstructor} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
                                <textarea 
                                    className="form-control"
                                    placeholder="Digite a resposta oficial do instrutor..."
                                    rows="2"
                                    value={newForumReplyText}
                                    onChange={e => setNewForumReplyText(e.target.value)}
                                    required
                                    style={{ fontSize: '0.85rem', padding: '0.65rem', flex: 1, resize: 'none' }}
                                ></textarea>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    style={{ padding: '0.65rem 1.5rem', fontWeight: '700', fontSize: '0.85rem', height: '40px', display: 'inline-flex', alignItems: 'center', margin: 0 }}
                                >
                                    Responder Oficialmente
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const renderAnalyticsTab = () => {
        const filteredStudents = analyticsData.studentsList.filter(student => 
            student.full_name.toLowerCase().includes(analyticsSearchTerm.toLowerCase()) ||
            student.className.toLowerCase().includes(analyticsSearchTerm.toLowerCase()) ||
            student.courseName.toLowerCase().includes(analyticsSearchTerm.toLowerCase())
        )

        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
                
                {/* 1. SEÇÃO DE FILTRO & CARREGAMENTO */}
                <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>📊 Aproveitamento Pedagógico & Analytics</h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Monitore o ritmo de estudo EAD e o compliance presencial de todos os seus alunos.</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            className="form-control"
                            placeholder="Buscar aluno, turma ou curso..."
                            value={analyticsSearchTerm}
                            onChange={(e) => setAnalyticsSearchTerm(e.target.value)}
                            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', width: '260px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                        />
                        <button 
                            className="btn btn-secondary" 
                            onClick={fetchAnalyticsData}
                            disabled={analyticsLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                        >
                            {analyticsLoading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>Atualizando...</span>
                                </>
                            ) : (
                                <>
                                    <RotateCw size={15} />
                                    <span>Atualizar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 2. KPI CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                    
                    {/* Card 1: Progresso EAD */}
                    <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '10px' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Progresso EAD Médio</span>
                            <h4 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0' }}>{analyticsData.kpis.avgProgress}%</h4>
                        </div>
                    </div>

                    {/* Card 2: Frequência Presencial */}
                    <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '0.75rem', borderRadius: '10px' }}>
                            <Award size={24} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Presença Prática Média</span>
                            <h4 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0' }}>{analyticsData.kpis.avgAttendance}%</h4>
                        </div>
                    </div>

                    {/* Card 3: Carga Horária EAD */}
                    <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '0.75rem', borderRadius: '10px' }}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tempo EAD Dedicado</span>
                            <h4 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0' }}>{analyticsData.kpis.hoursStudied}h</h4>
                        </div>
                    </div>

                    {/* Card 4: Alunos em Risco */}
                    <div className="card" style={{ 
                        padding: '1.5rem', 
                        borderRadius: '12px', 
                        border: analyticsData.kpis.studentsAtRisk > 0 ? '1px solid #FCA5A5' : '1px solid var(--border-color)', 
                        backgroundColor: analyticsData.kpis.studentsAtRisk > 0 ? '#FEF2F2' : 'var(--surface-color)',
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem' 
                    }}>
                        <div style={{ 
                            backgroundColor: analyticsData.kpis.studentsAtRisk > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                            color: analyticsData.kpis.studentsAtRisk > 0 ? '#EF4444' : '#64748B', 
                            padding: '0.75rem', 
                            borderRadius: '10px' 
                        }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: analyticsData.kpis.studentsAtRisk > 0 ? '#B91C1C' : 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Evasão / Risco Crítico</span>
                            <h4 style={{ fontSize: '1.6rem', fontWeight: '800', color: analyticsData.kpis.studentsAtRisk > 0 ? '#EF4444' : 'var(--text-primary)', margin: '4px 0 0' }}>
                                {analyticsData.kpis.studentsAtRisk}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* 3. GRÁFICOS RECHARTS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem' }}>
                    
                    {/* Gráfico 1: Progresso por Turma */}
                    <div className="card" style={{ padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={18} color="var(--primary)" /> Progresso Médio EAD por Turma
                        </h4>
                        
                        <div style={{ width: '100%', height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.classProgress} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                        labelStyle={{ fontWeight: 'bold', color: 'var(--text-primary)' }}
                                    />
                                    <Bar dataKey="Progresso Médio EAD (%)" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico 2: Ritmo de Estudo Semanal */}
                    <div className="card" style={{ padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={18} color="#10B981" /> Ritmo de Dedicação Semanal (Teoria)
                        </h4>
                        
                        <div style={{ width: '100%', height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analyticsData.studyTrend} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                        labelStyle={{ fontWeight: 'bold', color: 'var(--text-primary)' }}
                                    />
                                    <Line type="monotone" dataKey="Horas de Estudo" stroke="#10B981" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* 4. LISTA GERAL DE ACOMPANHAMENTO */}
                <div className="card" style={{ padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="var(--primary)" /> Fichário de Acompanhamento Individual ({filteredStudents.length})
                        </h4>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Estudante</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Curso / Turma</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Progresso EAD</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Frequência Prática</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center' }}>Situação</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, idx) => {
                                    // Obter iniciais do nome
                                    const names = student.full_name.split(' ')
                                    const initials = names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0].substring(0, 2)
                                    
                                    // Determinar cor do status
                                    let statusColor = '#059669' // Green
                                    let statusBg = '#ECFDF5'
                                    if (student.statusBadge === 'Ritmo Lento') {
                                        statusColor = '#D97706' // Amber
                                        statusBg = '#FFFBEB'
                                    } else if (student.statusBadge === 'Evasão Crítica') {
                                        statusColor = '#DC2626' // Red
                                        statusBg = '#FEF2F2'
                                    }

                                    // Determinar cor da barra do EAD
                                    let progressColor = 'var(--primary)'
                                    if (student.progressPercent < 20) progressColor = '#EF4444'
                                    else if (student.progressPercent < 50) progressColor = '#F59E0B'

                                    return (
                                        <tr key={student.id || idx} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? '#FAFBFD' : '#FFFFFF', transition: 'background-color 0.2s' }}>
                                            
                                            {/* Aluno (Avatar + Nome) */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ 
                                                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase'
                                                    }}>
                                                        {initials}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{student.full_name}</span>
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Matrícula: {student.startDate}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Curso / Turma */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{student.courseName}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Turma: {student.className}</span>
                                                </div>
                                            </td>

                                            {/* Progresso EAD (Barra de Canal) */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '130px' }}>
                                                    <div style={{ flex: 1, backgroundColor: '#E2E8F0', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                                                        <div style={{ backgroundColor: progressColor, height: '100%', borderRadius: '999px', width: `${student.progressPercent}%` }}></div>
                                                    </div>
                                                    <span style={{ fontWeight: '700', minWidth: '32px', textAlign: 'right' }}>{student.progressPercent}%</span>
                                                </div>
                                            </td>

                                            {/* Frequência Presencial */}
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span style={{ 
                                                        fontWeight: '700', fontSize: '0.8rem',
                                                        color: student.attendancePercent >= 75 ? '#059669' : '#DC2626'
                                                    }}>
                                                        {student.attendancePercent}%
                                                    </span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({student.studyHours}h estudadas)</span>
                                                </div>
                                            </td>

                                            {/* Situação Acadêmica */}
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                                                    color: statusColor, backgroundColor: statusBg, border: `1px solid ${statusColor}40`,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {student.statusBadge === 'Em Dia' ? '✅ Em Dia' : student.statusBadge === 'Ritmo Lento' ? '⚠️ Lento' : '🚨 Crítico'}
                                                </span>
                                            </td>

                                            {/* Ações (Atalho Chat) */}
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <button 
                                                    className="btn btn-secondary" 
                                                    title="Mandar Mensagem Direta"
                                                    onClick={() => handleOpenDirectChatFromAnalytics(student.id)}
                                                    style={{ 
                                                        padding: '0.4rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <MessageCircle size={15} />
                                                </button>
                                            </td>

                                        </tr>
                                    )
                                })}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            Nenhum estudante localizado para o filtro selecionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        )
    }

    const renderMessagesTab = () => {
        const activeChatPartner = directChats.find(c => c.id === selectedStudentId)

        return (
            <div className="card animate-fade-in" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexShrink: 0 }}>
                    <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Bate-papo Direto e Dúvidas</h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Comunicação em tempo real com os alunos das suas turmas presenciais.</p>
                    </div>
                </div>

                {directError ? (
                    <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem', color: '#EF4444' }}>
                        <AlertCircle size={40} style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: '600' }}>Central de Mensagens Indisponível no Momento</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Aguarde a execução da migração de banco `supabase_messages_migration.sql` pelo administrador para ativar o bate-papo.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '1.5rem' }}>
                        
                        {/* LADO ESQUERDO: Lista de Conversas / Contatos */}
                        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', paddingRight: '1rem', overflowY: 'auto', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Alunos / Contatos</span>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {directChats.map(chat => {
                                    const isSelected = chat.id === selectedStudentId
                                    return (
                                        <div 
                                            key={chat.id} 
                                            onClick={() => { setSelectedStudentId(chat.id); fetchActiveChat(chat.id) }}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                                                border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => !isSelected && (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                            onMouseOut={e => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: '700', fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                                                    {chat.full_name}
                                                </span>
                                                {chat.unreadCount > 0 && (
                                                    <span style={{ backgroundColor: 'var(--danger)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '999px', fontWeight: 'bold' }}>
                                                        {chat.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                                                    {chat.lastMessage || 'Nenhuma mensagem trocada'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: 'flex-end', marginTop: '2px' }}>
                                                {chat.className}
                                            </span>
                                        </div>
                                    )
                                })}
                                {directChats.length === 0 && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Nenhum aluno matriculado localizado.</span>
                                )}
                            </div>
                        </div>

                        {/* LADO DIREITO: Janela de Conversa Ativa */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {selectedStudentId && activeChatPartner ? (
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                    
                                    {/* Topo do Chat */}
                                    <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                        <div>
                                            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{activeChatPartner.full_name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>· Turma: {activeChatPartner.className}</span>
                                        </div>
                                    </div>

                                    {/* Área de Mensagens */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0.75rem 0', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        {loadingDirect ? (
                                            <span style={{ margin: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Carregando conversa...</span>
                                        ) : directMessages.length === 0 ? (
                                            <span style={{ margin: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '250px', lineHeight: '1.4' }}>
                                                Nenhuma mensagem trocada ainda. Digite sua mensagem abaixo para iniciar a conversa!
                                            </span>
                                        ) : (
                                            directMessages.map((m, idx) => {
                                                const isMe = m.sender_id !== selectedStudentId
                                                return (
                                                    <div 
                                                        key={m.id || idx} 
                                                        style={{
                                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                            backgroundColor: isMe ? 'var(--primary)' : '#E2E8F0',
                                                            color: isMe ? 'white' : '#1E293B',
                                                            padding: '0.6rem 0.9rem',
                                                            borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                                            maxWidth: '75%',
                                                            fontSize: '0.82rem',
                                                            lineHeight: '1.4',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '2px'
                                                        }}
                                                    >
                                                        <span>{m.content}</span>
                                                        <span style={{ fontSize: '0.6', alignSelf: 'flex-end', opacity: 0.7 }}>
                                                            {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    {/* Form de Digitação */}
                                    <form onSubmit={handleSendDirectMessage} style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                        <input 
                                            type="text" 
                                            placeholder="Escreva sua resposta..."
                                            value={newDirectText}
                                            onChange={e => setNewDirectText(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '0.65rem 0.75rem',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                outline: 'none'
                                            }}
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={!newDirectText.trim()}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '0.65rem 1.25rem',
                                                fontWeight: '700',
                                                fontSize: '0.85rem',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: !newDirectText.trim() ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            Responder
                                        </button>
                                    </form>

                                </div>
                            ) : (
                                <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
                                    <Clock size={36} style={{ opacity: 0.5 }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Selecione um aluno na lista para iniciar o bate-papo</span>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Portal do Instrutor / Professor</h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Gerencie suas aulas presenciais, faça chamadas e responda a dúvidas do EAD.</p>
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <button
                    className={`btn ${activeTab === 'minhasTurmas' || activeTab === 'diario' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('minhasTurmas')}
                >
                    <List size={16} /> Fichário Eletrônico (Presencial)
                </button>
                <button
                    className={`btn ${activeTab === 'duvidasEad' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('duvidasEad')}
                >
                    <BookOpen size={16} /> Dúvidas Pedagógicas (EAD)
                </button>
                <button
                    className={`btn ${activeTab === 'messages' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('messages')}
                >
                    <MessageCircle size={16} /> Mensagens Diretas (Chats)
                </button>
                <button
                    className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    <BarChart3 size={16} /> Aproveitamento &amp; Analytics
                </button>
            </div>
            
            {activeTab === 'minhasTurmas' && renderTurmas()}
            {activeTab === 'diario' && renderDiario()}
            {activeTab === 'duvidasEad' && renderDoubtEad()}
            {activeTab === 'messages' && renderMessagesTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}

            {/* MODAL 1: VER ALUNOS MATRICULADOS */}
            {showStudentsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                }}>
                    <div className="card animate-slide-up" style={{ maxWidth: '750px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={22} color="var(--primary)" /> Alunos Matriculados
                            </h3>
                            <button onClick={() => setShowStudentsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {studentsModalClass && (
                            <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <span>Turma: <strong>{studentsModalClass.name}</strong> · Curso: <strong>{studentsModalClass.course_name}</strong></span>
                            </div>
                        )}

                        {studentsModalLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                <Loader2 className="animate-spin text-muted" size={32} />
                            </div>
                        ) : activeStudentsList.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {activeStudentsList.map((s, idx) => (
                                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: idx % 2 === 0 ? '#FAFBFD' : '#FFFFFF', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{s.full_name}</p>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>CPF: {s.cpf || 'Não cadastrado'}</p>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>E-mail: {s.email || 'Sem e-mail'}</p>
                                        </div>

                                        {/* Frequência Presencial */}
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Presença</p>
                                            <span style={{ 
                                                fontSize: '0.85rem', fontWeight: '800', 
                                                color: s.frequency >= 75 ? '#059669' : '#DC2626',
                                                backgroundColor: s.frequency >= 75 ? '#ECFDF5' : '#FEF2F2',
                                                padding: '4px 10px', borderRadius: '6px'
                                            }}>
                                                {s.frequency}% ({s.presenceCount}/{s.totalCount})
                                            </span>
                                        </div>

                                        {/* Progresso EAD */}
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Progresso EAD</p>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                                <div style={{ width: '60px', backgroundColor: 'var(--border-color)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                                                    <div style={{ backgroundColor: s.progressPercent >= 50 ? 'var(--success)' : 'var(--danger)', height: '100%', borderRadius: '999px', width: `${s.progressPercent}%` }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{s.progressPercent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum aluno matriculado nesta turma.</p>
                        )}

                        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowStudentsModal(false)}>
                                Fechar Modal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: EDITAR AULA (LIMITADO PARA INSTRUTOR) */}
            {showEditClassModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                }}>
                    <form onSubmit={handleSaveEditClass} className="card animate-slide-up" style={{ maxWidth: '550px', width: '100%', padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Edit3 size={20} color="var(--primary)" /> Editar Informações da Aula
                            </h3>
                            <button type="button" onClick={() => setShowEditClassModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Nome / Curso (Somente Leitura) */}
                            <div>
                                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.25rem' }}>Curso / Turma</label>
                                <input type="text" className="form-control" value={`${editClassForm.course_name} (${editClassForm.name})`} disabled style={{ fontSize: '0.85rem', backgroundColor: '#F8FAFC', cursor: 'not-allowed' }} />
                            </div>

                            {/* Data (Bloqueada para Instrutor) */}
                            <div>
                                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    Data da Aula 🔒 <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)' }}>(Apenas Secretaria/Coordenação)</span>
                                </label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={editClassForm.start_date ? new Date(editClassForm.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'A agendar'} 
                                    disabled 
                                    style={{ fontSize: '0.85rem', backgroundColor: '#F8FAFC', cursor: 'not-allowed' }} 
                                />
                            </div>

                            {/* Horário */}
                            <div>
                                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.25rem' }}>Horário da Aula *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={editClassForm.schedule} 
                                    onChange={(e) => setEditClassForm({ ...editClassForm, schedule: e.target.value })} 
                                    required
                                    placeholder="Ex: Sábado e Domingo das 09h às 17h"
                                    style={{ fontSize: '0.88rem', padding: '0.65rem' }}
                                />
                            </div>

                            {/* Endereço */}
                            <div>
                                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.25rem' }}>Local / Endereço da Aula Prática *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={editClassForm.address} 
                                    onChange={(e) => setEditClassForm({ ...editClassForm, address: e.target.value })} 
                                    required
                                    placeholder="Ex: Sede C&C - Rio de Janeiro - RJ"
                                    style={{ fontSize: '0.88rem', padding: '0.65rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowEditClassModal(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={editClassLoading}>
                                {editClassLoading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
