import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  MapPin, 
  ExternalLink,
  MessageCircle,
  Award,
  Video,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AreaAluno() {
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [upcomingPractical, setUpcomingPractical] = useState(null);
  const [hasConfirmedAttendance, setHasConfirmedAttendance] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [technicalEvals, setTechnicalEvals] = useState([]);
  const [missingDocs, setMissingDocs] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Olá');
  const { session } = useAuth();

  // Função para definir saudação dinâmica com base na hora
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Bom dia');
    else if (hr < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  const handleStartCourse = async (courseId) => {
    // Buscar primeira aula ou última aula acessada do curso para continuar de onde parou
    const { data: lessons } = await supabase
      .from('lms_lessons')
      .select('id, module_id, lms_modules(course_id)')
      .order('order_index', { ascending: true });

    // Filtrar aulas deste curso
    const courseLessons = lessons?.filter(l => l.lms_modules?.course_id === courseId) || [];
    
    if (courseLessons.length > 0) {
      // Tentar ver se o aluno já tem algum progresso em andamento
      const { data: progress } = await supabase
        .from('lms_student_progress')
        .select('lesson_id, last_accessed')
        .eq('student_id', session.user.id)
        .order('last_accessed', { ascending: false });

      // Encontrar a última aula acessada que pertence a este curso
      const lastAccessed = progress?.find(p => courseLessons.some(l => l.id === p.lesson_id));

      if (lastAccessed) {
        navigate(`/curso/${courseId}/aula/${lastAccessed.lesson_id}`);
      } else {
        // Se for a primeira vez, vai para a primeira aula
        navigate(`/curso/${courseId}/aula/${courseLessons[0].id}`);
      }
    } else {
      alert('Este curso ainda não possui aulas cadastradas no portal.');
    }
  };

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
  };

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      // 1. Buscar cadastro do estudante e documentos do aluno pelo user_id
      const { data: studentsData, error: stError } = await supabase
        .from('students')
        .select(`
          id,
          turma_id,
          doc_photo_url,
          doc_id_url,
          doc_cpf_url,
          doc_address_url,
          doc_education_url,
          has_lms_access
        `)
        .eq('user_id', session.user.id)
        .maybeSingle();

      let activeStudentId = null;
      let activeTurmaId = null;

      if (!stError && studentsData) {
        activeStudentId = studentsData.id;
        activeTurmaId = studentsData.turma_id;
        setStudentId(studentsData.id);
        
        // Verificar se há documentos pendentes
        const hasMissing = !studentsData.doc_photo_url || 
                           !studentsData.doc_id_url || 
                           !studentsData.doc_cpf_url || 
                           !studentsData.doc_address_url || 
                           !studentsData.doc_education_url;
        setMissingDocs(hasMissing);
      }

      // 2. Buscar Cursos matriculados e Progresso Real
      // Para calcular progresso real, precisamos:
      // a) Total de aulas cadastrado por curso
      // b) Total de aulas marcadas como concluídas pelo aluno
      const { data: lessonsData } = await supabase
        .from('lms_lessons')
        .select('id, module_id, lms_modules(course_id)');

      const { data: progressData } = await supabase
        .from('lms_student_progress')
        .select('lesson_id, is_completed')
        .eq('student_id', session.user.id)
        .eq('is_completed', true);

      // Buscar matrículas para extrair os cursos ativados
      const { data: studentEnrollments } = await supabase
        .from('students')
        .select('has_lms_access, classes(lms_course_id)')
        .eq('user_id', session.user.id);

      const courseIds = studentEnrollments
        ?.filter(e => e.has_lms_access)
        .map(e => e.classes?.lms_course_id)
        .filter(Boolean) || [];

      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from('lms_courses')
          .select('*')
          .in('id', courseIds)
          .eq('is_published', true);

        if (courses) {
          // Processar progresso real para cada curso
          const coursesWithProgress = courses.map(course => {
            const courseLessons = lessonsData?.filter(l => l.lms_modules?.course_id === course.id) || [];
            const courseCompleted = courseLessons.filter(l => 
              progressData?.some(p => p.lesson_id === l.id)
            ).length;

            const percentage = courseLessons.length > 0 
              ? Math.round((courseCompleted / courseLessons.length) * 100) 
              : 0;

            return {
              ...course,
              progress_percent: percentage
            };
          });
          setMyCourses(coursesWithProgress);
        }
      }

      // 3. Buscar Turma e Aula Prática Presencial de Final de Semana (upcoming_classes)
      if (activeTurmaId) {
        const { data: turmaData } = await supabase
          .from('upcoming_classes')
          .select('*, lms_courses(title)')
          .eq('id', activeTurmaId)
          .maybeSingle();

        if (turmaData) {
          setUpcomingPractical(turmaData);

          // Verificar se o aluno já confirmou presença para esta turma
          if (activeStudentId) {
            const { data: attendanceCheck } = await supabase
              .from('attendance_records')
              .select('id')
              .eq('student_id', activeStudentId)
              .eq('class_id', activeTurmaId)
              .maybeSingle();
            
            setHasConfirmedAttendance(!!attendanceCheck);
          }
        }
      }

      // 4. Buscar Notas de Avaliações Técnicas (Presenciais)
      if (activeStudentId) {
        const { data: evals } = await supabase
          .from('student_evaluations')
          .select('*, classes(name, course_name)')
          .eq('student_id', activeStudentId)
          .order('date', { ascending: false });
        
        if (evals) setTechnicalEvals(evals);
      }

      // 5. Buscar Notas dos Quizzes EAD realizados
      const { data: qResults } = await supabase
        .from('lms_quiz_results')
        .select('*, lms_quizzes(title, quiz_type)')
        .eq('student_id', session.user.id)
        .order('updated_at', { ascending: false });
      
      if (qResults) setQuizResults(qResults);

    } catch (err) {
      console.error('Erro ao carregar dados do aluno:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file || !studentId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${docType}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${studentId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student_documents')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('students')
        .update({ [`doc_${docType}_url`]: publicUrl })
        .eq('id', studentId);

      if (updateError) throw updateError;

      alert(`Documento (${docType.toUpperCase()}) enviado com sucesso!`);
      fetchData(); // Recarrega dados para conferência
    } catch (error) {
      console.error('Erro no upload de documento:', error);
      alert('Falha ao enviar arquivo. Por favor, tente novamente.');
    }
  };

  // Se houver documentos pendentes por exigência Abendi, exibe bloqueio amigável
  if (missingDocs) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="card text-center" style={{ padding: '3.5rem 2rem', border: '2px solid #FCD34D', backgroundColor: '#FFFBEB', borderRadius: '24px' }}>
          <AlertCircle size={48} color="#b45309" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', color: '#92400E' }}>Falta pouco para acessar suas aulas!</h2>
          <p style={{ color: '#B45309', marginBottom: '2.5rem', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            Por exigência da certificação nacional **Abendi**, precisamos que você conclua o envio dos seus documentos obrigatórios antes de liberar o acesso completo à plataforma LMS.
          </p>
          
          <div style={{ display: 'grid', gap: '1.25rem', textAlign: 'left', maxWidth: '550px', margin: '0 auto' }}>
            {[
              { type: 'photo', label: 'Foto de Rosto (Você pode tirar uma selfie agora)' },
              { type: 'id', label: 'Documento de Identidade com Foto (RG ou CNH)' },
              { type: 'cpf', label: 'CPF' },
              { type: 'address', label: 'Comprovante de Residência atualizado' },
              { type: 'education', label: 'Comprovante de Escolaridade (Diploma ou Histórico)' }
            ].map((doc) => (
              <div key={doc.type} style={{ padding: '1.25rem', backgroundColor: 'white', borderRadius: '14px', border: '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary-dark)', flex: 1 }}>{doc.label}</span>
                <label className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', cursor: 'pointer', margin: 0, borderRadius: '8px' }}>
                  {doc.type === 'photo' ? 'Tirar Selfie / Enviar' : 'Selecionar Arquivo'}
                  <input 
                    type="file" 
                    hidden 
                    accept={doc.type === 'photo' ? "image/*" : ".pdf,image/*"} 
                    capture={doc.type === 'photo' ? "user" : undefined}
                    onChange={(e) => handleFileUpload(e, doc.type)} 
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '2.5rem', color: 'var(--primary)' }}>
        {greeting}, Aluno(a)! 👋
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* COLUNA ESQUERDA: LISTAGEM DE CURSOS */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-dark)' }}>
            <BookOpen size={22} color="var(--primary)" /> Meus Cursos Online
          </h3>

          {loading ? (
            <p className="text-muted">Carregando seus cursos...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {myCourses.map(course => {
                const isEad = course.modality === 'online';
                const isPres = course.modality === 'presencial';
                const isHib = course.modality === 'hibrido' || !course.modality;
                
                return (
                  <div key={course.id} className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '1.5rem' }}>
                    <div style={{ width: '100px', height: '70px', backgroundColor: 'rgba(0, 75, 73, 0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PlayCircle size={36} color="var(--primary)" style={{ opacity: 0.7 }} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary-dark)', margin: 0 }}>{course.title}</h4>
                        
                        {/* Badges de Modalidade */}
                        {isEad && (
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Video size={10} /> Online
                          </span>
                        )}
                        {isPres && (
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={10} /> Presencial
                          </span>
                        )}
                        {isHib && (
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Award size={10} /> Híbrido
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                        <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${course.progress_percent || 0}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.4s ease' }}></div>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)' }}>{course.progress_percent || 0}%</span>
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleStartCourse(course.id)}
                      style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontWeight: '700' }}
                    >
                      Continuar Aula
                    </button>
                  </div>
                );
              })}
              {myCourses.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <p className="text-secondary" style={{ fontSize: '1rem', margin: 0 }}>Você não possui matrículas de cursos online ativas no momento.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: CALENDÁRIO PRÁTICO (PRESENCIALCARD) */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-dark)' }}>
            <Calendar size={22} className="text-warning" /> Aula Prática (Presencial)
          </h3>
          
          {upcomingPractical ? (
            <div className="card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FCD34D', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: '#F59E0B' }}></div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B45309', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                <MapPin size={15} />
                <span>Aula Prática — Final de Semana</span>
              </div>
              
              <h4 style={{ color: 'var(--primary-dark)', fontSize: '0.98rem', fontWeight: '800', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                {upcomingPractical.lms_courses?.title || 'Treinamento Técnico'}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#B45309' }}>
                  <Calendar size={14} />
                  <span>
                    {new Date(upcomingPractical.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} className="text-muted" />
                  <span>{upcomingPractical.start_time?.substring(0, 5) || '08:00'} às {upcomingPractical.end_time?.substring(0, 5) || '17:00'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'start', gap: '0.4rem' }}>
                  <MapPin size={14} className="text-muted" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{upcomingPractical.address || 'Sede C&C Engenharia'}</span>
                </div>
                
                {upcomingPractical.instructor_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={14} className="text-muted" />
                    <span>Instrutor: <strong>{upcomingPractical.instructor_name}</strong></span>
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Vagas: <strong>{(upcomingPractical.capacity || 20) - (upcomingPractical.enrolled_count || 0)} de {upcomingPractical.capacity || 20} disponíveis</strong>
                  </span>
                </div>
              </div>

              {/* Botões de Ação do PresencialCard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #FCD34D', paddingTop: '1rem' }}>
                {hasConfirmedAttendance ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem', background: '#D1FAE5', color: '#065F46', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', width: '100%', border: '1px solid #A7F3D0' }}>
                    <CheckCircle size={16} /> Presença Confirmada
                  </div>
                ) : (
                  <button 
                    onClick={handleConfirmAttendance}
                    className="btn"
                    style={{ 
                      width: '100%', 
                      padding: '0.65rem', 
                      backgroundColor: '#10b981', 
                      color: 'white', 
                      fontWeight: '800', 
                      fontSize: '0.82rem', 
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.2s'
                    }}
                  >
                    ✓ Confirmar Presença
                  </button>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcomingPractical.address || 'Sede C&C Engenharia')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn"
                    style={{ 
                      padding: '0.5rem', 
                      background: 'white', 
                      border: '1px solid #e2e8f0', 
                      color: 'var(--text-main)', 
                      fontWeight: '700', 
                      fontSize: '0.78rem', 
                      borderRadius: '8px',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <MapPin size={12} /> Ver no Maps
                  </a>
                  
                  {upcomingPractical.whatsapp_group_url ? (
                    <a 
                      href={upcomingPractical.whatsapp_group_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ 
                        padding: '0.5rem', 
                        background: '#075E54', 
                        color: 'white', 
                        border: 'none',
                        fontWeight: '700', 
                        fontSize: '0.78rem', 
                        borderRadius: '8px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <MessageCircle size={12} /> Grupo da Turma
                    </a>
                  ) : (
                    <button
                      disabled
                      style={{ 
                        padding: '0.5rem', 
                        background: '#f1f5f9', 
                        color: '#94a3b8', 
                        border: '1px solid #e2e8f0',
                        fontWeight: '700', 
                        fontSize: '0.78rem', 
                        borderRadius: '8px',
                        cursor: 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      Sem WhatsApp
                    </button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: '600', marginTop: '1rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} />
                <span>Nota: Traga seus EPIs e documentos necessários para a aula prática.</span>
              </div>
            </div>
          ) : (
            <div className="card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', padding: '2rem 1.5rem', textAlign: 'center' }}>
              <Clock size={32} color="#B45309" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem', color: '#B45309', margin: 0, fontWeight: '600' }}>Nenhuma aula prática presencial prevista no momento.</p>
            </div>
          )}
        </div>

      </div>

      {/* HISTÓRICO DE DESEMPENHO */}
      <div style={{ marginTop: '3.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-dark)' }}>
          <CheckCircle size={22} className="text-success" /> Meu Desempenho e Notas
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* NOTAS EAD */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provas Online (EAD)</h4>
            {quizResults.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Nenhum teste concluído ainda.</p>
            ) : (
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.5rem 0' }}>Teste / Módulo</th>
                    <th style={{ padding: '0.5rem 0' }}>Tentativas</th>
                    <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Maior Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {quizResults.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0' }}>
                        <div style={{ fontWeight: '700', color: 'var(--primary-dark)' }}>{r.lms_quizzes?.title}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: '800', color: r.lms_quizzes?.quiz_type === 'final_exam' ? '#7c3aed' : '#059669', marginTop: '2px' }}>
                          {r.lms_quizzes?.quiz_type === 'final_exam' ? '🏆 PROVA FINAL' : '📝 EXERCÍCIO'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-muted)' }}>{r.attempts_count} / 3</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '800', color: r.score >= 70 ? '#10b981' : '#ef4444' }}>
                        {r.score}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* NOTAS PRESENCIAIS */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avaliações Presenciais</h4>
            {technicalEvals.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Nenhuma nota presencial lançada pelo instrutor no momento.</p>
            ) : (
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.5rem 0' }}>Data</th>
                    <th style={{ padding: '0.5rem 0' }}>Exame Prático</th>
                    <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Média Final</th>
                  </tr>
                </thead>
                <tbody>
                  {technicalEvals.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-muted)' }}>{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '0.75rem 0' }}>
                        <div style={{ fontWeight: '700', color: 'var(--primary-dark)' }}>{e.exam_type}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{e.classes?.name}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '800', color: e.grade >= 7 ? '#10b981' : '#ef4444' }}>
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
  );
}
