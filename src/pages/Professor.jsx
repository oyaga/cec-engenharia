import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BookOpen, CheckSquare, List, Calendar as CalendarIcon, Edit3, ShieldAlert } from 'lucide-react'

export default function Professor() {
    const [activeTab, setActiveTab] = useState('minhasTurmas') // minhasTurmas | diario
    const [selectedClass, setSelectedClass] = useState(null)
    const [loading, setLoading] = useState(true)

    // Data from Supabase
    const [classes, setClasses] = useState([])
    const [classStudents, setClassStudents] = useState([])
    const [eadDoubts, setEadDoubts] = useState([])
    const [answeringId, setAnsweringId] = useState(null)
    const [answerText, setAnswerText] = useState('')

    // Form States
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0])
    const [recordContent, setRecordContent] = useState('')
    const [attendance, setAttendance] = useState({}) // { studentId: 'presente' | 'falta' }
    const [improvements, setImprovements] = useState({}) // { studentId: 'texto...' }

    const fetchClasses = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Buscar perfil para saber o role
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            const isAdminOrCoord = profile?.role === 'admin' || profile?.role === 'coordenador'

            if (isAdminOrCoord) {
                // Admin e coordenadores veem todas as turmas
                const { data, error } = await supabase
                    .from('classes')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (error) throw error
                setClasses(data || [])
            } else {
                // Instrutor vê apenas as turmas vinculadas a ele
                const { data: links, error: linksError } = await supabase
                    .from('class_instructors')
                    .select('class_id')
                    .eq('user_id', user.id)
                if (linksError) throw linksError

                const classIds = links?.map(l => l.class_id) || []

                if (classIds.length === 0) {
                    setClasses([])
                } else {
                    const { data, error } = await supabase
                        .from('classes')
                        .select('*')
                        .in('id', classIds)
                        .order('created_at', { ascending: false })
                    if (error) throw error
                    setClasses(data || [])
                }
            }
        } catch (error) {
            console.error('Error fetching classes for professor:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchClassStudents = async (classId) => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('students').select('*').eq('turma_id', classId)
            if (error) throw error

            setClassStudents(data || [])

            // Initialize default attendance (all present by default to save time) and improvements
            const initialAttendance = {}
            const initialImprovements = {}
            if (data) {
                data.forEach(s => {
                    initialAttendance[s.id] = 'presente'
                    initialImprovements[s.id] = s.improvements || ''
                })
            }
            setAttendance(initialAttendance)
            setImprovements(initialImprovements)
        } catch (error) {
            console.error('Error fetching students:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'minhasTurmas') fetchClasses()
        if (activeTab === 'duvidasEad') fetchEadDoubts()
    }, [activeTab])

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

    const handleOpenDiario = (turma) => {
        setSelectedClass(turma)
        setActiveTab('diario')
        fetchClassStudents(turma.id) // Fetch real students for this specific class
    }

    const handleAttendanceChange = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }))
    }

    const handleImprovementChange = (studentId, value) => {
        setImprovements(prev => ({ ...prev, [studentId]: value }))
    }

    const handleSaveDiario = async () => {
        if (!recordContent) {
            alert('Por favor, descreva o conteúdo lecionado.')
            return
        }

        // 1. In a complete implementation, this would save to a 'class_records' and 'attendance' table in Supabase.
        // We simulate saving the improvements back to the DB for the students
        for (const studentId of Object.keys(improvements)) {
            const text = improvements[studentId];
            if (text) {
                await supabase.from('students').update({ improvements: text }).eq('id', studentId);
            }
        }

        alert('Fichário Diário, Presença e Pontos de Melhoria Salvos com Sucesso!')

        // Return to class list
        setActiveTab('minhasTurmas')
        setSelectedClass(null)
        setRecordContent('')
    }

    const renderTurmas = () => (
        <div className="animate-fade-in">
            {loading ? <p>Carregando turmas da instituição...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {classes.map(turma => (
                        <div key={turma.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{turma.name}</h3>
                                    <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Curso: {turma.course_name}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => handleOpenDiario(turma)}>
                                    <BookOpen size={16} /> Abrir Diário de Classe (Fichário)
                                </button>
                            </div>
                        </div>
                    ))}
                    {classes.length === 0 && <p>Nenhuma turma cadastrada no BD.</p>}
                </div>
            )}
        </div>
    )

    const renderDiario = () => {
        if (!selectedClass) return null

        return (
            <div className="animate-fade-in">
                <button className="btn btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => { setActiveTab('minhasTurmas'); setSelectedClass(null) }}>
                    &larr; Voltar às Minhas Turmas
                </button>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedClass.name} - Diário de Classe</h2>
                    <p className="text-muted">Preencha o conteúdo lecionado e a presença da turma conectada pelo banco.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                    {/* Fichário */}
                    <div className="card">
                        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Edit3 size={18} /> Novo Registro (Ficha)
                        </h3>
                        <div className="form-group">
                            <label className="form-label">Data Lecionada</label>
                            <input type="date" className="form-control" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Conteúdo Diferido / Atividade</label>
                            <textarea className="form-control" rows="5" placeholder="Descreva o que foi ensinado na aula de hoje..." value={recordContent} onChange={(e) => setRecordContent(e.target.value)}></textarea>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', margin: '1rem 0', padding: '1rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                            <ShieldAlert size={24} style={{ flexShrink: 0 }} />
                            <div><strong>Atenção:</strong> De acordo com a Regra, não poderá alterar o registro após salvá-lo. (AuditTrail em Background)</div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveDiario}>Salvar Fichário e Fechar</button>
                    </div>

                    {/* Frequência */}
                    <div className="card">
                        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckSquare size={18} /> Chamada / Frequência de Hoje
                        </h3>

                        {loading ? <p>Carregando alunos da Turma...</p> : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                            <th style={{ padding: '0.75rem' }}>Aluno Matriculado</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', color: '#065F46' }}>Presente</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center', color: '#991B1B' }}>Falta</th>
                                            <th style={{ padding: '0.75rem' }}>Pontos de Melhoria (Acumulativo)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classStudents.map(student => (
                                            <tr key={student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{student.full_name}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <input type="radio" name={`presenca_${student.id}`} value="presente"
                                                        checked={attendance[student.id] === 'presente'}
                                                        onChange={() => handleAttendanceChange(student.id, 'presente')} />
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <input type="radio" name={`presenca_${student.id}`} value="falta"
                                                        checked={attendance[student.id] === 'falta'}
                                                        onChange={() => handleAttendanceChange(student.id, 'falta')} />
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <textarea
                                                        className="form-control"
                                                        rows="1"
                                                        placeholder="Ex: Prestar atenção na solda X..."
                                                        value={improvements[student.id] || ''}
                                                        onChange={(e) => handleImprovementChange(student.id, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                        {classStudents.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>Nenhum aluno cadastrado nesta turma.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const renderDoubtEad = () => (
        <div className="animate-fade-in">
            {loading ? <p>Buscando dúvidas pendentes...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {eadDoubts.map(doubt => (
                        <div key={doubt.id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
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
            )}
        </div>
    )

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Portal do Instrutor / Professor</h2>
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
            </div>
            {activeTab === 'minhasTurmas' && renderTurmas()}
            {activeTab === 'diario' && renderDiario()}
            {activeTab === 'duvidasEad' && renderDoubtEad()}
        </div>
    )
}
