import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, PlayCircle, CheckCircle, Clock, Calendar } from 'lucide-react'

import { useNavigate } from 'react-router-dom'

export default function AreaAluno() {
    const navigate = useNavigate()
    const [myCourses, setMyCourses] = useState([])
    const [upcomingPractical, setUpcomingPractical] = useState([])
    const [quizResults, setQuizResults] = useState([])
    const [technicalEvals, setTechnicalEvals] = useState([])
    const [missingDocs, setMissingDocs] = useState(false)
    const [studentId, setStudentId] = useState(null)
    const [loading, setLoading] = useState(true)
    const { session } = useAuth()

    const handleStartCourse = async (courseId) => {
        const { data: lesson } = await supabase
            .from('lms_lessons')
            .select('id')
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle()
        
        if (lesson) {
            navigate(`/curso/${courseId}/aula/${lesson.id}`)
        } else {
            alert('Este curso ainda não possui aulas cadastradas.')
        }
    }

    const fetchData = async () => {
        setLoading(true)
        if (!session?.user?.id) return

        // 1. Buscar o nome completo do perfil do usuário logado
        const { data: profile } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', session.user.id)
            .maybeSingle()

        if (!profile) {
            setLoading(false)
            return
        }

        // 2. Buscar matrículas (students) pelo user_id
        const { data: enrollments } = await supabase
            .from('students')
            .select(`
                id,
                doc_photo_url,
                doc_id_url,
                doc_cpf_url,
                has_lms_access,
                classes(lms_course_id)
            `)
            .eq('user_id', session.user.id)

        if (enrollments && enrollments.length > 0) {
            setStudentId(enrollments[0].id)
            // Check if mandatory documents are missing
            const hasMissingDocs = enrollments.some(e => 
                !e.doc_id_url || !e.doc_cpf_url || !e.doc_photo_url || 
                !e.doc_address_url || !e.doc_education_url
            )
            if (hasMissingDocs) {
                setMissingDocs(true)
            }
        }

        // 3. Extrair IDs de cursos vinculados às turmas que o aluno tem acesso (apenas os que têm EAD)
        const eadEnrollments = enrollments?.filter(e => e.has_lms_access) || []
        const courseIds = eadEnrollments.map(e => e.classes?.lms_course_id).filter(Boolean) || []

        if (courseIds.length > 0) {
            const { data: courses } = await supabase
                .from('lms_courses')
                .select('*')
                .in('id', courseIds)
                .eq('is_published', true)
            
            if (courses) setMyCourses(courses)
        }

        // 4. Buscar turmas presenciais para o calendário
        const { data: practicalStudents } = await supabase
            .from('students')
            .select('turma_id, classes(name, course_name, start_date)')
            .eq('user_id', session.user.id)
        
        if (practicalStudents) {
            const dates = practicalStudents.map(s => s.classes).filter(Boolean)
            setUpcomingPractical(dates)

            // 5. Buscar notas das avaliações técnicas (presenciais)
            const studentIds = practicalStudents.map(s => s.id)
            if (studentIds.length > 0) {
                const { data: evals } = await supabase
                    .from('student_evaluations')
                    .select('*, classes(name, course_name)')
                    .in('student_id', studentIds)
                    .order('date', { ascending: false })
                if (evals) setTechnicalEvals(evals)
            }
        }

        // 6. Buscar notas dos quizzes EAD realizados
        const { data: qResults } = await supabase
            .from('lms_quiz_results')
            .select('*, lms_quizzes(title, quiz_type)')
            .eq('student_id', session.user.id)
            .order('updated_at', { ascending: false })
        
        if (qResults) setQuizResults(qResults)

        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [session])

    const handleFileUpload = async (e, docType) => {
        const file = e.target.files[0]
        if (!file || !studentId) return

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${studentId}_${docType}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${studentId}/${fileName}`

            const { error: uploadError } = await supabase.storage.from('student_documents').upload(filePath, file)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('student_documents').getPublicUrl(filePath)

            const { error: updateError } = await supabase.from('students').update({ [`doc_${docType}_url`]: publicUrl }).eq('id', studentId)
            if (updateError) throw updateError

            alert(`Documento (${docType}) enviado com sucesso!`)
            fetchData() // Recarrega para verificar se ainda faltam documentos
        } catch (error) {
            console.error('Erro no upload:', error)
            alert('Falha ao enviar arquivo. Tente novamente.')
        }
    }

    if (missingDocs) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem' }}>
                <div className="card text-center" style={{ padding: '3rem 2rem', border: '2px solid #FDE68A', backgroundColor: '#FFFBEB' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#92400E' }}>Falta pouco para acessar suas aulas!</h2>
                    <p style={{ color: '#B45309', marginBottom: '2rem', fontSize: '1.1rem' }}>
                        Por exigência da certificação Abendi, precisamos que você faça o upload dos seus documentos básicos antes de liberar o acesso à plataforma.
                    </p>
                    
                    <div style={{ display: 'grid', gap: '1.5rem', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
                        {['photo', 'id', 'cpf', 'address', 'education'].map((docType) => {
                            const labels = { 
                                photo: 'Foto de Rosto (Você pode tirar uma selfie agora)', 
                                id: 'Documento de Identidade (RG/CNH)', 
                                cpf: 'CPF',
                                address: 'Comprovante de Residência atualizado',
                                education: 'Comprovante de Escolaridade (Diploma/Histórico)'
                            }
                            
                            const isPhoto = docType === 'photo'

                            return (
                                <div key={docType} style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                                    <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{labels[docType]}</p>
                                    <label className="btn btn-primary" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
                                        {isPhoto ? 'Tirar Selfie / Enviar Foto' : 'Selecionar e Enviar Arquivo'}
                                        <input 
                                            type="file" 
                                            hidden 
                                            accept={isPhoto ? "image/*" : ".pdf,image/*"} 
                                            capture={isPhoto ? "user" : undefined}
                                            onChange={(e) => handleFileUpload(e, docType)} 
                                        />
                                    </label>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--primary)' }}>Boa noite, Aluno(a)! 👋</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* LISTA DE CURSOS ONLINE */}
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={20} className="text-primary" /> Meus Cursos Online
                    </h3>

                    {loading ? (
                        <p>Carregando seus cursos...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {myCourses.map(course => (
                                <div key={course.id} className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <div style={{ width: '120px', height: '80px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PlayCircle size={40} className="text-primary" style={{ opacity: 0.3 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{course.title}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: '0%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>0%</span>
                                        </div>
                                    </div>
                                    <button className="btn btn-primary" onClick={() => handleStartCourse(course.id)}>Continuar Aula</button>
                                </div>
                            ))}
                            {myCourses.length === 0 && (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p className="text-secondary">Você ainda não está matriculado em nenhum curso online.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* CALENDÁRIO PRÁTICO (PRESENCIAL) */}
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} className="text-warning" /> Aulas Práticas (Presencial)
                    </h3>
                    <div className="card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }}>
                        <p style={{ fontSize: '0.875rem', color: '#92400E', marginBottom: '1rem', fontWeight: 500 }}>
                            Fique atento às datas dos seus treinamentos presenciais para certificação Abendi:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {upcomingPractical.map((p, i) => (
                                <div key={i} style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.course_name}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', color: '#B45309', fontWeight: 600, fontSize: '0.8rem' }}>
                                        <Clock size={14} /> {new Date(p.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                            ))}
                            {upcomingPractical.length === 0 && (
                                <p style={{ fontSize: '0.875rem', color: '#B45309', textAlign: 'center' }}>Sem datas previstas no momento.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* HISTÓRICO DE NOTAS E DESEMPENHO */}
            <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} className="text-success" /> Meu Desempenho e Notas
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* NOTAS EAD */}
                    <div className="card">
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provas Online (EAD)</h4>
                        {quizResults.length === 0 ? (
                            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Nenhum teste concluído ainda.</p>
                        ) : (
                            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                                        <th style={{ padding: '0.5rem 0' }}>Teste/Módulo</th>
                                        <th style={{ padding: '0.5rem 0' }}>Tentativas</th>
                                        <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Maior Nota</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quizResults.map(r => (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '0.75rem 0' }}>
                                                <div style={{ fontWeight: 600 }}>{r.lms_quizzes?.title}</div>
                                                <div style={{ fontSize: '0.7rem', color: r.lms_quizzes?.quiz_type === 'final_exam' ? '#7c3aed' : '#059669' }}>
                                                    {r.lms_quizzes?.quiz_type === 'final_exam' ? '🏆 PROVA FINAL' : '📝 EXERCÍCIO'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 0' }}>{r.attempts_count} / 3</td>
                                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: r.score >= 70 ? '#10b981' : '#ef4444' }}>
                                                {r.score}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* NOTAS PRESENCIAIS */}
                    <div className="card">
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avaliações Presenciais</h4>
                        {technicalEvals.length === 0 ? (
                            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Nenhuma nota presencial lançada pelo instrutor.</p>
                        ) : (
                            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                                        <th style={{ padding: '0.5rem 0' }}>Data</th>
                                        <th style={{ padding: '0.5rem 0' }}>Tipo</th>
                                        <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Nota</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {technicalEvals.map(e => (
                                        <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '0.75rem 0' }}>{new Date(e.date).toLocaleDateString()}</td>
                                            <td style={{ padding: '0.75rem 0' }}>
                                                <div style={{ fontWeight: 600 }}>{e.exam_type}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{e.classes?.name}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: e.grade >= 7 ? '#10b981' : '#ef4444' }}>
                                                {e.grade}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
