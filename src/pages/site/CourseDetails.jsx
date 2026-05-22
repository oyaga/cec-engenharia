import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle, Clock, Calendar, Laptop, Award, 
  MapPin, CreditCard, ArrowRight, HelpCircle, ChevronDown
} from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import EditableText from '../../components/site/EditableText';
import EditableImage from '../../components/site/EditableImage';
import Navbar from '../../components/site/Navbar';
import Footer from '../../components/site/Footer';
import AdminToolbar from '../../components/site/AdminToolbar';

const CourseDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { content, isEditing } = useEdit();
  const course = content.course_details?.[slug];

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!course && !isEditing) {
      // Se o curso não existir, volta para a home
      navigate('/');
    }
  }, [slug, course, navigate, isEditing]);

  if (!course && !isEditing) return null;

  // Se estiver editando e não houver curso (novo curso), usamos um padrão
  const data = course || {
    title: 'Título do Novo Curso',
    badge: 'NOVIDADE',
    target: 'Objetivo do curso aqui',
    intro: 'Introdução detalhada...',
    why_title: 'Por que este curso?',
    why_text: 'Razões para escolher este curso...',
    details: {
      workload: '00 horas',
      format: 'Online + Presencial',
      schedule: 'Horários aqui',
      cert: 'Certificação Industrial',
      theory: 'Plataforma Online',
      practice: 'Fim de semana prático'
    },
    investment: {
      credit: 'R$ 0.000 em 10x',
      pix: 'R$ 0.000 à vista',
      boleto: 'Parcelado no boleto',
      tip: 'Dica de economia aqui'
    },
    outcomes: ['Benefício 1', 'Benefício 2'],
    images: ['', '', '']
  };

  return (
    <div className="course-details-page">
      <AdminToolbar />
      <Navbar />

      <header className="page-header-simple">
        <div className="container">
          <div className="badge-details">
            <EditableText path={`course_details.${slug}.badge`} initialValue={data.badge} />
          </div>
          <h1 className="course-main-title">
            <EditableText path={`course_details.${slug}.title`} initialValue={data.title} />
          </h1>
          <p className="course-target">
            <EditableText path={`course_details.${slug}.target`} initialValue={data.target} />
          </p>
        </div>
      </header>

      <section className="course-content-section section-padding">
        <div className="container">
          <div className="course-grid-main">
            
            {/* Coluna da Esquerda: Textos */}
            <motion.div 
              className="course-text-col"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="content-block">
                <EditableText 
                  path={`course_details.${slug}.intro`} 
                  initialValue={data.intro} 
                  tagName="p"
                  className="intro-p"
                />
              </div>

              <div className="content-block highlight-block">
                <h3>
                  <EditableText path={`course_details.${slug}.why_title`} initialValue={data.why_title} />
                </h3>
                <EditableText 
                  path={`course_details.${slug}.why_text`} 
                  initialValue={data.why_text} 
                  tagName="p"
                />
              </div>

              <div className="course-info-cards">
                <div className="info-card">
                  <Clock size={24} />
                  <div>
                    <strong>Carga Horária</strong>
                    <EditableText path={`course_details.${slug}.details.workload`} initialValue={data.details.workload} />
                  </div>
                </div>
                <div className="info-card">
                  <Calendar size={24} />
                  <div>
                    <strong>Formato</strong>
                    <EditableText path={`course_details.${slug}.details.format`} initialValue={data.details.format} />
                  </div>
                </div>
                <div className="info-card">
                  <Laptop size={24} />
                  <div>
                    <strong>Teoria</strong>
                    <EditableText path={`course_details.${slug}.details.theory`} initialValue={data.details.theory} />
                  </div>
                </div>
                <div className="info-card">
                  <MapPin size={24} />
                  <div>
                    <strong>Prática</strong>
                    <EditableText path={`course_details.${slug}.details.practice`} initialValue={data.details.practice} />
                  </div>
                </div>
              </div>

              <div className="investment-section">
                <h3>💰 INVESTIMENTO</h3>
                <div className="price-box">
                  <div className="price-item">
                    <span>Cartão de Crédito:</span>
                    <strong><EditableText path={`course_details.${slug}.investment.credit`} initialValue={data.investment.credit} /></strong>
                  </div>
                  <div className="price-item highlighted">
                    <span>PIX / Dinheiro (DESCONTO):</span>
                    <strong><EditableText path={`course_details.${slug}.investment.pix`} initialValue={data.investment.pix} /></strong>
                  </div>
                  <div className="price-item">
                    <span>Boleto:</span>
                    <EditableText path={`course_details.${slug}.investment.boleto`} initialValue={data.investment.boleto} />
                  </div>
                </div>
                <div className="tip-box">
                  <EditableText path={`course_details.${slug}.investment.tip`} initialValue={data.investment.tip} />
                </div>
              </div>

              <div className="outcomes-list">
                <h3>✅ O QUE VOCÊ VAI CONSEGUIR</h3>
                <ul>
                  {data.outcomes.map((outcome, idx) => (
                    <li key={idx}>
                      <CheckCircle size={18} />
                      <EditableText path={`course_details.${slug}.outcomes.${idx}`} initialValue={outcome} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="final-cta">
                <Link to={`/matricular-se?course=${encodeURIComponent(data.title)}`} className="btn-site-primary btn-large">
                  INSCREVA-SE AGORA — Vagas limitadas!
                  <ArrowRight size={20} />
                </Link>
              </div>
            </motion.div>

            {/* Coluna da Direita: 3 Imagens */}
            <motion.div 
              className="course-images-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="images-stack">
                <div className="main-detail-img">
                  <EditableImage path={`course_details.${slug}.images.0`} initialValue={data.images[0]} />
                </div>
                <div className="secondary-images">
                  <div className="side-img">
                    <EditableImage path={`course_details.${slug}.images.1`} initialValue={data.images[1]} />
                  </div>
                  <div className="side-img">
                    <EditableImage path={`course_details.${slug}.images.2`} initialValue={data.images[2]} />
                  </div>
                </div>
              </div>

              <div className="guarantee-badge">
                <Award size={40} />
                <div>
                  <h4>Garantia de Qualidade</h4>
                  <p>Instrutores com +15 anos de experiência prática.</p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section bg-soft section-padding">
        <div className="container">
          <h2 className="section-title text-center">Dúvidas Frequentes</h2>
          <div className="faq-grid">
            {(content.course_details?.faq || []).map((item, idx) => (
              <div key={idx} className="faq-item">
                <h4><HelpCircle size={18} /> <EditableText path={`course_details.faq.${idx}.q`} initialValue={item.q} /></h4>
                <EditableText path={`course_details.faq.${idx}.a`} initialValue={item.a} tagName="p" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      <style jsx>{`
        .course-details-page {
          background: white;
        }
        .page-header-simple {
          background: var(--primary-dark);
          padding: 8rem 0 4rem;
          color: white;
          text-align: center;
        }
        .badge-details {
          display: inline-block;
          background: var(--accent);
          color: black;
          padding: 0.4rem 1rem;
          border-radius: 4px;
          font-weight: 800;
          font-size: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .course-main-title {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: white !important;
          max-width: 900px;
          margin-inline: auto;
        }
        .course-target {
          font-size: 1.25rem;
          opacity: 0.9;
          max-width: 700px;
          margin-inline: auto;
        }

        .course-grid-main {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 5rem;
        }

        .intro-p {
          font-size: 1.2rem;
          line-height: 1.8;
          color: var(--text-main);
          white-space: pre-line;
        }

        .highlight-block {
          background: #f8fafc;
          padding: 2.5rem;
          border-radius: 1.5rem;
          border-left: 5px solid var(--primary);
          margin: 3rem 0;
        }
        .highlight-block h3 {
          margin-bottom: 1rem;
          color: var(--primary);
        }

        .course-info-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .info-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
        }
        .info-card strong {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .investment-section {
          background: #0f172a;
          color: white;
          padding: 3rem;
          border-radius: 2rem;
          margin-bottom: 3rem;
        }
        .price-box {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .price-item {
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .price-item.highlighted {
          background: rgba(16, 185, 129, 0.1);
          border-radius: 8px;
          border-bottom: none;
        }
        .price-item.highlighted strong {
          color: #10b981;
          font-size: 1.2rem;
        }
        .tip-box {
          margin-top: 1.5rem;
          font-size: 0.9rem;
          font-style: italic;
          color: #94a3b8;
        }

        .outcomes-list ul {
          list-style: none;
          padding: 0;
          margin-top: 1.5rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .outcomes-list li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .final-cta {
          margin-top: 4rem;
        }
        .btn-large {
          padding: 1.5rem 2rem;
          font-size: 1.2rem;
          width: 100%;
          justify-content: center;
        }

        /* Images Column */
        .images-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: sticky;
          top: 120px;
        }
        .main-detail-img {
          height: 400px;
          border-radius: 2rem;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }
        .secondary-images {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .side-img {
          height: 200px;
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .guarantee-badge {
          margin-top: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 1rem;
          color: #92400e;
        }
        .guarantee-badge h4 { margin: 0; font-size: 1rem; }
        .guarantee-badge p { margin: 0; font-size: 0.85rem; }

        .faq-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-width: 1000px;
          margin-inline: auto;
        }
        .faq-item h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary);
          margin-bottom: 0.75rem;
        }

        @media (max-width: 1024px) {
          .course-grid-main { grid-template-columns: 1fr; }
          .images-stack { position: static; order: -1; }
          .outcomes-list ul { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default CourseDetails;
