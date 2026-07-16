import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { coursesApi, classesApi } from '../services/academic'
import { lmsApi } from '../services/lms'
import { uploadFile } from '../lib/api'
import { Plus, Book, Video, FileText, ChevronRight, ChevronDown, Save, Trash2, Edit, CheckSquare, Clock, Trophy, Eye, Printer, Search, Award, UploadCloud, Megaphone } from 'lucide-react'

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

const MATH_SYMBOLS = [
    { label: '° (Grau)', value: '°' },
    { label: 'Ø (Diâmetro)', value: 'Ø' },
    { label: '± (Tolerância)', value: '±' },
    { label: '√ (Raiz)', value: '√' },
    { label: 'π (Pi)', value: 'π' },
    { label: '× (Multiplicação)', value: '×' },
    { label: '÷ (Divisão)', value: '÷' },
    { label: '≤ (Menor/Igual)', value: '≤' },
    { label: '≥ (Maior/Igual)', value: '≥' },
    { label: 'Δ (Delta)', value: 'Δ' },
    { label: 'α (Alfa)', value: 'α' },
    { label: 'β (Beta)', value: 'β' },
    { label: 'θ (Teta)', value: 'θ' },
    { label: 'µ (Micro)', value: 'µ' },
    { label: '² (Quadrado)', value: '²' },
    { label: '³ (Cubo)', value: '³' },
    { label: '→ (Seta)', value: '→' }
]

