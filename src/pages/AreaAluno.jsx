import { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  MessageSquare,
  DollarSign,
  FileText,
  Users,
  Search,
  Send,
  Lock,
  Unlock,
  FileCheck,
  ChevronRight,
  Megaphone,
  Download,
  Heart,
  Sparkles,
  Star,
  Phone,
  Zap,
  Pin
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import initialContent from '../data/content.json';
import { generateDocument } from '../lib/pdfGenerator';

export default function AreaAluno() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  // Estados principais
  const [userName, setUserName] = useState('');
  const [studentId, setStudentId] = useState(null);
  const [turmaId, setTurmaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Olá');
  const [missingDocs, setMissingDocs] = useState(false);
  const [studentData, setStudentData] = useState(null);

  // Dados das abas
  const [myCourses, setMyCourses] = useState([]);
  const [upcomingPractical, setUpcomingPractical] = useState(null);
  const [hasConfirmedAttendance, setHasConfirmedAttendance] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [technicalEvals, setTechnicalEvals] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [issuedCertificates, setIssuedCertificates] = useState([]);
  const [financialRecord, setFinancialRecord] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});

  useEffect(() => {
    if (studentData && studentData.id) {
      const loadSignedUrls = async () => {
        const urls = {};
        const docsToSign = [
          { key: 'photo', url: studentData.doc_photo_url },
          { key: 'id', url: studentData.doc_id_url },
          { key: 'cpf', url: studentData.doc_cpf_url },
          { key: 'address', url: studentData.doc_address_url },
          { key: 'education', url: studentData.doc_education_url }
        ];

        for (const doc of docsToSign) {
          if (doc.url) {
            const parts = doc.url.split('/object/public/student_documents/');
            const filePath = parts.length > 1 ? parts[1] : null;
            if (filePath) {
              try {
                const { data, error } = await supabase.storage
                  .from('student_documents')
                  .createSignedUrl(filePath, 900); // 15 minutos
                if (!error && data) {
                  urls[doc.key] = data.signedUrl;
                }
              } catch (e) {
                console.warn('[Segurança] Falha ao assinar URL para o aluno:', e);
              }
            }
          }
        }
        setSignedUrls(urls);
      };
      loadSignedUrls();
    } else {
      setSignedUrls({});
    }
  }, [studentData]);

  // Estados da Vitrine de Cursos (Wishlist)
  const [availableCourses, setAvailableCourses] = useState([]);
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cec_wishlist') || '[]'); } catch { return []; }
  });
  const [vitrineSearch, setVitrineSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Estados do Fórum
  const [forumTopics, setForumTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicReplies, setTopicReplies] = useState([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [newReplyContent, setNewReplyContent] = useState('');
  const [forumSearch, setForumSearch] = useState('');

  // Estados do Chat
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Estados para Agendamento Prático (Fase 20.1)
  const [availablePracticalClasses, setAvailablePracticalClasses] = useState([]);
  const [schedulingActionLoading, setSchedulingActionLoading] = useState(null);

  // Estados para Modal de Selfie / Captura de Câmera
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [selfieStream, setSelfieStream] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Efeito para a saudação baseada no horário
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Bom dia');
    else if (hr < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  // Rolar mensagens de chat para o final automaticamente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedInstructor]);

  // Carregamento geral de dados do Supabase
  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      // 1. Buscar Perfil do Usuário
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
      
      const fullName = profile?.full_name || session.user.email.split('@')[0];
      setUserName(fullName);

      // 2. Buscar Cadastro do Aluno
      const { data: student, error: stError } = await supabase
        .from('students')
        .select('*, classes:classes!turma_id(name, course_name), practical_class:classes!practical_class_id(name, course_name, start_date, address)')
        .eq('user_id', session.user.id)
        .maybeSingle();

      let activeStudentId = null;
      let activeTurmaId = null;

      if (!stError && student) {
        activeStudentId = student.id;
        activeTurmaId = student.turma_id;
        setStudentId(student.id);
        setTurmaId(student.turma_id);
        setStudentData(student);
        
        // Verificar pendência Abendi
        const hasMissing = !student.doc_photo_url || 
                           !student.doc_id_url || 
                           !student.doc_cpf_url || 
                           !student.doc_address_url || 
                           !student.doc_education_url;
        setMissingDocs(hasMissing);
      }

      // 3. Buscar Cursos e calcular progresso real
      const { data: lessonsData } = await supabase
        .from('lms_lessons')
        .select('id, module_id, lms_modules(course_id)');

      const { data: progressData } = await supabase
        .from('lms_student_progress')
        .select('lesson_id, is_completed')
        .eq('student_id', session.user.id)
        .eq('is_completed', true);

      const { data: enrollments } = await supabase
        .from('students')
        .select('has_lms_access, classes(lms_course_id)')
        .eq('user_id', session.user.id);

      const courseIds = enrollments
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

      // 4. Buscar Próxima Aula Prática Presencial
      if (activeTurmaId) {
        const { data: upcoming } = await supabase
          .from('upcoming_classes')
          .select('*, lms_courses(title)')
          .eq('id', activeTurmaId)
          .maybeSingle();

        if (upcoming) {
          setUpcomingPractical(upcoming);

          // Verificar confirmação de presença do aluno
          if (activeStudentId) {
            const { data: attendanceCheck } = await supabase
              .from('attendance_records')
              .select('id')
              .eq('student_id', activeStudentId)
              .eq('class_id', activeTurmaId)
              .eq('status', 'presente')
              .maybeSingle();
            
            setHasConfirmedAttendance(!!attendanceCheck);
          }
        }
      }

      // 5. Histórico de Chamadas e Frequência Presencial
      if (activeStudentId && activeTurmaId) {
        const { data: attData } = await supabase
          .from('attendance_records')
          .select('*, classes(name)')
          .eq('student_id', activeStudentId)
          .order('created_at', { ascending: false });

        setAttendanceHistory(attData || []);
      }

      // 6. Buscar Notas de Provas Online (Quizzes) e Presenciais
      const { data: qResults } = await supabase
        .from('lms_quiz_results')
        .select('*, lms_quizzes(title, quiz_type)')
        .eq('student_id', session.user.id)
        .order('updated_at', { ascending: false });
      if (qResults) setQuizResults(qResults);

      if (activeStudentId) {
        const { data: evals } = await supabase
          .from('student_evaluations')
          .select('*, classes(name, course_name)')
          .eq('student_id', activeStudentId)
          .order('date', { ascending: false });
        if (evals) setTechnicalEvals(evals);
      }

      // 7. Mural de Comunicados Reativo
      const { data: annData } = await supabase
        .from('announcements')
        .select('*, author:users!created_by(full_name)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (annData) {
        const activeAnn = annData.filter(a => 
          a.target_roles?.includes('aluno') && 
          (!a.expires_at || new Date(a.expires_at) >= new Date())
        );
        setAnnouncements(activeAnn);
      }

      // 8. Buscar Certificados Emitidos
      if (activeStudentId) {
        const { data: certs } = await supabase
          .from('lms_issued_certificates')
          .select('*')
          .eq('student_id', activeStudentId);
        
        setIssuedCertificates(certs || []);
        setCertificatesCount(certs?.length || 0);
      }

      // 9. Buscar Financeiro (Receitas / Parcelas)
      if (activeStudentId) {
        const { data: finData } = await supabase
          .from('financial_records')
          .select('*')
          .eq('student_id', activeStudentId)
          .maybeSingle();
        setFinancialRecord(finData);
      }

      // 10. Carregar Fórum e Instrutores para Chat
      loadForum(activeTurmaId);
      loadInstructors(activeTurmaId);
      loadAvailableCourses();

      // 11. Carregar Aulas Práticas de Final de Semana Disponíveis (Fase 20.1)
      if (student) {
        const courseName = student.classes?.course_name;
        if (courseName) {
          const { data: practicals, error: prError } = await supabase
            .from('classes')
            .select(`
              id, name, course_name, start_date, max_capacity, schedule, address,
              practical_students:students!practical_class_id(id, practical_class_status)
            `)
            .eq('schedule', 'Aula prática - Final de semana')
            .eq('course_name', courseName)
            .gte('start_date', new Date().toISOString().split('T')[0])
            .order('start_date', { ascending: true });

          if (!prError && practicals) {
            const mappedPracticals = practicals.map(p => {
              const confirmedCount = p.practical_students?.filter(s => s.practical_class_status === 'confirmado').length || 0;
              const pendingCount = p.practical_students?.filter(s => s.practical_class_status === 'pendente').length || 0;
              return {
                ...p,
                confirmedCount,
                pendingCount,
                availableVacancies: Math.max(0, (p.max_capacity || 10) - confirmedCount)
              };
            });
            setAvailablePracticalClasses(mappedPracticals);
          }
        }
      }

    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session, location.pathname]);

  // Função para carregar fórum (com resiliência no localStorage)
  const loadForum = async (activeTurmaId) => {
    try {
      const { data, error } = await supabase
        .from('lms_forum_topics')
        .select('*, student:users!student_id(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForumTopics(data || []);
    } catch (err) {
      console.warn("Fórum: Usando fallback resiliente do localStorage");
      const localForum = localStorage.getItem('local_forum_topics');
      if (localForum) {
        setForumTopics(JSON.parse(localForum));
      } else {
        const initialMock = [
          { id: 'f-1', title: 'Dúvida sobre o ensaio de Líquido Penetrante', content: 'Quantas demãos de revelador são ideais no ensaio?', student: { full_name: 'Ana Maria Silva' }, created_at: new Date().toISOString() },
          { id: 'f-2', title: 'Diferença entre CD e CL no Ultrassom', content: 'Gostaria de entender melhor a diferença conceitual das ondas.', student: { full_name: 'Bruno Lima' }, created_at: new Date().toISOString() }
        ];
        setForumTopics(initialMock);
        localStorage.setItem('local_forum_topics', JSON.stringify(initialMock));
      }
    }
  };

  // Carregar cursos disponíveis para matrícula (Vitrine integrada ao CMS)
  const loadAvailableCourses = async () => {
    try {
      // 1. Carregar cursos do LMS
      const { data: lmsCourses } = await supabase
        .from('lms_courses')
        .select('id, title, description, thumbnail_url, code, price_card, price_pix, price_boleto, price_financing, max_installments, financing_installments')
        .eq('is_published', true);

      // 2. Carregar CMS do site público (site_content)
      const { data: siteData, error: siteError } = await supabase
        .from('site_content')
        .select('data')
        .eq('id', 'main-content')
        .maybeSingle();

      if (siteError) throw siteError;

      const siteContent = siteData?.data || {};
      const cmsCourses = siteContent.courses_section?.courses || [];
      const courseDetails = siteContent.course_details || {};

      // Se não há cursos no CMS, usa o lms_courses diretamente
      if (cmsCourses.length === 0) {
        const mapped = (lmsCourses || []).map(c => ({
          ...c,
          category: c.code?.toUpperCase().startsWith('NR') ? 'NR' : 'END',
          modality: 'hibrido'
        }));
        setAvailableCourses(mapped);
        return;
      }

      // 3. Fazer o merge inteligente das informações
      const mapped = cmsCourses.map((c, index) => {
        const slug = c.slug || '';
        const details = courseDetails[slug] || {};
        const investment = details.investment || {};

        // Achar o correspondente no LMS para obter o ID real de matrícula
        const lmsMatch = (lmsCourses || []).find(l => 
          l.code?.toLowerCase() === slug.toLowerCase() ||
          slug.toLowerCase().replace(/-/g, '') === l.code?.toLowerCase().replace(/-/g, '') ||
          l.title?.toLowerCase().includes(c.title?.toLowerCase()) ||
          c.title?.toLowerCase().includes(l.title?.toLowerCase())
        );

        // Parsear preço do PIX no CMS
        let pricePix = 0;
        if (investment.pix) {
          const match = investment.pix.match(/R\$\s*([0-9.,]+)/);
          if (match) pricePix = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        if (!pricePix && lmsMatch?.price_pix) {
          pricePix = lmsMatch.price_pix;
        }

        // Parsear preço do Cartão no CMS
        let priceCard = 0;
        if (investment.credit) {
          const match = investment.credit.match(/R\$\s*([0-9.,]+)/);
          if (match) priceCard = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        if (!priceCard && lmsMatch?.price_card) {
          priceCard = lmsMatch.price_card;
        }

        // Parsear parcelas
        let maxInstallments = 10;
        if (investment.credit) {
          const matchInstallments = investment.credit.match(/([0-9]+)\s*x/i);
          if (matchInstallments) maxInstallments = parseInt(matchInstallments[1], 10);
        }
        if (maxInstallments === 10 && lmsMatch?.max_installments) {
          maxInstallments = lmsMatch.max_installments;
        }

        return {
          id: lmsMatch?.id || slug || `cms-${index}`,
          title: c.title || lmsMatch?.title,
          description: c.description || lmsMatch?.description,
          thumbnail_url: c.image || lmsMatch?.thumbnail_url,
          code: lmsMatch?.code || slug?.toUpperCase(),
          price_card: priceCard || 3000,
          price_pix: pricePix || 2500,
          max_installments: maxInstallments,
          modality: (c.type?.toLowerCase().includes('hibrido') || c.type?.toLowerCase().includes('híbrido')) ? 'hibrido' : (c.type?.toLowerCase().includes('presencial') ? 'presencial' : 'hibrido'),
          category: slug.startsWith('nr') ? 'NR' : 'END',
          whatsapp_link: c.whatsapp_link || null
        };
      });

      setAvailableCourses(mapped);
    } catch (err) {
      console.warn('Vitrine: falha ao carregar do CMS, usando dados locais de fallback do content.json');
      
      const cmsCourses = initialContent?.courses_section?.courses || [];
      const courseDetails = initialContent?.course_details || {};
      
      const mapped = cmsCourses.map((c, index) => {
        const details = courseDetails[c.slug] || {};
        const investment = details.investment || {};
        
        let pricePix = 2500;
        let priceCard = 3000;
        let maxInstallments = 10;
        
        if (c.slug === 'cd-cl') { pricePix = 3300; priceCard = 3800; maxInstallments = 10; }
        else if (c.slug === 'cd-et') { pricePix = 4800; priceCard = 5200; maxInstallments = 10; }
        else if (c.slug === 'cd-mc') { pricePix = 4400; priceCard = 4700; maxInstallments = 10; }
        else if (c.slug === 'cd-to') { pricePix = 4400; priceCard = 4700; maxInstallments = 10; }
        else if (c.slug === 'laser-tracker-caldeiraria') { pricePix = 5300; priceCard = 5900; maxInstallments = 10; }
        else if (c.slug === 'retreinamento-teorico-cd-cl') { pricePix = 1550; priceCard = 1800; maxInstallments = 10; }
        else if (c.slug === 'retreinamento-pratico-cd-cl') { pricePix = 2100; priceCard = 2400; maxInstallments = 10; }

        return {
          id: c.slug || `cms-local-${index}`,
          title: c.title,
          description: c.description,
          thumbnail_url: c.image || null,
          code: c.slug?.toUpperCase() || 'END',
          price_card: priceCard,
          price_pix: pricePix,
          max_installments: maxInstallments,
          modality: (c.type?.toLowerCase().includes('hibrido') || c.type?.toLowerCase().includes('híbrido')) ? 'hibrido' : (c.type?.toLowerCase().includes('presencial') ? 'presencial' : 'hibrido'),
          category: c.slug?.toUpperCase().startsWith('NR') ? 'NR' : 'END',
          whatsapp_link: c.whatsapp_link || null
        };
      });
      setAvailableCourses(mapped);
    }
  };

  // Toggle na Wishlist (Salva no localStorage)
  const toggleWishlist = (courseId) => {
    setWishlist(prev => {
      const updated = prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId];
      localStorage.setItem('cec_wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  // Disparo de WhatsApp para Secretaria
  const handleContactSecretaria = (course) => {
    const message = encodeURIComponent(
      `Olá! Me chamo *${userName}* e tenho interesse em me matricular no curso:\n\n` +
      `📚 *${course.title}*\n` +
      `🔖 Código: ${course.code || 'Consultar'}\n` +
      `🏫 Modalidade: ${course.modality?.toUpperCase() || 'HÍBRIDO'}\n\n` +
      `Poderia me passar mais informações sobre valores, turmas disponíveis e datas de início? Obrigado(a)!`
    );
    window.open(`https://wa.me/5521965554180?text=${message}`, '_blank');
  };

  // Redirecionamento para checkout
  const handleMatricular = (course) => {
    navigate(`/matricular-se?course=${encodeURIComponent(course.title)}`);
  };

  // Carregar instrutores da turma do aluno para o Chat
  const loadInstructors = async (activeTurmaId) => {
    try {
      if (activeTurmaId) {
        const { data } = await supabase
          .from('class_instructors')
          .select('*, user:users(id, full_name, email)')
          .eq('class_id', activeTurmaId);

        if (data && data.length > 0) {
          setInstructors(data.map(i => i.user).filter(Boolean));
          return;
        }
      }
      setInstructors([]);
    } catch (err) {
      setInstructors([]);
    }
  };

  // Enviar dúvida no Fórum
  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !newTopicContent.trim() || !session?.user?.id) return;

    const topicPayload = {
      title: newTopicTitle.trim(),
      content: newTopicContent.trim(),
      student_id: session.user.id,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('lms_forum_topics')
        .insert([topicPayload])
        .select('*, student:users!student_id(full_name)');

      if (error) throw error;
      setForumTopics(prev => [data[0], ...prev]);
    } catch (err) {
      // Fallback localstorage
      const newLocalTopic = {
        id: 'f-' + Date.now(),
        title: topicPayload.title,
        content: topicPayload.content,
        student: { full_name: userName },
        created_at: topicPayload.created_at
      };
      const updated = [newLocalTopic, ...forumTopics];
      setForumTopics(updated);
      localStorage.setItem('local_forum_topics', JSON.stringify(updated));
    }

    setNewTopicTitle('');
    setNewTopicContent('');
    alert('Dúvida publicada no fórum com sucesso!');
  };

  // Carregar respostas de um tópico selecionado
  const handleSelectTopic = async (topic) => {
    setSelectedTopic(topic);
    setTopicReplies([]);
    try {
      const { data, error } = await supabase
        .from('lms_forum_replies')
        .select('*, author:users!author_id(full_name, role)')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTopicReplies(data || []);
    } catch (err) {
      // Fallback localstorage para respostas
      const localReplies = localStorage.getItem(`replies_${topic.id}`);
      if (localReplies) {
        setTopicReplies(JSON.parse(localReplies));
      } else {
        const initialReplies = [
          { id: 'r-1', content: 'O ideal é uma demão fina e uniforme a uma distância de 20-30cm.', author: { full_name: 'Prof. Carlos Santos', role: 'instrutor' }, created_at: new Date().toISOString() }
        ];
        setTopicReplies(initialReplies);
        localStorage.setItem(`replies_${topic.id}`, JSON.stringify(initialReplies));
      }
    }
  };

  // Responder no Fórum
  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!newReplyContent.trim() || !selectedTopic || !session?.user?.id) return;

    const replyPayload = {
      topic_id: selectedTopic.id,
      author_id: session.user.id,
      content: newReplyContent.trim(),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('lms_forum_replies')
        .insert([replyPayload])
        .select('*, author:users!author_id(full_name, role)');

      if (error) throw error;
      setTopicReplies(prev => [...prev, data[0]]);
    } catch (err) {
      const newLocalReply = {
        id: 'r-' + Date.now(),
        content: replyPayload.content,
        author: { full_name: userName, role: 'aluno' },
        created_at: replyPayload.created_at
      };
      const updated = [...topicReplies, newLocalReply];
      setTopicReplies(updated);
      localStorage.setItem(`replies_${selectedTopic.id}`, JSON.stringify(updated));
    }

    setNewReplyContent('');
  };

  // Selecionar instrutor para Chat e carregar mensagens
  const handleSelectInstructorChat = async (inst) => {
    setSelectedInstructor(inst);
    setChatMessages([]);
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${inst.id}),and(sender_id.eq.${inst.id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
      
      // Marcar mensagens recebidas como lidas
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', inst.id)
        .eq('receiver_id', session.user.id)
        .eq('is_read', false);

    } catch (err) {
      // Fallback localstorage para chat
      const localChat = localStorage.getItem(`chat_${inst.id}`);
      if (localChat) {
        setChatMessages(JSON.parse(localChat));
      } else {
        const initialMsg = [
          { id: 'm-1', sender_id: inst.id, receiver_id: session.user.id, content: `Olá, tudo bem? Sou o ${inst.full_name}, estou aqui para te ajudar com suas dúvidas!`, created_at: new Date().toISOString() }
        ];
        setChatMessages(initialMsg);
        localStorage.setItem(`chat_${inst.id}`, JSON.stringify(initialMsg));
      }
    }
  };

  // Enviar mensagem no Chat
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !selectedInstructor || !session?.user?.id) return;

    const payload = {
      sender_id: session.user.id,
      receiver_id: selectedInstructor.id,
      content: newChatMessage.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([payload])
        .select();

      if (error) throw error;
      setChatMessages(prev => [...prev, data[0]]);
    } catch (err) {
      const newLocalMsg = {
        id: 'm-' + Date.now(),
        ...payload
      };
      const updated = [...chatMessages, newLocalMsg];
      setChatMessages(updated);
      localStorage.setItem(`chat_${selectedInstructor.id}`, JSON.stringify(updated));
    }

    setNewChatMessage('');
  };

  // Confirmar Presença
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
      setUpcomingPractical(prev => ({
        ...prev,
        enrolled_count: (prev.enrolled_count || 0) + 1
      }));

      alert('Presença confirmada com sucesso! Esperamos você no treinamento prático presencial.');
      fetchData();
    } catch (err) {
      console.error('Erro ao confirmar presença na aula presencial:', err);
      alert('Erro ao confirmar presença: ' + err.message);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      setSelfieStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      alert("Não foi possível acessar a câmera. Por favor, dê permissão de acesso à câmera no seu navegador ou envie um arquivo de imagem.");
    }
  };

  const stopCamera = () => {
    if (selfieStream) {
      selfieStream.getTracks().forEach(track => track.stop());
      setSelfieStream(null);
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    
    // Aplicar máscara de corte redondo físico na imagem para máxima privacidade
    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.clip();
    
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileUpload(file, 'photo');
        setShowSelfieModal(false);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleSelectLocalFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0], 'photo');
      setShowSelfieModal(false);
      stopCamera();
    }
  };

  // Upload de Documentos Abendi
  const handleFileUpload = async (e, docType) => {
    let file;
    if (e && e.target && e.target.files) {
      file = e.target.files[0];
    } else {
      file = e; // se passarmos o objeto File diretamente
    }
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
      fetchData();
    } catch (error) {
      console.error('Erro no upload de documento:', error);
      alert('Falha ao enviar arquivo. Por favor, tente novamente.');
    }
  };

  // Aceitar termo de 6 meses
  const handleAcceptTerms = async () => {
    if (!studentId) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({ terms_accepted: true })
        .eq('id', studentId);

      if (error) throw error;

      // Atualiza o estado local para fechar o modal imediatamente
      setStudentData(prev => prev ? { ...prev, terms_accepted: true } : null);
      alert('Obrigado! Termo de compromisso aceito com sucesso.');
    } catch (err) {
      console.error('Erro ao aceitar termo de compromisso:', err);
      alert('Não foi possível registrar o seu aceite. Por favor, tente novamente.');
    }
  };

  // Baixar Certificado Conquistado (Gera PDF Client-side)
  const handleDownloadPDF = (cert) => {
    const studentObj = {
      name: cert.student_name || userName,
      cpf: studentData?.cpf || ' --- ',
      class: cert.class_name || 'Turma CEC'
    };
    generateDocument('custom_certificate', studentObj, {
      content: `Certificamos que o aluno ${studentObj.name}, portador do CPF ${studentObj.cpf}, concluiu com êxito o treinamento técnico de ${cert.course_title}, com aproveitamento de nota média ${cert.grade || '8.0'}, cumprindo todos os requisitos teóricos e práticos de qualificação.`,
      uuid: cert.certificate_code
    });
    alert(`Certificado digital baixado com sucesso!`);
  };

  // Redireciona o aluno para a primeira aula do curso EAD
  const handleStartCourse = async (courseId) => {
    try {
      // Buscar módulos do curso ordenados
      const { data: modules, error: modError } = await supabase
        .from('lms_modules')
        .select('id')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (modError) throw modError;

      if (!modules || modules.length === 0) {
        alert('Este curso ainda não possui módulos teóricos EAD cadastrados.');
        return;
      }

      // Buscar a primeira aula do primeiro módulo
      const moduleIds = modules.map(m => m.id);
      const { data: lessons, error: lesError } = await supabase
        .from('lms_lessons')
        .select('id')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true })
        .limit(1);

      if (lesError) throw lesError;

      if (!lessons || lessons.length === 0) {
        alert('Este curso ainda não possui aulas teóricas EAD cadastradas.');
        return;
      }

      // Navegar para a rota da lição
      navigate(`/curso/${courseId}/aula/${lessons[0].id}`);
    } catch (err) {
      console.error('Erro ao acessar o player do curso:', err);
      alert('Não foi possível iniciar o curso. Tente novamente mais tarde.');
    }
  };

  // ═══════════════════════════════════════════
  // CÁLCULO DE FREQUÊNCIA PRESENCIAL (Fórmulas do Resumo)
  // ═══════════════════════════════════════════
  const getFrequenciaPresencial = () => {
    if (!turmaId) return { freq: 100, presencas: 0, totalDadas: 0, progresso: 0 };
    
    // Total de aulas ocorridas = datas distintas na tabela attendance_records para a turma
    // Buscamos datas distintas de presença lançadas
    const datasUnicas = Array.from(new Set(attendanceHistory.map(a => a.created_at?.split('T')[0])));
    const totalDadas = datasUnicas.length;
    
    // Contagem de presenças e faltas justificadas (status 'presente' ou 'falta_justificada')
    const presencas = attendanceHistory.filter(a => 
      a.class_id === turmaId && (a.status === 'presente' || a.status === 'falta_justificada')
    ).length;

    const freq = totalDadas > 0 ? Math.round((presencas / totalDadas) * 100) : 100;
    const progresso = Math.round((presencas / 10) * 100); // Divisor padrão 10

    return { freq, presencas, totalDadas, progresso };
  };

  const { freq: freqReal, presencas: presencasReal, totalDadas: totalDadasReal, progresso: progressoPresencial } = getFrequenciaPresencial();

  // ═══════════════════════════════════════════
  // RENDERIZAÇÃO DAS VISTAS/ROTAS/ABAS INTERNAS
  // ═══════════════════════════════════════════

  // ABA 1: DASHBOARD
  const renderDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* CARD DE BOAS-VINDAS */}
      <div style={{
        background: 'linear-gradient(135deg, #004b49 0%, #002d2c 100%)',
        color: 'white',
        padding: '2.5rem',
        borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(0, 75, 73, 0.3)'
      }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          {greeting}, {userName}! 👋
        </h2>
        <p style={{ margin: '0.75rem 0 0 0', opacity: 0.85, fontSize: '0.95rem' }}>
          Bem-vindo de volta ao seu portal de estudos C&C Engenharia e Capacitação. Veja abaixo seu andamento teórico e presencial.
        </p>
      </div>

      {/* CARDS DE KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'white' }}>
          <div style={{ backgroundColor: 'rgba(0, 75, 73, 0.08)', color: 'var(--primary)', padding: '1rem', borderRadius: '12px' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Meus Cursos</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '4px 0 0 0' }}>{myCourses.length}</p>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'white' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', padding: '1rem', borderRadius: '12px' }}>
            <Award size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Certificados</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: '4px 0 0 0' }}>{certificatesCount}</p>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'white' }}>
          <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#d97706', padding: '1rem', borderRadius: '12px' }}>
            <Calendar size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Próxima Aula Presencial</h4>
            {upcomingPractical ? (
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: '4px 0 0 0' }}>
                {new Date(upcomingPractical.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {upcomingPractical.start_time?.substring(0, 5)}h ({upcomingPractical.classes?.name || 'CEC'})
              </p>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>Sem cronograma</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        {/* CURSOS EM ANDAMENTO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlayCircle size={22} color="var(--primary)" /> Meus Cursos em Andamento
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {myCourses.map(course => {
              const isEligible = course.progress_percent === 100 && freqReal >= 75;
              const hasCert = issuedCertificates.some(c => c.course_id === course.id);
              const isEadCompleted = course.progress_percent === 100;
              
              // Estilo de borda especial de celebração para cursos completos/teoria completa
              const cardBorder = hasCert 
                ? '1px solid rgba(16, 185, 129, 0.45)' 
                : isEligible 
                  ? '1px solid rgba(2, 132, 199, 0.45)' 
                  : isEadCompleted 
                    ? '1px dashed rgba(245, 158, 11, 0.5)' 
                    : '1px solid var(--border-color)';

              const cardBg = hasCert 
                ? 'linear-gradient(to bottom right, #ffffff, #f0fdf4)' 
                : isEadCompleted 
                  ? 'linear-gradient(to bottom right, #ffffff, #fffdfa)'
                  : 'white';
              
              return (
                <div key={course.id} className="card" style={{ padding: '1.5rem', backgroundColor: 'white', background: cardBg, border: cardBorder, display: 'flex', flexDirection: 'column', gap: '1.25rem', transition: 'all 0.2s', boxShadow: hasCert ? '0 10px 15px -3px rgba(16, 185, 129, 0.05)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {course.title}
                        {hasCert && <span style={{ fontSize: '1.1rem' }}>🏆</span>}
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Modalidade: {course.modality?.toUpperCase() || 'HÍBRIDO'}</span>
                    </div>
 
                    <div>
                      {hasCert ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ✓ Certificado Emitido
                        </span>
                      ) : isEligible ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px' }}>
                          ⏳ Aguardando Homologação
                        </span>
                      ) : isEadCompleted ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#fff7ed', color: '#c2410c', padding: '4px 10px', borderRadius: '12px' }}>
                          📚 Teoria 100% · Prática Pendente
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px' }}>
                          🔒 Certificado Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
 
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    {/* Progresso Teórico EAD */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        <span>Aulas Teóricas EAD</span>
                        <span style={{ color: isEadCompleted ? '#10b981' : '#475569', fontWeight: '800' }}>
                          {isEadCompleted ? 'Concluído 100% 🎉' : `${course.progress_percent || 0}%`}
                        </span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${course.progress_percent || 0}%`, height: '100%', backgroundColor: isEadCompleted ? '#10b981' : 'var(--primary)', transition: 'width 0.4s' }}></div>
                      </div>
                    </div>
 
                    {/* Progresso Presencial */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        <span>Presenças Práticas</span>
                        <span>{presencasReal} de 10 aulas ({progressoPresencial}%)</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressoPresencial}%`, height: '100%', backgroundColor: '#f59e0b', transition: 'width 0.4s' }}></div>
                      </div>
                    </div>
                  </div>

                  {isEadCompleted && !isEligible && !hasCert && (
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.04)', borderLeft: '3px solid #f59e0b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#b45309', lineHeight: '1.4' }}>
                      💡 <strong>Teoria EAD Concluída:</strong> Fique atento às datas presenciais de final de semana na aba de Aulas Presenciais. O seu certificado será gerado assim que cumprir a frequência prática.
                    </div>
                  )}
 
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '700' }}>Frequência Presencial:</span>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: '800', 
                        color: freqReal >= 75 ? '#10b981' : '#ef4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        {freqReal}% {freqReal < 75 && <AlertCircle size={14} title="Mínimo exigido para aprovação: 75%" />}
                      </span>
                    </div>
 
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {hasCert ? (
                        <>
                          <button
                            onClick={() => handleStartCourse(course.id)}
                            style={{ 
                              padding: '0.5rem 1rem', 
                              borderRadius: '8px', 
                              fontWeight: '600', 
                              fontSize: '0.82rem',
                              background: 'transparent',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              cursor: 'pointer'
                            }}
                          >
                            Rever Aulas EAD
                          </button>
                          <button
                            onClick={() => navigate('/area-aluno/certificados')}
                            className="btn"
                            style={{ 
                              padding: '0.6rem 1.5rem', 
                              borderRadius: '8px', 
                              fontWeight: '750', 
                              fontSize: '0.85rem',
                              background: 'linear-gradient(to right, #10b981, #059669)',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            📜 Acessar Certificado
                          </button>
                        </>
                      ) : isEadCompleted ? (
                        <>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600', marginRight: '4px' }}>EAD Completo!</span>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleStartCourse(course.id)}
                            style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', border: '1px solid #cbd5e1', color: '#475569', background: 'transparent' }}
                          >
                            Rever Aulas EAD <ChevronRight size={16} />
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleStartCourse(course.id)}
                          style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem' }}
                        >
                          Estudar EAD <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {myCourses.length === 0 && (
              <div className="card" style={{ padding: '3rem', textCenter: 'center', backgroundColor: 'white' }}>
                <p className="text-secondary" style={{ margin: 0 }}>Você não possui matrículas ativas no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* COMUNICADOS DO MURAL */}
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Megaphone size={22} className="text-warning" /> Avisos da Secretaria
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className="card" style={{ 
                padding: '1.25rem', 
                backgroundColor: ann.is_pinned ? '#FEF2F2' : 'white', 
                borderLeft: ann.is_pinned ? '4px solid #ef4444' : '4px solid var(--primary)',
                borderColor: ann.is_pinned ? '#FCA5A5' : '#cbd5e1'
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' }}>{ann.title}</h4>
                <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  {ann.body.length > 120 ? `${ann.body.slice(0, 120)}...` : ann.body}
                </p>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Publicado em: {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Nenhum comunicado no mural no momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ABA 2: MEUS CURSOS
  const renderCursos = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--primary-dark)' }}>Meus Cursos Matriculados</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {myCourses.map(course => {
          const isEligible = course.progress_percent === 100 && freqReal >= 75;
          const hasCert = issuedCertificates.some(c => c.course_id === course.id);
          const isEadCompleted = course.progress_percent === 100;

          // Mesmos estilos do dashboard
          const cardBorder = hasCert 
            ? '1px solid rgba(16, 185, 129, 0.45)' 
            : isEligible 
              ? '1px solid rgba(2, 132, 199, 0.45)' 
              : isEadCompleted 
                ? '1px dashed rgba(245, 158, 11, 0.5)' 
                : '1px solid var(--border-color)';

          const cardBg = hasCert 
            ? 'linear-gradient(to bottom right, #ffffff, #f0fdf4)' 
            : isEadCompleted 
              ? 'linear-gradient(to bottom right, #ffffff, #fffdfa)'
              : 'white';

          return (
            <div key={course.id} className="card" style={{ padding: '1.5rem', backgroundColor: 'white', background: cardBg, border: cardBorder, display: 'flex', flexDirection: 'column', gap: '1.15rem', transition: 'all 0.2s', boxShadow: hasCert ? '0 10px 15px -3px rgba(16, 185, 129, 0.05)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {course.title}
                    {hasCert && <span style={{ fontSize: '1.15rem' }}>🏆</span>}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>Código do Curso: <strong>{course.code || ' --- '}</strong></p>
                </div>
                
                <div>
                  {hasCert ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px' }}>
                      ✓ Certificado Emitido
                    </span>
                  ) : isEligible ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px' }}>
                      ⏳ Aguardando Homologação
                    </span>
                  ) : isEadCompleted ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#fff7ed', color: '#c2410c', padding: '4px 10px', borderRadius: '12px' }}>
                      📚 Teoria 100% · Prática Pendente
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px' }}>
                      🔒 Certificado Bloqueado
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  <span>Progresso Teórico EAD</span>
                  <span style={{ color: isEadCompleted ? '#10b981' : '#475569', fontWeight: '800' }}>
                    {isEadCompleted ? 'Concluído 100% 🎉' : `${course.progress_percent || 0}%`}
                  </span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${course.progress_percent || 0}%`, height: '100%', backgroundColor: isEadCompleted ? '#10b981' : 'var(--primary)', transition: 'width 0.4s' }}></div>
                </div>
              </div>

              {isEadCompleted && !isEligible && !hasCert && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.04)', borderLeft: '3px solid #f59e0b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#b45309', lineHeight: '1.4' }}>
                  💡 A parte teórica está completa! Fique atento às aulas presenciais obrigatórias para liberar seu certificado.
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', width: '100%' }}>
                {hasCert ? (
                  <>
                    <button
                      onClick={() => handleStartCourse(course.id)}
                      style={{ 
                        flex: 1,
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        fontWeight: '700', 
                        fontSize: '0.85rem',
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      Rever Aulas
                    </button>
                    <button
                      onClick={() => navigate('/area-aluno/certificados')}
                      className="btn"
                      style={{ 
                        flex: 1.5,
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        fontWeight: '750', 
                        fontSize: '0.85rem',
                        background: 'linear-gradient(to right, #10b981, #059669)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(16, 185, 129, 0.15)'
                      }}
                    >
                      📜 Acessar Certificado
                    </button>
                  </>
                ) : isEadCompleted ? (
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleStartCourse(course.id)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', fontWeight: '750', border: '1px solid #cbd5e1', color: '#475569', background: 'transparent' }}
                  >
                    Revisar Aulas EAD <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleStartCourse(course.id)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', fontWeight: '750' }}
                  >
                    Estudar EAD <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Funções de Agendamento de Aula Prática (Fase 20.1)
  const handleRequestPracticalClass = async (classId) => {
    if (!studentData?.id) return;
    setSchedulingActionLoading(classId);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          practical_class_id: classId,
          practical_class_status: 'pendente'
        })
        .eq('id', studentData.id);

      if (error) throw error;

      alert('Solicitação de agendamento realizada com sucesso! Aguarde a confirmação da coordenação.');
      await fetchData();
    } catch (err) {
      alert('Erro ao solicitar agendamento: ' + err.message);
    } finally {
      setSchedulingActionLoading(null);
    }
  };

  const handleCancelPracticalClass = async (practicalClass) => {
    if (!studentData?.id) return;
    
    // Regra de 7 dias
    const prDate = new Date(practicalClass.start_date + 'T12:00:00');
    const today = new Date();
    const diffTime = prDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      alert('Bloqueado: Cancelamentos ou alterações só são permitidos com até 7 dias de antecedência. Entre em contato com a secretaria.');
      return;
    }

    if (!window.confirm('Deseja realmente cancelar sua solicitação/agendamento para este final de semana?')) {
      return;
    }

    setSchedulingActionLoading(practicalClass.id);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          practical_class_id: null,
          practical_class_status: null
        })
        .eq('id', studentData.id);

      if (error) throw error;

      alert('Agendamento cancelado com sucesso!');
      await fetchData();
    } catch (err) {
      alert('Erro ao cancelar agendamento: ' + err.message);
    } finally {
      setSchedulingActionLoading(null);
    }
  };

  // ABA 3: AULAS PRESENCIAIS E FREQUÊNCIA DETALHADA
  const renderPresencial = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        {/* HISTÓRICO DE PRESENÇAS */}
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1.5rem' }}>Frequência e Chamadas Presenciais</h3>
          
          <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Frequência Prática Registrada</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Cálculo baseado em {totalDadasReal} aulas ministradas na turma (mínimo exigido: 75%).</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  fontSize: '2rem', 
                  fontWeight: 900, 
                  color: freqReal >= 75 ? '#10b981' : '#ef4444',
                  display: 'block',
                  lineHeight: 1
                }}>
                  {freqReal}%
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: freqReal >= 75 ? '#047857' : '#b91c1c' }}>
                  {freqReal >= 75 ? 'Aprovado por Frequência' : 'Frequência Insuficiente'}
                </span>
              </div>
            </div>

            {/* Barra de Progresso de Frequência */}
            <div style={{ height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ width: `${freqReal}%`, height: '100%', backgroundColor: freqReal >= 75 ? '#10b981' : '#ef4444', transition: 'width 0.4s' }}></div>
            </div>

            {freqReal < 75 && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', color: '#991B1B', fontSize: '0.82rem', lineHeight: '1.4' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Atenção:</strong> Sua frequência prática está abaixo de 75%. De acordo com as normas regulamentares da **Abendi**, a emissão do certificado permanecerá **bloqueada** até que as faltas sejam justificadas ou repostas com a secretaria.
                </span>
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1rem' }}>Lista de Chamadas Realizadas</h4>
          <div className="card" style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '1rem' }}>Data da Aula</th>
                  <th style={{ padding: '1rem' }}>Turma / Disciplina</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{a.classes?.name || 'Treinamento Prático'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                        backgroundColor: a.status === 'presente' ? '#dcfce7' : (a.status === 'falta_justificada' ? '#fee2e2' : '#f1f5f9'),
                        color: a.status === 'presente' ? '#15803d' : (a.status === 'falta_justificada' ? '#991b1b' : '#475569')
                      }}>
                        {a.status === 'presente' ? 'Presente' : (a.status === 'falta_justificada' ? 'Falta Justificada' : 'Falta')}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                      {a.justification_type || ' --- '}
                    </td>
                  </tr>
                ))}
                {attendanceHistory.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      Nenhum registro de chamada lançado para sua matrícula no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD PRESENCIAL DO FINAL DE SEMANA */}
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1.5rem' }}>Cronograma Presencial</h3>
          {upcomingPractical ? (
            <div className="card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FCD34D', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: '#F59E0B' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B45309', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                <MapPin size={15} />
                <span>Aula Presencial Prevista</span>
              </div>
              <h4 style={{ color: 'var(--primary-dark)', fontSize: '1rem', fontWeight: '800', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                {upcomingPractical.lms_courses?.title || 'Treinamento CEC'}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '750', color: '#B45309' }}>
                  <Calendar size={14} />
                  <span>
                    {new Date(upcomingPractical.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} className="text-muted" />
                  <span>{upcomingPractical.start_time?.substring(0, 5)}h às {upcomingPractical.end_time?.substring(0, 5)}h</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'start', gap: '0.4rem' }}>
                  <MapPin size={14} className="text-muted" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{upcomingPractical.address}</span>
                </div>
                {upcomingPractical.instructor_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={14} className="text-muted" />
                    <span>Instrutor: <strong>{upcomingPractical.instructor_name}</strong></span>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Vagas: <strong>{(upcomingPractical.capacity || 20) - (upcomingPractical.enrolled_count || 0)} de {upcomingPractical.capacity || 20} livres</strong>
                  </span>
                </div>
              </div>

              {/* Ações */}
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
                      width: '100%', padding: '0.65rem', backgroundColor: '#10b981', color: 'white', 
                      fontWeight: '800', fontSize: '0.82rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', transition: 'all 0.2s'
                    }}
                  >
                    ✓ Confirmar Presença
                  </button>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcomingPractical.address)}`} 
                    target="_blank" rel="noopener noreferrer" className="btn"
                    style={{ 
                      padding: '0.5rem', background: 'white', border: '1px solid #e2e8f0', color: 'var(--text-main)', 
                      fontWeight: '700', fontSize: '0.78rem', borderRadius: '8px', textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                    }}
                  >
                    <MapPin size={12} /> Ver no Maps
                  </a>
                  {upcomingPractical.whatsapp_group_url && (
                    <a 
                      href={upcomingPractical.whatsapp_group_url} 
                      target="_blank" rel="noopener noreferrer" className="btn"
                      style={{ 
                        padding: '0.5rem', background: '#075E54', color: 'white', border: 'none',
                        fontWeight: '700', fontSize: '0.78rem', borderRadius: '8px', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                      }}
                    >
                      <MessageCircle size={12} /> Grupo WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FEF3C7', padding: '2rem 1.5rem', textAlign: 'center' }}>
              <Clock size={32} color="#B45309" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem', color: '#B45309', margin: 0, fontWeight: '600' }}>Nenhuma aula prática presencial prevista no momento.</p>
            </div>
          )}

          {/* BLOCO DE AGENDAMENTO PRÁTICO DE FIM DE SEMANA (Fase 20.1) */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🗓️ Aula Prática (Fins de Semana)
            </h3>
            
            {studentData?.practical_class ? (
              // Aluno já tem agendamento (Pendente ou Confirmado)
              (() => {
                const isConfirmed = studentData.practical_class_status === 'confirmado';
                const prClass = studentData.practical_class;
                
                // Verificar prazo de 7 dias
                const prDate = new Date(prClass.start_date + 'T12:00:00');
                const today = new Date();
                const diffTime = prDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isChangeBlocked = diffDays <= 7;

                return (
                  <div className="card" style={{ 
                    backgroundColor: isConfirmed ? '#f0fdf4' : '#fffbeb', 
                    borderColor: isConfirmed ? '#bbf7d0' : '#fef3c7', 
                    padding: '1.5rem', 
                    position: 'relative', 
                    overflow: 'hidden',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderRadius: '12px'
                  }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, right: 0, height: '5px', 
                      background: isConfirmed ? '#22c55e' : '#f59e0b' 
                    }}></div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isConfirmed ? '#166534' : '#b45309', fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      {isConfirmed ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                      <span>{isConfirmed ? 'Agendamento Confirmado' : 'Aguardando Confirmação'}</span>
                    </div>

                    <h4 style={{ color: 'var(--primary-dark)', fontSize: '1rem', fontWeight: '800', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                      {prClass.name}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '750', color: isConfirmed ? '#166534' : '#b45309' }}>
                        <Calendar size={14} />
                        <span>
                          {new Date(prClass.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '0.4rem' }}>
                        <MapPin size={14} className="text-muted" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{prClass.address || 'Local do Treinamento CEC'}</span>
                      </div>
                    </div>

                    {isChangeBlocked && (
                      <div style={{ 
                        backgroundColor: '#f8fafc', 
                        color: '#64748b', 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        fontSize: '0.76rem', 
                        marginBottom: '1rem',
                        border: '1px solid #e2e8f0',
                        lineHeight: '1.4'
                      }}>
                        🔒 Alterações bloqueadas. Modificações só são permitidas com até 7 dias de antecedência.
                      </div>
                    )}

                    <button 
                      onClick={() => handleCancelPracticalClass(prClass)}
                      disabled={isChangeBlocked || schedulingActionLoading === prClass.id}
                      className="btn"
                      style={{ 
                        width: '100%', 
                        padding: '0.65rem', 
                        backgroundColor: isChangeBlocked ? '#cbd5e1' : '#fee2e2', 
                        color: isChangeBlocked ? '#94a3b8' : '#ef4444', 
                        fontWeight: '800', 
                        fontSize: '0.82rem', 
                        borderRadius: '10px', 
                        border: 'none', 
                        cursor: isChangeBlocked ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {schedulingActionLoading === prClass.id ? (
                        <span>Processando...</span>
                      ) : (
                        <span>Cancelar Agendamento</span>
                      )}
                    </button>
                  </div>
                );
              })()
            ) : (
              // Aluno não tem agendamento, listar disponíveis
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                  💡 Selecione abaixo um final de semana disponível para agendar sua aula prática presencial.
                </div>
                
                {availablePracticalClasses.length === 0 ? (
                  <div className="card text-center text-muted" style={{ padding: '2rem', backgroundColor: 'white' }}>
                    Nenhuma data de aula prática futura disponível no momento para o seu curso ({studentData?.classes?.course_name || 'CEC'}).
                  </div>
                ) : (
                  availablePracticalClasses.map(pc => {
                    const isFull = pc.availableVacancies <= 0;
                    return (
                      <div key={pc.id} className="card" style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: '10px' }}>
                        <div>
                          <h4 style={{ color: 'var(--primary-dark)', fontSize: '0.9rem', fontWeight: '800', margin: 0 }}>
                            {pc.name}
                          </h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                            📅 {new Date(pc.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                            📍 {pc.address || 'Centro de Treinamento CEC'}
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: isFull ? '#ef4444' : '#166534', fontWeight: '700' }}>
                            {isFull ? 'Lotado (0 vagas)' : `${pc.availableVacancies} vagas livres`}
                          </span>
                          
                          <button
                            onClick={() => handleRequestPracticalClass(pc.id)}
                            disabled={isFull || schedulingActionLoading === pc.id}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.4rem 1rem', 
                              fontSize: '0.78rem', 
                              borderRadius: '8px', 
                              fontWeight: '700',
                              backgroundColor: isFull ? '#cbd5e1' : 'var(--primary)',
                              color: isFull ? '#94a3b8' : 'white',
                              border: 'none',
                              cursor: isFull ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {schedulingActionLoading === pc.id ? 'Solicitando...' : 'Solicitar Vaga'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ABA 4: DESEMPENHO E NOTAS
  const renderDesempenho = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>Histórico de Notas e Desempenho</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Provas Online (EAD) */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '1rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provas Online (LMS)</h4>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '0.5rem 0' }}>Teste / Módulo</th>
                <th style={{ padding: '0.5rem 0' }}>Tentativas</th>
                <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Nota</th>
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
              {quizResults.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ padding: '2rem 0', textAlign: 'center', color: '#94a3b8' }}>
                    Nenhum quiz online concluído ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Avaliações Presenciais */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', marginBottom: '1rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avaliações Práticas Presenciais</h4>
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
                  <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '800', color: e.grade >= 7.0 ? '#10b981' : '#ef4444' }}>
                    {e.grade}
                  </td>
                </tr>
              ))}
              {technicalEvals.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ padding: '2rem 0', textAlign: 'center', color: '#94a3b8' }}>
                    Nenhuma nota presencial lançada pelo instrutor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ABA 5: FÓRUM DE DÚVIDAS
  const renderForum = () => (
    <div style={{ display: 'grid', gridTemplateColumns: selectedTopic ? '1fr 1fr' : '1.2fr 0.8fr', gap: '2rem', flexWrap: 'wrap' }}>
      {/* TÓPICOS DO FÓRUM */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>Fórum de Dúvidas</h3>
          <input 
            type="text" 
            placeholder="Buscar dúvidas..."
            value={forumSearch}
            onChange={e => setForumSearch(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
          {forumTopics
            .filter(t => t.title.toLowerCase().includes(forumSearch.toLowerCase()) || t.content.toLowerCase().includes(forumSearch.toLowerCase()))
            .map(t => (
              <div 
                key={t.id} 
                className="card" 
                onClick={() => handleSelectTopic(t)}
                style={{ 
                  padding: '1.25rem', 
                  backgroundColor: selectedTopic?.id === t.id ? '#F0F9FF' : 'white', 
                  borderColor: selectedTopic?.id === t.id ? '#0284c7' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--primary-dark)', margin: '0 0 6px 0' }}>{t.title}</h4>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  {t.content.length > 100 ? `${t.content.slice(0, 100)}...` : t.content}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>Por: <strong>{t.student?.full_name}</strong></span>
                  <span>{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))
          }
          {forumTopics.length === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Nenhuma dúvida registrada no fórum.</p>
            </div>
          )}
        </div>
      </div>

      {/* DETALHE DO TÓPICO / CRIAR TÓPICO */}
      <div>
        {selectedTopic ? (
          <div className="card animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', maxHeight: '72vh' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary-dark)', margin: '0 0 4px 0' }}>{selectedTopic.title}</h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Postado por {selectedTopic.student?.full_name} em {new Date(selectedTopic.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <button 
                onClick={() => setSelectedTopic(null)}
                style={{ background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Voltar
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.5, padding: '0.5rem 0' }}>{selectedTopic.content}</p>

            {/* Respostas */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <h5 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', margin: '0 0 4px 0' }}>Respostas Pedagógicas</h5>
              {topicReplies.map(r => (
                <div key={r.id} style={{ 
                  padding: '0.85rem', 
                  backgroundColor: r.author?.role === 'instrutor' || r.author?.role === 'admin' ? '#ECFDF5' : '#f8fafc',
                  border: '1px solid',
                  borderColor: r.author?.role === 'instrutor' || r.author?.role === 'admin' ? '#A7F3D0' : '#e2e8f0',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '750', color: r.author?.role === 'instrutor' ? '#065f46' : '#1e293b' }}>
                      {r.author?.full_name} ({r.author?.role?.toUpperCase() || 'ALUNO'})
                    </span>
                    <span>{new Date(r.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#334155', margin: 0, lineHeight: 1.4 }}>{r.content}</p>
                </div>
              ))}
              {topicReplies.length === 0 && (
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Nenhuma resposta no momento.</p>
              )}
            </div>

            {/* Form de Resposta */}
            <form onSubmit={handleAddReply} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <input 
                type="text" 
                placeholder="Escreva sua resposta..."
                value={newReplyContent}
                onChange={e => setNewReplyContent(e.target.value)}
                style={{ flex: 1, padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>Responder</button>
            </form>
          </div>
        ) : (
          <div className="card" style={{ padding: '1.5rem', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={18} color="var(--primary)" /> Nova Dúvida Pedagógica
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Sua pergunta ficará disponível para que instrutores e outros alunos respondam.</p>
            
            <form onSubmit={handleAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Título da Dúvida</label>
                <input 
                  type="text" 
                  placeholder="Ex: Como calibrar o bloco V1 no Ultrassom?"
                  value={newTopicTitle}
                  onChange={e => setNewTopicTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Explique sua Dúvida em Detalhes</label>
                <textarea 
                  rows="4" 
                  placeholder="Descreva aqui sua pergunta com o máximo de informações possível..."
                  value={newTopicContent}
                  onChange={e => setNewTopicContent(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', fontWeight: '750', fontSize: '0.85rem' }}>
                Enviar para o Fórum
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  // ABA 6: CHAT COM INSTRUTOR
  const renderMensagens = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', height: '70vh', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '16px', overflow: 'hidden' }}>
      {/* LISTA DE CONTATOS */}
      <div style={{ borderRight: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary-dark)' }}>Instrutores & Suporte</h4>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {instructors.map(inst => (
            <div 
              key={inst.id} 
              onClick={() => handleSelectInstructorChat(inst)}
              style={{ 
                padding: '0.85rem 1rem', 
                borderBottom: '1px solid #f1f5f9', 
                cursor: 'pointer',
                backgroundColor: selectedInstructor?.id === inst.id ? 'var(--primary-light)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                backgroundColor: 'var(--primary)', color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: 'bold', fontSize: '0.8rem' 
              }}>
                {inst.full_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.full_name}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.email}</div>
              </div>
            </div>
          ))}
          {instructors.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Carregando contatos...</p>
          )}
        </div>
      </div>

      {/* ÁREA DE MENSAGENS */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {selectedInstructor ? (
          <>
            {/* Header do Chat */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                {selectedInstructor.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: '800', color: 'var(--primary-dark)' }}>{selectedInstructor.full_name}</h4>
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: '700' }}>● Online</span>
              </div>
            </div>

            {/* Listagem de Mensagens */}
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', backgroundColor: '#f8fafc' }}>
              {chatMessages.map(msg => {
                const isMe = msg.sender_id === session?.user?.id;
                return (
                  <div 
                    key={msg.id}
                    style={{ 
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      backgroundColor: isMe ? 'var(--primary)' : 'white',
                      color: isMe ? 'white' : '#1e293b',
                      padding: '0.6rem 0.85rem',
                      borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                      maxWidth: '70%',
                      fontSize: '0.82rem',
                      lineHeight: '1.4',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      border: isMe ? 'none' : '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span>{msg.content}</span>
                    <span style={{ fontSize: '0.6rem', alignSelf: 'flex-end', opacity: 0.65, marginTop: '2px' }}>
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} style={{ padding: '1rem', borderTop: '1px solid #cbd5e1', display: 'flex', gap: '0.5rem', backgroundColor: 'white' }}>
              <input 
                type="text" 
                placeholder="Digite sua mensagem pedagógica..."
                value={newChatMessage}
                onChange={e => setNewChatMessage(e.target.value)}
                style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '2rem' }}>
            <MessageCircle size={48} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <h4 style={{ margin: 0, fontWeight: 700 }}>Chat Pedagógico</h4>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0', textAlign: 'center' }}>Selecione um instrutor na barra lateral para iniciar sua conversa em tempo real.</p>
          </div>
        )}
      </div>
    </div>
  );

  // ABA 7: SECRETARIA E DOCUMENTOS (Abendi Compliance)
  const renderDocumentos = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>Secretaria Digital - Envio de Documentos</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Conclua o upload de seus documentos para manter sua matrícula em conformidade com as regras da **Abendi** e garantir a emissão de certificados.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Formulário de Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            { type: 'photo', label: 'Foto de Rosto (Foto / Selfie)', field: studentData?.doc_photo_url, signedField: signedUrls.photo },
            { type: 'id', label: 'Documento de Identidade Oficial (RG ou CNH)', field: studentData?.doc_id_url, signedField: signedUrls.id },
            { type: 'cpf', label: 'Cadastro de Pessoa Física (CPF)', field: studentData?.doc_cpf_url, signedField: signedUrls.cpf },
            { type: 'address', label: 'Comprovante de Residência recente', field: studentData?.doc_address_url, signedField: signedUrls.address },
            { type: 'education', label: 'Comprovante de Escolaridade (Diploma ou Histórico)', field: studentData?.doc_education_url, signedField: signedUrls.education }
          ].map(doc => (
            <div key={doc.type} className="card" style={{ padding: '1.25rem', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <span style={{ fontWeight: '750', fontSize: '0.88rem', color: 'var(--primary-dark)', display: 'block' }}>{doc.label}</span>
                <span style={{ fontSize: '0.72rem', color: doc.field ? '#10b981' : '#f59e0b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                  {doc.field ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {doc.field ? 'Enviado para Auditoria' : 'Pendente de Upload'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {doc.field && (
                  <a href={doc.signedField || doc.field} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', textDecoration: 'none' }}>
                    Visualizar
                  </a>
                )}
                {doc.type === 'photo' ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setShowSelfieModal(true);
                      setTimeout(startCamera, 100);
                    }}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', cursor: 'pointer', margin: 0, borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                  >
                    {doc.field ? 'Re-enviar Foto/Selfie' : 'Tirar Selfie'}
                  </button>
                ) : (
                  <label className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem', cursor: 'pointer', margin: 0, borderRadius: '8px' }}>
                    {doc.field ? 'Re-enviar' : 'Fazer Upload'}
                    <input 
                      type="file" 
                      hidden 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleFileUpload(e, doc.type)} 
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status e Orientações Abendi */}
        <div>
          <div className="card" style={{ backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0369a1', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileCheck size={18} /> Diretrizes de Auditoria Abendi
            </h4>
            <ul style={{ fontSize: '0.8rem', color: '#0369a1', paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.4 }}>
              <li>Os arquivos devem estar legíveis e sem cortes nas bordas.</li>
              <li>A foto de rosto deve ser frontal, com fundo claro e sem óculos de sol ou boné.</li>
              <li>Formatos aceitos: PDF, PNG, JPG e JPEG de até 5MB.</li>
              <li>Certificados de conclusão dependem de 100% dos documentos aprovados.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // ABA 8: MEUS CERTIFICADOS
  const renderCertificates = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>Meus Certificados de Conclusão</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Visualize e baixe seus certificados digitais emitidos pela C&C Engenharia e Capacitação.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {issuedCertificates.map(cert => (
          <div key={cert.id} className="card" style={{ padding: '1.5rem', backgroundColor: 'white', display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '5px solid #10b981' }}>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', padding: '1rem', borderRadius: '12px' }}>
              <Award size={36} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary-dark)', margin: '0 0 4px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cert.course_title}</h4>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>Emitido em: {new Date(cert.issued_at).toLocaleDateString('pt-BR')}</span>
              
              <button 
                className="btn btn-primary"
                onClick={() => handleDownloadPDF(cert)}
                style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', borderRadius: '6px', fontWeight: '750', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        ))}

        {/* Cursos aptos pendentes de emissão pela secretaria */}
        {myCourses
          .filter(c => c.progress_percent === 100 && freqReal >= 75 && !issuedCertificates.some(cert => cert.course_id === c.id))
          .map(course => (
            <div key={course.id} className="card" style={{ padding: '1.5rem', backgroundColor: 'white', display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '5px solid #d97706' }}>
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#d97706', padding: '1rem', borderRadius: '12px' }}>
                <Clock size={36} />
              </div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary-dark)', margin: '0 0 4px 0' }}>{course.title}</h4>
                <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Elegível · Aguardando homologação da Secretaria</span>
                
                <button 
                  disabled
                  style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', borderRadius: '6px', fontWeight: '750', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', cursor: 'not-allowed' }}
                >
                  Pendente de Emissão
                </button>
              </div>
            </div>
          ))
        }

        {issuedCertificates.length === 0 && !myCourses.some(c => c.progress_percent === 100 && freqReal >= 75) && (
          <div className="card" style={{ colSpan: '2', padding: '3rem', textAlign: 'center', backgroundColor: 'white', width: '100%' }}>
            <Lock size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Você ainda não conquistou nenhum certificado nesta conta. Conclua os módulos teóricos (100% EAD) e atinja frequência ≥ 75% nas aulas presenciais para liberar!</p>
          </div>
        )}
      </div>
    </div>
  );

  // ABA 9: FINANCEIRO (Mensalidades e Faturas)
  const renderFinanceiro = () => {
    const installments = financialRecord?.installments || [];
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        {/* PARCELAS */}
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1.25rem' }}>Mensalidades e Faturas</h3>
          
          <div className="card" style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '1rem' }}>Parcela</th>
                  <th style={{ padding: '1rem' }}>Vencimento</th>
                  <th style={{ padding: '1rem' }}>Valor</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst, index) => {
                  const isPaid = inst.status === 'pago';
                  const isLate = !isPaid && new Date(inst.dueDate) < new Date();
                  
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{index + 1}ª Mensalidade</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{new Date(inst.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: '800' }}>R$ {Number(inst.amount).toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800',
                          backgroundColor: isPaid ? '#dcfce7' : (isLate ? '#fee2e2' : '#fef9c3'),
                          color: isPaid ? '#15803d' : (isLate ? '#991b1b' : '#a16207')
                        }}>
                          {isPaid ? 'Pago' : (isLate ? 'Atrasado' : 'Pendente')}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {!isPaid && (
                          <button 
                            className="btn btn-primary"
                            onClick={() => {
                              navigator.clipboard.writeText("00020101021126360014br.gov.bcb.pix0114cc@cursocec.com");
                              alert("Chave PIX da C&C copiada com sucesso! Faça a transferência no app do seu banco.");
                            }}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', borderRadius: '6px' }}
                          >
                            Copiar PIX
                          </button>
                        )}
                        {isPaid && <span style={{ color: '#10b981', fontWeight: '800' }}>✓</span>}
                      </td>
                    </tr>
                  );
                })}
                {installments.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      Nenhum registro de faturamento encontrado para esta conta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* INFORMAÇÕES FINANCEIRAS */}
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1.25rem' }}>Informações de Pagamento</h3>
          
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Valor Total Contratado</span>
              <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-dark)', margin: '4px 0 0 0' }}>
                R$ {financialRecord ? Number(financialRecord.total_value).toFixed(2) : '0,00'}
              </p>
            </div>
            
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Chave PIX Oficial (CNPJ)</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, backgroundColor: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#334155' }}>
                  cc@cursocec.com
                </code>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    navigator.clipboard.writeText("cc@cursocec.com");
                    alert("Chave PIX copiada para a área de transferência.");
                  }}
                  style={{ padding: '0.5rem', fontSize: '0.78rem' }}
                >
                  Copiar
                </button>
              </div>
            </div>
            
            <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4, margin: 0, fontStyle: 'italic' }}>
              Para pagamento via Boleto Bancário ou Nota Fiscal, entre em contato diretamente com a nossa secretaria financeira pelo canal oficial.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ABA 10: VITRINE DE CURSOS / WISHLIST
  const renderVitrine = () => {
    const enrolledIds = new Set(myCourses.map(c => c.id));

    const filtered = availableCourses.filter(c => {
      const matchSearch = !vitrineSearch || 
        c.title.toLowerCase().includes(vitrineSearch.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(vitrineSearch.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(vitrineSearch.toLowerCase());
      return matchSearch;
    });

    const wishlistCourses = availableCourses.filter(c => wishlist.includes(c.id));

    const modalityBadge = (mod) => {
      const colors = { presencial: '#0ea5e9', ead: '#8b5cf6', hibrido: '#10b981', online: '#8b5cf6' };
      const labels = { presencial: '🏫 Presencial', ead: '💻 EAD', hibrido: '⚡ Híbrido', online: '💻 Online' };
      const bg = colors[mod] || '#64748b';
      return (
        <span style={{ fontSize: '0.68rem', fontWeight: '800', background: `${bg}18`, color: bg, padding: '3px 8px', borderRadius: '10px', border: `1px solid ${bg}30` }}>
          {labels[mod] || mod?.toUpperCase() || 'HÍBRIDO'}
        </span>
      );
    };

    const gradients = [
      'linear-gradient(135deg, #004B49 0%, #006B68 100%)',
      'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
      'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
      'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
      'linear-gradient(135deg, #9f1239 0%, #f43f5e 100%)',
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* CABEÇALHO */}
        <div style={{
          background: 'linear-gradient(135deg, #3b0764 0%, #7c3aed 50%, #1d4ed8 100%)',
          color: 'white',
          padding: '2.5rem',
          borderRadius: '20px',
          boxShadow: '0 10px 40px -10px rgba(124, 58, 237, 0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '30%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', position: 'relative' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
              <Sparkles size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, lineHeight: 1 }}>Vitrine de Cursos</h2>
              <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.88rem' }}>Explore, salve na lista de desejos e solicite sua matrícula via WhatsApp</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem', position: 'relative' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={14} /> {availableCourses.length} cursos disponíveis
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Heart size={14} /> {wishlist.length} na sua wishlist
            </div>
          </div>
        </div>

        {/* WISHLIST RÁPIDA */}
        {wishlistCourses.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Heart size={18} fill="#7c3aed" /> Minha Lista de Desejos ({wishlistCourses.length})
            </h3>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.75rem' }}>
              {wishlistCourses.map(course => (
                <div key={`w-${course.id}`} style={{
                  minWidth: '260px',
                  background: 'white',
                  borderRadius: '14px',
                  border: '2px solid #ede9fe',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 4px 15px rgba(124,58,237,0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
                    <button onClick={() => toggleWishlist(course.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                      <Heart size={16} fill="#ef4444" color="#ef4444" />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b', margin: 0, lineHeight: 1.3 }}>{course.title}</p>
                  <button
                    onClick={() => handleMatricular(course)}
                    style={{
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Zap size={12} /> Solicitar Matrícula
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUSCA */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar curso, código ou área..."
              value={vitrineSearch}
              onChange={e => setVitrineSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.75rem 0.7rem 2.5rem',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {/* GRADE DE CURSOS */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
            <Sparkles size={40} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#94a3b8', fontWeight: '600', margin: 0 }}>Nenhum curso encontrado para "{vitrineSearch}".</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filtered.map((course, idx) => {
              const inWishlist = wishlist.includes(course.id);
              const alreadyEnrolled = enrolledIds.has(course.id);
              const gradient = gradients[idx % gradients.length];
              return (
                <div key={course.id} style={{
                  background: 'white',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: inWishlist 
                    ? '0 8px 30px rgba(124,58,237,0.2), 0 0 0 2px #ede9fe' 
                    : '0 4px 20px rgba(0,0,0,0.06)',
                  transition: 'all 0.25s',
                  display: 'flex',
                  flexDirection: 'column',
                  transform: 'translateY(0)',
                  cursor: 'default'
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Thumbnail / Banner */}
                  <div style={{
                    height: '120px',
                    background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : gradient,
                    position: 'relative',
                    flexShrink: 0
                  }}>

                    {/* Botão Wishlist */}
                    <button
                      onClick={() => toggleWishlist(course.id)}
                      title={inWishlist ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '12px',
                        background: 'rgba(255,255,255,0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '34px',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                    >
                      <Heart size={16} fill={inWishlist ? '#ef4444' : 'none'} color={inWishlist ? '#ef4444' : '#64748b'} />
                    </button>

                    {/* Badge Já Matriculado */}
                    {alreadyEnrolled && (
                      <div style={{ position: 'absolute', bottom: '10px', left: '12px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '900', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          ✅ Já matriculado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo do Card */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {modalityBadge(course.modality)}
                      {course.code && <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', fontFamily: 'monospace' }}>{course.code}</span>}
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b', margin: 0, lineHeight: 1.35 }}>{course.title}</h4>

                    {/* Preços dinâmicos */}
                    {course.price_pix ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#15803d' }}>
                          ⚡ R$ {Number(course.price_pix).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no PIX
                        </span>
                        {course.price_card && course.max_installments && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            ou {course.max_installments}x de R$ {(Number(course.price_card) / Number(course.max_installments)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no cartão
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Consulte valores com a secretaria</span>
                    )}

                    {course.description && (
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.5, flex: 1 }}>
                        {course.description.length > 100 ? `${course.description.substring(0, 100)}...` : course.description}
                      </p>
                    )}

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => toggleWishlist(course.id)}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: inWishlist ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                          background: inWishlist ? '#fef2f2' : '#f8fafc',
                          color: inWishlist ? '#ef4444' : '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Heart size={13} fill={inWishlist ? '#ef4444' : 'none'} />
                        {inWishlist ? 'Salvo' : 'Salvar'}
                      </button>

                      <button
                        onClick={() => handleMatricular(course)}
                        disabled={alreadyEnrolled}
                        style={{
                          flex: 2,
                          padding: '0.6rem 0.75rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: alreadyEnrolled ? '#e2e8f0' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                          color: alreadyEnrolled ? '#94a3b8' : 'white',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          cursor: alreadyEnrolled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                          boxShadow: alreadyEnrolled ? 'none' : '0 3px 10px rgba(124,58,237,0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Zap size={13} />
                        {alreadyEnrolled ? 'Já Matriculado' : 'Quero me Matricular'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA FINAL */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: '16px',
          padding: '1.75rem',
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ background: '#25D366', color: 'white', padding: '1rem', borderRadius: '14px', flexShrink: 0 }}>
            <Phone size={28} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#065f46', margin: '0 0 4px 0' }}>Ficou com dúvidas? Fale com nossa secretaria!</h4>
            <p style={{ fontSize: '0.82rem', color: '#047857', margin: 0, lineHeight: 1.5 }}>
              Nossa equipe está disponível para te ajudar a escolher o treinamento ideal, verificar pré-requisitos e condições especiais de pagamento.
            </p>
          </div>
          <button
            onClick={() => {
              const msg = encodeURIComponent(`Olá! Me chamo *${userName}*. Gostaria de saber mais sobre os cursos disponíveis na C&C Engenharia e Capacitação. Pode me ajudar?`);
              window.open(`https://wa.me/5521965554180?text=${msg}`, '_blank');
            }}
            style={{
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '0.85rem 1.75rem',
              fontSize: '0.9rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(37,211,102,0.35)',
              flexShrink: 0
            }}
          >
            <Phone size={18} /> Chamar no WhatsApp
          </button>
        </div>
      </div>
    );
  };

  // ABA: QUADRO DE AVISOS COMPLETO
  const renderQuadroAvisos = () => {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={28} className="text-warning" /> Quadro de Avisos Oficial
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
              Fique por dentro de todas as manutenções, prazos e novidades da C&C Engenharia.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {announcements.map(ann => {
            const isPinned = ann.is_pinned;
            return (
              <div key={ann.id} className="card" style={{ 
                padding: '1.75rem', 
                backgroundColor: isPinned ? '#FEF2F2' : 'white', 
                borderLeft: isPinned ? '6px solid #ef4444' : '6px solid var(--primary)',
                borderColor: isPinned ? '#FCA5A5' : '#cbd5e1',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                transition: 'transform 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isPinned && (
                      <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Pin size={10} fill="#ef4444" /> IMPORTANTE
                      </span>
                    )}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>{ann.title}</h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Publicado em: {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#334155', margin: '0 0 1.25rem 0', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {ann.body}
                </p>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                  <span>
                    Autor: <strong>{ann.author?.full_name || 'Coordenação Pedagógica'}</strong>
                  </span>
                  {ann.expires_at && (
                    <span>
                      Válido até: <strong>{new Date(ann.expires_at).toLocaleDateString('pt-BR')}</strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {announcements.length === 0 && (
            <div className="card text-center" style={{ padding: '4rem 2rem', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <Megaphone size={40} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#475569', margin: '0 0 0.25rem 0' }}>Mural Limpo!</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Nenhum aviso importante publicado para seu perfil no momento.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // CONTROLE GERAL DA RENDERIZAÇÃO
  // ═══════════════════════════════════════════
  
  // Se estiver carregando, exibe loader premium
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="animate-spin" />
        <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Carregando Portal C&C...</span>
      </div>
    );
  }

  // Se não aceitou o termo de compromisso de 6 meses, exibe o termo impeditivo
  if (studentData && studentData.terms_accepted === false) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="card text-center" style={{ maxWidth: '600px', width: '100%', padding: '3.5rem 2.5rem', border: '1px solid #fee2e2', backgroundColor: '#fff8f8', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
          <div style={{ display: 'inline-flex', padding: '1.25rem', backgroundColor: '#fee2e2', borderRadius: '50%', color: '#ef4444', marginBottom: '1.5rem' }}>
            <AlertCircle size={40} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem', color: '#991b1b', margin: 0 }}>Atenção: Prazo de Conclusão</h2>
          <p style={{ color: '#7f1d1d', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.6', fontWeight: 600, marginTop: '0.5rem' }}>
            Antes de acessar o seu portal, você precisa declarar ciência e concordância com os prazos limites da instituição.
          </p>
          
          <div style={{ backgroundColor: 'white', border: '1px solid #fee2e2', borderRadius: '16px', padding: '1.5rem', textAlign: 'left', marginBottom: '2.5rem', color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.6' }}>
            <p style={{ margin: 0 }}>
              Você terá o prazo máximo e improrrogável de <strong>6 (seis) meses</strong>, contados a partir da data de matrícula, para concluir integralmente todas as etapas do curso:
            </p>
            <ul style={{ margin: '0.75rem 0 0 0', paddingLeft: '1.25rem' }}>
              <li><strong>Parte Teórica:</strong> Aulas online gravadas e testes no portal EAD.</li>
              <li><strong>Parte Prática:</strong> Aulas práticas presença nos laboratórios.</li>
              <li><strong>Avaliação Final:</strong> Provas técnicas necessárias para emissão do certificado.</li>
            </ul>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '12px' }} 
            onClick={handleAcceptTerms}
          >
            <CheckCircle size={20} /> Estou ciente e de acordo
          </button>
        </div>
      </div>
    );
  }

  // Se houver pendência Abendi, exibe bloqueio amigável
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
                {doc.type === 'photo' ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setShowSelfieModal(true);
                      setTimeout(startCamera, 100);
                    }}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', cursor: 'pointer', margin: 0, borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
                  >
                    Tirar Selfie
                  </button>
                ) : (
                  <label className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', cursor: 'pointer', margin: 0, borderRadius: '8px' }}>
                    Selecionar Arquivo
                    <input 
                      type="file" 
                      hidden 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleFileUpload(e, doc.type)} 
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Roteamento condicional baseado na rota ativa
  const getActiveTabContent = () => {
    const path = location.pathname;
    
    if (path === '/area-aluno/cursos') {
      return renderCursos();
    } else if (path === '/area-aluno/ead') {
      return renderCursos(); // Aulas EAD também lista e direciona para player
    } else if (path === '/area-aluno/presencial') {
      return renderPresencial();
    } else if (path === '/area-aluno/desempenho') {
      return renderDesempenho();
    } else if (path === '/area-aluno/forum') {
      return renderForum();
    } else if (path === '/area-aluno/mensagens') {
      return renderMensagens();
    } else if (path === '/area-aluno/documentos') {
      return renderDocumentos();
    } else if (path === '/area-aluno/certificados') {
      return renderCertificates();
    } else if (path === '/area-aluno/financeiro') {
      return renderFinanceiro();
    } else if (path === '/area-aluno/vitrine') {
      return renderVitrine();
    } else if (path === '/area-aluno/avisos') {
      return renderQuadroAvisos();
    } else {
      return renderDashboard();
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {getActiveTabContent()}

      {/* MODAL DE CAPTURA DE SELFIE INTERATIVA COM MÁSCARA REDONDA DE PRIVACIDADE */}
      {showSelfieModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid #e2e8f0', textAlign: 'center', boxSizing: 'border-box' }} className="animate-scale-up">
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-dark)' }}>
              Capturar Selfie
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 1.5rem 0', lineHeight: 1.4 }}>
              Posicione seu rosto no centro da bola para encaixar a foto. A imagem será recortada em círculo para sua total privacidade.
            </p>

            {/* Vídeo com a Câmera */}
            <div style={{
              position: 'relative',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid var(--primary)',
              boxShadow: '0 8px 30px rgba(0, 75, 73, 0.15)',
              margin: '0 auto 1.5rem auto',
              backgroundColor: '#0f172a'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)' // Efeito espelho natural
                }}
              />
              {/* Círculo visual de encaixe */}
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '20px solid rgba(15, 23, 42, 0.7)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />
            </div>

            {/* Ações do Modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={captureSelfie}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 75, 73, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                Capturar e Enviar
              </button>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button 
                  onClick={() => {
                    stopCamera();
                    setShowSelfieModal(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: 'white',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#f1f5f9',
                    color: 'var(--primary-dark)',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Enviar Arquivo
                </button>
              </div>
            </div>

            {/* Input file oculto para envio manual alternativo */}
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept="image/*" 
              onChange={handleSelectLocalFile}
            />
          </div>
        </div>
      )}
    </div>
  );
}
