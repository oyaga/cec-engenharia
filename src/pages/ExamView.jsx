import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, XCircle, AlertCircle, RefreshCcw, Clock } from 'lucide-react'

export default function ExamView() {
    const { quizId } = useParams()
    const navigate = useNavigate()
    const { session } = useAuth()
    
    const [quiz, setQuiz] = useState(null)
    const [questions, setQuestions] = useState([])
    const [answers, setAnswers] = useState({}) // { questionId: optionIndex }
    const [status, setStatus] = useState('intro') // intro | active | result | blocked
    const [score, setScore] = useState(0)
    const [attemptsCount, setAttemptsCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState(null) // em segundos
    const [showTimeWarning, setShowTimeWarning] = useState(false)

    // ANTI-FRAUDE: Bloqueios
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault()
        document.addEventListener('contextmenu', preventDefault)
        document.addEventListener('copy', preventDefault)
        document.addEventListener('paste', preventDefault)
        return () => {
            document.removeEventListener('contextmenu', preventDefault)
            document.removeEventListener('copy', preventDefault)
            document.removeEventListener('paste', preventDefault)
        }
    }, [])

    useEffect(() => {
        fetchQuizData()
    }, [quizId])

    const fetchQuizData = async () => {
        setLoading(true)
        const { data: quizData } = await supabase.from('lms_quizzes').select('*').eq('id', quizId).single()
        const { data: questionsData } = await supabase.from('lms_questions').select('*').eq('quiz_id', quizId)
        
        if (quizData) {
            setQuiz(quizData)
            setQuestions(questionsData || [])
            
            // Checar tentativas existentes
            const { data: results } = await supabase
                .from('lms_quiz_results')
                .select('*')
                .eq('quiz_id', quizId)
                .eq('student_id', session.user.id)
                .maybeSingle()
            
            if (results) {
                setAttemptsCount(results.attempts_count)
                setScore(results.score || 0) // Carregar score anterior
                if (results.is_approved) setStatus('result')
                else if (results.attempts_count >= quizData.max_attempts) setStatus('blocked')
            }
        }
        setLoading(false)
    }

    const handleStartExam = () => {
        if (attemptsCount >= (quiz?.max_attempts || 3)) {
            setStatus('blocked')
            return
        }
        
        if (quiz?.time_limit_minutes > 0) {
            setTimeLeft(quiz.time_limit_minutes * 60)
        }
        
        setStatus('active')
        setAnswers({})
    }

    const handleSubmit = async () => {
        // Impedir cliques duplos se já estiver enviando
        if (status === 'result') return

        try {
            let correctCount = 0
            const feedbackMap = {}

            questions.forEach(q => {
                const isCorrect = answers[q.id] === q.correct_option_index
                if (isCorrect) correctCount++
                feedbackMap[q.id] = {
                    is_correct: isCorrect,
                    user_answer: answers[q.id],
                    correct_answer: q.correct_option_index
                }
            })
            
            const finalScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
            
            // Regra de Melhor Nota: Mantém a maior entre a atual e a anterior
            const bestScore = Math.max(finalScore, score)
            const approved = bestScore >= (quiz?.passing_grade || 70)
            const newAttempts = attemptsCount + 1

            const { error: upsertError } = await supabase.from('lms_quiz_results').upsert({
                student_id: session.user.id,
                quiz_id: quizId,
                score: bestScore,
                attempts_count: newAttempts,
                is_approved: approved
            }, { onConflict: ['student_id', 'quiz_id'] })

            if (upsertError) throw upsertError

            setScore(finalScore)
            setAttemptsCount(newAttempts)
            setStatus('result')
            setTimeLeft(null)
        } catch (error) {
            console.error('Erro ao enviar prova:', error)
            alert('Lamentamos o erro ao enviar suas respostas. Por favor, verifique sua conexão e tente novamente. Detalhe: ' + error.message)
        }
    }

    // Cronômetro e Heartbeat de Estudo
    useEffect(() => {
        let timer = null
        let heartbeatCount = 0
        
        if (status === 'active') {
            timer = setInterval(() => {
                // Lógica de Tempo Restante
                if (timeLeft !== null) {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            clearInterval(timer)
                            handleSubmit() // Envio automático
                            return 0
                        }
                        
                        // Alerta de 10%
                        const totalSec = quiz.time_limit_minutes * 60
                        if (prev <= totalSec * 0.1 && !showTimeWarning) {
                            setShowTimeWarning(true)
                        }
                        
                        return prev - 1
                    })
                }

                // Heartbeat para Carga Horária (lms_time_logs) - a cada 30 segundos
                heartbeatCount++
                if (heartbeatCount >= 30) {
                    logStudyTime(30)
                    heartbeatCount = 0
                }
            }, 1000)
        }
        
        return () => {
            clearInterval(timer)
            if (heartbeatCount > 5) logStudyTime(heartbeatCount)
        }
    }, [status, timeLeft])

    const logStudyTime = async (seconds) => {
        if (!session?.user?.id || !quizId) return
        try {
            await supabase.from('lms_time_logs').insert([{
                student_id: session.user.id,
                course_id: quiz.course_id,
                quiz_id: quizId,
                duration_seconds: seconds
            }])
        } catch (e) {
            console.error("Erro ao registrar heartbeat em prova:", e)
        }
    }

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando exame...</div>
    if (!quiz) return <div style={{ padding: '2rem', textAlign: 'center' }}>Exame não encontrado.</div>

    return (
        <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>
            {status === 'intro' && (
                <div className="card text-center" style={{ padding: '3rem' }}>
                    <AlertCircle size={48} className="text-warning" style={{ margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {quiz.quiz_type === 'final_exam' ? '🏆 Prova Final:' : '📝 Exercício:'} {quiz.title}
                    </h2>
                    <p className="text-secondary" style={{ marginTop: '1rem' }}>
                        {quiz.quiz_type === 'final_exam' 
                            ? 'Esta é a avaliação final do curso. ' 
                            : 'Este exercício ajudará a fixar o conteúdo do módulo. '}
                        Para aprovação, você precisa de no mínimo <strong>{quiz.passing_grade}%</strong> de acerto.
                        <br />Você tem <strong>{quiz.max_attempts - attemptsCount}</strong> tentativas restantes.
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={handleStartExam}>
                        Iniciar Prova
                    </button>
                </div>
            )}

            {status === 'active' && (
                <div className="animate-fade-in">
                    <div style={{ position: 'sticky', top: '1rem', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginBottom: '2rem', border: showTimeWarning ? '2px solid #ef4444' : '1px solid #e2e8f0' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{quiz.title}</h2>
                        {timeLeft !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: showTimeWarning ? '#ef4444' : 'inherit', fontWeight: 700 }}>
                                <Clock size={20} className={showTimeWarning ? 'animate-pulse' : ''} />
                                <span style={{ fontSize: '1.25rem' }}>{formatTime(timeLeft)}</span>
                            </div>
                        )}
                    </div>
                    
                    {showTimeWarning && (
                        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={16} /> Atenção! Restam menos de 10% do tempo.
                        </div>
                    )}
                    {questions.map((q, idx) => (
                        <div key={q.id} className="card" style={{ marginBottom: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.75rem' }}>{idx + 1}. {q.question_text}</p>
                                {q.image_url && (
                                    <img src={q.image_url} alt="Ilustração da questão" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }} />
                                )}
                            </div>
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: q.options.length > 3 ? '1fr 1fr' : '1fr', 
                                gap: '1rem' 
                            }}>
                                {q.options.map((option, oidx) => {
                                    const hasImage = typeof option === 'object' && option.image_url;
                                    const optText = typeof option === 'object' ? option.text : option;
                                    
                                    return (
                                        <label key={oidx} style={{ 
                                            display: 'flex', 
                                            flexDirection: hasImage ? 'column' : 'row',
                                            alignItems: hasImage ? 'flex-start' : 'center', 
                                            gap: '0.75rem', 
                                            padding: '1rem', 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            backgroundColor: answers[q.id] === oidx ? 'var(--primary-light)' : 'white',
                                            borderColor: answers[q.id] === oidx ? 'var(--primary)' : '#e2e8f0',
                                            boxShadow: answers[q.id] === oidx ? '0 0 0 2px var(--primary-alpha)' : 'none'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                                <input 
                                                    type="radio" 
                                                    name={`q-${q.id}`} 
                                                    checked={answers[q.id] === oidx}
                                                    onChange={() => setAnswers({...answers, [q.id]: oidx})}
                                                    style={{ width: '1.25rem', height: '1.25rem' }}
                                                />
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{optText}</span>
                                            </div>
                                            {hasImage && (
                                                <img src={option.image_url} alt={`Opção ${oidx}`} style={{ width: '100%', height: '120px', objectFit: 'contain', borderRadius: '4px', marginTop: '0.5rem', backgroundColor: '#f8fafc' }} />
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                        <button 
                            className="btn btn-primary" 
                            disabled={Object.keys(answers).length < questions.length}
                            onClick={handleSubmit}
                        >
                            Finalizar e Enviar
                        </button>
                    </div>
                </div>
            )}

            {status === 'result' && (
                <div className="animate-fade-in">
                    <div className="card text-center" style={{ padding: '3rem', marginBottom: '2rem' }}>
                        {score >= quiz.passing_grade ? (
                            <>
                                <CheckCircle size={64} style={{ color: '#10b981', margin: '0 auto 1.5rem' }} />
                                <h2 style={{ color: '#065f46' }}>Parabéns! Você foi aprovado!</h2>
                            </>
                        ) : (
                            <>
                                <XCircle size={64} style={{ color: '#ef4444', margin: '0 auto 1.5rem' }} />
                                <h2 style={{ color: '#991b1b' }}>
                                    {quiz.quiz_type === 'final_exam' ? 'Não aprovado na prova final.' : 'Exercício não superado.'}
                                </h2>
                            </>
                        )}
                        <div style={{ margin: '2rem 0', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                            <p style={{ fontSize: '1rem', color: '#64748b' }}>Sua nota nesta tentativa:</p>
                            <p style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{score}%</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            {score < quiz.passing_grade && attemptsCount < quiz.max_attempts && (
                                <button className="btn btn-secondary" onClick={handleStartExam}>
                                    <RefreshCcw size={16} /> Tentar Novamente
                                </button>
                            )}
                            <button className="btn btn-primary" onClick={() => navigate('/meus-cursos')}>
                                Voltar para Meus Cursos
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={20} color="var(--primary)" /> Conferência de Gabarito
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {questions.map((q, idx) => {
                                const isCorrect = answers[q.id] === q.correct_option_index
                                return (
                                    <div key={q.id} style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: isCorrect ? '#f0fdf4' : '#fff1f2' }}>
                                        <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{idx + 1}. {q.question_text}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {q.options.map((opt, oidx) => {
                                                const optText = typeof opt === 'object' ? opt.text : opt
                                                const isSelected = answers[q.id] === oidx
                                                const isCorrectOpt = q.correct_option_index === oidx
                                                
                                                let bgColor = 'transparent'
                                                let borderColor = '#e2e8f0'
                                                if (isCorrectOpt) {
                                                    bgColor = '#dcfce7'
                                                    borderColor = '#22c55e'
                                                } else if (isSelected && !isCorrect) {
                                                    bgColor = '#fee2e2'
                                                    borderColor = '#ef4444'
                                                }

                                                return (
                                                    <div key={oidx} style={{ 
                                                        padding: '0.75rem 1rem', 
                                                        borderRadius: '8px', 
                                                        border: `1px solid ${borderColor}`,
                                                        backgroundColor: bgColor,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        <div style={{ width: '1.25rem' }}>
                                                            {isCorrectOpt ? <CheckCircle size={16} color="#22c55e" /> : isSelected ? <XCircle size={16} color="#ef4444" /> : null}
                                                        </div>
                                                        <span style={{ fontWeight: (isSelected || isCorrectOpt) ? 600 : 400 }}>{optText}</span>
                                                        {isCorrectOpt && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>RESPOSTA CORRETA</span>}
                                                        {isSelected && !isCorrect && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#991b1b', fontWeight: 700 }}>SUA ESCOLHA ANTERIOR</span>}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {status === 'blocked' && (
                <div className="card text-center" style={{ padding: '3rem', border: '1px solid #fee2e2', backgroundColor: '#fef2f2' }}>
                    <XCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1.5rem' }} />
                    <h2 style={{ color: '#991b1b' }}>Acesso Bloqueado</h2>
                    <p style={{ marginTop: '1rem', color: '#b91c1c' }}>
                        Você atingiu o limite máximo de <strong>{quiz.max_attempts} tentativas</strong> sem atingir a média necessária.
                        <br />Por favor, entre em contato com o coordenador para solicitar uma nova chance.
                    </p>
                    <button className="btn btn-secondary" style={{ marginTop: '2rem' }} onClick={() => navigate('/meus-cursos')}>
                        Voltar
                    </button>
                </div>
            )}
        </div>
    )
}