export default function LMSAdmin() {
    const navigate = useNavigate()
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // list | add_course | manage_course | doubts | certificate_models | announcements
    const [selectedCourse, setSelectedCourse] = useState(null)
    const [modules, setModules] = useState([])
    const [lessons, setLessons] = useState({}) // { moduleId: [lessons] }
    const [quizzes, setQuizzes] = useState({}) // { moduleId: quizObj }
    const [selectedQuiz, setSelectedQuiz] = useState(null)
    const [quizQuestions, setQuizQuestions] = useState([])
    const [isEditingQuiz, setIsEditingQuiz] = useState(false)
    const [eadDoubts, setEadDoubts] = useState([])
    const [answeringDoubtId, setAnsweringDoubtId] = useState(null)
    const [doubtAnswerText, setDoubtAnswerText] = useState('')
    const [certConfigs, setCertConfigs] = useState([])
    
    // Estados do Quadro de Avisos (Prioridade 🟡 13)
    const [announcements, setAnnouncements] = useState([])
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
    const [showAnnForm, setShowAnnForm] = useState(false)
    const [annForm, setAnnForm] = useState({ id: null, title: '', content: '', priority: 'geral', course_id: '' })

    // Estados do NOVO QUESTION BUILDER
    const [showQuestionBuilder, setShowQuestionBuilder] = useState(false)
    const [questionForm, setQuestionForm] = useState({
        text: '',
        image_url: null,
        options: [
            { text: '', image_url: null },
            { text: '', image_url: null }
        ],
        correctIndex: 0
    })
    const [isSavingQuestion, setIsSavingQuestion] = useState(false)
    const [editingQuestionId, setEditingQuestionId] = useState(null)
    const [uploadingImageQuestion, setUploadingImageQuestion] = useState(false)
    const [uploadingImageOptionIdx, setUploadingImageOptionIdx] = useState(null)

    // Refs para inputs de arquivo
    const questionImageRef = useRef(null)
    const optionImageRefs = useRef([])

    const [courseForm, setCourseForm] = useState({
        title: '',
        code: '',
        description: '',
        thumbnail_url: '',
        min_theoretical_hours: 0,
        is_published: false,
        instructor_payment_type: 'fixed',
        instructor_payment_value: 0,
        create_class_container: true
    })

    // Estados para FORMULÁRIOS VISUAIS (Substituindo Prompts)
    const [showModuleForm, setShowModuleForm] = useState(false)
    const [moduleForm, setModuleForm] = useState({ title: '', id: null }) // id para edição

    const [showLessonForm, setShowLessonForm] = useState(false)
    const [lessonForm, setLessonForm] = useState({
        id: null, // para edição
        moduleId: null,
        title: '',
        type: 'video', // video | pdf
        video_url: '',
        pdf_url: '',
        min_minutes: 0,
        allow_download: false
    })

    const [showQuizForm, setShowQuizForm] = useState(false)
    const [quizForm, setQuizForm] = useState({
        id: null,
        moduleId: null,
        title: '',
        type: 'exercise', // exercise | final_exam
        time_limit: 60,
        passing_grade: 70
    })

    const fetchCourses = async () => {
        setLoading(true)
        try {
            const { courses } = await coursesApi.list()
            setCourses(courses || [])
        } catch { /* mantém lista */ }
        setLoading(false)
    }

    const fetchCourseDetails = async (courseId) => {
        try {
            const { modules: mods } = await lmsApi.structure(courseId)
            setModules(mods || [])

            const lessonsData = {}
            ;(mods || []).forEach(mod => { lessonsData[mod.id] = mod.lessons || [] })
            setLessons(lessonsData)

            const { quizzes: qzs } = await lmsApi.courseQuizzes(courseId)
            const quizzesData = {}
            ;(qzs || []).forEach(qz => { quizzesData[`${qz.module_id}_${qz.quiz_type}`] = qz })
            setQuizzes(quizzesData)
        } catch (err) {
            console.error('Erro ao carregar detalhes do curso:', err)
        }
    }

    const fetchAllDoubts = async () => {
        setLoading(true)
        try {
            const { doubts } = await lmsApi.doubts()
            setEadDoubts(doubts || [])
        } catch { /* ignora */ }
        setLoading(false)
    }

    const handleAnswerDoubt = async (id) => {
        if (!doubtAnswerText.trim()) return
        try {
            await lmsApi.answerDoubt(id, doubtAnswerText)
            setDoubtAnswerText('')
            setAnsweringDoubtId(null)
            fetchAllDoubts()
            alert('Resposta enviada!')
        } catch (err) {
            alert('Erro ao responder: ' + err.message)
        }
    }

    const fetchCertConfigs = async () => {
        // Modelos de certificado são geridos na tela Certificados (via settings).
        setCertConfigs([])
    }

    const fetchAnnouncementsAdmin = async () => {
        setLoadingAnnouncements(true)
        try {
            const { announcements } = await lmsApi.announcements()
            setAnnouncements(announcements || [])
        } catch (err) {
            console.error("Erro ao buscar avisos:", err)
        } finally {
            setLoadingAnnouncements(false)
        }
    }

    const handleSaveAnnouncement = async (e) => {
        e.preventDefault()
        if (!annForm.title.trim() || !annForm.content.trim()) return alert('Título e Conteúdo são obrigatórios')
        setLoadingAnnouncements(true)
        
        try {
            const payload = {
                title: annForm.title.trim(),
                content: annForm.content.trim(),
                priority: annForm.priority,
                course_id: annForm.course_id || null,
            }

            if (annForm.id) {
                await lmsApi.updateAnnouncement(annForm.id, payload)
            } else {
                await lmsApi.createAnnouncement(payload)
            }

            alert('Aviso salvo com sucesso!')
            setShowAnnForm(false)
            setAnnForm({ id: null, title: '', content: '', priority: 'geral', course_id: '' })
            fetchAnnouncementsAdmin()
        } catch (err) {
            alert('Erro ao salvar aviso: ' + err.message)
        } finally {
            setLoadingAnnouncements(false)
        }
    }

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm('Deseja excluir este aviso permanentemente?')) return
        setLoadingAnnouncements(true)
        try {
            await lmsApi.removeAnnouncement(id)
            alert('Aviso excluído com sucesso!')
            fetchAnnouncementsAdmin()
        } catch (err) {
            alert('Erro ao excluir aviso: ' + err.message)
        } finally {
            setLoadingAnnouncements(false)
        }
    }

    useEffect(() => {
        fetchCourses()
        fetchCertConfigs()
    }, [])

    useEffect(() => {
        const contentArea = document.querySelector('.content-area')
        if (contentArea) {
            contentArea.scrollTop = 0
        }
    }, [view, selectedCourse])

    const handleSaveCourse = async () => {
        if (!courseForm.title) return alert('Título é obrigatório')
        
        try {
            if (selectedCourse) {
                await coursesApi.update(selectedCourse.id, {
                    title: courseForm.title,
                    code: courseForm.code,
                    description: courseForm.description,
                    thumbnail_url: courseForm.thumbnail_url,
                    min_theoretical_hours: courseForm.min_theoretical_hours,
                    instructor_payment_type: courseForm.instructor_payment_type,
                    instructor_payment_value: parseFloat(courseForm.instructor_payment_value) || 0
                })
            } else {
                const { create_class_container, ...cleanForm } = courseForm
                const { course: newCourse } = await coursesApi.create({
                    ...cleanForm,
                    instructor_payment_value: parseFloat(courseForm.instructor_payment_value) || 0
                })
                if (create_class_container && newCourse) {
                    await classesApi.create({
                        name: `Auto: ${newCourse.title}`,
                        course_name: newCourse.title,
                        is_immediate_start: true,
                        lms_course_id: newCourse.id,
                        instructor_payment_type: newCourse.instructor_payment_type,
                        instructor_payment_value: newCourse.instructor_payment_value,
                        duration: '0',
                        schedule: 'Acesso Online Perpétuo'
                    })
                }
            }

            alert('Curso salvo com sucesso!')
            setCourseForm({ title: '', code: '', description: '', thumbnail_url: '', min_theoretical_hours: 0, is_published: false, instructor_payment_type: 'fixed', instructor_payment_value: 0 })
            setSelectedCourse(null)
            setView('list')
            fetchCourses()
        } catch (err) {
            alert('Erro ao salvar curso: ' + err.message)
        }
    }

    const handleSaveCertConfig = async (id, text) => {
        // Modelos de certificado migrados para a tela Certificados (via settings).
        alert('Configure os modelos de certificado na tela "Certificados".')
    }

    const handleSelectCourse = async (course) => {
        setSelectedCourse(course)
        await fetchCourseDetails(course.id)
        setView('manage_course')
    }

    const renderCourseList = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Gestão de Cursos EAD</h2>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => { setView('doubts'); fetchAllDoubts(); }}>Central de Dúvidas</button>
                    <button className="btn btn-secondary" onClick={() => { setView('announcements'); fetchAnnouncementsAdmin(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Megaphone size={14} /> Quadro de Avisos</button>
                    <button className="btn btn-secondary" onClick={() => { setView('certificate_models'); fetchCertConfigs(); }}>Modelos de Certificado</button>
                    <button className="btn btn-primary" onClick={() => {
                        setSelectedCourse(null)
                        setView('add_course')
                    }}>
                        <Plus size={16} /> Novo Curso
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Carregando dados...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {courses.map(course => (
                        <div key={course.id} className="card" style={{ cursor: 'pointer' }} onClick={() => handleSelectCourse(course)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.25rem' }}>{course.title}</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mín: {course.min_theoretical_hours || 0}h teóricas</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '0.25rem 0.5rem', 
                                        borderRadius: '4px',
                                        backgroundColor: course.is_published ? '#DEF7EC' : '#F3F4F6',
                                        color: course.is_published ? '#03543F' : '#374151',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {course.is_published ? 'Publicado' : 'Rascunho'}
                                    </span>
                                    <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem' }} onClick={(e) => {
                                        e.stopPropagation()
                                        setCourseForm({
                                            title: course.title,
                                            code: course.code || '',
                                            description: course.description || '',
                                            thumbnail_url: course.thumbnail_url || '',
                                            min_theoretical_hours: course.min_theoretical_hours || 0,
                                            is_published: course.is_published,
                                            instructor_payment_type: course.instructor_payment_type || 'fixed',
                                            instructor_payment_value: course.instructor_payment_value || 0
                                        })
                                        setSelectedCourse(course)
                                        setView('add_course')
                                    }}>
                                        <Edit size={14} /> Editar
                                    </button>
                                </div>
                            </div>
                            <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                                {course.description || 'Sem descrição.'}
                            </p>
                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Book size={14} /> Módulos</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Video size={14} /> Aulas</span>
                            </div>
                        </div>
                    ))}
                    {courses.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                            <p>Nenhum curso cadastrado ainda.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    const renderAddCourse = () => (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => setView('list')}>&larr; Voltar</button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '1rem' }}>Configurar Novo Curso</h2>
            </div>

            <div className="card">
                <div className="form-group">
                    <label className="form-label">Título do Curso</label>
                    <input
                        type="text"
                        className="form-control"
                        value={courseForm.title}
                        onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                        placeholder="Ex: Inspetor de Controle Dimensional - Base"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Código do Curso</label>
                    <input
                        type="text"
                        className="form-control"
                        value={courseForm.code}
                        onChange={e => setCourseForm({...courseForm, code: e.target.value})}
                        placeholder="Ex: CD-CM"
                    />
                    <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
                        A página pública do curso (/curso/&lt;código&gt;) é encontrada por este código.
                    </small>
                </div>
                <div className="form-group">
                    <label className="form-label">Descrição / Ementa</label>
                    <textarea 
                        className="form-control" 
                        style={{ height: '120px' }}
                        value={courseForm.description}
                        onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                        placeholder="Descreva o que o aluno aprenderá..."
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Thumbnail (URL)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={courseForm.thumbnail_url} 
                            onChange={e => setCourseForm({...courseForm, thumbnail_url: e.target.value})}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Carga Horária Teórica (Horas)</label>
                        <input 
                            type="number" 
                            className="form-control" 
                            value={courseForm.min_theoretical_hours} 
                            onChange={e => setCourseForm({...courseForm, min_theoretical_hours: parseInt(e.target.value) || 0})}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Tipo de Pagamento (Instrutor EAD)</label>
                        <select 
                            className="form-control" 
                            value={courseForm.instructor_payment_type} 
                            onChange={e => setCourseForm({...courseForm, instructor_payment_type: e.target.value})}
                        >
                            <option value="fixed">Valor Fixo (Salário/Hora)</option>
                            <option value="split">Rateio de Lucro (50% após despesas)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                            {courseForm.instructor_payment_type === 'fixed' ? 'Valor do Pagamento (R$)' : 'Percentual de Rateio (%)'}
                        </label>
                        <input 
                            type="number" 
                            className="form-control" 
                            value={courseForm.instructor_payment_value} 
                            onChange={e => setCourseForm({...courseForm, instructor_payment_value: e.target.value})}
                            placeholder={courseForm.instructor_payment_type === 'fixed' ? "Ex: 500" : "Ex: 50"}
                        />
                    </div>
                </div>
                
                {!selectedCourse && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ECFDF5', borderRadius: '8px', border: '1px solid #10B981', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input 
                            type="checkbox" 
                            id="create_class_container"
                            checked={courseForm.create_class_container}
                            onChange={e => setCourseForm({...courseForm, create_class_container: e.target.checked})}
                            style={{ width: '1.2rem', height: '1.2rem' }}
                        />
                        <label htmlFor="create_class_container" style={{ fontSize: '0.9rem', color: '#065F46', fontWeight: 600, cursor: 'pointer' }}>
                            Criar automaticamente uma Turma de "Início Imediato" para este curso?
                        </label>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => {
                        setSelectedCourse(null)
                        setCourseForm({ title: '', code: '', description: '', thumbnail_url: '', min_theoretical_hours: 0, is_published: false, instructor_payment_type: 'fixed', instructor_payment_value: 0, create_class_container: true })
                        setView('list')
                    }}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSaveCourse}>{selectedCourse ? 'Salvar Alterações' : 'Criar Curso'}</button>
                </div>
            </div>
        </div>
    )

    const handleOpenModuleForm = (mod = null) => {
        if (mod) {
            setModuleForm({ title: mod.title, id: mod.id })
        } else {
            setModuleForm({ title: '', id: null })
        }
        setShowModuleForm(true)
    }

    const handleSaveModule = async () => {
        if (!moduleForm.title.trim()) return alert('Título obrigatório')
        
        try {
            if (moduleForm.id) {
                await lmsApi.updateModule(moduleForm.id, { title: moduleForm.title })
            } else {
                await lmsApi.createModule({ course_id: selectedCourse.id, title: moduleForm.title, order_index: modules.length })
            }
            setShowModuleForm(false)
            fetchCourseDetails(selectedCourse.id)
        } catch (err) {
            alert('Erro ao salvar módulo: ' + err.message)
        }
    }

    const handleOpenLessonForm = (moduleId, lesson = null) => {
        if (lesson) {
            setLessonForm({
                id: lesson.id,
                moduleId: lesson.module_id,
                title: lesson.title,
                type: lesson.video_url ? 'video' : 'pdf',
                video_url: lesson.video_url || '',
                pdf_url: lesson.pdf_url || '',
                min_minutes: Math.round((lesson.min_watch_time_sec || 0) / 60),
                allow_download: lesson.allow_download || false
            })
        } else {
            setLessonForm({
                id: null,
                moduleId: moduleId,
                title: '',
                type: 'video',
                video_url: '',
                pdf_url: '',
                min_minutes: 10,
                allow_download: false
            })
        }
        setShowLessonForm(true)
    }

    const handleSaveLesson = async () => {
        if (!lessonForm.title.trim()) return alert('Título obrigatório')
        
        const data = {
            module_id: lessonForm.moduleId,
            title: lessonForm.title,
            type: lessonForm.type,
            video_url: lessonForm.type === 'video' ? lessonForm.video_url : null,
            pdf_url: lessonForm.type === 'pdf' ? lessonForm.pdf_url : null,
            min_watch_time_sec: (parseInt(lessonForm.min_minutes) || 0) * 60,
            allow_download: lessonForm.allow_download || false
        }

        if (!lessonForm.id) {
            data.order_index = (lessons[lessonForm.moduleId]?.length || 0)
        }

        try {
            if (lessonForm.id) {
                await lmsApi.updateLesson(lessonForm.id, data)
            } else {
                await lmsApi.createLesson(data)
            }
            setShowLessonForm(false)
            fetchCourseDetails(selectedCourse.id)
        } catch (err) {
            alert('Erro ao salvar aula: ' + err.message)
        }
    }


    const handleDeleteModule = async (moduleId, title) => {
        if (!window.confirm(`Excluir módulo "${title}" e TODAS as suas aulas?`)) return
        try { await lmsApi.removeModule(moduleId); fetchCourseDetails(selectedCourse.id) }
        catch (err) { alert('Erro ao excluir módulo: ' + err.message) }
    }

    const handleDeleteLesson = async (lessonId, title) => {
        if (!window.confirm(`Excluir aula "${title}"?`)) return
        try { await lmsApi.removeLesson(lessonId); fetchCourseDetails(selectedCourse.id) }
        catch (err) { alert('Erro ao excluir aula: ' + err.message) }
    }

    const handleOpenQuizForm = (moduleId, type = 'exercise') => {
        setQuizForm({
            id: null,
            moduleId,
            title: type === 'exercise' ? 'Exercício de Fixação' : 'Prova Final',
            type,
            time_limit: 60,
            passing_grade: 70
        })
        setShowQuizForm(true)
    }

    const handleSaveQuiz = async () => {
        if (!quizForm.title.trim()) return alert('Título obrigatório')
        
        try {
            const { quiz } = await lmsApi.createQuiz({
                course_id: selectedCourse.id,
                module_id: quizForm.moduleId,
                title: quizForm.title,
                quiz_type: quizForm.type,
                passing_grade: quizForm.passing_grade,
                max_attempts: 3,
                time_limit_minutes: parseInt(quizForm.time_limit) || 0
            })
            setShowQuizForm(false)
            fetchCourseDetails(selectedCourse.id)
            handleManageQuiz(quiz)
        } catch (err) {
            alert('Erro ao salvar: ' + err.message)
        }
    }

    const handleManageQuiz = async (quiz) => {
        setSelectedQuiz(quiz)
        setIsEditingQuiz(true)
        try {
            const { questions } = await lmsApi.quiz(quiz.id)
            setQuizQuestions(questions || [])
        } catch { setQuizQuestions([]) }
    }


    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm("Excluir esta questão?")) return
        try { await lmsApi.removeQuestion(qId); handleManageQuiz(selectedQuiz) }
        catch (err) { alert('Erro ao excluir: ' + err.message) }
    }

    const handleQuizImageUpload = async (file, pathPrefix = '') => {
        if (!file) return null
        try {
            const { url } = await uploadFile(file, 'lms-quiz-images')
            return url
        } catch (err) {
            alert('Erro no upload: ' + err.message)
            return null
        }
    }

    const handleOpenQuestionBuilder = () => {
        setEditingQuestionId(null)
        setQuestionForm({
            text: '',
            image_url: null,
            options: [
                { text: '', image_url: null },
                { text: '', image_url: null },
                { text: '', image_url: null },
                { text: '', image_url: null }
            ],
            correctIndex: 0
        })
        setShowQuestionBuilder(true)
    }

    const handleEditQuestion = (q) => {
        setEditingQuestionId(q.id)
        setQuestionForm({
            text: q.question_text || '',
            image_url: q.image_url || null,
            options: Array.isArray(q.options) 
                ? q.options.map(opt => typeof opt === 'object' ? { text: opt.text || '', image_url: opt.image_url || null } : { text: opt, image_url: null })
                : [
                    { text: '', image_url: null },
                    { text: '', image_url: null },
                    { text: '', image_url: null },
                    { text: '', image_url: null }
                ],
            correctIndex: q.correct_option_index
        })
        setShowQuestionBuilder(true)
    }

    const handleSaveFullQuestion = async () => {
        if (!questionForm.text.trim() && !questionForm.image_url) {
            alert('A pergunta precisa de texto ou imagem.')
            return
        }
        
        // Validar pelo menos 2 opções
        const validOptions = questionForm.options.filter(o => o.text.trim() || o.image_url)
        if (validOptions.length < 2) {
            alert('A questão precisa de pelo menos 2 alternativas preenchidas.')
            return
        }

        setIsSavingQuestion(true)
        const payload = {
            quiz_id: selectedQuiz.id,
            question_text: questionForm.text,
            image_url: questionForm.image_url,
            options: questionForm.options.filter(o => o.text.trim() || o.image_url),
            correct_option_index: questionForm.correctIndex
        }

        let error = null
        try {
            if (editingQuestionId) {
                await lmsApi.updateQuestion(editingQuestionId, payload)
            } else {
                await lmsApi.createQuestion(payload)
                // Sincroniza com o banco central de questões (só novas).
                await lmsApi.addToBank({
                    question_text: questionForm.text,
                    image_url: questionForm.image_url,
                    options: questionForm.options.filter(o => o.text.trim() || o.image_url),
                    correct_option_index: questionForm.correctIndex,
                    category: selectedCourse?.title || 'Geral',
                    original_quiz_id: selectedQuiz.id
                })
            }
        } catch (err) {
            error = err
        }

        setIsSavingQuestion(false)
        if (error) alert('Erro ao salvar questão: ' + error.message)
        else {
            setEditingQuestionId(null)
            setShowQuestionBuilder(false)
            handleManageQuiz(selectedQuiz)
        }
    }

    const handleOptionImageClick = (index) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e) => handleFileChange(e, 'option', index)
        input.click()
    }

    const handleFileChange = async (e, type, index = null) => {
        const file = e.target.files[0]
        if (!file) return

        if (type === 'question') {
            setUploadingImageQuestion(true)
        } else {
            setUploadingImageOptionIdx(index)
        }

        const path = type === 'question' ? 'questions/' : 'options/'
        const url = await handleQuizImageUpload(file, path)
        
        if (url) {
            if (type === 'question') {
                setQuestionForm(prev => ({ ...prev, image_url: url }))
            } else {
                const newOptions = [...questionForm.options]
                newOptions[index].image_url = url
                setQuestionForm(prev => ({ ...prev, options: newOptions }))
            }
        }

        if (type === 'question') {
            setUploadingImageQuestion(false)
        } else {
            setUploadingImageOptionIdx(null)
        }
    }

    const insertSymbol = (symbol) => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            const start = activeEl.selectionStart;
            const end = activeEl.selectionEnd;
            const text = activeEl.value;
            const before = text.substring(0, start);
            const after = text.substring(end, text.length);
            const newValue = before + symbol + after;
            
            // Atualiza o elemento ativo no DOM e o cursor
            activeEl.value = newValue;
            activeEl.selectionStart = activeEl.selectionEnd = start + symbol.length;
            
            // Atualiza o estado no React correspondente
            const fieldType = activeEl.getAttribute('data-field-type');
            if (fieldType === 'question') {
                setQuestionForm(prev => ({ ...prev, text: newValue }));
            } else if (fieldType === 'option') {
                const optionIdx = parseInt(activeEl.getAttribute('data-option-idx'), 10);
                if (!isNaN(optionIdx)) {
                    const newOpt = [...questionForm.options];
                    newOpt[optionIdx].text = newValue;
                    setQuestionForm(prev => ({ ...prev, options: newOpt }));
                }
            }
            
            // Foca de volta
            activeEl.focus();
        } else {
            // Fallback: se nenhum elemento estiver focado, insere na pergunta principal
            setQuestionForm(prev => ({ ...prev, text: prev.text + symbol }));
        }
    }

    const handleTogglePublishCourse = async (courseId, currentStatus) => {
        try {
            await coursesApi.update(courseId, { is_published: !currentStatus })
            setSelectedCourse(prev => ({ ...prev, is_published: !currentStatus }))
            fetchCourses()
        } catch (err) {
            alert('Erro ao alterar status: ' + err.message)
        }
    }

    const handlePreviewCourse = () => {
        if (!selectedCourse || modules.length === 0) return alert('Este curso ainda não possui módulos.')
        
        // Pegar a primeira aula do primeiro módulo
        const firstModId = modules[0].id
        const firstLesson = lessons[firstModId]?.[0]
        
        if (firstLesson) {
            navigate(`/curso/${selectedCourse.id}/aula/${firstLesson.id}`)
        } else {
            alert('Crie pelo menos uma aula no primeiro módulo para visualizar.')
        }
    }

    const renderManageCourse = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <button className="btn btn-secondary" onClick={() => setView('list')}>&larr; Voltar</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{selectedCourse?.title}</h2>
                        <button 
                            className="btn" 
                            style={{ 
                                padding: '0.25rem 0.75rem', 
                                fontSize: '0.75rem',
                                backgroundColor: selectedCourse?.is_published ? '#DEF7EC' : '#F3F4F6',
                                color: selectedCourse?.is_published ? '#03543F' : '#374151',
                                border: '1px solid currentColor'
                            }}
                            onClick={() => handleTogglePublishCourse(selectedCourse.id, selectedCourse.is_published)}
                        >
                            {selectedCourse?.is_published ? 'Publicado' : 'Rascunho (Clique p/ Publicar)'}
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handlePreviewCourse}><ChevronRight size={16} /> Ver como Aluno</button>
                    <button className="btn btn-primary" onClick={() => handleOpenModuleForm()}><Plus size={16} /> Novo Módulo</button>
                </div>
            </div>

            {/* RESUMO DE CARGA HORÁRIA */}
            {(() => {
                let totalMin = 0
                Object.values(lessons).forEach(lessArr => {
                    lessArr.forEach(l => totalMin += (l.min_watch_time_sec || 0) / 60)
                })
                Object.values(quizzes).forEach(q => {
                    totalMin += (q.time_limit_minutes || 0)
                })
                
                const goalMin = (selectedCourse?.min_theoretical_hours || 0) * 60
                const isUnder = totalMin < goalMin
                
                return (
                    <div style={{ 
                        padding: '1rem', 
                        backgroundColor: isUnder ? '#FEF2F2' : '#F0FDF4', 
                        border: `1px solid ${isUnder ? '#FECACA' : '#BBF7D0'}`, 
                        borderRadius: '8px',
                        marginBottom: '2rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.5rem', backgroundColor: isUnder ? '#EF4444' : '#10B981', color: 'white', borderRadius: '50%' }}>
                                <Clock size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1rem', color: isUnder ? '#991B1B' : '#065F46' }}>
                                    Carga Horária: {Math.floor(totalMin / 60)}h {Math.round(totalMin % 60)}min / {selectedCourse?.min_theoretical_hours}h total
                                </h4>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: isUnder ? '#B91C1C' : '#059669' }}>
                                    {isUnder 
                                        ? `Atenção: Faltam ${Math.floor((goalMin - totalMin) / 60)}h ${Math.round((goalMin - totalMin) % 60)}min para cumprir a meta.`
                                        : 'Meta de carga horária teórica atingida! ✅'
                                    }
                                </p>
                            </div>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isUnder ? '#EF4444' : '#10B981' }}>
                            {Math.round((totalMin / (goalMin || 1)) * 100)}%
                        </div>
                    </div>
                )
            })()}

            <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                {modules.map((mod, idx) => (
                    <div key={mod.id} className="card" style={{ padding: '0' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ width: '24px', height: '24px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {idx + 1}
                                </span>
                                <h4 style={{ fontWeight: 600 }}>{mod.title}</h4>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => handleOpenModuleForm(mod)}><Edit size={14} /></button>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.4rem' ,color: 'var(--danger)'}}
                                    onClick={() => handleDeleteModule(mod.id, mod.title)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            {lessons[mod.id]?.map((lesson, lidx) => (
                                <div key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderBottom: lidx === lessons[mod.id].length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {lesson.video_url ? <Video size={16} /> : <FileText size={16} />}
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{lesson.title}</span>
                                            {lesson.video_url ? (
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Video: {lesson.video_url}</span>
                                            ) : (
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Documento: PDF anexado</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Edit 
                                            size={14} 
                                            className="text-muted" 
                                            style={{ cursor: 'pointer' }} 
                                            onClick={() => handleOpenLessonForm(mod.id, lesson)}
                                        />
                                        <Trash2 
                                            size={14} 
                                            style={{ cursor: 'pointer', color: 'var(--danger)' }} 
                                            onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                        />
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => handleOpenLessonForm(mod.id)}
                                style={{ width: '100%', padding: '0.75rem', border: '1px dashed #e2e8f0', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', backgroundColor: 'transparent', cursor: 'pointer' }}
                            >
                                + Adicionar Aula neste Módulo
                            </button>
                            {/* Seção de Quiz por Módulo */}
                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {/* EXERCÍCIO */}
                                {quizzes[`${mod.id}_exercise`] ? (
                                    <div style={{ padding: '0.75rem', backgroundColor: '#F0F9FF', borderRadius: '6px', border: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0369A1' }}>
                                            <CheckSquare size={16} />
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>📝 EXERCÍCIO: {quizzes[`${mod.id}_exercise`].title}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: '#fff' }} onClick={() => handleManageQuiz(quizzes[`${mod.id}_exercise`])}>Gerenciar Questões</button>
                                            <button className="btn" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={async () => {
                                                if (window.confirm("Excluir este exercício?")) {
                                                    await lmsApi.removeQuiz(quizzes[`${mod.id}_exercise`].id)
                                                    fetchCourseDetails(selectedCourse.id)
                                                }
                                            }}>Excluir</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleOpenQuizForm(mod.id, 'exercise')}
                                        style={{ width: '100%', padding: '0.75rem', border: '1px dashed #BAE6FD', borderRadius: '6px', color: '#0369A1', fontSize: '0.875rem', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Plus size={16} /> Adicionar Exercício de Fixação
                                    </button>
                                )}

                                {/* PROVA FINAL */}
                                {quizzes[`${mod.id}_final_exam`] ? (
                                    <div style={{ padding: '0.75rem', backgroundColor: '#F5F3FF', borderRadius: '6px', border: '1px solid #DDD6FE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6D28D9' }}>
                                            <Trophy size={16} />
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>🏆 PROVA FINAL: {quizzes[`${mod.id}_final_exam`].title}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', backgroundColor: '#fff' }} onClick={() => handleManageQuiz(quizzes[`${mod.id}_final_exam`])}>Gerenciar Questões</button>
                                            <button className="btn" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: 'var(--danger)' }} onClick={async () => {
                                                if (window.confirm("Excluir esta prova final?")) {
                                                    await lmsApi.removeQuiz(quizzes[`${mod.id}_final_exam`].id)
                                                    fetchCourseDetails(selectedCourse.id)
                                                }
                                            }}>Excluir</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleOpenQuizForm(mod.id, 'final_exam')}
                                        style={{ width: '100%', padding: '0.75rem', border: '1px dashed #DDD6FE', borderRadius: '6px', color: '#6D28D9', fontSize: '0.875rem', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Trophy size={16} /> Adicionar Prova Final deste Módulo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {modules.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p className="text-secondary">Este curso ainda não tem módulos.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => handleOpenModuleForm()}><Plus size={16} /> Adicionar Primeiro Módulo</button>
                    </div>
                )}
            </div>
        </div>
    )

    const renderDoubts = () => (
        <div className="animate-fade-in">
            <button className="btn btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => setView('list')}>&larr; Voltar para listagem</button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>Central Pedagógica (Todas as Dúvidas)</h3>
            
            {loading ? <p>Carregando histórico completo...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {eadDoubts.map(d => (
                        <div key={d.id} className="card" style={{ borderLeft: d.answer_text ? '4px solid #10b981' : '4px solid #ef4444' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <strong>{d.student?.full_name}</strong> em {d.lesson?.lms_modules?.lms_courses?.title} &rarr; {d.lesson?.title}
                                </div>
                                <span style={{ fontSize: '0.75rem' }}>{new Date(d.created_at).toLocaleDateString()}</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>"{d.question_text}"</p>
                            
                            {d.answer_text ? (
                                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>Resposta enviada:</p>
                                    <p style={{ fontSize: '0.85rem' }}>{d.answer_text}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {answeringDoubtId === d.id ? (
                                        <>
                                            <textarea className="form-control" rows="2" value={doubtAnswerText} onChange={e => setDoubtAnswerText(e.target.value)} placeholder="Escreva a resposta pedagógica..."></textarea>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setAnsweringDoubtId(null)}>Cancelar</button>
                                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleAnswerDoubt(d.id)}>Enviar Resposta</button>
                                            </div>
                                        </>
                                    ) : (
                                        <button className="btn btn-secondary" style={{ alignSelf: 'flex-end', fontSize: '0.8rem' }} onClick={() => setAnsweringDoubtId(d.id)}>Responder</button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {eadDoubts.length === 0 && <p className="text-secondary text-center" style={{ padding: '2rem' }}>Nenhuma dúvida enviada no sistema.</p>}
                </div>
            )}
        </div>
    )

    const renderAnnouncements = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <button className="btn btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => setView('list')}>&larr; Voltar para listagem</button>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Megaphone size={24} color="var(--primary)" /> Quadro de Avisos &amp; Comunicados
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem', margin: 0 }}>
                        Publique informações urgentes ou gerais para todos os alunos ou segmentados por cursos.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => {
                    setAnnForm({ id: null, title: '', content: '', priority: 'geral', course_id: '' })
                    setShowAnnForm(true)
                }} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plus size={16} /> Novo Aviso
                </button>
            </div>

            {loadingAnnouncements ? <p>Carregando Quadro de Avisos...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {announcements.map(ann => {
                        const priorities = {
                            urgente: { label: 'Urgente 🚨', color: '#EF4444', bg: '#FEE2E2' },
                            importante: { label: 'Importante ⚠️', color: '#F59E0B', bg: '#FEF3C7' },
                            geral: { label: 'Geral 📢', color: '#3B82F6', bg: '#DBEAFE' }
                        }
                        const p = priorities[ann.priority?.toLowerCase()] || priorities.geral
                        return (
                            <div key={ann.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: `4px solid ${p.color}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ backgroundColor: p.bg, color: p.color, fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>
                                            {p.label}
                                        </span>
                                        <h4 style={{ fontWeight: 700, margin: 0 }}>{ann.title}</h4>
                                        {ann.lms_courses?.title && (
                                            <span style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                                                Curso: {ann.lms_courses.title}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{new Date(ann.created_at).toLocaleDateString('pt-BR')}</span>
                                        <button className="btn btn-secondary" style={{ padding: '0.35rem', color: 'var(--danger)' }} onClick={() => handleDeleteAnnouncement(ann.id)} title="Excluir Aviso">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{ann.content}</p>
                            </div>
                        )
                    })}
                    {announcements.length === 0 && <p className="text-secondary text-center" style={{ padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>Nenhum comunicado cadastrado.</p>}
                </div>
            )}
        </div>
    )

    const renderCertificateModels = () => (
        <div className="animate-fade-in">
            <button className="btn btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => setView('list')}>&larr; Voltar para listagem</button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={24} color="var(--primary)" /> Modelos de Texto para Certificados
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '2rem' }}>
                Configure o texto padrão que será renderizado nos certificados dos alunos que concluírem o curso. Use as variáveis sugeridas.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {certConfigs.map(config => (
                    <div key={config.id} className="card" style={{ padding: '2rem' }}>
                        <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Modelo Oficial CEC</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Texto Base do Certificado</label>
                                <textarea 
                                    className="form-control" 
                                    rows="4" 
                                    defaultValue={config.template_text}
                                    id={`cert_text_${config.id}`}
                                    style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.9rem', lineHeight: '1.5' }}
                                />
                            </div>

                            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h5 style={{ fontWeight: 700, fontSize: '0.8rem', color: '#475569', marginTop: 0, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Variáveis Suportadas:</h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
                                    <span><code>{"{{nome_aluno}}"}</code> - Nome completo do estudante</span>
                                    <span><code>{"{{cpf_aluno}}"}</code> - CPF cadastrado do aluno</span>
                                    <span><code>{"{{nome_curso}}"}</code> - Título do curso concluído</span>
                                    <span><code>{"{{carga_horaria}}"}</code> - Horas teóricas do curso</span>
                                </div>
                            </div>

                            <button 
                                className="btn btn-primary" 
                                style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                onClick={() => {
                                    const text = document.getElementById(`cert_text_${config.id}`).value
                                    handleSaveCertConfig(config.id, text)
                                }}
                            >
                                <Save size={16} /> Salvar Alterações
                            </button>
                        </div>
                    </div>
                ))}
                {certConfigs.length === 0 && <p className="text-secondary">Nenhum modelo de certificado encontrado no banco de dados.</p>}
            </div>
        </div>
    )

    return (
        <div className="lms-admin-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {view === 'list' && renderCourseList()}
            {view === 'add_course' && renderAddCourse()}
            {view === 'manage_course' && renderManageCourse()}
            {view === 'doubts' && renderDoubts()}
            {view === 'announcements' && renderAnnouncements()}
            {view === 'certificate_models' && renderCertificateModels()}

            {/* MODAL DE GERENCIAMENTO DE PROVAS (QUESTÕES) */}
            {isEditingQuiz && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '700px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckSquare size={20} /> Questões: {selectedQuiz?.title}
                                </h3>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Média para aprovação: {selectedQuiz?.passing_grade}%</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tempo: {selectedQuiz?.time_limit_minutes > 0 ? `${selectedQuiz.time_limit_minutes} min` : 'Sem limite'}</p>
                                </div>
                            </div>
                            <button className="btn" onClick={() => setIsEditingQuiz(false)}>Fechar</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {quizQuestions.map((q, idx) => (
                                <div key={q.id} style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{idx + 1}. {q.question_text}</p>
                                            {q.image_url && (
                                                <img src={q.image_url} alt="Referência" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid #ddd' }} />
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                                            <Edit size={16} style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => handleEditQuestion(q)} title="Editar Questão" />
                                            <Trash2 size={16} style={{ color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDeleteQuestion(q.id)} title="Excluir Questão" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: q.options.length > 3 ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                                        {q.options.map((opt, oidx) => (
                                            <div key={oidx} style={{ 
                                                fontSize: '0.85rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px',
                                                border: oidx === q.correct_option_index ? '2px solid #10b981' : '1px solid #e2e8f0',
                                                color: oidx === q.correct_option_index ? '#059669' : 'inherit', fontWeight: oidx === q.correct_option_index ? 700 : 400 
                                            }}>
                                                <span style={{ marginRight: '0.5rem' }}>{String.fromCharCode(65 + oidx)})</span>
                                                {typeof opt === 'object' ? opt.text : opt}
                                                {typeof opt === 'object' && opt.image_url && (
                                                    <img src={opt.image_url} alt="Opção" style={{ display: 'block', maxWidth: '100%', height: '80px', objectFit: 'contain', marginTop: '0.5rem', borderRadius: '4px' }} />
                                                )}
                                                {oidx === q.correct_option_index && <CheckSquare size={14} style={{ marginLeft: '0.5rem', display: 'inline' }} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {quizQuestions.length === 0 && <p className="text-center text-muted">Nenhuma questão cadastrada.</p>}
                            
                             {showQuestionBuilder ? (
                                <div className="card animate-fade-in" style={{ marginTop: '1.5rem', backgroundColor: '#f8fafc', border: '2px solid var(--primary-alpha)' }}>
                                    <h4 style={{ fontWeight: 700, marginBottom: '1.5rem', color: 'var(--primary)' }}>{editingQuestionId ? 'Editar Questão' : 'Construtor de Questão'}</h4>
                                    
                                    {/* Barra de Ferramentas de Símbolos Matemáticos */}
                                    <div style={{ 
                                        display: 'flex', 
                                        flexWrap: 'wrap', 
                                        gap: '0.4rem', 
                                        marginBottom: '1.5rem', 
                                        padding: '0.6rem', 
                                        backgroundColor: '#f1f5f9', 
                                        borderRadius: '6px', 
                                        border: '1px solid #cbd5e1' 
                                    }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>
                                            Símbolos Rápidos:
                                        </span>
                                        {MATH_SYMBOLS.map((sym, sIdx) => (
                                            <button
                                                key={sIdx}
                                                type="button"
                                                onMouseDown={e => {
                                                    e.preventDefault(); // Impede perda do foco no input/textarea ativo
                                                    insertSymbol(sym.value);
                                                }}
                                                style={{
                                                    padding: '0.25rem 0.6rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                    backgroundColor: 'white',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    color: 'var(--primary)'
                                                }}
                                                onMouseOver={e => e.target.style.backgroundColor = '#e2e8f0'}
                                                onMouseOut={e => e.target.style.backgroundColor = 'white'}
                                                title={sym.label}
                                            >
                                                {sym.value}
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label className="form-label" style={{ fontWeight: 600 }}>Enunciado da Questão</label>
                                        <textarea 
                                            className="form-control" 
                                            rows="3" 
                                            value={questionForm.text} 
                                            onChange={e => setQuestionForm(prev => ({...prev, text: e.target.value}))} 
                                            placeholder="Escreva a pergunta aqui..."
                                            data-field-type="question"
                                        ></textarea>
                                        
                                        {uploadingImageQuestion && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px dashed #cbd5e1', borderRadius: '6px', textAlign: 'center', backgroundColor: '#f1f5f9', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                Enviando imagem...
                                            </div>
                                        )}

                                        {!uploadingImageQuestion && questionForm.image_url && (
                                            <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
                                                <img src={questionForm.image_url} alt="Referência da Pergunta" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'block' }} />
                                                <button 
                                                    style={{ 
                                                        position: 'absolute', top: '-8px', right: '-8px', 
                                                        backgroundColor: 'var(--danger)', color: 'white', 
                                                        border: 'none', borderRadius: '50%', 
                                                        width: '20px', height: '20px', fontSize: '12px', 
                                                        cursor: 'pointer', display: 'flex', 
                                                        alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                        zIndex: 10
                                                    }}
                                                    onClick={() => setQuestionForm(prev => ({...prev, image_url: null}))}
                                                    title="Remover Imagem"
                                                >×</button>
                                            </div>
                                        )}

                                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <button className="btn btn-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => questionImageRef.current.click()}>
                                                <UploadCloud size={14} /> {questionForm.image_url ? 'Alterar Imagem' : 'Anexar Imagem'}
                                            </button>
                                            <input type="file" ref={questionImageRef} hidden accept="image/*" onChange={e => handleFileChange(e, 'question')} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <label className="form-label" style={{ fontWeight: 600 }}>Alternativas (Mínimo 2)</label>
                                        {questionForm.options.map((opt, oidx) => (
                                            <div key={oidx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
                                                    <input type="radio" name="correct_choice" checked={questionForm.correctIndex === oidx} onChange={() => setQuestionForm(prev => ({...prev, correctIndex: oidx}))} />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{String.fromCharCode(65+oidx)}</span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            value={opt.text} 
                                                            onChange={e => {
                                                                const newOpt = [...questionForm.options]; newOpt[oidx].text = e.target.value; setQuestionForm(prev => ({...prev, options: newOpt}))
                                                            }} 
                                                            placeholder={`Texto da opção ${String.fromCharCode(65+oidx)}`} 
                                                            data-field-type="option"
                                                            data-option-idx={oidx}
                                                        />
                                                        <button className="btn btn-secondary" style={{ padding: '0.4rem', flexShrink: 0 }} onClick={() => handleOptionImageClick(oidx)}>
                                                            <UploadCloud size={14} />
                                                        </button>
                                                    </div>
                                                    {uploadingImageOptionIdx === oidx && (
                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            Enviando imagem...
                                                        </div>
                                                    )}
                                                    {uploadingImageOptionIdx !== oidx && opt.image_url && (
                                                        <div style={{ marginTop: '0.5rem', position: 'relative', display: 'inline-block' }}>
                                                            <img src={opt.image_url} alt="Opção" style={{ height: '50px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                                            <button 
                                                                style={{ 
                                                                    position: 'absolute', top: '-5px', right: '-5px', 
                                                                    backgroundColor: 'var(--danger)', color: 'white', 
                                                                    border: 'none', borderRadius: '50%', 
                                                                    width: '16px', height: '16px', fontSize: '10px', 
                                                                    cursor: 'pointer', display: 'flex', 
                                                                    alignItems: 'center', justifyContent: 'center' 
                                                                }}
                                                                onClick={() => {
                                                                    const newOpt = [...questionForm.options]; newOpt[oidx].image_url = null; setQuestionForm(prev => ({...prev, options: newOpt}))
                                                                }}
                                                            >×</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                        <button className="btn btn-secondary" onClick={() => { setShowQuestionBuilder(false); setEditingQuestionId(null); }}>Cancelar</button>
                                        <button className="btn btn-primary" onClick={handleSaveFullQuestion} disabled={isSavingQuestion}>
                                            {isSavingQuestion ? 'Salvando...' : 'Salvar Questão'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center', padding: '1rem' }} onClick={handleOpenQuestionBuilder}>
                                    + Adicionar Questão com Imagem/Texto
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL DE MÓDULO */}
            {showModuleForm && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '400px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{moduleForm.id ? 'Editar Módulo' : 'Novo Módulo'}</h3>
                        <div className="form-group">
                            <label className="form-label">Título do Módulo</label>
                            <input type="text" className="form-control" value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} placeholder="Ex: Introdução ao Curso" />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowModuleForm(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveModule}>Salvar</button>
                        </div>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL DE AULA */}
            {showLessonForm && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '500px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{lessonForm.id ? 'Editar Aula' : 'Nova Aula'}</h3>
                        <div className="form-group">
                            <label className="form-label">Título da Aula</label>
                            <input type="text" className="form-control" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipo de Conteúdo</label>
                            <select className="form-control" value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value})}>
                                <option value="video">Vídeo (YouTube/Vimeo ou arquivo enviado)</option>
                                <option value="pdf">Arquivo (PDF, Word, Excel, PPT)</option>
                            </select>
                        </div>

                        {lessonForm.type === 'video' ? (
                            <div className="form-group">
                                <label className="form-label">URL do Vídeo (YouTube/Vimeo) — ou envie o arquivo</label>
                                <input type="text" className="form-control" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="https://youtube.com/..." />
                                <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.6rem' }} onClick={async () => {
                                    const input = document.createElement('input'); input.type = 'file'; input.accept = '.mp4,.webm';
                                    input.onchange = async (e) => {
                                        const file = e.target.files[0]
                                        if (!file) return
                                        if (file.size > 500 * 1024 * 1024) { alert('O vídeo excede o limite de 500 MB.'); return }
                                        setLessonForm(prev => ({ ...prev, video_url: '⏳ Enviando vídeo... aguarde' }))
                                        try {
                                            const { url } = await uploadFile(file, 'lms-videos')
                                            setLessonForm(prev => ({ ...prev, video_url: url }))
                                        } catch (err) {
                                            setLessonForm(prev => ({ ...prev, video_url: '' }))
                                            alert('Falha no envio do vídeo: ' + err.message)
                                        }
                                    }
                                    input.click()
                                }}>
                                    🎬 Enviar arquivo de vídeo (MP4/WebM, até 500 MB — fica hospedado na plataforma)
                                </button>
                                {lessonForm.video_url && !lessonForm.video_url.startsWith('⏳') && (
                                    <div style={{ marginTop: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', backgroundColor: '#f8fafc' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>📺 Prévia do Vídeo:</span>
                                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: 'black', borderRadius: '6px', overflow: 'hidden' }}>
                                            {/\.(mp4|webm|ogg)(\?|$)/i.test(lessonForm.video_url.split('#')[0]) ? (
                                                <video
                                                    src={lessonForm.video_url}
                                                    controls
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'black' }}
                                                />
                                            ) : (
                                            <iframe
                                                src={formatVideoUrl(lessonForm.video_url)}
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title="Prévia do Vídeo"
                                            ></iframe>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Arquivo / Documento</label>
                                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={async () => {
                                    const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif';
                                    input.onchange = async (e) => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            try {
                                                const { url } = await uploadFile(file, 'lms-docs')
                                                setLessonForm(prev => ({ ...prev, pdf_url: url }))
                                            } catch (err) { alert('Erro no upload: ' + err.message) }
                                        }
                                    }
                                    input.click()
                                }}>{lessonForm.pdf_url ? 'Alterar Arquivo' : 'Subir Arquivo'}</button>
                                {lessonForm.pdf_url && (
                                    <div style={{ marginTop: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', backgroundColor: '#f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✅ Arquivo Carregado:</span>
                                            <a href={lessonForm.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'underline' }}>
                                                Abrir em Nova Aba ↗
                                            </a>
                                        </div>
                                        {isImageUrl(lessonForm.pdf_url) ? (
                                            <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', borderRadius: '6px', overflow: 'hidden' }}>
                                                <img 
                                                    src={lessonForm.pdf_url} 
                                                    alt="Prévia do arquivo" 
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                            </div>
                                        ) : (
                                            <iframe 
                                                src={lessonForm.pdf_url} 
                                                style={{ width: '100%', height: '180px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white' }}
                                                title="Prévia do PDF"
                                            ></iframe>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Tempo teórico (Minutos)</label>
                            <input type="number" className="form-control" value={lessonForm.min_minutes} onChange={e => setLessonForm({...lessonForm, min_minutes: e.target.value})} />
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                            <input 
                                type="checkbox" 
                                id="allow_download" 
                                checked={lessonForm.allow_download || false} 
                                onChange={e => setLessonForm({...lessonForm, allow_download: e.target.checked})}
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <label htmlFor="allow_download" style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                                Liberar download do material (PDF, Imagem, Vídeo) para o aluno?
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowLessonForm(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveLesson}>Salvar Aula</button>
                        </div>
                    </div>
                </div>
            ), document.body)}

            {/* MODAL DE QUIZ / PROVA */}
            {showQuizForm && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '500px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{quizForm.type === 'exercise' ? '📝 Novo Exercício' : '🏆 Nova Prova Final'}</h3>
                        <div className="form-group">
                            <label className="form-label">Título</label>
                            <input type="text" className="form-control" value={quizForm.title} onChange={e => setQuizForm({...quizForm, title: e.target.value})} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Tempo Limite (Min)</label>
                                <input type="number" className="form-control" value={quizForm.time_limit} onChange={e => setQuizForm({...quizForm, time_limit: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Média Mínima (%)</label>
                                <input type="number" className="form-control" value={quizForm.passing_grade} onChange={e => setQuizForm({...quizForm, passing_grade: e.target.value})} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowQuizForm(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveQuiz}>Criar e Adicionar Questões</button>
                        </div>
                    </div>
                </div>
            ), document.body)}



            {/* MODAL DE QUADRO DE AVISOS (Prioridade 🟡 13) */}
            {showAnnForm && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '500px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'white', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                                <Megaphone color="var(--primary)" size={20} /> Novo Comunicado Pedagógico
                            </h3>
                            <button onClick={() => setShowAnnForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Título do Comunicado *</label>
                                <input type="text" required className="form-control" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} placeholder="Ex: Treinamento Presencial Prático" style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Prioridade / Destacabilidade *</label>
                                <select className="form-control" value={annForm.priority} onChange={e => setAnnForm({...annForm, priority: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <option value="geral">Informativo Geral (Azul)</option>
                                    <option value="importante">Importante (Laranja)</option>
                                    <option value="urgente">Urgente / Crítico (Vermelho)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Curso Destinatário (Opcional)</label>
                                <select className="form-control" value={annForm.course_id} onChange={e => setAnnForm({...annForm, course_id: e.target.value})} style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <option value="">Aviso Geral para Todos os Alunos</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Conteúdo do Comunicado *</label>
                                <textarea required className="form-control" rows="5" value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})} placeholder="Escreva o comunicado em detalhes para os alunos..." style={{ padding: '0.65rem', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAnnForm(false)} style={{ flex: 1 }}>Cancelar</button>
                                <button type="submit" disabled={loadingAnnouncements} className="btn btn-primary" style={{ flex: 1 }}>
                                    {loadingAnnouncements ? 'Salvando...' : 'Salvar e Publicar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}
