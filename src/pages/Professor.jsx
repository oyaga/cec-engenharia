import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { classesApi, studentsApi, attendanceApi } from '../services/academic'
import { lmsApi } from '../services/lms'
import { messagesApi } from '../services/misc'
import ChatPanel from '../components/ChatPanel'
import { useAuth } from '../contexts/AuthContext'
import {
    BookOpen, CheckSquare, List, Calendar as CalendarIcon, Edit3,
    ShieldAlert, Users, Plus, X, Loader2, Info, Check,
    AlertCircle, AlertTriangle, MessageCircle, Clock, Send,
    BarChart3, TrendingUp, Award, PlayCircle
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

export default function Professor({ initialTab = 'minhasTurmas' }) {
    const { session, userProfile } = useAuth()
    const uid = session?.user?.id
    const [activeTab, setActiveTab] = useState(initialTab) // minhasTurmas | duvidasEad | messages | analytics | diario
    const [selectedClass, setSelectedClass] = useState(null)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState('instrutor')

    // "Minhas turmas": admin/coord veem todas; instrutor vê onde é vinculado.
    const filterMyClasses = (all) => {
        const role = userProfile?.role
        if (role === 'admin' || role === 'coordenador') return all || []
        return (all || []).filter(c => (c.instructors || []).some(i => i.user?.id === uid))
    }

    // Data from Supabase
    const [classes, setClasses] = useState([])
    const [classStudents, setClassStudents] = useState([])
    const [inPersonModules, setInPersonModules] = useState([])
    const [selectedAttendanceModule, setSelectedAttendanceModule] = useState(null)
    const [studentConfirmations, setStudentConfirmations] = useState({})
    const [selectedClassProgress, setSelectedClassProgress] = useState(null)
    const [eadDoubts, setEadDoubts] = useState([])
    const [answeringId, setAnsweringId] = useState(null)
    const [answerText, setAnswerText] = useState('')
    const [doubtStatusFilter, setDoubtStatusFilter] = useState('pending')
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

    // Fórum do instrutor: sem dados fabricados (retorna vazio quando não há dados reais)
    const getMockForumDataForInstructor = () => {
        return []
    }

    const getMockRepliesForInstructor = () => {
        return []
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
            if (!uid) return
            if (userProfile?.role) setUserRole(userProfile.role)

            const { classes: allClasses } = await classesApi.list()
            const myClasses = filterMyClasses(allClasses)

            let studentsList = []
            if (myClasses.length > 0) {
                const classIds = new Set(myClasses.map(c => c.id))
                const { students: stds } = await studentsApi.list()
                studentsList = (stds || [])
                    .filter(s => classIds.has(s.turma_id))
                    .map(s => ({ id: s.user_id || s.id, full_name: s.full_name, className: s.turma_name || 'Sem Turma' }))
                    .filter(s => s.id)
            }

            // 2. Mensagens do instrutor
            let msgs = []
            try {
                msgs = (await messagesApi.list()).messages || []
            } catch (msgsErr) {
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
                    const partnerId = m.sender_id === uid ? m.receiver_id : m.sender_id

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

                    if (m.receiver_id === uid && !m.is_read) {
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
            if (!uid) return
            const { messages: msgs } = await messagesApi.list(studentId)
            setDirectMessages(msgs || [])

            setDirectChats(prev => prev.map(c => c.id === studentId ? { ...c, unreadCount: 0 } : c))
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
            if (!uid) return
            const { message } = await messagesApi.create({ receiver_id: selectedStudentId, content: text })
            if (message) {
                setDirectMessages(prev => [...prev, message])
                setDirectChats(prev => prev.map(c => (
                    c.id === selectedStudentId ? { ...c, lastMessage: text, lastTime: message.created_at } : c
                )).sort((a, b) => {
                    if (a.lastTime && b.lastTime) return new Date(b.lastTime) - new Date(a.lastTime)
                    if (a.lastTime) return -1
                    if (b.lastTime) return 1
                    return a.full_name.localeCompare(b.full_name)
                }))
            } else {
                fetchActiveChat(selectedStudentId)
            }
        } catch (err) {
            console.error(err)
            alert("Não foi possível enviar a mensagem. Verifique a conexão.")
        }
    }

    useEffect(() => {
        if (activeTab === 'messages') {
            fetchDirectChats()
            // Rede de segurança lenta (30s); o tempo real vem do WebSocket abaixo.
            const interval = setInterval(() => {
                fetchDirectChats()
                if (selectedStudentId) {
                    messagesApi.list(selectedStudentId).then(({ messages }) => {
                        if (messages) setDirectMessages(messages)
                    }).catch(() => {})
                }
            }, 30000)
            return () => clearInterval(interval)
        }
    }, [activeTab, selectedStudentId])

    // O chat de mensagens é gerido pelo componente ChatPanel (WebSocket próprio).

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
            if (!uid) return
            if (userProfile?.role) setUserRole(userProfile.role)
            const { classes: all } = await classesApi.list()
            setClasses(filterMyClasses(all))
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

            const { students: stds } = await studentsApi.list({ turma_id: classId })
            const studentsList = (stds || []).map(s => ({
                id: s.id,
                full_name: s.full_name,
                email: s.email
            }))

            let activeModule = null
            if (selected.lms_course_id) {
                const { modules: courseModules } = await lmsApi.structure(selected.lms_course_id)
                const presencial = (courseModules || []).filter(m => m.is_in_person)
                setInPersonModules(presencial)
                activeModule = presencial[0] || null
                setSelectedAttendanceModule(activeModule)
            } else {
                setInPersonModules([])
                setSelectedAttendanceModule(null)
            }

            // Chamadas já existentes
            const response = activeModule
                ? await attendanceApi.moduleList(classId, activeModule.id)
                : await attendanceApi.list({ class_id: classId })
            const records = activeModule
                ? (response.attendance || []).map(row => ({ ...row, id: row.record_id, student_id: row.student_id }))
                : response.attendance
            
            const initialAttendance = {}
            const initialJustifications = {}
            const confirmations = {}
            
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
                confirmations[s.id] = !!rec?.confirmed_by_student
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
            setStudentConfirmations(confirmations)
        } catch (error) {
            console.error('Error fetching students:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAttendanceModuleChange = async (moduleId) => {
        const module = inPersonModules.find(m => m.id === moduleId) || null
        setSelectedAttendanceModule(module)
        if (!module || !selectedClass) return
        setLoading(true)
        try {
            const { attendance: rows } = await attendanceApi.moduleList(selectedClass.id, module.id)
            const statuses = {}, notes = {}, confirmations = {}
            ;(rows || []).forEach(row => {
                statuses[row.student_id] = row.status === 'ausente' ? 'falta' : row.status === 'justificado' ? 'falta_justificada' : 'presente'
                notes[row.student_id] = { type: row.status === 'justificado' ? 'Outro' : '', note: row.justification_note || '' }
                confirmations[row.student_id] = !!row.confirmed_by_student
            })
            classStudents.forEach(student => { if (!statuses[student.id]) statuses[student.id] = 'presente' })
            setAttendance(statuses); setJustifications(notes); setStudentConfirmations(confirmations)
            if (module.in_person_date) setRecordDate(module.in_person_date.slice(0, 10))
        } catch (err) { alert('Erro ao carregar chamada do módulo: ' + err.message) }
        finally { setLoading(false) }
    }

    // Estrutura de analytics vazia (sem dados fabricados): usada quando não há turmas/alunos reais
    const getEmptyAnalyticsData = () => {
        return {
            kpis: {
                avgProgress: 0,
                avgAttendance: 0,
                hoursStudied: 0,
                studentsAtRisk: 0
            },
            classProgress: [],
            studyTrend: [],
            studentsList: []
        }
    }

    const fetchAnalyticsData = async () => {
        setAnalyticsLoading(true)
        try {
            if (!uid) return
            if (userProfile?.role) setUserRole(userProfile.role)

            const { classes: allC } = await classesApi.list()
            const myClasses = filterMyClasses(allC)
            if (!myClasses || myClasses.length === 0) {
                setAnalyticsData(getEmptyAnalyticsData())
                return
            }

            const classIds = myClasses.map(c => c.id)
            const courseIds = myClasses.map(c => c.lms_course_id).filter(Boolean)

            // Roster: alunos das minhas turmas (adaptado: usa students, não enrollments)
            const { students: allStudents } = await studentsApi.list()
            const classIdSet = new Set(classIds)
            const enrolls = (allStudents || [])
                .filter(s => classIdSet.has(s.turma_id))
                .map(s => ({
                    student_id: s.id,
                    course_id: myClasses.find(c => c.id === s.turma_id)?.lms_course_id,
                    created_at: s.created_at,
                    turma_id: s.turma_id,
                    users: { id: s.id, full_name: s.full_name, email: s.email, cpf: s.cpf },
                }))

            if (enrolls.length === 0) {
                setAnalyticsData(getEmptyAnalyticsData())
                return
            }

            // Progresso EAD: total de aulas por curso + conclusões
            const totalLessonsByCourse = {}
            const courseLessons = []
            for (const cid of courseIds) {
                try {
                    const { lessons } = await lmsApi.courseLessons(cid)
                    ;(lessons || []).forEach(l => courseLessons.push({ id: l.id, course_id: cid }))
                    totalLessonsByCourse[cid] = (lessons || []).length || 1
                } catch { totalLessonsByCourse[cid] = 1 }
            }

            let completions = []
            const { attendance: presences } = await attendanceApi.list({})
            const timeLogs = []
            try {
                // progresso: uma chamada por aluno seria caro; usa progresso agregado onde possível.
                for (const e of enrolls) {
                    const { progress } = await lmsApi.progress(e.student_id)
                    ;(progress || []).filter(p => p.is_completed).forEach(p => completions.push({ student_id: e.student_id, lesson_id: p.lesson_id }))
                }
            } catch { /* ignora */ }

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
                const studentCompletions = completions?.filter(c => c.student_id === studentUser.id && courseLessons.some(l => l.id === c.lesson_id && l.course_id === e.course_id)) || []
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
            setAnalyticsData(getEmptyAnalyticsData())
        } finally {
            setAnalyticsLoading(false)
        }
    }

    const fetchEadDoubts = async () => {
        setLoading(true)
        try {
            const { doubts } = await lmsApi.doubts()
            setEadDoubts((doubts || []).map(d => ({ ...d, student: { full_name: d.student_name }, lesson: { title: d.lesson_title } })))
        } catch { setEadDoubts([]) }
        setLoading(false)
    }

    useEffect(() => {
        if (userProfile?.role) setUserRole(userProfile.role)
    }, [userProfile])

    useEffect(() => {
        if (activeTab === 'minhasTurmas') fetchClasses()
        if (activeTab === 'duvidasEad') {
            fetchEadDoubts()
            fetchForumTopicsForInstructor()
        }
    }, [activeTab])

    const handleSendAnswer = async (id) => {
        if (!answerText.trim()) return
        try {
            await lmsApi.answerDoubt(id, answerText)
            setAnswerText('')
            setAnsweringId(null)
            fetchEadDoubts()
            alert('Resposta enviada com sucesso!')
        } catch (err) {
            alert('Erro ao salvar resposta: ' + err.message)
        }
    }

    const visibleVideoComments = eadDoubts.filter(doubt => doubtStatusFilter === 'all' || (doubtStatusFilter === 'pending' ? !doubt.answer_text : !!doubt.answer_text))
    const pendingVideoComments = eadDoubts.filter(doubt => !doubt.answer_text).length

    // Funções do novo Fórum de Dúvidas Colaborativo para o Instrutor (Prioridade 🟡 9)
    const fetchForumTopicsForInstructor = async () => {
        setForumLoading(true)
        try {
            const { topics } = await lmsApi.allForumTopics()
            const topicsWithCount = (topics || []).map(t => ({
                ...t,
                student: { full_name: t.student_name },
                replies_count: t.replies_count || 0
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
            const { replies } = await lmsApi.topicReplies(topicId)
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
            if (!uid) return
            await lmsApi.createReply({ topic_id: selectedForumTopic.id, author_id: uid, content: newForumReplyText.trim() })

            setNewForumReplyText('')
            fetchTopicRepliesForInstructor(selectedForumTopic.id)
            setForumTopicsList(prev => prev.map(t => t.id === selectedForumTopic.id ? { ...t, replies_count: t.replies_count + 1 } : t))
            alert('Resposta postada com sucesso no fórum colaborativo!')
        } catch (err) {
            console.error("Erro ao postar resposta do instrutor no fórum:", err)
            alert('Erro ao postar resposta: ' + (err.message || 'tente novamente.'))
        }
    }

    const handleOpenDiario = (turma) => {
        setSelectedClass(turma)
        setActiveTab('diario')
        fetchClassStudents(turma.id)
        setSelectedClassProgress(null)
        classesApi.progress(turma.id)
            .then(setSelectedClassProgress)
            .catch(error => console.error('Erro ao carregar progresso da turma:', error))
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
            // 1. Alunos da turma
            const { students: stds } = await studentsApi.list({ turma_id: turma.id })
            const studentsList = (stds || []).map(s => ({
                id: s.id,
                full_name: s.full_name,
                email: s.email,
                cpf: s.cpf
            }))

            // 2. Lições do curso
            let courseLessons = []
            if (turma.lms_course_id) {
                try { courseLessons = (await lmsApi.courseLessons(turma.lms_course_id)).lessons || [] } catch { /* */ }
            }
            const totalLessonsCount = courseLessons.length || 1

            // 3. Dados acadêmicos por aluno
            const { attendance: allAtt } = await attendanceApi.list({ class_id: turma.id })
            const formattedList = await Promise.all(studentsList.map(async (student) => {
                const studAtt = (allAtt || []).filter(a => a.student_id === student.id)
                const totalCount = studAtt.length
                const presenceCount = studAtt.filter(a => a.status === 'presente').length
                const frequency = totalCount > 0 ? Math.round((presenceCount / totalCount) * 100) : 100

                let completedCount = 0
                try {
                    const { progress } = await lmsApi.progress(student.id)
                    completedCount = (progress || []).filter(p => p.is_completed && courseLessons.some(l => l.id === p.lesson_id)).length
                } catch { /* */ }
                const progressPercent = Math.round((completedCount / totalLessonsCount) * 100)

                return { ...student, frequency, presenceCount, totalCount, progressPercent }
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
            await classesApi.update(editClassForm.id, {
                schedule: editClassForm.schedule,
                address: editClassForm.address,
                notes: editClassForm.notes
            })

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
            if (selectedAttendanceModule) {
                for (const studentId of Object.keys(attendance)) {
                    const currentStatus = attendance[studentId]
                    const j = justifications[studentId] || {}
                    await attendanceApi.setModuleStatus(selectedClass.id, selectedAttendanceModule.id, studentId, {
                        status: currentStatus === 'falta' ? 'ausente' : currentStatus === 'falta_justificada' ? 'justificado' : 'presente',
                        justification_note: currentStatus === 'falta_justificada' ? `${j.type ? j.type + ': ' : ''}${j.note || ''}` : null
                    })
                }
                alert('Chamada do módulo presencial salva e confirmada!')
                setActiveTab('minhasTurmas'); setSelectedClass(null); setLoading(false); return
            }
            const { attendance: existingRecords } = await attendanceApi.list({ class_id: selectedClass.id })

            for (const studentId of Object.keys(attendance)) {
                const currentStatus = attendance[studentId]
                const j = justifications[studentId] || {}
                const recordPayload = {
                    class_id: selectedClass.id,
                    student_id: studentId,
                    date: recordDate,
                    status: currentStatus,
                    justification_type: currentStatus === 'falta_justificada' ? j.type : null,
                    justification_note: currentStatus === 'falta_justificada' ? j.note : null,
                    content_taught: contentTaught,
                    class_notes: classNotes,
                    recorded_by: uid,
                }
                const existing = (existingRecords || []).find(r => r.student_id === studentId)
                if (existing) {
                    await attendanceApi.update(existing.id, recordPayload)
                } else {
                    await attendanceApi.create(recordPayload)
                }
            }

            // Marca a turma como concluída
            await classesApi.update(selectedClass.id, { status: 'completed', notes: contentTaught })

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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
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

                {selectedClassProgress && (
                    <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Progresso detalhado da turma</h3>
                            <strong>{selectedClassProgress.days_remaining == null ? 'Sem prazo definido' : `${selectedClassProgress.days_remaining} dias restantes`}</strong>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                                <thead><tr><th style={{ textAlign: 'left', padding: '.6rem' }}>Aluno</th><th style={{ textAlign: 'left', padding: '.6rem' }}>Módulo</th><th>Conclusão</th><th>Tempo</th><th>Prova</th><th>Presença</th></tr></thead>
                                <tbody>{(selectedClassProgress.students || []).flatMap(student => (student.modules || []).map(module => (
                                    <tr key={`${student.student_id}-${module.module_id}`} style={{ borderTop: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '.6rem' }}>{student.full_name}</td><td style={{ padding: '.6rem' }}>{module.title}</td>
                                        <td style={{ textAlign: 'center' }}>{module.lessons_completed}/{module.lessons_total}</td>
                                        <td style={{ textAlign: 'center' }}>{Math.round((module.watched_seconds || 0) / 60)} min</td>
                                        <td style={{ textAlign: 'center' }}>{module.score == null ? '—' : `${module.score}%`}</td>
                                        <td style={{ textAlign: 'center' }}>{module.attendance_status || (module.is_in_person ? 'Pendente' : '—')}</td>
                                    </tr>
                                )))}</tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="prof-diario-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '2rem', alignItems: 'start' }}>
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
                        {inPersonModules.length > 0 && <div className="form-group" style={{ marginBottom:'1rem' }}><label className="form-label">Módulo presencial</label><select className="form-control" value={selectedAttendanceModule?.id || ''} onChange={e => handleAttendanceModuleChange(e.target.value)}>{inPersonModules.map(mod => <option key={mod.id} value={mod.id}>{mod.title} {mod.in_person_date ? `— ${new Date(`${mod.in_person_date.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</option>)}</select></div>}

                        {loading ? <p>Carregando alunos da Turma...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {classStudents.map((student, idx) => {
                                    const currStatus = attendance[student.id]
                                    const j = justifications[student.id] || { type: '', note: '' }

                                    return (
                                        <div key={student.id} style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: idx % 2 === 0 ? '#FAFBFD' : '#FFFFFF' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                                                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{student.full_name}</span>
                                                {selectedAttendanceModule && <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'0.2rem 0.5rem', borderRadius:'999px', background:studentConfirmations[student.id] ? '#dcfce7' : '#fef3c7', color:studentConfirmations[student.id] ? '#166534' : '#92400e' }}>{studentConfirmations[student.id] ? 'Aluno confirmou' : 'Aguardando aluno'}</span>}
                                                
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <button
                        className={`btn ${doubtSubTab === 'perguntas' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setDoubtSubTab('perguntas')}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        💬 Comentários dos Vídeos
                        <span style={{ fontSize: '0.7rem', backgroundColor: doubtSubTab === 'perguntas' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)', color: doubtSubTab === 'perguntas' ? 'white' : 'var(--text-secondary)', padding: '2px 8px', borderRadius: '999px', fontWeight: 'bold' }}>
                            {pendingVideoComments}
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
                            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '.82rem' }}>Mostrar:</strong>
                                <button className={`btn ${doubtStatusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDoubtStatusFilter('pending')}>Pendentes ({pendingVideoComments})</button>
                                <button className={`btn ${doubtStatusFilter === 'answered' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDoubtStatusFilter('answered')}>Respondidos ({eadDoubts.length - pendingVideoComments})</button>
                                <button className={`btn ${doubtStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDoubtStatusFilter('all')}>Todos</button>
                            </div>
                            {visibleVideoComments.map(doubt => (
                                <div key={doubt.id} className="card" style={{ borderLeft: '4px solid var(--primary)', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{doubt.student?.full_name}</h4>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                <strong>{doubt.course_title || 'Curso EAD'}</strong> &rarr; {doubt.module_title || 'Módulo'} &rarr; {doubt.lesson_title || doubt.lesson?.title}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(doubt.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                                        "{doubt.question_text}"
                                    </p>
                                    {doubt.answer_text && <div style={{ marginBottom: '1rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46' }}><strong>Sua resposta:</strong><div style={{ marginTop: '.35rem', whiteSpace: 'pre-wrap' }}>{doubt.answer_text}</div></div>}
                                    {doubt.video_url && <a href={doubt.video_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'inline-flex' }}><PlayCircle size={15} /> Abrir vídeo da aula</a>}
                                    
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
                                        <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={() => { setAnswerText(doubt.answer_text || ''); setAnsweringId(doubt.id) }}>
                                            {doubt.answer_text ? 'Editar resposta' : 'Responder comentário'}
                                        </button>
                                    )}
                                </div>
                            ))}
                            {visibleVideoComments.length === 0 && (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p className="text-secondary">Não há comentários nesta situação.</p>
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
                {selectedForumTopic && createPortal((
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999
                    }}>
                        <div className="card animate-slide-up" style={{
                            width: '100%', maxWidth: 'min(750px, 92vw)', padding: '2rem', maxHeight: '90vh', overflowY: 'auto',
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
                ), document.body)}
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
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar aluno, turma ou curso..."
                            value={analyticsSearchTerm}
                            onChange={(e) => setAnalyticsSearchTerm(e.target.value)}
                            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', width: '260px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #CBD5E1' }}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '2rem' }}>
                    
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

    const renderMessagesTab = () => (
        <div>
            <div style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12 }}><strong>Chat do Professor</strong><div style={{ marginTop: '.25rem', fontSize: '.82rem', color: '#475569' }}>Use as abas Alunos, Secretaria e Professores para escolher com quem conversar em tempo real.</div></div>
            <div style={{ height: 'calc(100vh - 300px)', minHeight: 480, border: '1px solid #e8edf3', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px -20px rgba(15,23,42,0.2)' }}><ChatPanel /></div>
        </div>
    )

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <style>{`
@media (max-width: 768px) {
  .prof-diario-grid { grid-template-columns: 1fr !important; }
  .prof-messages-body { flex-direction: column !important; gap: 1rem !important; }
  .prof-messages-list { width: 100% !important; max-height: 200px !important; border-right: none !important; border-bottom: 1px solid var(--border-color) !important; padding-right: 0 !important; padding-bottom: 0.5rem !important; }
  .prof-students-modal-row { grid-template-columns: 1fr !important; }
}
`}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Portal do Instrutor / Professor</h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Gerencie suas aulas presenciais, faça chamadas e responda a dúvidas do EAD.</p>
                </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
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
            {showStudentsModal && createPortal((
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                }}>
                    <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 'min(750px, 92vw)', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
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
                                    <div key={s.id} className="prof-students-modal-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: idx % 2 === 0 ? '#FAFBFD' : '#FFFFFF', alignItems: 'center' }}>
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
            ), document.body)}

            {/* MODAL 2: EDITAR AULA (LIMITADO PARA INSTRUTOR) */}
            {showEditClassModal && createPortal((
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
                }}>
                    <form onSubmit={handleSaveEditClass} className="card animate-slide-up" style={{ width: '100%', maxWidth: 'min(550px, 92vw)', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
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
            ), document.body)}
        </div>
    )
}
