import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { upcomingClassesApi } from '../../services/misc';
import { Clock, Monitor, ChevronRight, Plus, Trash2, X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEdit } from '../../context/EditContext';
import EditableText from './EditableText';
import EditableImage from './EditableImage';
import DraggableInEdit from './DraggableInEdit';

const Courses = () => {
  const { content, isEditing, addItemToList, removeItemFromList, updateContent } = useEdit();
  const courses_section = content.courses_section || {};
  const coursesList = courses_section.courses || [];
  const [upcomingClasses, setUpcomingClasses] = useState([]);

  useEffect(() => {
    const fetchUpcomingClasses = async () => {
      try {
        const { classes: data } = await upcomingClassesApi.listPublic();
        if (data) {
          setUpcomingClasses(data);
        }
      } catch (err) {
        console.error("Erro ao buscar próximas turmas:", err);
      }
    };
    fetchUpcomingClasses();
  }, []);

  const getNextClassDate = (courseTitle) => {
    if (!courseTitle) return null;
    const match = courseTitle.match(/\((.*?)\)/);
    const acronym = match ? match[1] : courseTitle;
    
    const upcoming = upcomingClasses.find(c => 
      (c.course_name && acronym && c.course_name.toLowerCase().includes(acronym.toLowerCase())) ||
      (courseTitle && c.course_name && courseTitle.toLowerCase().includes(c.course_name.toLowerCase()))
    );
    
    if (upcoming && upcoming.start_date) {
      const parts = upcoming.start_date.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return null;
  };
  const handleAddCourse = () => {
    const uniqueId = Date.now();
    const newSlug = `novo-curso-${uniqueId}`;

    const newCourse = {
      slug: newSlug,
      title: "Novo Treinamento",
      description: "Descrição do novo treinamento teórico ou prático de Controle Dimensional.",
      duration: "100 Horas",
      type: "Presencial + Híbrido",
      category: "MAIS PROCURADO",
      image: "https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=2000&auto=format&fit=crop",
      whatsapp_link: "https://chat.whatsapp.com/ExemploGrupo"
    };
    
    // 1. Adiciona o curso na lista da Home
    addItemToList('courses_section.courses', newCourse);
    
    // 2. Inicializa os detalhes padrão na página dinâmica seguindo o modelo rico do cd-cl
    const defaultDetails = {
      title: 'CONTROLE DIMENSIONAL – NOVO CURSO',
      badge: 'MAIS PROCURADO',
      target: 'Dominar a Precisão que a Indústria Exige',
      intro: 'A diferença entre um equipamento funcional e um fracasso está em milímetros. Este novo treinamento é focado em trazer precisão técnica e capacitação profissional de alta performance para a sua carreira.\n\nClique para editar este texto e customizar a introdução de forma a alinhar com o conteúdo programático real do seu curso.',
      why_title: 'Por que este curso?',
      why_text: 'Este programa foi desenvolvido sob medida para profissionais que precisam dominar completamente as técnicas de inspeção e metrologia industrial em cenários de trabalho reais.\n\nResultado? Você se torna um especialista altamente qualificado e requisitado pelas maiores indústrias do setor.',
      details: {
        workload: '100 horas de aprendizado intensivo',
        format: 'Aulas teóricas online + práticas presenciais',
        schedule: 'Segunda a sexta, 19h às 21h (compatível com sua rotina)',
        cert: 'Certificação CEC reconhecida nacionalmente',
        theory: 'Online e ao vivo na nossa plataforma educacional',
        practice: 'Prática de campo hands-on com equipamentos e instrumentação reais'
      },
      investment: {
        credit: 'R$ 3.800 em até 10x sem juros',
        pix: 'R$ 3.300 à vista (economia de R$ 500)',
        boleto: '3x de R$ 1.260 parcelado',
        tip: 'Facilitamos o pagamento no boleto ou dê preferência ao PIX com super desconto exclusivo!'
      },
      outcomes: [
        "Domínio completo dos principais instrumentos de medição",
        "Capacidade de identificar desvios antes do retrabalho",
        "Certificado CEC reconhecido nacionalmente com peso industrial",
        "Networking de alta performance com inspetores do setor",
        "Acesso contínuo com suporte pós-conclusão da turma"
      ],
      images: [
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800",
        "https://images.unsplash.com/photo-1504917595217-d4dc5f566f63?q=80&w=800",
        "https://images.unsplash.com/photo-1534398079543-7ae6d016b86a?q=80&w=800"
      ]
    };
    updateContent(`course_details.${newSlug}`, defaultDetails);
  };

  return (
    <section className="courses-section section-padding bg-soft" id="cursos">
      <div className="container">
        <div className="section-header">
          <div className="header-with-actions">
            <div>
              <h2 className="section-title">
                <EditableText path="courses_section.title" initialValue={courses_section.title} tagName="div" />
              </h2>
              <div className="section-subtitle">
                <EditableText path="courses_section.subtitle" initialValue={courses_section.subtitle} tagName="p" />
              </div>
            </div>
            {isEditing && (
              <button className="btn-add-course" onClick={handleAddCourse}>
                <Plus size={20} /> Adicionar Curso
              </button>
            )}
          </div>
        </div>

        <div className="courses-grid">
          <AnimatePresence>
            {coursesList.map((course, index) => (
              <motion.div
                key={course.id || index}
                className="course-card"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card-image-box" style={{ position: 'relative' }}>
                  {isEditing && (
                    <button
                      className="btn-remove-course"
                      onClick={() => removeItemFromList('courses_section.courses', index)}
                      title="Excluir este curso"
                      style={{ top: '10px', right: '10px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <DraggableInEdit
                    path={`courses_section.courses.${index}.badge_pos`}
                    initialPos={{ top: '12px', left: '12px' }}
                  >
                    <span className="card-badge">
                      <EditableText path={`courses_section.courses.${index}.category`} initialValue={course.category} />
                    </span>
                  </DraggableInEdit>
 
                  <EditableImage
                    path={`courses_section.courses.${index}.image`}
                    initialValue={course.image || `https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=2000&auto=format&fit=crop`}
                    className="card-img"
                  />
                </div>
 
                <div className="card-content">
                  <h3 className="card-title">
                    <EditableText path={`courses_section.courses.${index}.title`} initialValue={course.title} tagName="div" />
                  </h3>
                  
                  {(() => {
                    const nextDate = getNextClassDate(course.title);
                    return nextDate ? (
                      <div className="upcoming-class-badge">
                        <span className="pulse-dot"></span>
                        Próxima Turma: <strong>{nextDate}</strong>
                      </div>
                    ) : null;
                  })()}
 
                  <div className="card-desc">
                    <EditableText path={`courses_section.courses.${index}.description`} initialValue={course.description} tagName="p" />
                  </div>
 
                  <div className="card-meta">
                    <div className="meta-item">
                      <Clock size={16} />
                      <span>{content.course_details?.[course.slug]?.details?.workload || course.duration || '100 Horas'}</span>
                    </div>
                    <div className="meta-item">
                      <Monitor size={16} />
                      <EditableText path={`courses_section.courses.${index}.type`} initialValue={course.type} />
                    </div>
                  </div>
 
                  <div className="card-actions">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <Link 
                        to={`/matricular-se?course=${encodeURIComponent(course.title)}`} 
                        className="btn-site-primary btn-sm" 
                        style={{ display: 'inline-block', textAlign: 'center' }}
                      >
                        Matrícula
                      </Link>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Link 
                        to={`/curso/${course.slug || 'cd-cl'}`} 
                        className="btn-text"
                      >
                        Ver Detalhes <ChevronRight size={16} />
                      </Link>
                      <a 
                        href={course.whatsapp_link || 'https://chat.whatsapp.com/'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-community-link"
                        title="Entrar na Comunidade"
                      >
                        <MessageCircle size={18} />
                        Comunidade
                      </a>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="admin-only-panel" style={{ 
                      marginTop: '15px', 
                      padding: '12px', 
                      backgroundColor: 'rgba(0, 75, 73, 0.03)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(0, 75, 73, 0.1)',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '11px', color: 'var(--primary)', borderBottom: '1px solid rgba(0, 75, 73, 0.1)', paddingBottom: '4px', marginBottom: '4px' }}>
                        ⚙️ Configurações Administrativas
                      </div>
                      
                      <div>
                        <small style={{ fontSize: '10px', display: 'block', color: '#64748b', fontWeight: '600', marginBottom: '3px' }}>Link da Página (Slug):</small>
                        <input 
                          type="text" 
                          placeholder="Ex: novo-treinamento" 
                          value={course.slug || ''} 
                          onChange={(e) => {
                            const oldSlug = course.slug || 'novo-curso';
                            const newSlug = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
                            
                            const newCourses = [...coursesList];
                            newCourses[index] = { ...newCourses[index], slug: newSlug };
                            updateContent('courses_section.courses', newCourses);

                            if (newSlug && oldSlug !== newSlug) {
                              // Migra as informações da página dinâmica de detalhes para a nova chave de slug
                              const currentDetails = content.course_details?.[oldSlug] || {
                                title: 'CONTROLE DIMENSIONAL – NOVO CURSO',
                                badge: 'NOVIDADE',
                                target: 'Objetivo do novo curso técnico aqui',
                                intro: 'A diferença entre um equipamento funcional e um fracasso está em milímetros. Este novo treinamento é focado em trazer precisão técnica para sua carreira profissional.\n\nClique para editar este texto e customizar a introdução conforme o conteúdo programático do curso.',
                                why_title: 'Por que este curso?',
                                why_text: 'Este programa foi desenvolvido para profissionais que precisam dominar completamente as técnicas de inspeção do novo curso. Clique aqui para alterar e explicar por que o profissional deve se matricular.',
                                details: {
                                  workload: '40 horas de aprendizado intensivo',
                                  format: 'Aulas teóricas online + práticas presenciais',
                                  schedule: 'Horários flexíveis a combinar com a turma',
                                  cert: 'Certificação CEC reconhecida nacionalmente',
                                  theory: 'Online e ao vivo na nossa plataforma educacional',
                                  practice: 'Prática de campo hands-on com equipamentos reais'
                                },
                                investment: {
                                  credit: 'R$ 2.500 em até 10x sem juros',
                                  pix: 'R$ 2.200 à vista (Melhor Opção)',
                                  boleto: 'Entrada + parcelamento direto no boleto',
                                  tip: 'Facilitamos o pagamento de forma a caber no orçamento de sua empresa ou carreira.'
                                },
                                outcomes: [
                                  "Domínio das principais competências técnicas",
                                  "Diferencial competitivo expressivo no currículo",
                                  "Networking de alto nível com profissionais do setor",
                                  "Certificação profissional emitida logo após a conclusão",
                                  "Acesso à plataforma de alunos CEC com suporte contínuo"
                                ],
                                images: [
                                  "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800",
                                  "https://images.unsplash.com/photo-1504917595217-d4dc5f566f63?q=80&w=800",
                                  "https://images.unsplash.com/photo-1534398079543-7ae6d016b86a?q=80&w=800"
                                ]
                              };

                              updateContent(`course_details.${newSlug}`, currentDetails);

                              // Se a chave antiga existia no estado global, limpamos ela para evitar resíduos no JSON
                              if (content.course_details?.[oldSlug]) {
                                const cleanDetails = { ...content.course_details };
                                delete cleanDetails[oldSlug];
                                updateContent('course_details', cleanDetails);
                              }
                            }
                          }}
                          style={{ fontSize: '11px', padding: '6px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                        />
                        <small style={{ fontSize: '9px', display: 'block', color: '#94a3b8', marginTop: '2px' }}>
                          O link será: /curso/{course.slug || 'slug'}
                        </small>
                      </div>

                      <div>
                        <small style={{ fontSize: '10px', display: 'block', color: '#64748b', fontWeight: '600', marginBottom: '3px' }}>Link do WhatsApp (Comunidade):</small>
                        <input 
                          type="text" 
                          placeholder="Ex: https://chat.whatsapp.com/..." 
                          value={course.whatsapp_link || ''} 
                          onChange={(e) => {
                            const newCourses = [...coursesList];
                            newCourses[index] = { ...newCourses[index], whatsapp_link: e.target.value };
                            updateContent('courses_section.courses', newCourses);
                          }}
                          style={{ fontSize: '11px', padding: '6px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                        />
                      </div>

                      <div>
                        <small style={{ fontSize: '10px', display: 'block', color: '#64748b', fontWeight: '600', marginBottom: '3px' }}>ID do Produto no Asaas:</small>
                        <input 
                          type="text" 
                          placeholder="Ex: c_123" 
                          value={course.asaas_link || ''} 
                          onChange={(e) => {
                            const newCourses = [...coursesList];
                            newCourses[index] = { ...newCourses[index], asaas_link: e.target.value };
                            updateContent('courses_section.courses', newCourses);
                          }}
                          style={{ fontSize: '11px', padding: '6px', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            
            {isEditing && (
              <motion.div 
                className="course-card add-placeholder"
                onClick={handleAddCourse}
                whileHover={{ scale: 1.02 }}
                style={{ cursor: 'pointer', border: '2px dashed #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', minHeight: '400px' }}
              >
                <div className="add-icon-circle" style={{ background: 'var(--primary)', color: 'white', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', marginBottom: '1rem', justifyContent: 'center' }}>
                  <Plus size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-dark)' }}>Adicionar Nova Formação</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>Clique aqui para criar um novo treinamento seguindo o padrão.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .header-with-actions {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          margin-bottom: 4rem;
        }
        .section-title { font-size: 2.5rem; margin-bottom: 1rem; }
        .btn-add-course {
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 10px 15px -3px rgba(0, 75, 73, 0.2);
          transition: all 0.3s;
        }
        .btn-add-course:hover { transform: translateY(-2px); }
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }
        .course-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          transition: var(--transition);
        }
        .course-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); }
        .card-image-box { position: relative; height: 200px; overflow: hidden; }
        .btn-remove-course {
          position: absolute; top: 0.75rem; right: 0.75rem;
          background: #ef4444; color: white; border: none;
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 10;
        }
        .card-badge {
          position: absolute; top: 0.75rem; left: 0.75rem;
          background: var(--primary); color: white;
          padding: 0.3rem 0.6rem; border-radius: 4px;
          font-size: 0.65rem; font-weight: 700; z-index: 2;
        }
        .card-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .card-content { padding: 1.5rem; }
        .card-title { font-size: 1.1rem; margin-bottom: 0.75rem; line-height: 1.4; min-height: 3rem; }
        .card-meta {
          display: flex; gap: 1rem; margin-bottom: 1.5rem;
          padding-top: 1rem; border-top: 1px solid var(--border); flex-wrap: wrap;
        }
        .meta-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--primary); font-weight: 600; }
        .card-actions { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .btn-sm { padding: 0.6rem 1.25rem; font-size: 0.85rem; }
        .btn-text { color: var(--text-muted); font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.25rem; cursor: pointer; background: transparent; border: none; }
        .btn-text:hover { color: var(--primary); }
 
        .btn-community-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(37, 211, 102, 0.1);
          color: #128C7E;
          padding: 0.5rem 0.8rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          transition: all 0.3s;
          text-decoration: none;
        }
        .btn-community-link:hover {
          background: #25D366;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2);
        }
 
        .upcoming-class-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(37, 211, 102, 0.1);
          color: #1e293b;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          margin-bottom: 1rem;
          border: 1px solid rgba(37, 211, 102, 0.3);
        }
        .pulse-dot {
          width: 8px; height: 8px;
          background: #25D366;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 rgba(37, 211, 102, 0.4);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
 
        @media (max-width: 768px) {
          .courses-grid { grid-template-columns: 1fr; }
          .header-with-actions { flex-direction: column; align-items: flex-start; }
          .section-title { font-size: 1.8rem; }
        }
        @media (max-width: 480px) {
          .card-content { padding: 1rem; }
        }
      `}</style>
    </section>
  );
};

export default Courses;
