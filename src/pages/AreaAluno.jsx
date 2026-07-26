import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { studentsApi, classesApi, coursesApi, attendanceApi } from '../services/academic';
import { lmsApi } from '../services/lms';
import { ordersApi, messagesApi, generalAnnouncementsApi, siteContentApi, upcomingClassesApi } from '../services/misc';
import { connectSocket, onSocketMessage, onSocketStatus, isSocketConnected } from '../lib/socket';
import ChatPanel from '../components/ChatPanel';
import { financialApi, evaluationsApi } from '../services/financial';
import { uploadFile } from '../lib/api';
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
  const { session, userProfile } = useAuth();

  // Estados principais
  const [userName, setUserName] = useState('');
  const [studentId, setStudentId] = useState(null);
  const [turmaId, setTurmaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Olá');
  const [missingDocs, setMissingDocs] = useState(false);
  const [docsBlockado, setDocsBlockado] = useState(false);
  const [docsPendentes, setDocsPendentes] = useState([]);
  const [docsReprovados, setDocsReprovados] = useState([]);
  const [studentData, setStudentData] = useState(null);

  // Dados das abas
  const [myCourses, setMyCourses] = useState([]);
  const [upcomingPractical, setUpcomingPractical] = useState(null);
  const [hasConfirmedAttendance, setHasConfirmedAttendance] = useState(false);
  const [quizResults, setQuizResults] = useState([]);
  const [technicalEvals, setTechnicalEvals] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [inPersonModules, setInPersonModules] = useState([]);
  const [confirmingModuleId, setConfirmingModuleId] = useState(null);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [issuedCertificates, setIssuedCertificates] = useState([]);
  const [financialRecord, setFinancialRecord] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});

  useEffect(() => {
    if (studentData && studentData.id) {
      // Storage do backend serve os arquivos por URL direta (sem assinatura).
      setSignedUrls({
        photo: studentData.doc_photo_url,
        id: studentData.doc_id_url,
        cpf: studentData.doc_cpf_url,
        address: studentData.doc_address_url,
        education: studentData.doc_education_url,
      });
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
  // Chat: contatos por categoria, presença online, não-lidos e status do WS.
  const [contacts, setContacts] = useState({ professores: [], secretaria: [], alunos: [] });
  const [contactTab, setContactTab] = useState('professores');
  const [onlineIds, setOnlineIds] = useState([]);
  const [unreadBy, setUnreadBy] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const selectedContactRef = useRef(null);

  // Estados para Agendamento Prático (Fase 20.1)
  const [availablePracticalClasses, setAvailablePracticalClasses] = useState([]);
  const [schedulingActionLoading, setSchedulingActionLoading] = useState(null);

  // Estados para Modal de Câmera / Upload de Documentos
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [selfieStream, setSelfieStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [documentNotice, setDocumentNotice] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [activeUploadType, setActiveUploadType] = useState(null);
  const [isChatFull, setIsChatFull] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
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

  // Mantém uma ref do contato aberto (evita closure velha no WebSocket).
  useEffect(() => { selectedContactRef.current = selectedInstructor; }, [selectedInstructor]);

  // Chat em tempo real: conecta ao WebSocket e entrega mensagens ao vivo.
  useEffect(() => {
    if (!session?.user?.id) return;
    connectSocket();
    setWsConnected(isSocketConnected());
    const offMsg = onSocketMessage((data) => {
      if (data?.type !== 'message' || !data.message) return;
      const msg = data.message;
      const myId = session.user.id;
      const partnerId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
      if (selectedContactRef.current?.id === partnerId) {
        setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      } else if (msg.sender_id !== myId) {
        setUnreadBy(prev => ({ ...prev, [partnerId]: (prev[partnerId] || 0) + 1 }));
      }
    });
    const offStatus = onSocketStatus(setWsConnected);
    // Mantém o socket vivo entre telas (não desconecta ao trocar de aba).
    return () => { offMsg(); offStatus(); };
  }, [session?.user?.id]);

  // Carregamento geral de dados do Supabase
  const fetchData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      // 1. Perfil (via contexto)
      const fullName = userProfile?.full_name || session.user.email.split('@')[0];
      setUserName(fullName);

      // 2. Cadastro do aluno
      const { students } = await studentsApi.list({ user_id: session.user.id });
      const student = students && students[0];

      let activeStudentId = null;
      let activeTurmaId = null;
      const { classes: allClasses } = await classesApi.list();

      if (student) {
        activeStudentId = student.id;
        activeTurmaId = student.turma_id;
        setStudentId(student.id);
        setTurmaId(student.turma_id);
        setStudentData(student);
        const DOC_TYPES = ['photo', 'id', 'cpf', 'address', 'education'];
        const pend = DOC_TYPES.filter(t => !student['doc_' + t + '_url']);
        const reprov = DOC_TYPES.filter(t => student['doc_' + t + '_status'] === 'rejected');
        setDocsPendentes(pend);
        setDocsReprovados(reprov);
        setDocsBlockado(pend.length > 0 || reprov.length > 0);
        const hasMissing = !student.doc_photo_url || !student.doc_id_url || !student.doc_cpf_url || !student.doc_address_url || !student.doc_education_url;
        setMissingDocs(hasMissing);
      }

      // 3. Cursos matriculados (EAD) + progresso — vários cursos por aluno.
      const { progress: progressData } = await lmsApi.progress();
      const turma = (allClasses || []).find(c => c.id === activeTurmaId);
      try {
        const { courses } = await lmsApi.myCourses();
        const enrolledCourses = courses || [];
        setMyCourses(enrolledCourses);
        const structures = await Promise.all(enrolledCourses.map(async course => {
          try {
            const { modules } = await lmsApi.structure(course.id);
            return (modules || []).filter(module => module.is_in_person).map(module => ({ ...module, course_title: course.title }));
          } catch { return []; }
        }));
        const presencial = structures.flat();
        if (activeTurmaId) {
          await Promise.all(presencial.map(async module => {
            try {
              const { attendance } = await attendanceApi.moduleList(activeTurmaId, module.id);
              const own = (attendance || []).find(row => row.student_id === activeStudentId);
              module.attendance = own || null;
            } catch { module.attendance = null; }
          }));
        }
        setInPersonModules(presencial);
      } catch {
        // Fallback (backend antigo sem /my-courses): usa o curso da turma.
        const lmsCourseId = turma?.lms_course_id;
        if (student?.has_lms_access && lmsCourseId) {
          try {
            const { course } = await coursesApi.get(lmsCourseId);
            if (course && course.is_published) {
              const { lessons: courseLessons } = await lmsApi.courseLessons(lmsCourseId);
              const done = (courseLessons || []).filter(l => (progressData || []).some(p => p.lesson_id === l.id && p.is_completed)).length;
              const percentage = courseLessons?.length ? Math.round((done / courseLessons.length) * 100) : 0;
              setMyCourses([{ ...course, progress_percent: percentage }]);
            }
          } catch { /* sem curso liberado */ }
        }
      }

      // 4. Próxima aula prática presencial
      if (activeTurmaId) {
        const { classes: uc } = await upcomingClassesApi.list(activeTurmaId);
        const upcoming = uc && uc[0];
        if (upcoming) {
          setUpcomingPractical(upcoming);
          if (activeStudentId) {
            const { attendance } = await attendanceApi.list({ student_id: activeStudentId, class_id: activeTurmaId });
            setHasConfirmedAttendance(!!(attendance && attendance.some(a => a.status === 'presente')));
          }
        }
      }

      // 5. Histórico de presença
      if (activeStudentId) {
        const { attendance: attData } = await attendanceApi.list({ student_id: activeStudentId });
        setAttendanceHistory(attData || []);
      }

      // 6. Notas de provas + avaliações técnicas
      const { results: qResults } = await lmsApi.results({});
      if (qResults) setQuizResults(qResults);
      if (activeStudentId) {
        const { evaluations } = await evaluationsApi.list(activeStudentId);
        if (evaluations) setTechnicalEvals(evaluations);
      }

      // 7. Mural de comunicados
      const { announcements: annData } = await generalAnnouncementsApi.list();
      if (annData) {
        const activeAnn = annData.filter(a => {
          const roles = Array.isArray(a.target_roles) ? a.target_roles : [];
          return roles.includes('aluno');
        });
        setAnnouncements(activeAnn.length ? activeAnn : annData);
      }

      // 8. Certificados
      if (activeStudentId) {
        const { certificates } = await lmsApi.certificates({ student_id: activeStudentId });
        setIssuedCertificates(certificates || []);
        setCertificatesCount(certificates?.length || 0);
      }

      // 9. Financeiro
      if (activeStudentId) {
        const { records } = await financialApi.listRecords(activeStudentId);
        setFinancialRecord(records && records[0] ? records[0] : null);
      }

      // 10. Fórum, instrutores, vitrine
      loadForum(activeTurmaId);
      // Contatos/mensagens agora são geridos pelo componente ChatPanel.
      loadAvailableCourses();

      // 11. Aulas práticas de fim de semana disponíveis
      const courseName = turma?.course_name;
      if (courseName) {
        const practicals = (allClasses || []).filter(p => p.schedule === 'Aula prática - Final de semana' && p.course_name === courseName);
        const mappedPracticals = practicals.map(p => ({
          ...p,
          confirmedCount: p.practical_confirmed || 0,
          pendingCount: p.practical_pending || 0,
          availableVacancies: Math.max(0, (p.max_capacity || 10) - (p.practical_confirmed || 0))
        }));
        setAvailablePracticalClasses(mappedPracticals);
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

  useEffect(() => {
    const p = location.pathname;
    if (p.includes('/presencial'))      setActiveTab('presencial');
    else if (p.includes('/desempenho'))  setActiveTab('desempenho');
    else if (p.includes('/mensagens'))   setActiveTab('mensagens');
    else if (p.includes('/avisos'))      setActiveTab('avisos');
    else if (p.includes('/forum'))       setActiveTab('forum');
    else if (p.includes('/financeiro'))  setActiveTab('financeiro');
    else if (p.includes('/documentos'))  setActiveTab('documentos');
    else if (p.includes('/certificados'))setActiveTab('certificados');
    else if (p.includes('/vitrine'))     setActiveTab('vitrine');
    else                                 setActiveTab('cursos');
  }, [location.pathname]);

  // Bloqueia navegação enquanto docs pendentes — deve ficar antes de qualquer return
  useEffect(() => {
    if (!loading && docsBlockado && !location.pathname.includes('/documentos')) {
      navigate('/area-aluno/documentos', { replace: true });
    }
  }, [loading, docsBlockado, location.pathname]);

  // Função para carregar fórum (com resiliência no localStorage)
  const loadForum = async (activeTurmaId) => {
    try {
      const { topics } = await lmsApi.allForumTopics();
      setForumTopics((topics || []).map(t => ({ ...t, student: { full_name: t.student_name } })));
    } catch (err) {
      console.warn("Fórum: Usando fallback resiliente do localStorage");
      const localForum = localStorage.getItem('local_forum_topics');
      if (localForum) {
        setForumTopics(JSON.parse(localForum));
      } else {
        setForumTopics([]);
      }
    }
  };

  // Carregar cursos disponíveis para matrícula (Vitrine integrada ao CMS)
  const loadAvailableCourses = async () => {
    try {
      // 1. Cursos do LMS (catálogo público)
      const { courses: lmsCourses } = await coursesApi.listPublic();

      // 2. CMS do site (site_content)
      let siteContent = {};
      try {
        const { content } = await siteContentApi.get();
        siteContent = content?.['main-content'] || content || {};
      } catch { siteContent = {}; }

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
          // Curso sem preço cadastrado fica sem preço: os valores fictícios que
          // ficavam aqui eram indistinguíveis dos reais para o aluno.
          price_card: priceCard || null,
          price_pix: pricePix || null,
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
        
        // Fallback offline: só o texto do CMS local. Não há tabela de preços
        // embutida aqui — valores congelados no código não acompanham reajuste
        // e chegavam ao aluno como se fossem os preços vigentes.
        let pricePix = null;
        let priceCard = null;
        let maxInstallments = 10;

        if (investment.pix) {
          const match = investment.pix.match(/R\$\s*([0-9.,]+)/);
          if (match) pricePix = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        }
        if (investment.credit) {
          const match = investment.credit.match(/R\$\s*([0-9.,]+)/);
          if (match) priceCard = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
          const matchInstallments = investment.credit.match(/([0-9]+)\s*x/i);
          if (matchInstallments) maxInstallments = parseInt(matchInstallments[1], 10);
        }

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
  // Carrega os contatos do chat (professores, secretaria, colegas) + presença.
  const loadContacts = async () => {
    try {
      const data = await messagesApi.contacts();
      const next = {
        professores: data.professores || [],
        secretaria: data.secretaria || [],
        alunos: data.alunos || [],
      };
      setContacts(next);
      setOnlineIds(data.online || []);
      // Abre na primeira categoria que tiver alguém e já seleciona o 1º contato.
      const firstTab = next.professores.length ? 'professores'
        : next.secretaria.length ? 'secretaria'
        : next.alunos.length ? 'alunos' : 'professores';
      setContactTab(firstTab);
      const first = next[firstTab]?.[0];
      if (first && !selectedContactRef.current) handleSelectInstructorChat(first);
    } catch {
      setContacts({ professores: [], secretaria: [], alunos: [] });
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
      const { topic } = await lmsApi.createTopic(topicPayload);
      setForumTopics(prev => [{ ...topic, student: { full_name: userName } }, ...prev]);
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
      const { replies } = await lmsApi.topicReplies(topic.id);
      setTopicReplies(replies || []);
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
      const { reply } = await lmsApi.createReply(replyPayload);
      setTopicReplies(prev => [...prev, { ...reply, author: { full_name: userName, role: 'aluno' } }]);
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
    setUnreadBy(prev => ({ ...prev, [inst.id]: 0 }));
    if (!session?.user?.id) return;

    try {
      const { messages } = await messagesApi.list(inst.id);
      setChatMessages(messages || []);
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
      const { message } = await messagesApi.create({ receiver_id: selectedInstructor.id, content: newChatMessage.trim() });
      setChatMessages(prev => [...prev, message]);
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
      await attendanceApi.create({
        student_id: studentId,
        class_id: upcomingPractical.id,
        status: 'presente',
        confirmed_by_student: true,
      });

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

  const handleConfirmModuleAttendance = async (moduleId) => {
    setConfirmingModuleId(moduleId);
    try {
      const { attendance } = await attendanceApi.confirmAsStudent(moduleId);
      setInPersonModules(current => current.map(module => module.id === moduleId
        ? { ...module, attendance: { ...(module.attendance || {}), ...(attendance || {}), confirmed_by_student: true } }
        : module));
      alert('Participação na aula presencial confirmada. O professor fará a chamada definitiva.');
    } catch (err) {
      alert('Não foi possível confirmar: ' + err.message);
    } finally {
      setConfirmingModuleId(null);
    }
  };

  const startCameraLegacy = async () => {
    setCameraError('');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('CAMERA_UNAVAILABLE');
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
      } catch (constraintError) {
        if (constraintError?.name === 'NotAllowedError' || constraintError?.name === 'SecurityError') {
          throw constraintError;
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setSelfieStream(stream);
      window.setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }, 0);
    } catch (err) {
      const message = err?.message === 'CAMERA_UNAVAILABLE'
        ? 'A câmera não está disponível neste navegador. Abra o portal pelo Chrome/Safari usando HTTPS ou use a câmera nativa do celular.'
        : err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
          ? 'O acesso à câmera foi bloqueado. Libere a permissão nas configurações do navegador e tente novamente.'
          : 'Não foi possível iniciar a câmera. Tente novamente ou use a câmera nativa do celular.';
      setCameraError(message);
      console.error("Erro ao acessar a câmera:", err);
    }
  };

  const stopCameraLegacy = () => {
    if (selfieStream) {
      selfieStream.getTracks().forEach(track => track.stop());
      setSelfieStream(null);
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !selfieStream) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('A câmera ainda está carregando. Aguarde um instante e tente novamente.');
      return;
    }
    
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

  const handleSelectLocalFile = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const uploaded = await handleFileUpload(e.target.files[0], 'photo');
      if (uploaded) {
        setShowSelfieModal(false);
        stopCamera();
      }
      e.target.value = '';
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

    if (docType === 'photo') {
      const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!acceptedImageTypes.includes(file.type)) {
        setDocumentNotice({ type: 'error', title: 'Formato não aceito', message: 'Escolha uma foto nos formatos JPG, PNG ou WEBP.' });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setDocumentNotice({ type: 'error', title: 'Foto muito grande', message: 'A foto deve ter no máximo 10 MB. Reduza o tamanho do arquivo e tente novamente.' });
        return false;
      }
    }

    try {
      const { url: publicUrl } = await uploadFile(file, `student-docs/${studentId}`);
      await studentsApi.update(studentId, { [`doc_${docType}_url`]: publicUrl });

      setDocumentNotice({
        type: 'success',
        title: docType === 'photo' ? 'Foto enviada' : 'Documento enviado',
        message: docType === 'photo' ? 'Sua foto foi salva e enviada para auditoria.' : 'O documento foi enviado para auditoria com sucesso.'
      });
      fetchData();
      return true;
    } catch (error) {
      console.error('Erro no upload de documento:', error);
      setDocumentNotice({ type: 'error', title: 'Falha no envio', message: 'Não foi possível enviar o arquivo. Verifique sua conexão e tente novamente.' });
      return false;
    }
  };

  // Aceitar termo de 6 meses
  const handleAcceptTerms = async () => {
    if (!studentId) return;

    try {
      await studentsApi.update(studentId, { terms_accepted: true });

      // Atualiza o estado local para fechar o modal imediatamente
      setStudentData(prev => prev ? { ...prev, terms_accepted: true } : null);
      alert('Obrigado! Termo de compromisso aceito com sucesso.');
    } catch (err) {
      console.error('Erro ao aceitar termo de compromisso:', err);
      alert('Não foi possível registrar o seu aceite. Por favor, tente novamente.');
    }
  };

  // Baixar Certificado Conquistado (Gera PDF Client-side)
  const handleDownloadPDF = async (cert) => {
    // O backend guarda os dados da emissão em cert.metadata e o código em cert.code
    const meta = cert.metadata || {};
    const studentObj = {
      name: meta.student_name || cert.student_name || userName,
      cpf: meta.cpf || studentData?.cpf || ' --- ',
      class: meta.course_title || cert.course_title || 'Curso CEC'
    };
    const grade = meta.grade || cert.grade;
    const hours = meta.hours || cert.hours;
    await generateDocument('custom_certificate', studentObj, {
      content: `Certificamos que ${studentObj.name}, portador(a) do CPF ${studentObj.cpf}, concluiu com aproveitamento o curso de ${studentObj.class}${hours ? `, com carga horária de ${hours} horas` : ''}${grade ? `, obtendo nota média ${String(grade).replace('.', ',')}` : ''}.`,
      uuid: cert.code || cert.certificate_code,
      grade, hours
    });
  };

  // Emitir o próprio certificado (validação de elegibilidade é do servidor)
  const [claimingCourseId, setClaimingCourseId] = useState(null);
  const [activeTab, setActiveTab] = useState('cursos');
  const handleClaimCertificate = async (course) => {
    setClaimingCourseId(course.id);
    try {
      const { certificate } = await lmsApi.claimCertificate(course.id);
      setIssuedCertificates(prev => [certificate, ...prev.filter(c => c.id !== certificate.id)]);
      setCertificatesCount(prev => prev + 1);
      alert(`Certificado emitido com sucesso! Código de autenticidade: ${certificate.code.substring(0, 8).toUpperCase()}`);
    } catch (err) {
      alert(err.message || 'Não foi possível emitir o certificado.');
    } finally {
      setClaimingCourseId(null);
    }
  };

  // Redireciona o aluno para a primeira aula do curso EAD
  const handleStartCourse = async (courseId) => {
    try {
      const { lessons } = await lmsApi.courseLessons(courseId);
      if (!lessons || lessons.length === 0) {
        alert('Este curso ainda não possui aulas teóricas EAD cadastradas.');
        return;
      }
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

      {/* BANNER: documentos pendentes ou reprovados */}
      {studentData && (() => {
        const docTypes = ['photo','id','cpf','address','education'];
        const pendentes = docTypes.filter(t => !studentData['doc_' + t + '_url']);
        const reprovados = docTypes.filter(t => studentData['doc_' + t + '_status'] === 'rejected');
        if (pendentes.length === 0 && reprovados.length === 0) return null;
        const isReprov = reprovados.length > 0;
        return (
          <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: isReprov ? '#fee2e2' : '#fef3c7', border: '1px solid ' + (isReprov ? '#fca5a5' : '#fde68a'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertCircle size={18} color={isReprov ? '#b91c1c' : '#b45309'} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isReprov ? '#b91c1c' : '#92400e' }}>
                {isReprov
                  ? reprovados.length + ' documento(s) reprovado(s) — revise e reenvie para liberar seu certificado.'
                  : pendentes.length + ' documento(s) pendente(s) — envie para manter conformidade Abendi.'}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('documentos')}
              style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', background: isReprov ? '#b91c1c' : '#b45309', color: 'white', whiteSpace: 'nowrap' }}>
              Enviar agora
            </button>
          </div>
        );
      })()}

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

      <div className="aa-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
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
      await studentsApi.update(studentData.id, { practical_class_id: classId, practical_class_status: 'pendente' });
      const error = null;

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
      await studentsApi.update(studentData.id, { practical_class_id: null, practical_class_status: null });
      const error = null;

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
      <div className="aa-stack" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
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
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '480px' }}>
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
        </div>

        {/* CARD PRESENCIAL DO FINAL DE SEMANA */}
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1.5rem' }}>Cronograma Presencial</h3>
          {inPersonModules.map(module => {
            const address = [module.street, module.address_number, module.address_complement, module.neighborhood, module.city, module.state, module.cep].filter(Boolean).join(', ');
            const confirmed = module.attendance?.confirmed_by_student;
            return (
              <div key={module.id} className="card" style={{ padding: '1.25rem', marginBottom: '1rem', borderLeft: '4px solid #0f766e' }}>
                <strong style={{ display: 'block', marginBottom: '.25rem' }}>{module.title}</strong>
                <span style={{ fontSize: '.8rem', color: '#64748b' }}>{module.course_title}</span>
                <div style={{ display: 'grid', gap: '.45rem', marginTop: '.8rem', fontSize: '.84rem' }}>
                  {module.in_person_date && <span><Calendar size={14} style={{ verticalAlign: 'middle' }} /> {new Date(module.in_person_date).toLocaleDateString('pt-BR')} · {module.start_time?.slice(0, 5)}–{module.end_time?.slice(0, 5)}</span>}
                  {address && <span><MapPin size={14} style={{ verticalAlign: 'middle' }} /> {address}</span>}
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    {address && <a className="btn btn-secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Ver no Maps</a>}
                    {module.whatsapp_url && <a className="btn btn-secondary" href={module.whatsapp_url} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
                    <button className="btn" disabled={confirmed || confirmingModuleId === module.id} onClick={() => handleConfirmModuleAttendance(module.id)} style={{ background: confirmed ? '#dcfce7' : '#0f766e', color: confirmed ? '#166534' : 'white' }}>
                      {confirmed ? 'Participação confirmada' : confirmingModuleId === module.id ? 'Confirmando...' : 'Confirmar participação'}
                    </button>
                  </div>
                  {module.attendance?.status && <small>Chamada do professor: <strong>{module.attendance.status}</strong></small>}
                </div>
              </div>
            );
          })}
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
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '2rem' }}>
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
    <div className="aa-stack" style={{ display: 'grid', gridTemplateColumns: selectedTopic ? '1fr 1fr' : '1.2fr 0.8fr', gap: '2rem', flexWrap: 'wrap' }}>
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
  const renderMensagens = () => createPortal((
    <div className="aa-chat-window"><ChatPanel /></div>
  ), document.body);

  // ABA 7: SECRETARIA E DOCUMENTOS (Abendi Compliance)
  const DOC_DEFS = [
    { type: 'photo',     label: 'Foto de Rosto',               hint: 'Selfie frontal, fundo claro, sem óculos ou boné.',              accept: 'image/*',      allowCamera: true },
    { type: 'id',        label: 'RG ou CNH (frente e verso)',   hint: 'Documento oficial com foto. PDF ou imagem nítida.',             accept: '.pdf,image/*', allowCamera: true },
    { type: 'cpf',       label: 'CPF',                          hint: 'Cartão CPF físico ou comprovante da Receita Federal.',          accept: '.pdf,image/*', allowCamera: true },
    { type: 'address',   label: 'Comprovante de Residência',    hint: 'Conta de luz, água ou telefone com menos de 90 dias.',         accept: '.pdf,image/*', allowCamera: true },
    { type: 'education', label: 'Comprovante de Escolaridade',  hint: 'Diploma, certificado ou histórico escolar.',                   accept: '.pdf,image/*', allowCamera: true },
  ];

  const docUrl    = (type) => studentData ? studentData['doc_' + type + '_url']    : null;
  const docStatus = (type) => studentData ? studentData['doc_' + type + '_status'] : null;
  const docReject = (type) => studentData ? studentData['doc_' + type + '_reject'] : null;

  const docsTotal      = DOC_DEFS.length;
  const docsEnviados   = DOC_DEFS.filter(d => !!docUrl(d.type)).length;
  const docsAprovados  = DOC_DEFS.filter(d => docStatus(d.type) === 'approved').length;
  const docsRejeitados = DOC_DEFS.filter(d => docStatus(d.type) === 'rejected').length;

  const STATUS_CFG = {
    approved: { color: '#10b981', bg: '#d1fae5', border: '#a7f3d0', label: 'Aprovado',    icon: 'checkmark' },
    pending:  { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'Em analise',  icon: 'clock'     },
    rejected: { color: '#ef4444', bg: '#fee2e2', border: '#fca5a5', label: 'Reprovado',   icon: 'x'         },
    missing:  { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Nao enviado', icon: 'circle'    },
  };

  const getDocSK = (type) => {
    if (!docUrl(type)) return 'missing';
    return docStatus(type) || 'pending';
  };

  const openCameraForDoc = async (type) => {
    setActiveUploadType(type);
    setCameraError('');
    setShowSelfieModal(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        setSelfieStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        try {
          const s2 = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setSelfieStream(s2);
          if (videoRef.current) videoRef.current.srcObject = s2;
        } catch (e2) { setCameraError('Camera nao disponivel: ' + (e2.message || 'Permissao negada')); }
      }
    }, 150);
  };

  const stopCamera = () => {
    if (selfieStream) selfieStream.getTracks().forEach(t => t.stop());
    setSelfieStream(null);
    setShowSelfieModal(false);
    setActiveUploadType(null);
    setCameraError('');
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'doc_' + activeUploadType + '_' + Date.now() + '.jpg', { type: 'image/jpeg' });
      stopCamera();
      await handleFileUploadDoc({ target: { files: [file] } }, activeUploadType);
    }, 'image/jpeg', 0.92);
  };

  const handleFileUploadDoc = async (e, type) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !studentId) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Arquivo muito grande. Maximo 5 MB.'); return; }
    setUploadingDoc(type);
    setUploadError(null);
    try {
      con
      patch['doc_' + type + '_url']    = url;
      patch['doc_' + type + '_status'] = 'pending';
      patch['doc_' + type + '_reject'] = null;
      await studentsApi.update(studentId, patch);
      setStudentData(prev => ({ ...prev, ...patch }));
    } catch (err) {
      setUploadError('Falha ao enviar: ' + (err.message || 'tente novamente'));
    } finally {
      setUploadingDoc(null);
    }
  };

  const renderDocumentos = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)', margin: '0 0 4px' }}>Secretaria Digital - Documentos</h3>
        <p style={{ fontSize: '0.83rem', color: '#64748b', margin: 0 }}>Envie seus documentos para manter conformidade com a Abendi e liberar seu certificado.</p>
      </div>

      <div className="card" style={{ padding: '1.25rem', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Progresso da documentacao</span>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{docsAprovados} aprovado(s) de {docsTotal}</span>
        </div>
        <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: Math.round((docsAprovados / docsTotal) * 100) + '%', background: 'linear-gradient(90deg,#10b981,#059669)', borderRadius: '99px', transition: 'width .4s' }} />
        </div>
        {docsRejeitados > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>
            {docsRejeitados} documento(s) reprovado(s) - veja o motivo e reenvie.
          </div>
        )}
        {uploadError && (
          <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>
            {uploadError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {DOC_DEFS.map(function(doc) {
          var sk   = getDocSK(doc.type);
          var sc   = STATUS_CFG[sk];
          var url  = docUrl(doc.type);
          var note = docReject(doc.type);
          var busy = uploadingDoc === doc.type;
          return (
            <div key={doc.type} className="card" style={{ padding: '1rem 1.25rem', background: 'white', borderLeft: '4px solid ' + sc.border, display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 750, fontSize: '0.9rem', color: '#1e293b' }}>{doc.label}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: sc.color, background: sc.bg, border: '1px solid ' + sc.border, padding: '1px 8px', borderRadius: '99px' }}>{sc.label}</span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b' }}>{doc.hint}</p>
                {sk === 'rejected' && note && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#b91c1c', background: '#fee2e2', borderRadius: '6px', padding: '0.35rem 0.6rem', fontWeight: 600 }}>Motivo: {note}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end', flexShrink: 0 }}>
                {busy ? (
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Enviando...</span>
                ) : (
                  <React.Fragment>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-light)', padding: '0.3rem 0.75rem', borderRadius: '6px' }}>
                        Ver arquivo
                      </a>
                    )}
                    {doc.allowCamera && (
                      <button onClick={function(){ openCameraForDoc(doc.type); }}
                        style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        📷 {url ? 'Tirar nova foto' : 'Usar câmera'}
                      </button>
                    )}
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', background: '#ede9fe', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      📎 {url ? 'Substituir arquivo' : 'Anexar arquivo'}
                      <input type="file" hidden accept={doc.accept} onChange={function(e){ handleFileUploadDoc(e, doc.type); e.target.value = ''; }} />
                    </label>
                  </React.Fragment>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: '1.25rem', background: '#f0f9ff', borderColor: '#bae6fd' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileCheck size={16} /> Diretrizes Abendi
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: '#0369a1', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: 1.5 }}>
          <li>Arquivos legíveis, sem cortes nas bordas.</li>
          <li>Foto frontal, fundo claro, sem adereços.</li>
          <li>PDF, PNG, JPG — maximo 5 MB por arquivo.</li>
          <li>Certificado bloqueado ate todos os documentos serem aprovados.</li>
        </ul>
      </div>

      {showSelfieModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  📷 {DOC_DEFS.find(function(d){ return d.type === activeUploadType; })?.label || 'Documento'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748b' }}>Posicione o documento na frente da câmera e capture.</p>
              </div>
              <button onClick={stopCamera}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '1.1rem', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                ✕
              </button>
            </div>

            {cameraError ? (
              /* Câmera indisponível — oferecer upload de arquivo como fallback */
              <div style={{ padding: '1.25rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>📵</div>
                <p style={{ margin: 0, fontSize: '0.83rem', color: '#92400e', fontWeight: 600 }}>{cameraError}</p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400e' }}>Você ainda pode enviar uma foto ou PDF do arquivo:</p>
                <label style={{ fontWeight: 700, color: 'white', background: '#4f46e5', padding: '0.65rem 1.25rem', borderRadius: '10px', cursor: 'pointer', display: 'inline-block' }}>
                  📎 Escolher arquivo do dispositivo
                  <input type="file" hidden accept="image/*,.pdf"
                    onChange={function(e){ stopCamera(); handleFileUploadDoc(e, activeUploadType); e.target.value = ''; }} />
                </label>
              </div>
            ) : (
              <React.Fragment>
                {/* Preview da câmera */}
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'cover' }} />
                  {/* Guia de enquadramento */}
                  <div style={{ position: 'absolute', inset: '10%', border: '2px dashed rgba(255,255,255,0.4)', borderRadius: '8px', pointerEvents: 'none' }} />
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button onClick={stopCamera}
                    style={{ padding: '0.7rem', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', color: '#475569', fontSize: '0.85rem' }}>
                    Cancelar
                  </button>
                  <button onClick={captureFromCamera}
                    style={{ padding: '0.7rem', background: '#2563eb', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    📸 Capturar
                  </button>
                </div>
                {/* Alternativa: subir arquivo */}
                <div style={{ textAlign: 'center', paddingTop: '0.25rem', borderTop: '1px solid #f1f5f9' }}>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                    ou prefere <span style={{ color: '#4f46e5', textDecoration: 'underline' }}>escolher um arquivo</span>
                    <input type="file" hidden accept="image/*,.pdf"
                      onChange={function(e){ stopCamera(); handleFileUploadDoc(e, activeUploadType); e.target.value = ''; }} />
                  </label>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
  // ABA 8: MEUS CERTIFICADOS
  const renderCertificates = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-dark)', margin: 0 }}>Meus Certificados de Conclusão</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Visualize e baixe seus certificados digitais emitidos pela C&C Engenharia e Capacitação.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
        {issuedCertificates.map(cert => (
          <div key={cert.id} className="card" style={{ padding: '1.5rem', backgroundColor: 'white', display: 'flex', gap: '1rem', alignItems: 'center', borderLeft: '5px solid #10b981' }}>
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', padding: '1rem', borderRadius: '12px' }}>
              <Award size={36} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary-dark)', margin: '0 0 4px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{cert.metadata?.course_title || cert.course_title || 'Curso CEC'}</h4>
              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>Emitido em: {new Date(cert.issued_at).toLocaleDateString('pt-BR')} · Código {(cert.code || '').substring(0, 8).toUpperCase()}</span>
              
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
                <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Elegível · Requisitos concluídos 🎉</span>

                <button
                  className="btn btn-primary"
                  disabled={claimingCourseId === course.id}
                  onClick={() => handleClaimCertificate(course)}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', borderRadius: '6px', fontWeight: '750', display: 'inline-flex', alignItems: 'center', gap: '4px', opacity: claimingCourseId === course.id ? 0.6 : 1 }}
                >
                  <Award size={14} /> {claimingCourseId === course.id ? 'Emitindo...' : 'Emitir meu certificado'}
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
      <div className="aa-stack" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        {/* PARCELAS */}
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '1.25rem' }}>Mensalidades e Faturas</h3>
          
          <div className="card" style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '560px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '1.5rem' }}>
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
  const renderAvisos = () => renderCursos();

  const PORTAL_TABS = [
    { id: 'cursos', label: 'Meus Cursos' },
    { id: 'presencial', label: 'Aulas Presenciais' },
    { id: 'desempenho', label: 'Desempenho' },
    { id: 'mensagens', label: 'Mensagens' },
    { id: 'avisos', label: 'Avisos' },
    { id: 'forum', label: 'Forum' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'certificados', label: 'Certificados' },
    { id: 'vitrine', label: 'Vitrine' },
  ];

  const getActiveTabContent = () => {
    switch (activeTab) {
      case 'cursos':        return renderDashboard();
      case 'presencial':    return renderPresencial();
      case 'desempenho':    return renderDesempenho();
      case 'mensagens':     return renderMensagens();
      case 'avisos':        return renderAvisos();
      case 'forum':         return renderForum();
      case 'financeiro':    return renderFinanceiro();
      case 'documentos':    return renderDocumentos();
      case 'certificados':  return renderCertificates();
      case 'vitrine':       return renderVitrine();
      default:              return renderDashboard();
    }
  };

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

  // ── BLOQUEIO: documentos pendentes ou reprovados ──────────────────────
  // O aluno só acessa o portal depois de enviar todos os documentos.
  // Se algum foi reprovado, também fica bloqueado até reenviar.
  const docTypes = ['photo', 'id', 'cpf', 'address', 'education'];
  const docsPendentes  = studentData ? docTypes.filter(t => !studentData['doc_' + t + '_url']) : docTypes;
  const docsReprovados = studentData ? docTypes.filter(t => studentData['doc_' + t + '_status'] === 'rejected') : [];
  const docsBlockado   = docsPendentes.length > 0 || docsReprovados.length > 0;

  // Redireciona para documentos se tentar acessar outra rota enquanto bloqueado


  if (docsBlockado && !location.pathname.includes('/documentos')) {
    const isReprov = docsReprovados.length > 0;
    const docLabels = { photo: 'Foto de Rosto', id: 'RG ou CNH', cpf: 'CPF', address: 'Comprovante de Residência', education: 'Comprovante de Escolaridade' };
    const pendList  = [...docsPendentes, ...docsReprovados];

    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: '560px', width: '100%', background: 'white', borderRadius: '24px', padding: '2.5rem 2rem', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.1)', border: isReprov ? '1px solid #fca5a5' : '1px solid #fde68a' }}>
          {/* Ícone */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '1.1rem', borderRadius: '50%', background: isReprov ? '#fee2e2' : '#fef3c7', marginBottom: '1rem' }}>
              <AlertCircle size={40} color={isReprov ? '#b91c1c' : '#b45309'} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: isReprov ? '#991b1b' : '#92400e', margin: '0 0 0.5rem' }}>
              {isReprov ? 'Documentos reprovados' : 'Documentos obrigatórios pendentes'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              {isReprov
                ? 'Um ou mais documentos foram reprovados pela secretaria. Corrija e reenvie para liberar o acesso ao portal.'
                : 'Para acessar o portal de estudos, você precisa enviar todos os documentos exigidos pela norma Abendi.'}
            </p>
          </div>

          {/* Lista de documentos pendentes/reprovados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {pendList.map(t => {
              const reprovado = docsReprovados.includes(t);
              const note = studentData['doc_' + t + '_reject'];
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 1rem', borderRadius: '10px', background: reprovado ? '#fee2e2' : '#fef9e7', border: '1px solid ' + (reprovado ? '#fca5a5' : '#fde68a') }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>{reprovado ? '✗' : '○'}</span>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: reprovado ? '#991b1b' : '#92400e' }}>
                      {docLabels[t]}
                    </span>
                    {reprovado && note && (
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>Motivo: {note}</div>
                    )}
                    {!reprovado && (
                      <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '2px' }}>Não enviado</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de ação */}
          <button
            onClick={() => setActiveTab('documentos')}
            style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none', cursor: 'pointer', background: isReprov ? '#b91c1c' : '#b45309', color: 'white', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FileCheck size={20} /> Ir para Envio de Documentos
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', marginBottom: 0 }}>
            Após o envio, a secretaria analisará em até 1 dia útil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: isChatFull ? '100%' : '1200px', margin: '0 auto', padding: isChatFull ? '1.25rem 1.5rem' : '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .aa-stack { grid-template-columns: 1fr !important; }
        }
        /* Chat como JANELA: preenche a area a direita do menu, abaixo do topo. */
        .aa-chat-window {
          position: fixed;
          top: 70px; left: 260px; right: 0; bottom: 0;
          background: #ffffff;
          z-index: 20;
          display: flex;
        }
        @media (max-width: 768px) {
          .aa-chat-window { left: 0; top: 71px; }
        }
      `}</style>
      {getActiveTabContent()}

      {/* MODAL DE CAPTURA DE SELFIE INTERATIVA COM MÁSCARA REDONDA DE PRIVACIDADE */}
      {showSelfieModal && createPortal((
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '440px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid #e2e8f0', textAlign: 'center', boxSizing: 'border-box' }} className="animate-scale-up">
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary-dark)' }}>
              Enviar foto de identificação
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 1.5rem 0', lineHeight: 1.4 }}>
              Use a câmera ou escolha uma foto JPG, PNG ou WEBP já salva no seu dispositivo.
            </p>

            {/* Vídeo com a Câmera */}
            <div style={{
              position: 'relative',
              width: 'min(280px, 70vw)',
              height: 'min(280px, 70vw)',
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

            {cameraError && (
              <div role="alert" style={{ margin: '-0.5rem 0 1rem', padding: '0.75rem', borderRadius: '10px', background: '#fff7ed', color: '#9a3412', fontSize: '0.8rem', lineHeight: 1.4 }}>
                {cameraError}
              </div>
            )}

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
                  Escolher foto salva
                </button>
              </div>
            </div>

            {/* Input file oculto para envio manual alternativo */}
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSelectLocalFile}
            />
          </div>
        </div>
      ), document.body)}

      {documentNotice && createPortal((
        <div role="dialog" aria-modal="true" aria-labelledby="document-notice-title" style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15, 23, 42, 0.72)' }}>
          <div style={{ width: 'min(430px, 100%)', padding: '1.75rem', borderRadius: '20px', background: '#fff', boxShadow: '0 24px 60px rgba(15,23,42,.32)', textAlign: 'center' }}>
            <div style={{ width: 58, height: 58, margin: '0 auto 1rem', borderRadius: '50%', display: 'grid', placeItems: 'center', background: documentNotice.type === 'success' ? '#ecfdf5' : '#fef2f2', color: documentNotice.type === 'success' ? '#059669' : '#dc2626' }}>
              {documentNotice.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
            </div>
            <h3 id="document-notice-title" style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem' }}>{documentNotice.title}</h3>
            <p style={{ margin: '0.75rem 0 0', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.55 }}>{documentNotice.message}</p>
            <button type="button" autoFocus className="btn btn-primary" onClick={() => setDocumentNotice(null)} style={{ width: '100%', marginTop: '1.4rem', minHeight: 44 }}>
              Entendi
            </button>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
