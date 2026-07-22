import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { PDFDocument, rgb, degrees } from 'pdf-lib'
import { lmsApi } from '../services/lms'
import { classesApi, studentsApi, attendanceApi } from '../services/academic'
import { uploadFile } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { 
    ChevronLeft, 
    Lock, 
    CheckCircle, 
    AlertTriangle, 
    Clock, 
    ChevronRight, 
    FileText, 
    Trophy, 
    Video, 
    Maximize2, 
    Minimize2,
    Upload,
    Calendar,
    MapPin,
    Download,
    ExternalLink,
    MessageCircle,
    Users,
    Check
} from 'lucide-react'

export default function LessonPlayer() {
    const { courseId, lessonId } = useParams()
    const navigate = useNavigate()
    const { session, userProfile } = useAuth()
    
    const [showCompletionModal, setShowCompletionModal] = useState(false)
    const [frequenciaPratica, setFrequenciaPratica] = useState(100) // Cálculo dinâmico para certificado
    const [lesson, setLesson] = useState(null)
    const [course, setCourse] = useState(null)
    const [allLessons, setAllLessons] = useState([])
    const [secondsWatched, setSecondsWatched] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const [lessonStatus, setLessonStatus] = useState({}) // { lessonId: { is_completed, watched_seconds } }
    const [quizStatus, setQuizStatus] = useState({}) // { quizId: { is_approved, score } }
    const [courseQuizzes, setCourseQuizzes] = useState([])
    const [lessonQuestions, setLessonQuestions] = useState([])
    const [newQuestion, setNewQuestion] = useState('')
    const [loading, setLoading] = useState(true)

    // Estados do novo Fórum de Dúvidas Colaborativo (Prioridade 🟡 9)
    const [forumTopics, setForumTopics] = useState([])
    const [selectedTopic, setSelectedTopic] = useState(null)
    const [topicReplies, setTopicReplies] = useState([])
    const [newTopicTitle, setNewTopicTitle] = useState('')
    const [newTopicContent, setNewTopicContent] = useState('')
    const [newReplyContent, setNewReplyContent] = useState('')
    const [forumLoading, setForumLoading] = useState(false)
    const [repliesLoading, setRepliesLoading] = useState(false)
    const [showNewTopicForm, setShowNewTopicForm] = useState(false)
    const [forumError, setForumError] = useState(false)

    // Fórum: sem dados fabricados (retorna vazio quando não há dados reais)
    const getMockForumData = () => {
        return []
    }

    const getMockReplies = () => {
        return []
    }
    
    const timerRef = useRef(null)
    const pdfContainerRef = useRef(null)
    const mainContentRef = useRef(null)
    const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)
    const [watermarkedPdfUrl, setWatermarkedPdfUrl] = useState(null)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [videoWatermarkPos, setVideoWatermarkPos] = useState({ top: '10%', left: '10%' })

    // Estados específicos da Sprint 1 (Portal do Aluno / LMS)
    const [taskSubmission, setTaskSubmission] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [studentId, setStudentId] = useState(null)
    const [turmaId, setTurmaId] = useState(null)
    const [upcomingPractical, setUpcomingPractical] = useState(null)
    const [hasConfirmedAttendance, setHasConfirmedAttendance] = useState(false)

    // ANTI-FRAUDE: Bloqueios
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault()
        
        // Bloquear botão direito
        document.addEventListener('contextmenu', preventDefault)
        // Bloquear copiar e colar
        document.addEventListener('copy', preventDefault)
        document.addEventListener('paste', preventDefault)
        
        return () => {
            document.removeEventListener('contextmenu', preventDefault)
            document.removeEventListener('copy', preventDefault)
            document.removeEventListener('paste', preventDefault)
        }
    }, [])

    // Detectar saída do fullscreen via tecla ESC ou botão nativo do browser
    useEffect(() => {
        const handleFsChange = () => {
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
            setIsPdfFullscreen(isFs)
        }
        document.addEventListener('fullscreenchange', handleFsChange)
        document.addEventListener('webkitfullscreenchange', handleFsChange)
        document.addEventListener('mozfullscreenchange', handleFsChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange)
            document.removeEventListener('webkitfullscreenchange', handleFsChange)
            document.removeEventListener('mozfullscreenchange', handleFsChange)
        }
    }, [])

    const togglePdfFullscreen = () => {
        const el = pdfContainerRef.current
        if (!el) return
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
        if (!isFs) {
            if (el.requestFullscreen) el.requestFullscreen()
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen() // Safari/iOS
            else if (el.mozRequestFullScreen) el.mozRequestFullScreen()       // Firefox
        } else {
            if (document.exitFullscreen) document.exitFullscreen()
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen()
        }
    }

    const fetchData = async () => {
        if (!session?.user?.id) return
        setLoading(true)
        try {
            // Detalhes da aula + módulo/curso
            const { lesson: lessonData, module: mod, course: crs } = await lmsApi.lessonDetail(lessonId)

            if (lessonData) {
                setLesson(lessonData)
                setCourse(crs || null)
                const courseId = mod?.course_id

                // Todas as aulas do curso
                const { lessons } = await lmsApi.courseLessons(courseId)
                setAllLessons(lessons || [])

                // Quizzes do curso
                const { quizzes: qzs } = await lmsApi.courseQuizzesStudent(courseId)
                setCourseQuizzes(qzs || [])

                // Resultados dos quizzes do aluno
                const { results: qres } = await lmsApi.results({})
                const qMap = {}
                qres?.forEach(r => {
                    const current = qMap[r.quiz_id] || { is_approved: false, score: 0, attempts_count: 0 }
                    qMap[r.quiz_id] = {
                        is_approved: current.is_approved || r.is_approved,
                        score: Math.max(current.score, r.score || 0),
                        attempts_count: Math.max(current.attempts_count, r.attempts_count || 0)
                    }
                })
                setQuizStatus(qMap)

                // Progresso do aluno
                const { progress } = await lmsApi.progress()
                const statusMap = {}
                progress?.forEach(p => { statusMap[p.lesson_id] = { is_completed: p.is_completed, watched_seconds: p.watched_seconds } })
                setLessonStatus(statusMap)
                if (statusMap[lessonId]) {
                    setSecondsWatched(statusMap[lessonId]?.watched_seconds || 0)
                    setIsCompleted(statusMap[lessonId]?.is_completed || false)
                }

                // TRAVA SEQUENCIAL (acesso direto por URL / botão "próxima"):
                // se a aula pedida está bloqueada porque a anterior não foi
                // concluída, redireciona para a próxima aula liberada.
                const reqIdx = (lessons || []).findIndex(l => l.id === lessonId)
                const previousLesson = reqIdx > 0 ? lessons[reqIdx - 1] : null
                const previousExercise = previousLesson ? (qzs || []).find(q => q.quiz_type === 'exercise' && q.lesson_id === previousLesson.id) : null
                const previousReady = !previousLesson || (statusMap[previousLesson.id]?.is_completed && (!previousExercise || qMap[previousExercise.id]?.attempts_count > 0))
                if (reqIdx > 0 && !previousReady) {
                    let allowedIdx = 0
                    while (allowedIdx < lessons.length - 1) {
                        const allowedLesson = lessons[allowedIdx]
                        const exercise = (qzs || []).find(q => q.quiz_type === 'exercise' && q.lesson_id === allowedLesson.id)
                        if (!statusMap[allowedLesson.id]?.is_completed || (exercise && !qMap[exercise.id]?.attempts_count)) break
                        allowedIdx++
                    }
                    const target = lessons[allowedIdx]
                    if (target && target.id !== lessonId && courseId) {
                        navigate(`/curso/${courseId}/aula/${target.id}`, { replace: true })
                        return
                    }
                }

                // Dados do estudante (turma/prática/upload)
                try {
                    const { students } = await studentsApi.list({ user_id: session.user.id })
                    const studentsData = students && students[0]
                    if (studentsData) {
                        setStudentId(studentsData.id)
                        setTurmaId(studentsData.turma_id)

                        if (studentsData.turma_id) {
                            const { attendance: attData } = await attendanceApi.list({ student_id: studentsData.id })
                            if (attData && attData.length > 0) {
                                const datasUnicas = Array.from(new Set(attData.map(a => a.created_at?.split('T')[0])))
                                const totalDadas = datasUnicas.length
                                const presencas = attData.filter(a => a.class_id === studentsData.turma_id && (a.status === 'presente' || a.status === 'falta_justificada')).length
                                setFrequenciaPratica(totalDadas > 0 ? Math.round((presencas / totalDadas) * 100) : 100)
                            } else {
                                setFrequenciaPratica(100)
                            }
                        }

                        if (lessonData.type === 'presencial' && studentsData.turma_id) {
                            const { classes } = await classesApi.list()
                            const turmaData = (classes || []).find(cl => cl.id === studentsData.turma_id)
                            if (turmaData) {
                                setUpcomingPractical(turmaData)
                                const { attendance } = await attendanceApi.list({ student_id: studentsData.id, class_id: studentsData.turma_id })
                                setHasConfirmedAttendance(!!(attendance && attendance.length > 0))
                            }
                        }
                    }
                } catch (stErr) {
                    console.warn("Erro ao buscar dados do estudante:", stErr.message)
                }

                // Tarefa: submissão existente
                if (lessonData.type === 'tarefa') {
                    try {
                        const { submission } = await lmsApi.taskSubmission(lessonId)
                        setTaskSubmission(submission)
                    } catch (taskErr) {
                        console.warn("Erro ao buscar submissão da tarefa:", taskErr.message)
                    }
                }

                fetchQuestions()
            }
        } catch (err) {
            console.error("Erro geral no carregamento de dados do player:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmAttendance = async () => {
        if (!studentId || !upcomingPractical) return;
        
        try {
            await attendanceApi.create({
                student_id: studentId,
                class_id: upcomingPractical.id,
                status: 'presente',
                confirmed_by_student: true,
            });

            setHasConfirmedAttendance(true);
            
            // Incrementar localmente o enrolled_count para feedback visual instantâneo
            setUpcomingPractical(prev => ({
                ...prev,
                enrolled_count: (prev.enrolled_count || 0) + 1
            }));

            alert('Presença confirmada com sucesso! Esperamos você no treinamento prático presencial.');
        } catch (err) {
            console.error('Erro ao confirmar presença na aula presencial:', err);
            alert('Erro ao confirmar presença: ' + err.message);
        }
    }

    const handleTaskFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !session?.user?.id || !lessonId) return;

        setUploading(true);
        try {
            const { url: publicUrl } = await uploadFile(file, `tasks`);
            const { submission: subData } = await lmsApi.submitTask(lessonId, publicUrl);

            setTaskSubmission(subData || {
                student_id: session.user.id,
                lesson_id: lessonId,
                file_url: publicUrl,
                status: 'enviado',
                submitted_at: new Date().toISOString()
            });

            // Registrar aula como concluida ao enviar a tarefa!
            if (!isCompleted) {
                setIsCompleted(true);
                saveProgress(secondsWatched + 10, true);
            }

            alert('Solução de tarefa enviada com sucesso! O instrutor revisará em breve.');
        } catch (error) {
            console.error('Erro no upload de tarefa:', error);
            alert('Falha ao enviar solução. Detalhes: ' + error.message);
        } finally {
            setUploading(false);
        }
    }

    const fetchQuestions = async () => {
        try {
            const { doubts } = await lmsApi.lessonDoubts(lessonId)
            setLessonQuestions(doubts || [])
        } catch { setLessonQuestions([]) }
    }

    const handleSubmitQuestion = async () => {
        if (!newQuestion.trim()) return
        try {
            await lmsApi.createDoubt({ lesson_id: lessonId, question_text: newQuestion })
            setNewQuestion('')
            fetchQuestions()
        } catch (err) {
            alert('Erro ao enviar pergunta: ' + err.message)
        }
    }

    // Funções do novo Fórum de Dúvidas Colaborativo (Prioridade 🟡 9)
    const fetchForumTopics = async (lId = lessonId) => {
        if (!lId) return
        setForumLoading(true)
        setForumError(false)
        try {
            const { topics } = await lmsApi.lessonForum(lId)
            setForumTopics((topics || []).map(t => ({ ...t, replies_count: t.replies_count || 0 })))
        } catch (err) {
            console.warn("Erro ao buscar tópicos do fórum (usando fallbacks resilientes):", err.message)
            setForumTopics(getMockForumData())
            setForumError(true)
        } finally {
            setForumLoading(false)
        }
    }

    const fetchTopicReplies = async (topicId) => {
        if (!topicId) return
        setRepliesLoading(true)
        try {
            const { replies } = await lmsApi.topicReplies(topicId)
            setTopicReplies(replies || [])
        } catch (err) {
            console.warn("Erro ao buscar respostas do fórum (usando fallbacks resilientes):", err.message)
            setTopicReplies(getMockReplies(topicId))
        } finally {
            setRepliesLoading(false)
        }
    }

    const handleCreateTopic = async (e) => {
        e.preventDefault()
        if (!newTopicTitle.trim() || !newTopicContent.trim() || !session?.user?.id || !lessonId) return

        try {
            await lmsApi.createTopic({
                lesson_id: lessonId,
                student_id: session.user.id,
                title: newTopicTitle.trim(),
                content: newTopicContent.trim(),
            })

            setNewTopicTitle('')
            setNewTopicContent('')
            setShowNewTopicForm(false)
            fetchForumTopics(lessonId)
            alert('Novo tópico de debate criado com sucesso no fórum da lição!')
        } catch (err) {
            console.error("Erro ao criar tópico no fórum:", err)
            alert('Erro ao criar tópico: ' + (err.message || 'tente novamente.'))
        }
    }

    const handleCreateReply = async (e) => {
        e.preventDefault()
        if (!newReplyContent.trim() || !selectedTopic || !session?.user?.id) return

        try {
            await lmsApi.createReply({
                topic_id: selectedTopic.id,
                author_id: session.user.id,
                content: newReplyContent.trim(),
            })

            setNewReplyContent('')
            fetchTopicReplies(selectedTopic.id)
            setForumTopics(prev => prev.map(t => t.id === selectedTopic.id ? { ...t, replies_count: t.replies_count + 1 } : t))
        } catch (err) {
            console.error("Erro ao inserir resposta no fórum:", err)
            alert('Erro ao enviar resposta: ' + (err.message || 'tente novamente.'))
        }
    }

    useEffect(() => {
        fetchData()
        fetchForumTopics(lessonId)
        setSecondsWatched(0)
        setIsCompleted(false)
        setSelectedTopic(null)
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = 0
        }
    }, [lessonId])

    // Efeito para mover a marca d'água do vídeo aleatoriamente a cada 10 segundos
    useEffect(() => {
        if (!lesson || !lesson.video_url) return

        const moveWatermark = () => {
            const top = Math.floor(Math.random() * 70) + 15 // Entre 15% e 85% para não sair dos limites visíveis
            const left = Math.floor(Math.random() * 70) + 15 // Entre 15% e 85%
            setVideoWatermarkPos({ top: `${top}%`, left: `${left}%` })
        }

        moveWatermark()
        const interval = setInterval(moveWatermark, 10000)

        return () => clearInterval(interval)
    }, [lesson])

    // Efeito para injetar a marca d'água do CPF do aluno no PDF via pdf-lib
    useEffect(() => {
        let isCancelled = false
        const originalPdfUrl = lesson?.pdf_url

        const processPdf = async () => {
            if (!originalPdfUrl) return
            
            // Se for uma imagem, apenas atribuímos diretamente (o visualizador aplica marca d'água via overlay HTML)
            if (originalPdfUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || originalPdfUrl.includes('image')) {
                setWatermarkedPdfUrl(originalPdfUrl)
                return
            }

            setIsGeneratingPdf(true)
            setWatermarkedPdfUrl(null)

            try {
                const studentCpf = userProfile?.cpf || session?.user?.email || 'CPF nao cadastrado'
                const studentName = userProfile?.full_name || 'Aluno'
                const watermarkText = `Visualizado por: ${studentName} (${studentCpf}) - CEC Engenharia`

                const response = await fetch(originalPdfUrl)
                if (!response.ok) {
                    throw new Error(`Erro ao baixar PDF: ${response.statusText}`)
                }
                const pdfBytes = await response.arrayBuffer()

                const pdfDoc = await PDFDocument.load(pdfBytes)
                const pages = pdfDoc.getPages()
                const font = await pdfDoc.embedFont('Helvetica')

                for (const page of pages) {
                    const { width, height } = page.getSize()
                    
                    // Desenha marca d'água diagonal centralizada
                    page.drawText(watermarkText, {
                        x: width / 2 - 220,
                        y: height / 2,
                        size: Math.max(10, Math.min(width, height) * 0.035),
                        font: font,
                        color: rgb(0.6, 0.6, 0.6),
                        opacity: 0.15,
                        rotate: degrees(-45),
                    })

                    // Rodapé discreto de segurança
                    page.drawText(`Documento seguro - CPF do aluno: ${studentCpf}`, {
                        x: 20,
                        y: 15,
                        size: 9,
                        font: font,
                        color: rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    })
                }

                const modifiedPdfBytes = await pdfDoc.save()
                const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })
                const blobUrl = URL.createObjectURL(blob)

                if (!isCancelled) {
                    setWatermarkedPdfUrl(blobUrl)
                } else {
                    URL.revokeObjectURL(blobUrl)
                }
            } catch (err) {
                console.error("Falha ao gerar marca d'água no PDF. Usando fallback original.", err)
                if (!isCancelled) {
                    setWatermarkedPdfUrl(originalPdfUrl)
                }
            } finally {
                if (!isCancelled) {
                    setIsGeneratingPdf(false)
                }
            }
        }

        processPdf()

        return () => {
            isCancelled = true
            setWatermarkedPdfUrl(prev => {
                if (prev && prev.startsWith('blob:')) {
                    URL.revokeObjectURL(prev)
                }
                return null
            })
        }
    }, [lesson, userProfile, session])

    const saveProgress = async (seconds, completed) => {
        if (!session?.user?.id || !lessonId) return
        try {
            await lmsApi.saveProgress({ lesson_id: lessonId, watched_seconds: seconds, is_completed: completed })
        } catch (err) {
            console.error("Erro ao salvar progresso:", err)
        }
    }

    // Lógica de cronômetro para tempo mínimo e Heartbeat de presença
    useEffect(() => {
        if (!lesson) return

        let heartbeatCount = 0
        timerRef.current = setInterval(() => {
            setSecondsWatched(prev => {
                const next = prev + 1
                const completed = !lesson.min_watch_time_sec || next >= lesson.min_watch_time_sec
                
                if (completed && !isCompleted) {
                    setIsCompleted(true)
                    setLessonStatus(current => ({
                        ...current,
                        [lessonId]: {
                            ...(current[lessonId] || {}),
                            is_completed: true,
                            watched_seconds: next,
                        },
                    }))
                    saveProgress(next, true)
                } else if (next % 10 === 0) { // Salvar progresso da aula a cada 10 segundos
                    setLessonStatus(current => ({
                        ...current,
                        [lessonId]: {
                            ...(current[lessonId] || {}),
                            watched_seconds: next,
                        },
                    }))
                    saveProgress(next, isCompleted)
                }

                // Heartbeat para Carga Horária (lms_time_logs) - a cada 30 segundos
                heartbeatCount++
                if (heartbeatCount >= 30) {
                    logStudyTime(30)
                    heartbeatCount = 0
                }

                return next
            })
        }, 1000)

        return () => {
            clearInterval(timerRef.current)
            saveProgress(secondsWatched, isCompleted)
            // Log do tempo residual ao sair
            if (heartbeatCount > 5) logStudyTime(heartbeatCount)
        }
    }, [lesson, isCompleted])

    const logStudyTime = async (seconds) => {
        if (!session?.user?.id || !lessonId) return
        try {
            await lmsApi.logTime({ course_id: course?.id || null, lesson_id: lessonId, duration_seconds: seconds })
        } catch (e) {
            console.error("Erro ao registrar heartbeat:", e)
        }
    }

    const formatVideoUrl = (url) => {
        if (!url) return ''
        const cleanUrl = url.trim()

        // 1. YouTube Regex
        const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/
        const ytMatch = cleanUrl.match(ytRegex)
        if (ytMatch && ytMatch[2].length === 11) {
            return `https://www.youtube.com/embed/${ytMatch[2]}`
        }

        // 2. Vimeo Regex
        const vimeoRegex = /(?:vimeo)\.com\/(?:channels\/[\w| ]+\/|groups\/[^\/]+\/videos\/|album\/[0-9]+\/video\/|showcase\/[0-9]+\/video\/|video\/|)(^[0-9]+|[0-9]+)/
        const vimeoMatch = cleanUrl.match(vimeoRegex)
        if (vimeoMatch) {
            return `https://player.vimeo.com/video/${vimeoMatch[1]}`
        }

        return cleanUrl
    }

    const isImageUrl = (url) => {
        if (!url) return false
        const cleanPath = url.split('?')[0].toLowerCase()
        return cleanPath.endsWith('.png') ||
               cleanPath.endsWith('.jpg') ||
               cleanPath.endsWith('.jpeg') ||
               cleanPath.endsWith('.webp') ||
               cleanPath.endsWith('.gif') ||
               cleanPath.endsWith('.svg')
    }

    // Arquivo de vídeo direto (upload local): usa <video> nativo em vez de
    // iframe — controles, seek e fullscreen funcionam sem depender de embed.
    const isDirectVideo = (url) => /\.(mp4|webm|ogg)(\?|$)/i.test((url || '').split('#')[0])

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando aula...</div>
    if (!lesson) return <div style={{ padding: '2rem', textAlign: 'center' }}>Aula não encontrada.</div>

    const progressPercent = lesson.min_watch_time_sec > 0 
        ? Math.min(100, (secondsWatched / lesson.min_watch_time_sec) * 100)
        : 100

    return (
        <div className="lesson-player-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: 'calc(100vh - 120px)', backgroundColor: '#0f172a' }}>
            <style>{`
                @media (max-width: 768px) {
                    .lesson-player-grid {
                        grid-template-columns: 1fr !important;
                        height: auto !important;
                    }
                    .lesson-player-sidebar {
                        border-left: none !important;
                        border-top: 1px solid #334155 !important;
                    }
                }
                .pdf-fullscreen-container:fullscreen {
                    width: 100vw !important;
                    height: 100vh !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    background-color: #0f172a !important;
                    z-index: 99999 !important;
                }
                .pdf-fullscreen-container:-webkit-full-screen {
                    width: 100vw !important;
                    height: 100vh !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    background-color: #0f172a !important;
                    z-index: 99999 !important;
                }
                .pdf-fullscreen-container:-moz-full-screen {
                    width: 100vw !important;
                    height: 100vh !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    background-color: #0f172a !important;
                    z-index: 99999 !important;
                }
            `}</style>
            {/* PLAYER E CONTEÚDO */}
            <div ref={mainContentRef} style={{ overflowY: 'auto', padding: '2rem', color: 'white' }}>
                <button 
                    onClick={() => navigate('/meus-cursos')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem' }}
                >
                    <ChevronLeft size={16} /> Voltar para Meus Cursos
                </button>

                {/* ÁREA DE CONTEÚDO PRINCIPAL (PLAYER OU COMPONENTE ADAPTATIVO) */}
                {(true) ? (
                    <>
                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: 'black', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', border: '1px solid #1e293b' }}>
                            {lesson.video_url ? (
                                <>
                                    {isDirectVideo(lesson.video_url) ? (
                                        <video
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'black' }}
                                            src={lesson.video_url}
                                            controls
                                            controlsList="nodownload"
                                            playsInline
                                        />
                                    ) : (
                                    <iframe
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                        src={formatVideoUrl(lesson.video_url)}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                    )}
                                    
                                    {/* Marca d'água flutuante dinâmica sobre o vídeo */}
                                    <div style={{
                                        position: 'absolute',
                                        top: videoWatermarkPos.top,
                                        left: videoWatermarkPos.left,
                                        transform: 'translate(-50%, -50%)',
                                        color: 'rgba(255, 255, 255, 0.18)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                        pointerEvents: 'none',
                                        zIndex: 8,
                                        whiteSpace: 'nowrap',
                                        transition: 'top 0.5s ease, left 0.5s ease',
                                        userSelect: 'none'
                                    }}>
                                        {userProfile?.full_name || 'Aluno'} ({userProfile?.cpf || session?.user?.email || 'CPF nao cadastrado'})
                                    </div>

                                    {lesson.allow_download && (
                                        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10 }}>
                                            <a
                                                href={lesson.video_url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    background: 'rgba(16,185,129,0.9)',
                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                    borderRadius: '8px',
                                                    color: 'white',
                                                    padding: '0.45rem 0.75rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    textDecoration: 'none',
                                                    backdropFilter: 'blur(4px)',
                                                    transition: 'background 0.2s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(5,150,105,1)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.9)'}
                                            >
                                                <Download size={15} />
                                                Baixar Vídeo / Link Externo
                                            </a>
                                        </div>
                                    )}
                                </>
                            ) : lesson.pdf_url ? (
                                <div
                                    ref={pdfContainerRef}
                                    className="pdf-fullscreen-container"
                                    style={{
                                        position: isPdfFullscreen ? 'fixed' : 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: isPdfFullscreen ? '100vw' : '100%',
                                        height: isPdfFullscreen ? '100vh' : '100%',
                                        zIndex: isPdfFullscreen ? 99999 : 'auto',
                                        backgroundColor: '#0f172a'
                                    }}
                                >
                                    {isGeneratingPdf || !watermarkedPdfUrl ? (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '1rem' }}>
                                            <div className="spinner-border text-success" role="status" style={{ width: '2rem', height: '2rem' }}>
                                                <span className="visually-hidden">Protegendo documento...</span>
                                            </div>
                                            <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Protegendo documento com marca d'água...</p>
                                        </div>
                                    ) : isImageUrl(watermarkedPdfUrl) ? (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
                                            <img 
                                                src={watermarkedPdfUrl} 
                                                alt={lesson.title} 
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                                            />
                                            {/* Marca d'água sobreposta sobre imagem no EAD */}
                                            <div style={{
                                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)',
                                                fontSize: '1.8rem', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.12)',
                                                textShadow: '1px 1px 2px rgba(0,0,0,0.15)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
                                                textAlign: 'center', userSelect: 'none'
                                            }}>
                                                {userProfile?.full_name || 'Aluno'} <br />
                                                {userProfile?.cpf || session?.user?.email}
                                            </div>
                                        </div>
                                    ) : (
                                        <iframe 
                                            style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: 'white' }}
                                            src={watermarkedPdfUrl}
                                            title="Documento da Aula"
                                        ></iframe>
                                    )}
                                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
                                        {!isGeneratingPdf && watermarkedPdfUrl && lesson.allow_download && (
                                            <>
                                                <a
                                                    href={watermarkedPdfUrl}
                                                    download={`${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_protegido.pdf`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        background: 'rgba(16,185,129,0.9)',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        padding: '0.45rem 0.75rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        textDecoration: 'none',
                                                        backdropFilter: 'blur(4px)',
                                                        transition: 'background 0.2s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(5,150,105,1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.9)'}
                                                >
                                                    <Download size={15} />
                                                    Baixar Material
                                                </a>
                                                <a
                                                    href={watermarkedPdfUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        background: 'rgba(15,23,42,0.85)',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        borderRadius: '8px',
                                                        color: 'white',
                                                        padding: '0.45rem 0.75rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        textDecoration: 'none',
                                                        backdropFilter: 'blur(4px)',
                                                        transition: 'background 0.2s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,41,59,0.95)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,23,42,0.85)'}
                                                >
                                                    <ExternalLink size={15} />
                                                    Abrir em Nova Guia
                                                </a>
                                            </>
                                        )}
                                        <button
                                            onClick={togglePdfFullscreen}
                                            title={isPdfFullscreen ? 'Sair da Tela Cheia' : 'Expandir para Tela Cheia'}
                                            style={{
                                                background: 'rgba(15,23,42,0.85)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                padding: '0.45rem 0.75rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                backdropFilter: 'blur(4px)',
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,41,59,0.95)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,23,42,0.85)'}
                                        >
                                            {isPdfFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                                            {isPdfFullscreen ? 'Reduzir' : 'Tela Cheia'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                    <Video size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                    <p>Esta aula não possui conteúdo (Vídeo/PDF) vinculado.</p>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{lesson.title}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Progresso da Aula:</span>
                                    <div style={{ width: '150px', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' }}></div>
                                    </div>
                                    {isCompleted ? <CheckCircle size={18} className="text-success" /> : <Lock size={18} style={{ color: '#94a3b8' }} />}
                                </div>
                            </div>
                            
                            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '1rem' }}>
                                {lesson.content_text || 'Assista ao vídeo ou visualize o documento acima para concluir esta lição.'}
                            </p>
                        </div>
                    </>
                ) : (
                    <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', marginBottom: '2rem' }}>
                        {lesson.type === 'texto' && (
                            <div style={{ padding: '2.5rem 2rem', color: '#e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        <FileText size={16} />
                                        <span>Leitura Complementar</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Progresso:</span>
                                        <div style={{ width: '100px', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' }}></div>
                                        </div>
                                        {isCompleted ? <CheckCircle size={18} className="text-success" /> : <Lock size={18} style={{ color: '#94a3b8' }} />}
                                    </div>
                                </div>
                                <h1 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '1.5rem', fontWeight: 800 }}>{lesson.title}</h1>
                                <div 
                                    className="prose prose-invert"
                                    style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#cbd5e1' }}
                                    dangerouslySetInnerHTML={{ __html: lesson.content_text || '<p>Esta lição não possui conteúdo de texto cadastrado.</p>' }}
                                />
                            </div>
                        )}

                        {lesson.type === 'tarefa' && (
                            <div style={{ padding: '2.5rem 2rem', color: '#e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        <Upload size={16} />
                                        <span>Atividade Prática / Envio de Tarefa</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Tarefa:</span>
                                        {isCompleted ? (
                                            <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle size={15} /> Concluída
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={15} /> Pendente de envio
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <h1 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '1.25rem', fontWeight: 800 }}>{lesson.title}</h1>
                                
                                <div style={{ backgroundColor: '#0f172a', borderLeft: '4px solid #f59e0b', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem' }}>
                                    <h4 style={{ fontWeight: 'bold', color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Instruções da Tarefa:</h4>
                                    <div 
                                        style={{ fontSize: '0.92rem', lineHeight: '1.6', color: '#cbd5e1' }}
                                        dangerouslySetInnerHTML={{ __html: lesson.content_text || '<p>Siga as instruções descritas pelo instrutor para realizar esta atividade e faça o envio do seu relatório/arquivo abaixo.</p>' }}
                                    />
                                </div>

                                {/* Painel de Upload de Tarefa */}
                                <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Upload size={18} className="text-warning" /> Enviar Solução da Atividade
                                    </h3>
                                    
                                    {taskSubmission ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                                    <CheckCircle size={18} />
                                                    <span>Tarefa Enviada com Sucesso!</span>
                                                </div>
                                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                                                    Enviado em: {new Date(taskSubmission.submitted_at).toLocaleString('pt-BR')}
                                                </p>
                                                <a 
                                                    href={taskSubmission.file_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700', textDecoration: 'none', marginTop: '0.75rem' }}
                                                >
                                                    <ExternalLink size={14} /> Visualizar arquivo enviado
                                                </a>
                                            </div>

                                            {/* Notas e Feedback do Instrutor */}
                                            {(taskSubmission.grade !== null || taskSubmission.feedback) && (
                                                <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '10px', border: '1px solid #334155' }}>
                                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>Avaliação do Instrutor:</h4>
                                                    {taskSubmission.grade !== null && (
                                                        <div style={{ marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Nota: </span>
                                                            <strong style={{ fontSize: '1rem', color: taskSubmission.grade >= 70 ? '#10b981' : '#ef4444' }}>{taskSubmission.grade}/100</strong>
                                                        </div>
                                                    )}
                                                    {taskSubmission.feedback && (
                                                        <div>
                                                            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Feedback: </span>
                                                            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '4px 0 0 0', fontStyle: 'italic' }}>"{taskSubmission.feedback}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Permitir Reenvio se ainda não foi avaliado */}
                                            {taskSubmission.grade === null && (
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    <label className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '8px', margin: 0 }}>
                                                        {uploading ? 'Enviando Novo Arquivo...' : 'Substituir Envio'}
                                                        <input 
                                                            type="file" 
                                                            hidden 
                                                            disabled={uploading}
                                                            onChange={handleTaskFileUpload} 
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                                                Selecione o arquivo da sua solução (PDF, ZIP, DOCX, Imagem) para enviar ao instrutor. Tamanho máximo recomendado: 10MB.
                                            </p>
                                            
                                            <label className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.88rem', cursor: 'pointer', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                                <Upload size={16} />
                                                {uploading ? 'Enviando arquivo...' : 'Selecionar e Enviar Solução'}
                                                <input 
                                                    type="file" 
                                                    hidden 
                                                    disabled={uploading}
                                                    onChange={handleTaskFileUpload} 
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {lesson.type === 'presencial' && (
                            <div style={{ padding: '2.5rem 2rem', color: '#e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        <MapPin size={16} />
                                        <span>Aula Prática Presencial</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Status:</span>
                                        {hasConfirmedAttendance ? (
                                            <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle size={15} /> Presença Confirmada
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={15} /> Confirmação Pendente
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <h1 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '1.5rem', fontWeight: 800 }}>{lesson.title}</h1>
                                
                                {upcomingPractical ? (
                                    <div style={{ maxWidth: '600px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '2rem', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: '#10b981' }}></div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem' }}>
                                            <MapPin size={15} />
                                            <span>Agendamento de Treinamento Técnico</span>
                                        </div>
                                        
                                        <h4 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '800', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                                            {upcomingPractical.lms_courses?.title || 'Treinamento Técnico Presencial'}
                                        </h4>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', color: '#10b981' }}>
                                                <Calendar size={16} />
                                                <span>
                                                    {new Date(upcomingPractical.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={16} className="text-muted" />
                                                <span>{upcomingPractical.start_time?.substring(0, 5) || '08:00'} às {upcomingPractical.end_time?.substring(0, 5) || '17:00'}</span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                                                <MapPin size={16} className="text-muted" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                <span>{upcomingPractical.address || 'Sede C&C Engenharia'}</span>
                                            </div>
                                            
                                            {upcomingPractical.instructor_name && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Users size={16} className="text-muted" />
                                                    <span>Instrutor: <strong>{upcomingPractical.instructor_name}</strong></span>
                                                </div>
                                            )}
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                                    Vagas: <strong>{(upcomingPractical.capacity || 20) - (upcomingPractical.enrolled_count || 0)} de {upcomingPractical.capacity || 20} disponíveis</strong>
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #334155', paddingTop: '1.25rem' }}>
                                            {hasConfirmedAttendance ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '800', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                    <CheckCircle size={18} /> Presença Confirmada
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={handleConfirmAttendance}
                                                    className="btn"
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '0.75rem', 
                                                        backgroundColor: '#10b981', 
                                                        color: 'white', 
                                                        fontWeight: '800', 
                                                        fontSize: '0.9rem', 
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    ✓ Confirmar Presença na Aula Prática
                                                </button>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcomingPractical.address || 'Sede C&C Engenharia')}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="btn"
                                                    style={{ 
                                                        padding: '0.6rem', 
                                                        background: '#0f172a', 
                                                        border: '1px solid #334155', 
                                                        color: 'white', 
                                                        fontWeight: '700', 
                                                        fontSize: '0.8rem', 
                                                        borderRadius: '8px',
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <MapPin size={14} /> Ver no Maps
                                                </a>
                                                
                                                {upcomingPractical.whatsapp_group_url ? (
                                                    <a 
                                                        href={upcomingPractical.whatsapp_group_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="btn"
                                                        style={{ 
                                                            padding: '0.6rem', 
                                                            background: '#075E54', 
                                                            color: 'white', 
                                                            border: 'none',
                                                            fontWeight: '700', 
                                                            fontSize: '0.8rem', 
                                                            borderRadius: '8px',
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <MessageCircle size={14} /> Grupo da Turma
                                                    </a>
                                                ) : (
                                                    <button
                                                        disabled
                                                        style={{ 
                                                            padding: '0.6rem', 
                                                            background: '#0f172a', 
                                                            color: '#475569', 
                                                            border: '1px solid #1e293b',
                                                            fontWeight: '700', 
                                                            fontSize: '0.8rem', 
                                                            borderRadius: '8px',
                                                            cursor: 'not-allowed',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        Sem WhatsApp
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', maxWidth: '500px' }}>
                                        <Clock size={36} color="#f59e0b" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
                                        <h4 style={{ color: 'white', fontWeight: 'bold', marginBottom: '0.5rem' }}>Nenhuma Aula Prática Agendada</h4>
                                        <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
                                            Fique atento! A secretaria da CEC Engenharia entrará em contato para agendar o seu treinamento presencial de final de semana em breve.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {lesson.type === 'quiz' && (
                            <div style={{ padding: '3.5rem 2rem', color: '#e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy size={48} color="#f59e0b" style={{ marginBottom: '1.25rem' }} />
                                <h1 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '1rem', fontWeight: 800 }}>Questionário Avaliativo</h1>
                                <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', marginBottom: '2rem', lineHeight: '1.6' }}>
                                    Chegou a hora de testar os seus conhecimentos! Esta lição contém um quiz obrigatório para avaliar seu aprendizado no módulo.
                                </p>
                                
                                {(() => {
                                    const moduleQuiz = courseQuizzes.find(q => q.module_id === lesson.module_id)
                                    if (moduleQuiz) {
                                        const status = quizStatus[moduleQuiz.id]
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                                {status && (
                                                    <div style={{ backgroundColor: status.is_approved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: status.is_approved ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600' }}>
                                                        Última nota: <strong style={{ color: status.is_approved ? '#10b981' : '#ef4444' }}>{status.score}%</strong> {status.is_approved ? '(Aprovado! 🎉)' : '(Abaixo da média)'}
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={() => navigate(`/exame/${moduleQuiz.id}`)}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.8rem 2.5rem', fontSize: '1.05rem', fontWeight: 'bold', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', margin: 0 }}
                                                >
                                                    Iniciar Questionário <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        )
                                    } else {
                                        return (
                                            <p style={{ color: '#e11d48', fontSize: '0.88rem', fontWeight: 'bold' }}>
                                                ⚠️ Nenhum questionário cadastrado para este módulo no momento.
                                            </p>
                                        )
                                    }
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* BOTÃO DE PRÓXIMA AULA (UNIVERSAL) */}
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        onClick={() => {
                            if (!isCompleted) return
                            const lessonExercise = courseQuizzes.find(q => q.quiz_type === 'exercise' && q.lesson_id === lessonId)
                            if (lessonExercise && !quizStatus[lessonExercise.id]?.attempts_count) {
                                navigate(`/exame/${lessonExercise.id}`)
                                return
                            }
                            const currentIndex = allLessons.findIndex(l => l.id === lessonId)
                            if (currentIndex < allLessons.length - 1) {
                                navigate(`/curso/${courseId}/aula/${allLessons[currentIndex+1].id}`)
                            } else {
                                const finalExam = courseQuizzes.find(q => q.quiz_type === 'final_exam')
                                if (finalExam && !quizStatus[finalExam.id]?.is_approved) navigate(`/exame/${finalExam.id}`)
                                else setShowCompletionModal(true)
                            }
                        }}
                        className="btn btn-primary"
                        disabled={!isCompleted}
                        title={!isCompleted ? 'Conclua o tempo mínimo desta aula para continuar.' : 'Abrir a próxima aula'}
                        style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isCompleted ? 1 : 0.55, cursor: isCompleted ? 'pointer' : 'not-allowed' }}
                    >
                        {isCompleted
                            ? (courseQuizzes.some(q => q.quiz_type === 'exercise' && q.lesson_id === lessonId && !quizStatus[q.id]?.attempts_count)
                                ? 'Fazer exercício da aula'
                                : (allLessons.findIndex(l => l.id === lessonId) === allLessons.length - 1 && courseQuizzes.some(q => q.quiz_type === 'final_exam' && !quizStatus[q.id]?.is_approved) ? 'Fazer prova final' : 'Próxima Aula'))
                            : `Aguarde ${Math.max(0, (lesson.min_watch_time_sec || 0) - secondsWatched)}s`}
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* FÓRUM DE DÚVIDAS COLABORATIVO (Prioridade 🟡 9) */}
                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            💬 Fórum de Discussões &amp; Dúvidas
                        </h3>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowNewTopicForm(!showNewTopicForm)}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}
                        >
                            {showNewTopicForm ? 'Voltar para Tópicos' : '➕ Abrir Nova Dúvida'}
                        </button>
                    </div>

                    {/* Formulário de Novo Tópico */}
                    {showNewTopicForm && (
                        <form onSubmit={handleCreateTopic} className="animate-slide-up" style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'white', margin: 0 }}>Criar Novo Tópico de Debate</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8' }}>Título da Dúvida *</label>
                                <input 
                                    type="text" 
                                    className="form-control"
                                    placeholder="Ex: Dúvida sobre leitura do nônio no paquímetro..."
                                    value={newTopicTitle}
                                    onChange={e => setNewTopicTitle(e.target.value)}
                                    required
                                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '0.88rem', padding: '0.65rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8' }}>Descrição Detalhada *</label>
                                <textarea 
                                    className="form-control"
                                    placeholder="Descreva de forma completa a sua dúvida técnica ou dificuldade pedagógica..."
                                    rows="4"
                                    value={newTopicContent}
                                    onChange={e => setNewTopicContent(e.target.value)}
                                    required
                                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '0.88rem', padding: '0.65rem' }}
                                ></textarea>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowNewTopicForm(false)} style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ margin: 0, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                    Publicar Tópico
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Listagem de Tópicos do Fórum */}
                    {forumLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Carregando fórum de discussões...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {forumTopics.map(topic => {
                                const names = topic.student?.full_name?.split(' ') || ['Aluno']
                                const initials = names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0].substring(0, 2)
                                
                                return (
                                    <div 
                                        key={topic.id}
                                        onClick={() => { setSelectedTopic(topic); fetchTopicReplies(topic.id) }}
                                        style={{ 
                                            padding: '1.25rem', 
                                            backgroundColor: '#1e293b', 
                                            borderRadius: '12px', 
                                            border: '1px solid #334155', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            gap: '1rem',
                                            alignItems: 'start'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onMouseOut={e => e.currentTarget.style.borderColor = '#334155'}
                                    >
                                        <div style={{ 
                                            width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--primary)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', flexShrink: 0
                                        }}>
                                            {initials}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', margin: 0 }}>{topic.title}</h4>
                                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                                    {new Date(topic.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {topic.content}
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    Autor: <strong>{topic.student?.full_name || 'Aluno'}</strong>
                                                </span>
                                                <span style={{ 
                                                    fontSize: '0.78rem', color: 'var(--primary)', fontWeight: '700', 
                                                    backgroundColor: 'rgba(2, 132, 199, 0.08)', padding: '2px 8px', borderRadius: '6px'
                                                }}>
                                                    💬 {topic.replies_count || 0} {topic.replies_count === 1 ? 'resposta' : 'respostas'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            
                            {forumTopics.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem', padding: '2rem' }}>
                                    Nenhuma dúvida ou debate criado para esta lição. Seja o primeiro a postar no fórum!
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* MODAL PREMIUM DE DISCUSSÃO (selectedTopic) */}
                {selectedTopic && createPortal((
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999,
                        padding: '1rem'
                    }}>
                        <div className="card animate-slide-up" style={{ 
                            maxWidth: '750px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', 
                            border: '1px solid #334155', borderRadius: '16px', backgroundColor: '#1e293b', color: 'white',
                            display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                        }}>
                            {/* Topo do Modal */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    💬 Tópico de Debate
                                </h3>
                                <button 
                                    onClick={() => setSelectedTopic(null)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem', display: 'flex', alignItems: 'center', padding: '4px' }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Conteúdo da Dúvida em Destaque */}
                            <div style={{ backgroundColor: '#0f172a', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>
                                        Autor: {selectedTopic.student?.full_name || 'Aluno'}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                        {new Date(selectedTopic.created_at).toLocaleDateString('pt-BR')} às {new Date(selectedTopic.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'white', margin: 0 }}>{selectedTopic.title}</h4>
                                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {selectedTopic.content}
                                </p>
                            </div>

                            {/* Respostas do Tópico */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '300px', paddingRight: '4px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Respostas e Discussão</span>
                                
                                {repliesLoading ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Carregando debate...</div>
                                ) : topicReplies.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.82rem', margin: '1rem 0' }}>
                                        Nenhuma resposta ainda. Digite sua contribuição abaixo para cooperar com o colega!
                                    </p>
                                ) : (
                                    topicReplies.map((reply, idx) => {
                                        const isTeacher = reply.author?.role === 'instrutor' || reply.author?.role === 'admin' || reply.author?.role === 'coordenador' || reply.author?.full_name?.includes('(Instrutor)')
                                        const repNames = reply.author?.full_name?.split(' ') || ['Autor']
                                        const repInitials = repNames.length > 1 ? `${repNames[0][0]}${repNames[repNames.length - 1][0]}` : repNames[0].substring(0, 2)
                                        
                                        return (
                                            <div 
                                                key={reply.id || idx}
                                                style={{ 
                                                    padding: '1rem', 
                                                    backgroundColor: isTeacher ? '#0f172a' : '#1e293b', 
                                                    borderRadius: '10px', 
                                                    border: isTeacher ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #334155',
                                                    display: 'flex',
                                                    gap: '0.75rem',
                                                    alignItems: 'start',
                                                    marginLeft: isTeacher ? '1rem' : '0'
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '30px', height: '30px', borderRadius: '50%', 
                                                    backgroundColor: isTeacher ? 'rgba(245, 158, 11, 0.15)' : 'rgba(148, 163, 184, 0.1)', 
                                                    color: isTeacher ? '#F59E0B' : '#94A3B8', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', flexShrink: 0
                                                }}>
                                                    {repInitials}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isTeacher ? '#F59E0B' : 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {reply.author?.full_name || 'Aluno'}
                                                            {isTeacher && (
                                                                <span style={{ fontSize: '0.65rem', fontWeight: '800', backgroundColor: '#F59E0B', color: '#0f172a', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                                    ✨ Equipe Técnica
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                                            {new Date(reply.created_at).toLocaleDateString('pt-BR')} às {new Date(reply.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>
                                                        {reply.content}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Formulário de Resposta */}
                            <form onSubmit={handleCreateReply} style={{ borderTop: '1px solid #334155', paddingTop: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
                                <textarea 
                                    className="form-control"
                                    placeholder="Digite sua resposta ou contribuição..."
                                    rows="2"
                                    value={newReplyContent}
                                    onChange={e => setNewReplyContent(e.target.value)}
                                    required
                                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '0.85rem', padding: '0.65rem', flex: 1, resize: 'none' }}
                                ></textarea>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    style={{ padding: '0.65rem 1.5rem', fontWeight: '700', fontSize: '0.85rem', height: '40px', display: 'inline-flex', alignItems: 'center', margin: 0 }}
                                >
                                    Responder
                                </button>
                            </form>
                        </div>
                    </div>
                ), document.body)}
            </div>

            {/* BARRA LATERAL DA GRADE */}
            <div className="lesson-player-sidebar" style={{ backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
                    <h3 style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>Conteúdo do Curso</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>{course?.title}</p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {allLessons.map((l, idx) => {
                        const isCurrent = l.id === lessonId
                        const isDone = lessonStatus[l.id]?.is_completed
                        
                        const lessonModule = l.module_id
                        const previousLessons = allLessons.slice(0, idx)
                        const isBlockedByQuiz = previousLessons.some(previousLesson => {
                            const exercise = courseQuizzes.find(q => q.quiz_type === 'exercise' && q.lesson_id === previousLesson.id)
                            return exercise && !quizStatus[exercise.id]?.attempts_count
                        })

                        // TRAVA SEQUENCIAL: a aula só abre se a IMEDIATAMENTE
                        // anterior estiver concluída (a 1ª sempre abre). Some-se a
                        // isso o bloqueio por prova de módulo anterior.
                        const prevLesson = idx > 0 ? allLessons[idx - 1] : null
                        const isBlockedByPrev = !!prevLesson && !lessonStatus[prevLesson.id]?.is_completed
                        const isLocked = !isCurrent && (isBlockedByQuiz || isBlockedByPrev)
                        
                        // Verificar se existe quiz para este módulo logo após esta aula (se for a última do módulo)
                        const lessonExercise = courseQuizzes.find(q => q.quiz_type === 'exercise' && q.lesson_id === l.id)
                        const finalExam = idx === allLessons.length - 1 ? courseQuizzes.find(q => q.quiz_type === 'final_exam') : null
                        const moduleQuiz = lessonExercise || finalExam
                        const assessmentLocked = moduleQuiz?.quiz_type === 'final_exam'
                            ? allLessons.some(item => !lessonStatus[item.id]?.is_completed)
                            : !!moduleQuiz && !isDone

                        return (
                            <div key={l.id}>
                                <div 
                                    onClick={() => !isLocked && navigate(`/curso/${courseId}/aula/${l.id}`)}
                                    style={{ 
                                        padding: '1rem 1.5rem', 
                                        borderBottom: '1px solid #334155', 
                                        cursor: isLocked ? 'not-allowed' : 'pointer',
                                        backgroundColor: isCurrent ? '#0f172a' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        opacity: isLocked ? 0.5 : 1
                                    }}
                                >
                                    <span style={{ fontSize: '0.75rem', color: isDone ? '#10b981' : '#64748b' }}>
                                        {isDone ? <CheckCircle size={14} /> : `${idx + 1}.`}
                                    </span>
                                    <span style={{ fontSize: '0.875rem', color: isCurrent ? 'white' : '#94a3b8', flex: 1 }}>{l.title}</span>
                                    {isLocked && <Lock size={14} style={{ color: '#64748b' }} />}
                                </div>
                                
                                {moduleQuiz && (
                                    <div 
                                        onClick={() => !assessmentLocked && navigate(`/exame/${moduleQuiz.id}`)}
                                        style={{ 
                                            padding: '0.75rem 1.5rem', 
                                            backgroundColor: (moduleQuiz.quiz_type === 'final_exam' ? quizStatus[moduleQuiz.id]?.is_approved : quizStatus[moduleQuiz.id]?.attempts_count > 0)
                                                ? (moduleQuiz.quiz_type === 'final_exam' ? '#4c1d95' : '#064e3b') 
                                                : '#1e293b',
                                            borderBottom: '1px solid #334155',
                                            cursor: assessmentLocked ? 'not-allowed' : 'pointer',
                                            opacity: assessmentLocked ? 0.55 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            color: (moduleQuiz.quiz_type === 'final_exam' ? quizStatus[moduleQuiz.id]?.is_approved : quizStatus[moduleQuiz.id]?.attempts_count > 0)
                                                ? '#10b981' 
                                                : (moduleQuiz.quiz_type === 'final_exam' ? '#a855f7' : '#fbbf24')
                                        }}
                                    >
                                        {moduleQuiz.quiz_type === 'final_exam' ? <Trophy size={14} /> : <FileText size={14} />}
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                            {moduleQuiz.quiz_type === 'final_exam' ? 'PROVA FINAL' : 'EXERCÍCIO'}
                                        </span>
                                        { (moduleQuiz.quiz_type === 'final_exam' ? quizStatus[moduleQuiz.id]?.is_approved : quizStatus[moduleQuiz.id]?.attempts_count > 0) ? (
                                            <CheckCircle size={14} style={{ marginLeft: 'auto' }} />
                                        ) : (
                                            <Lock size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            {showCompletionModal && createPortal((
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 20000,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes scaleUp {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        @keyframes float {
                            0% { transform: translateY(0px); }
                            50% { transform: translateY(-10px); }
                            100% { transform: translateY(0px); }
                        }
                    `}</style>
                    <div style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '3rem 2rem',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                        color: 'white'
                    }}>
                        {frequenciaPratica < 75 ? (
                            <>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '90px',
                                    height: '90px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                                    boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.4)',
                                    marginBottom: '2rem',
                                    animation: 'float 3s ease-in-out infinite'
                                }}>
                                    <FileText size={48} color="white" />
                                </div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #38bdf8, #0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Teoria EAD Concluída!
                                </h2>
                                <p style={{ fontSize: '1.1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '1.5rem', padding: '0 1rem' }}>
                                    Parabéns, {userProfile?.full_name || 'Estudante'}! Você concluiu 100% das etapas teóricas do curso.
                                </p>
                                <div style={{ 
                                    backgroundColor: '#0f172a',
                                    borderRadius: '16px',
                                    padding: '1.25rem',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    marginBottom: '2.5rem',
                                    fontSize: '0.9rem',
                                    color: '#f59e0b',
                                    textAlign: 'left',
                                    lineHeight: '1.5'
                                }}>
                                    ⚠️ <strong>Certificado Aguardando Prática:</strong> A parte teórica EAD está concluída. O seu certificado oficial de qualificação será liberado automaticamente assim que você atingir o mínimo de <strong>75% de frequência presencial</strong> nas aulas práticas de caldeiraria e tubulação (sua presença atual: {frequenciaPratica}%).
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <button 
                                        onClick={() => navigate('/meus-cursos')}
                                        className="btn btn-primary"
                                        style={{ 
                                            padding: '0.85rem 1.5rem', 
                                            fontSize: '1rem', 
                                            fontWeight: 700, 
                                            borderRadius: '12px',
                                            background: 'linear-gradient(to right, #0284c7, #0369a1)',
                                            border: 'none',
                                            color: 'white',
                                            boxShadow: '0 4px 14px 0 rgba(2, 132, 199, 0.3)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📚 Voltar para Meus Cursos
                                    </button>
                                    <button 
                                        onClick={() => setShowCompletionModal(false)}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: '#64748b', 
                                            fontSize: '0.85rem', 
                                            cursor: 'pointer',
                                            marginTop: '0.5rem',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Fechar e continuar na aula
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '90px',
                                    height: '90px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                    boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
                                    marginBottom: '2rem',
                                    animation: 'float 3s ease-in-out infinite'
                                }}>
                                    <Trophy size={48} color="white" />
                                </div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Curso Concluído!
                                </h2>
                                <p style={{ fontSize: '1.1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '1.5rem', padding: '0 1rem' }}>
                                    Parabéns, {userProfile?.full_name || 'Estudante'}! Você concluiu com sucesso todas as etapas teóricas e práticas do curso.
                                </p>
                                <div style={{ 
                                    backgroundColor: '#0f172a',
                                    borderRadius: '16px',
                                    padding: '1rem',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    marginBottom: '2.5rem',
                                    fontSize: '0.9rem',
                                    color: '#94a3b8'
                                }}>
                                    🎓 Seu certificado oficial de qualificação técnica já está liberado na sua área de certificados!
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <button 
                                        onClick={() => navigate('/certificados')}
                                        className="btn btn-primary"
                                        style={{ 
                                            padding: '0.85rem 1.5rem', 
                                            fontSize: '1rem', 
                                            fontWeight: 700, 
                                            borderRadius: '12px',
                                            background: 'linear-gradient(to right, #10b981, #059669)',
                                            border: 'none',
                                            color: 'white',
                                            boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📜 Ir para Meus Certificados
                                    </button>
                                    <button 
                                        onClick={() => navigate('/meus-cursos')}
                                        style={{ 
                                            padding: '0.85rem 1.5rem', 
                                            fontSize: '0.95rem', 
                                            fontWeight: 600, 
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        📚 Voltar para Meus Cursos
                                    </button>
                                    <button 
                                        onClick={() => setShowCompletionModal(false)}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: '#64748b', 
                                            fontSize: '0.85rem', 
                                            cursor: 'pointer',
                                            marginTop: '0.5rem',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Fechar e continuar na aula
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}
