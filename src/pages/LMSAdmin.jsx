import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Book, Video, FileText, ChevronRight, ChevronDown, Save, Trash2, Edit, CheckSquare, Clock, Trophy, Eye, Printer, Search, Award, UploadCloud } from 'lucide-react'

export default function LMSAdmin() {
    const navigate = useNavigate()
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // list | add_course | manage_course
    const [selectedCourse, setSelectedCourse] = useState(null)
    const [modules, setModules] = useState([])
    const [lessons, setLessons] = useState({}) // { moduleId: [lessons] }
    const [prices, setPrices] = useState([])
    const [pricingView, setPricingView] = useState(false) // Toggle para aba de preços
    const [quizzes, setQuizzes] = useState({}) // { moduleId: quizObj }
    const [selectedQuiz, setSelectedQuiz] = useState(null)
    const [quizQuestions, setQuizQuestions] = useState([])
    const [isEditingQuiz, setIsEditingQuiz] = useState(false)
    const [eadDoubts, setEadDoubts] = useState([])
    const [answeringDoubtId, setAnsweringDoubtId] = useState(null)
    const [doubtAnswerText, setDoubtAnswerText] = useState('')
    const [certConfigs, setCertConfigs] = useState([])
    
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

    // Refs para inputs de arquivo
    const questionImageRef = useRef(null)
    const optionImageRefs = useRef([])

    const [courseForm, setCourseForm] = useState({
        title: '',
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
        min_minutes: 0
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

    const [showPriceForm, setShowPriceForm] = useState(false)
    const [priceForm, setPriceForm] = useState({ id: null, course_name: '', default_value: 0 })

    const fetchCourses = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('lms_courses')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (!error) setCourses(data || [])
        setLoading(false)
    }

    const fetchCourseDetails = async (courseId) => {
        const { data: mods, error: modError } = await supabase
            .from('lms_modules')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
        
        if (!modError && mods) {
            setModules(mods)
            
            // Buscar aulas para cada módulo
            const lessonsData = {}
            for (const mod of mods) {
                const { data: less, error: lessError } = await supabase
                    .from('lms_lessons')
                    .select('*')
                    .eq('module_id', mod.id)
                    .order('order_index', { ascending: true })
                
                if (!lessError) lessonsData[mod.id] = less || []
            }
            setLessons(lessonsData)

            // Buscar quizzes para cada módulo
            const quizzesData = {}
            for (const mod of mods) {
                const { data: qzs, error: qzError } = await supabase
                    .from('lms_quizzes')
                    .select('*')
                    .eq('module_id', mod.id)
                
                if (!qzError && qzs) {
                    qzs.forEach(qz => {
                        quizzesData[`${mod.id}_${qz.quiz_type}`] = qz
                    })
                }
            }
            setQuizzes(quizzesData)
        }
    }

    const fetchPrices = async () => {
        const { data } = await supabase.from('course_prices').select('*').order('course_name')
        if (data) setPrices(data)
    }

    const fetchAllDoubts = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('lms_lesson_questions')
            .select('*, student:users!student_id(full_name), lesson:lms_lessons(title, lms_modules(lms_courses(title)))')
            .order('created_at', { ascending: false })
        if (data) setEadDoubts(data)
        setLoading(false)
    }

    const handleAnswerDoubt = async (id) => {
        if (!doubtAnswerText.trim()) return
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('lms_lesson_questions')
            .update({
                answer_text: doubtAnswerText,
                answered_by: user.id,
                answered_at: new Date().toISOString()
            })
            .eq('id', id)
        
        if (!error) {
            setDoubtAnswerText('')
            setAnsweringDoubtId(null)
            fetchAllDoubts()
            alert('Resposta enviada!')
        }
    }

    const handleOpenPriceForm = (price = null) => {
        if (price) {
            setPriceForm({ id: price.id, course_name: price.course_name, default_value: price.default_value })
        } else {
            setPriceForm({ id: null, course_name: '', default_value: 0 })
        }
        setShowPriceForm(true)
    }

    const handleSavePrice = async () => {
        if (!priceForm.course_name.trim()) return alert('Nome do curso obrigatório')
        
        let error
        if (priceForm.id) {
            const { error: err } = await supabase.from('course_prices').update({ course_name: priceForm.course_name, default_value: parseFloat(priceForm.default_value) }).eq('id', priceForm.id)
            error = err
        } else {
            const { error: err } = await supabase.from('course_prices').insert([{ course_name: priceForm.course_name, default_value: parseFloat(priceForm.default_value) }])
            error = err
        }

        if (error) alert('Erro ao salvar preço: ' + error.message)
        else {
            setShowPriceForm(false)
            fetchPrices()
        }
    }

    const fetchCertConfigs = async () => {
        const { data } = await supabase.from('lms_certificate_configs').select('*')
        if (data) setCertConfigs(data)
    }

    useEffect(() => {
        fetchCourses()
        fetchPrices()
        fetchCertConfigs()
    }, [])

    const handleSaveCourse = async () => {
        if (!courseForm.title) return alert('Título é obrigatório')
        
        let error
        if (selectedCourse) {
            // Update
            const { error: err } = await supabase
                .from('lms_courses')
                .update({
                    title: courseForm.title,
                    description: courseForm.description,
                    thumbnail_url: courseForm.thumbnail_url,
                    min_theoretical_hours: courseForm.min_theoretical_hours,
                    instructor_payment_type: courseForm.instructor_payment_type,
                    instructor_payment_value: parseFloat(courseForm.instructor_payment_value) || 0
                })
                .eq('id', selectedCourse.id)
            error = err
        } else {
            // Create
            const { create_class_container, ...cleanForm } = courseForm
            const { data: newCourse, error: err } = await supabase
                .from('lms_courses')
                .insert([{
                    ...cleanForm,
                    instructor_payment_value: parseFloat(courseForm.instructor_payment_value) || 0
                }])
                .select()
                .single()
            
            // Se pediu para criar container de turma (Início Imediato)
            if (!err && create_class_container && newCourse) {
                await supabase.from('classes').insert([{
                    name: `Auto: ${newCourse.title}`,
                    course_name: newCourse.title,
                    is_immediate_start: true,
                    lms_course_id: newCourse.id,
                    instructor_payment_type: newCourse.instructor_payment_type,
                    instructor_payment_value: newCourse.instructor_payment_value,
                    duration: '0',
                    schedule: 'Acesso Online Perpétuo'
                }])
            }
            error = err
        }
        
        if (error) {
            alert('Erro ao salvar curso: ' + error.message)
        } else {
            alert('Curso salvo com sucesso!')
            setCourseForm({ title: '', description: '', thumbnail_url: '', min_theoretical_hours: 0, is_published: false, instructor_payment_type: 'fixed', instructor_payment_value: 0 })
            setSelectedCourse(null)
            setView('list')
            fetchCourses()
        }
    }

    const handleSaveCertConfig = async (id, text) => {
        const { error } = await supabase
            .from('lms_certificate_configs')
            .update({ template_text: text, updated_at: new Date().toISOString() })
            .eq('id', id)
        
        if (error) alert('Erro ao salvar modelo: ' + error.message)
        else alert('Modelo atualizado com sucesso!')
    }

    const handleSelectCourse = async (course) => {
        setSelectedCourse(course)
        await fetchCourseDetails(course.id)
        setView('manage_course')
    }

    const renderCourseList = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Gestão de Cursos EAD</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => { setView('doubts'); fetchAllDoubts(); }}>Central de Dúvidas</button>
                    <button className="btn btn-secondary" onClick={() => { setView('certificate_models'); fetchCertConfigs(); }}>Modelos de Certificado</button>
                    <button className="btn btn-secondary" onClick={() => setPricingView(!pricingView)}>
                        {pricingView ? 'Ver Cursos' : 'Gerenciar Preços'}
                    </button>
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
            ) : pricingView ? (
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Tabela de Preços Padrão</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem' }}>Nome do Curso</th>
                                    <th style={{ padding: '0.75rem' }}>Preço Sugerido (R$)</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prices.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem' }}>{p.course_name}</td>
                                        <td style={{ padding: '0.75rem' }}>R$ {p.default_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleOpenPriceForm(p)}>
                                                <Edit size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => handleOpenPriceForm()}>
                        + Adicionar Novo Preço
                    </button>
                </div>
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
                    <label className="form-label">Descrição / Ementa</label>
                    <textarea 
                        className="form-control" 
                        style={{ height: '120px' }}
                        value={courseForm.description}
                        onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                        placeholder="Descreva o que o aluno aprenderá..."
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
                        setCourseForm({ title: '', description: '', thumbnail_url: '', min_theoretical_hours: 0, is_published: false, instructor_payment_type: 'fixed', instructor_payment_value: 0, create_class_container: true })
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
        
        let error
        if (moduleForm.id) {
            const { error: err } = await supabase.from('lms_modules').update({ title: moduleForm.title }).eq('id', moduleForm.id)
            error = err
        } else {
            const { error: err } = await supabase.from('lms_modules').insert([{ course_id: selectedCourse.id, title: moduleForm.title, order_index: modules.length }])
            error = err
        }

        if (error) alert('Erro ao salvar módulo: ' + error.message)
        else {
            setShowModuleForm(false)
            fetchCourseDetails(selectedCourse.id)
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
                min_minutes: Math.round((lesson.min_watch_time_sec || 0) / 60)
            })
        } else {
            setLessonForm({
                id: null,
                moduleId: moduleId,
                title: '',
                type: 'video',
                video_url: '',
                pdf_url: '',
                min_minutes: 10
            })
        }
        setShowLessonForm(true)
    }

    const handleSaveLesson = async () => {
        if (!lessonForm.title.trim()) return alert('Título obrigatório')
        
        const data = {
            module_id: lessonForm.moduleId,
            title: lessonForm.title,
            video_url: lessonForm.type === 'video' ? lessonForm.video_url : null,
            pdf_url: lessonForm.type === 'pdf' ? lessonForm.pdf_url : null,
            min_watch_time_sec: (parseInt(lessonForm.min_minutes) || 0) * 60,
        }

        if (!lessonForm.id) {
            data.order_index = (lessons[lessonForm.moduleId]?.length || 0)
        }

        let error
        if (lessonForm.id) {
            const { error: err } = await supabase.from('lms_lessons').update(data).eq('id', lessonForm.id)
            error = err
        } else {
            const { error: err } = await supabase.from('lms_lessons').insert([data])
            error = err
        }

        if (error) alert('Erro ao salvar aula: ' + error.message)
        else {
            setShowLessonForm(false)
            fetchCourseDetails(selectedCourse.id)
        }
    }


    const handleDeleteModule = async (moduleId, title) => {
        if (!window.confirm(`Excluir módulo "${title}" e TODAS as suas aulas?`)) return
        const { error } = await supabase.from('lms_modules').delete().eq('id', moduleId)
        if (error) alert('Erro ao excluir module: ' + error.message)
        else fetchCourseDetails(selectedCourse.id)
    }

    const handleDeleteLesson = async (lessonId, title) => {
        if (!window.confirm(`Excluir aula "${title}"?`)) return
        const { error } = await supabase.from('lms_lessons').delete().eq('id', lessonId)
        if (error) alert('Erro ao excluir aula: ' + error.message)
        else fetchCourseDetails(selectedCourse.id)
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
        
        const { data, error } = await supabase
            .from('lms_quizzes')
            .insert([{ 
                course_id: selectedCourse.id, 
                module_id: quizForm.moduleId, 
                title: quizForm.title,
                quiz_type: quizForm.type,
                passing_grade: quizForm.passing_grade,
                max_attempts: 3,
                time_limit_minutes: parseInt(quizForm.time_limit) || 0
            }])
            .select()
            .maybeSingle()
        
        if (error) alert('Erro ao salvar: ' + error.message)
        else {
            setShowQuizForm(false)
            fetchCourseDetails(selectedCourse.id)
            handleManageQuiz(data)
        }
    }

    const handleManageQuiz = async (quiz) => {
        setSelectedQuiz(quiz)
        setIsEditingQuiz(true)
        const { data, error } = await supabase
            .from('lms_questions')
            .select('*')
            .eq('quiz_id', quiz.id)
        
        if (!error) setQuizQuestions(data || [])
    }


    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm("Excluir esta questão?")) return
        const { error } = await supabase.from('lms_questions').delete().eq('id', qId)
        if (!error) handleManageQuiz(selectedQuiz)
    }

    const handleQuizImageUpload = async (file, pathPrefix = '') => {
        if (!file) return null
        const fileExt = file.name.split('.').pop()
        const fileName = `${selectedQuiz.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${pathPrefix}${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('lms-quiz-images')
            .upload(filePath, file)

        if (uploadError) {
            alert('Erro no upload: ' + uploadError.message)
            return null
        }

        const { data: { publicUrl } } = supabase.storage
            .from('lms-quiz-images')
            .getPublicUrl(filePath)
        
        return publicUrl
    }

    const handleOpenQuestionBuilder = () => {
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
        const { error } = await supabase
            .from('lms_questions')
            .insert([{
                quiz_id: selectedQuiz.id,
                question_text: questionForm.text,
                image_url: questionForm.image_url,
                options: questionForm.options.filter(o => o.text.trim() || o.image_url),
                correct_option_index: questionForm.correctIndex
            }])
        
        // Sync with Central Question Bank for future automated use
        if (!error) {
            await supabase
                .from('lms_question_bank')
                .insert([{
                    question_text: questionForm.text,
                    image_url: questionForm.image_url,
                    options: questionForm.options.filter(o => o.text.trim() || o.image_url),
                    correct_option_index: questionForm.correctIndex,
                    category: selectedCourse?.title || 'Geral',
                    original_quiz_id: selectedQuiz.id
                }])
        }
        
        setIsSavingQuestion(false)
        if (error) alert('Erro ao salvar questão: ' + error.message)
        else {
            setShowQuestionBuilder(false)
            handleManageQuiz(selectedQuiz)
        }
    }

    const handleFileChange = async (e, type, index = null) => {
        const file = e.target.files[0]
        if (!file) return

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
    }

    const handleTogglePublishCourse = async (courseId, currentStatus) => {
        const { error } = await supabase
            .from('lms_courses')
            .update({ is_published: !currentStatus })
            .eq('id', courseId)
        
        if (error) alert('Erro ao alterar status: ' + error.message)
        else {
            setSelectedCourse(prev => ({ ...prev, is_published: !currentStatus }))
            fetchCourses()
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <button className="btn btn-secondary" onClick={() => setView('list')}>&larr; Voltar</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
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
                        alignItems: 'center'
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
                                                    await supabase.from('lms_quizzes').delete().eq('id', quizzes[`${mod.id}_exercise`].id)
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
                                                    await supabase.from('lms_quizzes').delete().eq('id', quizzes[`${mod.id}_final_exam`].id)
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

    return (
        <div className="lms-admin-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {view === 'list' && renderCourseList()}
            {view === 'add_course' && renderAddCourse()}
            {view === 'manage_course' && renderManageCourse()}
            {view === 'doubts' && renderDoubts()}

            {/* MODAL DE GERENCIAMENTO DE PROVAS (QUESTÕES) */}
            {isEditingQuiz && (
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
                                        <Trash2 size={16} style={{ color: 'var(--danger)', cursor: 'pointer', flexShrink: 0 }} onClick={() => handleDeleteQuestion(q.id)} />
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
                                    <h4 style={{ fontWeight: 700, marginBottom: '1.5rem', color: 'var(--primary)' }}>Construtor de Questão</h4>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label className="form-label" style={{ fontWeight: 600 }}>Enunciado da Questão</label>
                                        <textarea className="form-control" rows="3" value={questionForm.text} onChange={e => setQuestionForm(prev => ({...prev, text: e.target.value}))} placeholder="Escreva a pergunta aqui..."></textarea>
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
                                                        <input type="text" className="form-control" value={opt.text} onChange={e => {
                                                            const newOpt = [...questionForm.options]; newOpt[oidx].text = e.target.value; setQuestionForm(prev => ({...prev, options: newOpt}))
                                                        }} placeholder={`Texto da opção ${String.fromCharCode(65+oidx)}`} />
                                                        <button className="btn btn-secondary" style={{ padding: '0.4rem', flexShrink: 0 }} onClick={() => {
                                                            const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
                                                            input.onchange = (e) => handleFileChange(e, 'option', oidx);
                                                            input.click();
                                                        }}>
                                                            <UploadCloud size={14} />
                                                        </button>
                                                    </div>
                                                    {opt.image_url && (
                                                        <div style={{ marginTop: '0.5rem', position: 'relative', display: 'inline-block' }}>
                                                            <img src={opt.image_url} alt="Opção" style={{ height: '50px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                                            <button 
                                                                style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                                        <button className="btn btn-secondary" onClick={() => setShowQuestionBuilder(false)}>Cancelar</button>
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
            )}

            {/* MODAL DE MÓDULO */}
            {showModuleForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '400px' }}>
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
            )}

            {/* MODAL DE AULA */}
            {showLessonForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '500px' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{lessonForm.id ? 'Editar Aula' : 'Nova Aula'}</h3>
                        <div className="form-group">
                            <label className="form-label">Título da Aula</label>
                            <input type="text" className="form-control" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipo de Conteúdo</label>
                            <select className="form-control" value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value})}>
                                <option value="video">Vídeo (YouTube/Vimeo)</option>
                                <option value="pdf">Arquivo (PDF, Word, Excel, PPT)</option>
                            </select>
                        </div>

                        {lessonForm.type === 'video' ? (
                            <div className="form-group">
                                <label className="form-label">URL do Vídeo</label>
                                <input type="text" className="form-control" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="https://youtube.com/..." />
                            </div>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Arquivo / Documento</label>
                                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={async () => {
                                    const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
                                    input.onchange = async (e) => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            const fileName = `${selectedCourse.id}_${Date.now()}.${file.name.split('.').pop()}`
                                            const { error } = await supabase.storage.from('lms-docs').upload(`lessons/${fileName}`, file)
                                            if (!error) {
                                                const { data: { publicUrl } } = supabase.storage.from('lms-docs').getPublicUrl(`lessons/${fileName}`)
                                                setLessonForm(prev => ({ ...prev, pdf_url: publicUrl }))
                                            } else alert('Erro no upload: ' + error.message)
                                        }
                                    }
                                    input.click()
                                }}>{lessonForm.pdf_url ? 'Alterar Arquivo' : 'Subir Arquivo'}</button>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Tempo teórico (Minutos)</label>
                            <input type="number" className="form-control" value={lessonForm.min_minutes} onChange={e => setLessonForm({...lessonForm, min_minutes: e.target.value})} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowLessonForm(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSaveLesson}>Salvar Aula</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE QUIZ / PROVA */}
            {showQuizForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '500px' }}>
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
            )}

            {/* MODAL DE PREÇO */}
            {showPriceForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }}>
                    <div className="card animate-fade-in" style={{ width: '400px' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{priceForm.id ? 'Editar Preço' : 'Novo Preço Sugerido'}</h3>
                        <div className="form-group">
                            <label className="form-label">Nome do Curso</label>
                            <input type="text" className="form-control" value={priceForm.course_name} onChange={e => setPriceForm({...priceForm, course_name: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Valor Padrão (R$)</label>
                            <input type="number" className="form-control" value={priceForm.default_value} onChange={e => setPriceForm({...priceForm, default_value: e.target.value})} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setShowPriceForm(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSavePrice}>Salvar Preço</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
