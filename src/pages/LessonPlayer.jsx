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

    useEffect(() => {
        fetchData()
        setSecondsWatched(0)
        setIsCompleted(false)
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
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/')
        }
        if (url.includes('youtu.be/')) {
            return url.replace('youtu.be/', 'youtube.com/embed/')
        }
        return url
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
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <iframe 
                                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                        src={lesson.pdf_url}
                                        title="Documento da Aula"
                                    ></iframe>
                                    <button
                                        onClick={togglePdfFullscreen}
                                        title={isPdfFullscreen ? 'Sair da Tela Cheia' : 'Expandir para Tela Cheia'}
                                        style={{
                                            position: 'absolute',
                                            top: '0.75rem',
                                            right: '0.75rem',
                                            zIndex: 10,
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

                {/* FÓRUM DE DÚVIDAS */}
                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #334155' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Fórum de Dúvidas</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <textarea 
                            className="form-control" 
                            style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white', minHeight: '80px' }}
                            placeholder="Tire sua dúvida sobre esta aula..."
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                        ></textarea>
                        <button 
                            className="btn btn-primary" 
                            style={{ alignSelf: 'flex-end' }}
                            onClick={handleSubmitQuestion}
                            disabled={!newQuestion.trim()}
                        >
                            Enviar Pergunta
                        </button>
                    </div>
                    
                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {lessonQuestions.map(q => (
                            <div key={q.id} style={{ padding: '1.25rem', backgroundColor: '#1e293b', borderRadius: '8px', borderLeft: q.answer_text ? '4px solid #10b981' : '4px solid #64748b' }}>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                    {q.student?.full_name} em {new Date(q.created_at).toLocaleDateString('pt-BR')}
                                </p>
                                <p style={{ fontSize: '0.875rem', color: 'white' }}>{q.question_text}</p>
                                
                                {q.answer_text ? (
                                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #1e293b' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>Resposta da Equipe:</p>
                                        <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#cbd5e1' }}>{q.answer_text}</p>
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>Aguardando resposta da equipe pedagógica...</p>
                                )}
                            </div>
                        ))}
                        {lessonQuestions.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem', marginTop: '1rem' }}>Nenhuma dúvida enviada nesta aula ainda.</p>
                        )}
                    </div>
                </div>
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
