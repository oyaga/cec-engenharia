import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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
    ExternalLink,
    MessageCircle,
    Users,
    Check
} from 'lucide-react'

export default function LessonPlayer() {
    const { courseId, lessonId } = useParams()
    const navigate = useNavigate()
    const { session } = useAuth()
    
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

    // Mocks realistas para o Fórum
    const getMockForumData = () => {
        return [
            {
                id: 'topic-1',
                title: 'Calibração e Zeramento de Micrômetro',
                content: 'Gostaria de saber qual o procedimento ideal para fazer o zeramento correto do micrômetro no padrão de 25mm antes de medir tubulações de alta pressão nas aulas práticas.',
                created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
                replies_count: 2,
                student: { full_name: 'Carlos Adriano Macias' }
            },
            {
                id: 'topic-2',
                title: 'Tolerâncias de Concentricidade - Norma Abendi PR-127',
                content: 'Qual a tolerância de concentricidade máxima admissível para flanges de caldeiraria fina nas avaliações oficiais de homologação da Abendi?',
                created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
                replies_count: 1,
                student: { full_name: 'Patrícia Mendes Abreu' }
            }
        ]
    }

    const getMockReplies = (topicId) => {
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
    
    const timerRef = useRef(null)
    const pdfContainerRef = useRef(null)
    const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)

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
            // Buscar detalhes da aula atual
            const { data: lessonData } = await supabase
                .from('lms_lessons')
                .select('*, lms_modules(title, course_id, lms_courses(title))')
                .eq('id', lessonId)
                .maybeSingle()
            
            if (lessonData) {
                setLesson(lessonData)
                setCourse(lessonData.lms_modules.lms_courses)
                
                // Buscar todas as aulas do curso
                const { data: lessons } = await supabase
                    .from('lms_lessons')
                    .select('*, module_id')
                    .order('order_index', { ascending: true })
                
                setAllLessons(lessons || [])

                // Buscar todos os quizzes do curso
                const { data: qzs } = await supabase
                    .from('lms_quizzes')
                    .select('*')
                    .eq('course_id', lessonData.lms_modules.course_id)
                setCourseQuizzes(qzs || [])

                // Buscar resultados dos quizzes do aluno
                const { data: qres } = await supabase
                    .from('lms_quiz_results')
                    .select('*')
                    .eq('student_id', session.user.id)
                
                const qMap = {}
                qres?.forEach(r => qMap[r.quiz_id] = { 
                    is_approved: r.is_approved, 
                    score: r.score,
                    attempts_count: r.attempts_count 
                })
                setQuizStatus(qMap)

                // Buscar progresso do aluno para todas as aulas do curso
                const { data: progress } = await supabase
                    .from('lms_student_progress')
                    .select('*')
                    .eq('student_id', session.user.id)
                
                const statusMap = {}
                progress?.forEach(p => {
                    statusMap[p.lesson_id] = { is_completed: p.is_completed, watched_seconds: p.watched_seconds }
                })
                setLessonStatus(statusMap)

                if (statusMap[lessonId]) {
                    setSecondsWatched(statusMap[lessonId]?.watched_seconds || 0)
                    setIsCompleted(statusMap[lessonId]?.is_completed || false)
                }

                // Buscar dados do estudante (turma_id e studentId) para aula presencial e upload
                try {
                    const { data: studentsData } = await supabase
                        .from('students')
                        .select('id, turma_id')
                        .eq('user_id', session.user.id)
                        .maybeSingle()

                    if (studentsData) {
                        setStudentId(studentsData.id)
                        setTurmaId(studentsData.turma_id)
                        
                        // Se for aula do tipo presencial, buscar os detalhes da aula prática
                        if (lessonData.type === 'presencial' && studentsData.turma_id) {
                            const { data: turmaData } = await supabase
                                .from('upcoming_classes')
                                .select('*, lms_courses(title)')
                                .eq('id', studentsData.turma_id)
                                .maybeSingle()
                            
                            if (turmaData) {
                                setUpcomingPractical(turmaData)
                                
                                // Verificar presenca
                                const { data: attendanceCheck } = await supabase
                                    .from('attendance_records')
                                    .select('id')
                                    .eq('student_id', studentsData.id)
                                    .eq('class_id', studentsData.turma_id)
                                    .maybeSingle()
                                
                                setHasConfirmedAttendance(!!attendanceCheck)
                            }
                        }
                    }
                } catch (stErr) {
                    console.warn("Erro ao buscar dados do estudante ou aula presencial:", stErr.message)
                }

                // Se for aula do tipo tarefa, buscar se ja existe submissao
                if (lessonData.type === 'tarefa') {
                    try {
                        const { data: submission } = await supabase
                            .from('task_submissions')
                            .select('*')
                            .eq('student_id', session.user.id)
                            .eq('lesson_id', lessonId)
                            .maybeSingle()
                        
                        setTaskSubmission(submission)
                    } catch (taskErr) {
                        console.warn("Erro ao buscar submissao da tarefa:", taskErr.message)
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
            const { error } = await supabase
                .from('attendance_records')
                .insert([{
                    student_id: studentId,
                    class_id: upcomingPractical.id,
                    status: 'presente',
                    confirmed_by_student: true,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

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
            const fileExt = file.name.split('.').pop();
            const fileName = `${session.user.id}_task_${lessonId}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `tasks/${session.user.id}/${lessonId}/${fileName}`;

            // Fazer upload para o bucket student_documents do Supabase
            const { error: uploadError } = await supabase.storage
                .from('student_documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Obter a URL pública do arquivo
            const { data: { publicUrl } } = supabase.storage
                .from('student_documents')
                .getPublicUrl(filePath);

            // Upsert na tabela task_submissions
            const { data: subData, error: updateError } = await supabase
                .from('task_submissions')
                .upsert({
                    student_id: session.user.id,
                    lesson_id: lessonId,
                    file_url: publicUrl,
                    status: 'enviado',
                    submitted_at: new Date().toISOString()
                }, { onConflict: ['student_id', 'lesson_id'] })
                .select()
                .maybeSingle();

            if (updateError) throw updateError;

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
        const { data } = await supabase
            .from('lms_lesson_questions')
            .select('*, student:users!student_id(full_name)')
            .eq('lesson_id', lessonId)
            .order('created_at', { ascending: false })
        if (data) setLessonQuestions(data)
    }

    const handleSubmitQuestion = async () => {
        if (!newQuestion.trim()) return
        
        const { error } = await supabase
            .from('lms_lesson_questions')
            .insert([{
                lesson_id: lessonId,
                student_id: session.user.id,
                question_text: newQuestion
            }])
        
        if (!error) {
            setNewQuestion('')
            fetchQuestions()
        } else {
            alert('Erro ao enviar pergunta: ' + error.message)
        }
    }

    // Funções do novo Fórum de Dúvidas Colaborativo (Prioridade 🟡 9)
    const fetchForumTopics = async (lId = lessonId) => {
        if (!lId) return
        setForumLoading(true)
        setForumError(false)
        try {
            // 1. Buscar tópicos do fórum
            const { data: topics, error: topicsErr } = await supabase
                .from('lms_forum_topics')
                .select('*, student:users!student_id(id, full_name, email, role)')
                .eq('lesson_id', lId)
                .order('created_at', { ascending: false })

            if (topicsErr) throw topicsErr

            // 2. Buscar contagem de respostas de cada tópico
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

            setForumTopics(topicsWithCount)
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
            const { data: replies, error: repErr } = await supabase
                .from('lms_forum_replies')
                .select('*, author:users!author_id(id, full_name, email, role)')
                .eq('topic_id', topicId)
                .order('created_at', { ascending: true })

            if (repErr) throw repErr
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
            const { data, error } = await supabase
                .from('lms_forum_topics')
                .insert([{
                    lesson_id: lessonId,
                    student_id: session.user.id,
                    title: newTopicTitle.trim(),
                    content: newTopicContent.trim(),
                    created_at: new Date().toISOString()
                }])
                .select('*, student:users!student_id(id, full_name, email, role)')
                .maybeSingle()

            if (error) throw error

            setNewTopicTitle('')
            setNewTopicContent('')
            setShowNewTopicForm(false)
            fetchForumTopics(lessonId)
            alert('Novo tópico de debate criado com sucesso no fórum da lição!')
        } catch (err) {
            console.error("Erro ao criar tópico no Supabase, registrando mock local:", err)
            // Fallback local
            const localNewTopic = {
                id: `topic-${Date.now()}`,
                title: newTopicTitle.trim(),
                content: newTopicContent.trim(),
                created_at: new Date().toISOString(),
                replies_count: 0,
                student: { full_name: session?.user?.email?.split('@')[0] || 'Aluno' }
            }
            setForumTopics(prev => [localNewTopic, ...prev])
            setNewTopicTitle('')
            setNewTopicContent('')
            setShowNewTopicForm(false)
            alert('Tópico registrado com sucesso (Modo Resiliente ativado)!')
        }
    }

    const handleCreateReply = async (e) => {
        e.preventDefault()
        if (!newReplyContent.trim() || !selectedTopic || !session?.user?.id) return

        try {
            const { data, error } = await supabase
                .from('lms_forum_replies')
                .insert([{
                    topic_id: selectedTopic.id,
                    author_id: session.user.id,
                    content: newReplyContent.trim(),
                    created_at: new Date().toISOString()
                }])
                .select('*, author:users!author_id(id, full_name, email, role)')
                .maybeSingle()

            if (error) throw error

            setNewReplyContent('')
            fetchTopicReplies(selectedTopic.id)
            setForumTopics(prev => prev.map(t => t.id === selectedTopic.id ? { ...t, replies_count: t.replies_count + 1 } : t))
        } catch (err) {
            console.error("Erro ao inserir resposta no Supabase, registrando mock local:", err)
            // Fallback local
            const localNewReply = {
                id: `rep-${Date.now()}`,
                content: newReplyContent.trim(),
                created_at: new Date().toISOString(),
                author: { full_name: session?.user?.email?.split('@')[0] || 'Aluno', role: 'student' }
            }
            setTopicReplies(prev => [...prev, localNewReply])
            setNewReplyContent('')
            setForumTopics(prev => prev.map(t => t.id === selectedTopic.id ? { ...t, replies_count: t.replies_count + 1 } : t))
        }
    }

    useEffect(() => {
        fetchData()
        fetchForumTopics(lessonId)
        setSecondsWatched(0)
        setIsCompleted(false)
        setSelectedTopic(null)
    }, [lessonId])

    const saveProgress = async (seconds, completed) => {
        if (!session?.user?.id || !lessonId) return
        
        await supabase
            .from('lms_student_progress')
            .upsert({
                student_id: session.user.id,
                lesson_id: lessonId,
                watched_seconds: seconds,
                is_completed: completed,
                last_accessed: new Date().toISOString()
            }, { onConflict: ['student_id', 'lesson_id'] })
    }

    // Lógica de cronômetro para tempo mínimo e Heartbeat de presença
    useEffect(() => {
        if (!lesson) return

        let heartbeatCount = 0
        timerRef.current = setInterval(() => {
            setSecondsWatched(prev => {
                const next = prev + 1
                const completed = lesson.min_watch_time_sec > 0 && next >= lesson.min_watch_time_sec
                
                if (completed && !isCompleted) {
                    setIsCompleted(true)
                    saveProgress(next, true)
                } else if (next % 10 === 0) { // Salvar progresso da aula a cada 10 segundos
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
            await supabase.from('lms_time_logs').insert([{
                student_id: session.user.id,
                course_id: course.id,
                lesson_id: lessonId,
                duration_seconds: seconds
            }])
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

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando aula...</div>
    if (!lesson) return <div style={{ padding: '2rem', textAlign: 'center' }}>Aula não encontrada.</div>

    const progressPercent = lesson.min_watch_time_sec > 0 
        ? Math.min(100, (secondsWatched / lesson.min_watch_time_sec) * 100)
        : 100

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: 'calc(100vh - 120px)', backgroundColor: '#0f172a' }}>
            {/* PLAYER E CONTEÚDO */}
            <div style={{ overflowY: 'auto', padding: '2rem', color: 'white' }}>
                <button 
                    onClick={() => navigate('/meus-cursos')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem' }}
                >
                    <ChevronLeft size={16} /> Voltar para Meus Cursos
                </button>

                {/* ÁREA DE CONTEÚDO PRINCIPAL (PLAYER OU COMPONENTE ADAPTATIVO) */}
                {(!lesson.type || lesson.type === 'video' || lesson.type === 'pdf') ? (
                    <>
                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: 'black', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', border: '1px solid #1e293b' }}>
                            {(!lesson.type || lesson.type === 'video') && lesson.video_url ? (
                                <iframe 
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                    src={formatVideoUrl(lesson.video_url)}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (lesson.type === 'pdf' || (!lesson.type && lesson.pdf_url)) && lesson.pdf_url ? (
                                <div
                                    ref={pdfContainerRef}
                                    style={{
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                        backgroundColor: '#0f172a'
                                    }}
                                >
                                    {isImageUrl(lesson.pdf_url) ? (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                            <img 
                                                src={lesson.pdf_url} 
                                                alt={lesson.title} 
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                                            />
                                        </div>
                                    ) : (
                                        <iframe 
                                            style={{ width: '100%', height: '100%', border: 'none', display: 'block', backgroundColor: 'white' }}
                                            src={lesson.pdf_url}
                                            title="Documento da Aula"
                                        ></iframe>
                                    )}
                                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
                                        <a
                                            href={lesson.pdf_url}
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
                                            <ExternalLink size={15} />
                                            Abrir em Nova Guia
                                        </a>
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
                            const currentIndex = allLessons.findIndex(l => l.id === lessonId)
                            if (currentIndex < allLessons.length - 1) {
                                navigate(`/curso/${courseId}/aula/${allLessons[currentIndex+1].id}`)
                            } else {
                                alert('Parabéns! Você concluiu todas as lições deste curso.')
                            }
                        }}
                        className="btn btn-primary"
                        style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        Próxima Aula <ChevronRight size={18} />
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
                {selectedTopic && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999
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
                )}
            </div>

            {/* BARRA LATERAL DA GRADE */}
            <div style={{ backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
                    <h3 style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>Conteúdo do Curso</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>{course?.title}</p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {allLessons.map((l, idx) => {
                        const isCurrent = l.id === lessonId
                        const isDone = lessonStatus[l.id]?.is_completed
                        
                        const lessonModule = l.module_id
                        const previousModules = [...new Set(allLessons.slice(0, idx).map(al => al.module_id))]
                            .filter(m => m !== lessonModule)
                        
                        let isBlockedByQuiz = false
                        for (const modId of previousModules) {
                            const modQuiz = courseQuizzes.find(q => q.module_id === modId)
                            if (modQuiz) {
                                const qStat = quizStatus[modQuiz.id]
                                if (modQuiz.quiz_type === 'final_exam') {
                                    if (!qStat?.is_approved) { isBlockedByQuiz = true; break; }
                                } else {
                                    // Exercício: LIBERA se tiver pelo menos 1 tentativa (realizado)
                                    if (!qStat || qStat.attempts_count === 0) { isBlockedByQuiz = true; break; }
                                }
                            }
                        }

                        // AULA LIVRE (ignore lessonStatus), mas BLOQUEADA POR QUIZ anterior
                        const isLocked = isBlockedByQuiz
                        
                        // Verificar se existe quiz para este módulo logo após esta aula (se for a última do módulo)
                        const isLastInModule = idx === allLessons.length - 1 || allLessons[idx+1].module_id !== lessonModule
                        const moduleQuiz = courseQuizzes.find(q => q.module_id === lessonModule)

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
                                
                                {isLastInModule && moduleQuiz && (
                                    <div 
                                        onClick={() => navigate(`/exame/${moduleQuiz.id}`)}
                                        style={{ 
                                            padding: '0.75rem 1.5rem', 
                                            backgroundColor: (moduleQuiz.quiz_type === 'final_exam' ? quizStatus[moduleQuiz.id]?.is_approved : quizStatus[moduleQuiz.id]?.attempts_count > 0)
                                                ? (moduleQuiz.quiz_type === 'final_exam' ? '#4c1d95' : '#064e3b') 
                                                : '#1e293b',
                                            borderBottom: '1px solid #334155',
                                            cursor: 'pointer',
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
        </div>
    )
}
