import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, Send, Phone, User, Mail, BookOpen, 
  CreditCard, MapPin, Hash, X, ShieldCheck, Info,
  Smartphone, FileText, Calendar, Clock
} from 'lucide-react';
import { formatBrazilianPhone } from '../../utils/phone';
import { useEdit } from '../../context/EditContext';
import { coursesApi } from '../../services/academic';
import { enrollmentsApi } from '../../services/site';
import { publicCheckout } from '../../services/asaas';
import { useAuth } from '../../contexts/AuthContext';
import EditableText from '../../components/site/EditableText';
import Navbar from '../../components/site/Navbar';
import Footer from '../../components/site/Footer';
import AdminToolbar from '../../components/site/AdminToolbar';

const Enrollment = () => {
  const { content, isEditing } = useEdit();
  const { userProfile } = useAuth();
  const courses_section = content.courses_section || { courses: [] };
  const coursesList = courses_section.courses || [];
  const manual = content.manual_do_aluno || { title: 'Manual do Aluno', content: 'Carregando...' };
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasUrlCourse = params.get('course') !== null;
  
  const [formData, setFormData] = useState({
    name: '',
    social_name: '',
    cpf: '',
    phone: '',
    email: '',
    cep: '',
    addressNumber: '',
    course: '',
    paymentMethod: 'pix' // pix | credit_card | boleto
  });

  // Pré-preenchimento automático dos dados do perfil logado
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.full_name || prev.name,
        email: userProfile.email || prev.email,
        phone: userProfile.phone || prev.phone,
        cpf: userProfile.cpf || prev.cpf
      }));
    }
  }, [userProfile]);

  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [selectedCourseData, setSelectedCourseData] = useState(null);
  
  // Buscar detalhes da turma (preço e data) quando o curso mudar
  useEffect(() => {
    const fetchClassInfo = async () => {
      if (!formData.course) {
        setSelectedClass(null);
        setSelectedCourseData(null);
        return;
      }
      
      setLoadingPrice(true);
      try {
        // Preço oficial do curso (catálogo público)
        const { courses } = await coursesApi.listPublic();
        const cData = (courses || []).find(c => c.title === formData.course) || null;
        setSelectedCourseData(cData);
        // Turma específica é resolvida no servidor no checkout; aqui só exibimos preço do curso.
        setSelectedClass(null);
      } catch (err) {
        console.error("Erro ao buscar info do curso:", err);
      } finally {
        setLoadingPrice(false);
      }
    };

    fetchClassInfo();
  }, [formData.course]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const courseParam = params.get('course');
    if (courseParam) {
      setFormData(prev => ({ ...prev, course: decodeURIComponent(courseParam) }));
    }
  }, [location]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualReadToEnd, setManualReadToEnd] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const manualScrollRef = useRef(null);

  const handleManualScroll = () => {
    if (manualScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = manualScrollRef.current;
      // Se faltar menos de 20px para o fim, considera lido
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setManualReadToEnd(true);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) return;
    if (!acceptedTerms) return;

    if (honeypot) {
      console.warn('Bot detectado no formulário de matrícula.');
      const message = `*NOVA MATRÍCULA - CEC ENGENHARIA*%0A%0A*Nome:* ${formData.name}%0A*Curso:* ${formData.course}%0A*Pagamento:* ${formData.social_name || formData.paymentMethod}`;
      window.open(`https://api.whatsapp.com/send?phone=5521965554180&text=${message}`, '_blank');
      setPaymentInfo({ success: true, message: "Redirecionando para o WhatsApp..." });
      return;
    }

    setIsSubmitting(true);

    try {
      // Gerar UUID localmente de forma segura
      const enrollmentId = (() => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      })();

      // 1. Salvar a intenção de matrícula (endpoint público).
      let createdId = enrollmentId;
      try {
        const created = await enrollmentsApi.createPublic({
          name: formData.name,
          social_name: formData.social_name,
          phone: formData.phone,
          email: formData.email,
          course_name: formData.course,
          payment_method: formData.paymentMethod,
          turma_id: selectedClass?.id || null,
          cpf: formData.cpf,
        });
        if (created?.enrollment?.id) createdId = created.enrollment.id;
      } catch (e) {
        throw new Error(e.message || 'Falha ao registrar a matrícula.');
      }

      // 2. Checkout server-side (a chave do Asaas nunca vai ao browser; preço calculado no servidor).
      const result = await publicCheckout({
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email,
        phone: formData.phone,
        course_id: selectedCourseData?.id || null,
        course_name: formData.course,
        payment_method: formData.paymentMethod,
        enrollment_id: createdId,
      });

      if (result && result.invoiceUrl) {
        setPaymentInfo(result);
        // Redireciona o aluno imediatamente para o checkout do Asaas
        window.location.href = result.invoiceUrl;
      } else {
        throw new Error('Não foi possível obter a URL de pagamento.');
      }

    } catch (err) {
      console.error('Error:', err);
      const errMsg = err.message || '';
      
      // Se for erro de validação amigável da nossa Edge Function, exibe alerta e não abre WhatsApp
      if (errMsg.includes('CPF') || errMsg.includes('CNPJ') || errMsg.includes('inválido') || errMsg.includes('documento')) {
        alert(errMsg);
      } else {
        // Contingência do WhatsApp para erros inesperados
        const message = `*NOVA MATRÍCULA - CEC ENGENHARIA*%0A%0A*Nome:* ${formData.name}%0A*Curso:* ${formData.course}%0A*Pagamento:* ${formData.paymentMethod}`;
        window.open(`https://api.whatsapp.com/send?phone=5521965554180&text=${message}`, '_blank');
        setPaymentInfo({ success: true, message: "Redirecionando para o WhatsApp..." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedPrice = () => {
    let val = 0;
    
    // Tenta obter o preço da turma primeiro
    if (selectedClass) {
      if (formData.paymentMethod === 'pix') val = selectedClass.price_cash;
      else if (formData.paymentMethod === 'credit_card') val = selectedClass.price_card_10x;
      else if (formData.paymentMethod === 'boleto') val = selectedClass.price_installments_3x;
    }
    
    // Fallback: se a turma estiver ausente ou sem preço definido, usa o preço oficial do curso lms_courses
    if (!val && selectedCourseData) {
      if (formData.paymentMethod === 'pix') val = selectedCourseData.price_pix;
      else if (formData.paymentMethod === 'credit_card') val = selectedCourseData.price_card;
      else if (formData.paymentMethod === 'boleto') val = selectedCourseData.price_boleto;
      
      // Se não houver preço específico para a forma de pagamento, usa o valor padrão do curso
      if (!val) val = selectedCourseData.default_value;
    }
    
    if (!val) return 'Sob Consulta';

    // O preço cadastrado é exibido como está. Havia aqui um ajuste que
    // multiplicava por 1000 qualquer valor abaixo de 100, supondo erro de
    // cadastro — isso transformava um curso legítimo de R$ 80 em R$ 80.000.
    return val;
  };

  const formatPrice = (price) => {
    if (price === 'Sob Consulta' || price === null || price === undefined || isNaN(Number(price))) {
      return 'Sob Consulta';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(price));
  };

  return (
    <div className="enroll-page-wrapper">
      <AdminToolbar />
      <Navbar />
      
      <main className="enroll-main section-padding">
        <div className="container enroll-grid">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="enroll-content"
          >
            <div className="badge-status">MATRÍCULAS ABERTAS 2026</div>
            <h1 className="enroll-title">
              <EditableText path="enrollment_page.title_main" initialValue={content.enrollment_page?.title_main || "Sua carreira de elite "} />
              <span className="text-primary">
                <EditableText path="enrollment_page.title_span" initialValue={content.enrollment_page?.title_span || "começa aqui."} />
              </span>
            </h1>
            
            <div className="enroll-benefits-large">
              <div className="benefit-card">
                <ShieldCheck size={32} className="text-secondary" />
                <div>
                  <EditableText path="enrollment_page.benefit_1_title" initialValue={content.enrollment_page?.benefit_1_title || "Garantia CEC"} tagName="h4" />
                  <EditableText path="enrollment_page.benefit_1_desc" initialValue={content.enrollment_page?.benefit_1_desc || "Início garantido e suporte total durante o curso."} tagName="p" />
                </div>
              </div>
              <div className="benefit-card">
                <Smartphone size={32} className="text-secondary" />
                <div>
                  <EditableText path="enrollment_page.benefit_2_title" initialValue={content.enrollment_page?.benefit_2_title || "Acesso Digital"} tagName="h4" />
                  <EditableText path="enrollment_page.benefit_2_desc" initialValue={content.enrollment_page?.benefit_2_desc || "Liberação imediata do portal do aluno pós-pagamento."} tagName="p" />
                </div>
              </div>
            </div>

            {selectedClass && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="selected-class-info"
              >
                <h3>📌 Próxima Turma Confirmada</h3>
                <div className="class-details-row">
                  <div className="detail-item">
                    <Calendar size={18} />
                    <span>Início: <strong>{selectedClass.start_date && !isNaN(new Date(selectedClass.start_date.includes('T') ? selectedClass.start_date : `${selectedClass.start_date}T00:00:00`).getTime()) ? new Date(selectedClass.start_date.includes('T') ? selectedClass.start_date : `${selectedClass.start_date}T00:00:00`).toLocaleDateString('pt-BR') : 'Imediato / A definir'}</strong></span>
                  </div>
                  <div className="detail-item">
                    <Clock size={18} />
                    <span>Horário: <strong>{selectedClass.schedule}</strong></span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="enroll-form-card shadow-lg"
          >
            {!paymentInfo ? (
              <form onSubmit={handleSubmit} className="enroll-form">
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />
                <div className="form-head">
                  <h3><EditableText path="enrollment_page.form_title" initialValue={content.enrollment_page?.form_title || "Inscrição Online"} /></h3>
                  <p><EditableText path="enrollment_page.form_subtitle" initialValue={content.enrollment_page?.form_subtitle || "Preencha os dados abaixo para gerar seu acesso."} /></p>
                </div>

                <div className="input-group">
                  <label><User size={16} /> Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Como na Identidade"
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                </div>

                <div className="input-group">
                  <label><User size={16} /> Nome Social (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Caso possua"
                    value={formData.social_name} 
                    onChange={(e) => setFormData({...formData, social_name: e.target.value})} 
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label><CreditCard size={16} /> CPF</label>
                    <input type="text" required placeholder="000.000.000-00" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label><Phone size={16} /> WhatsApp</label>
                    <input
                      type="tel"
                      required
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: formatBrazilianPhone(e.target.value)})}
                      inputMode="numeric"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label><Mail size={16} /> E-mail Profissional</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>

                <div className="input-group">
                  <label><BookOpen size={16} /> Escolha a Formação</label>
                  <select 
                    required 
                    value={formData.course} 
                    onChange={(e) => setFormData({...formData, course: e.target.value})}
                    disabled={hasUrlCourse}
                  >
                    <option value="">Selecione um curso...</option>
                    {coursesList.map(course => <option key={course.id} value={course.title}>{course.title}</option>)}
                  </select>
                </div>

                <div className="payment-methods">
                  <label><CreditCard size={16} /> Forma de Pagamento</label>
                  <div className="methods-grid">
                    <button type="button" className={`method-btn ${formData.paymentMethod === 'pix' ? 'active' : ''}`} onClick={() => setFormData({...formData, paymentMethod: 'pix'})}>
                      <Smartphone size={20} />
                      <span>PIX à Vista</span>
                    </button>
                    <button type="button" className={`method-btn ${formData.paymentMethod === 'credit_card' ? 'active' : ''}`} onClick={() => setFormData({...formData, paymentMethod: 'credit_card'})}>
                      <CreditCard size={20} />
                      <span>Cartão 10x</span>
                    </button>
                    <button type="button" className={`method-btn ${formData.paymentMethod === 'boleto' ? 'active' : ''}`} onClick={() => setFormData({...formData, paymentMethod: 'boleto'})}>
                      <FileText size={20} />
                      <span>Boleto</span>
                    </button>
                  </div>
                </div>

                {formData.course && (
                  <div className="price-summary">
                    <span>Investimento Total:</span>
                    {loadingPrice ? <div className="loading-small"></div> : <strong>{formatPrice(getSelectedPrice())}</strong>}
                  </div>
                )}

                <div className="enroll-deadline-notice">
                  <div className="notice-header">
                    <Info size={18} className="notice-icon" />
                    <strong><EditableText path="enrollment_page.notice_title" initialValue={content.enrollment_page?.notice_title || "Aviso Importante: Prazo de Conclusão"} /></strong>
                  </div>
                  <p><EditableText path="enrollment_page.notice_text" initialValue={content.enrollment_page?.notice_text || "Ao se matricular, você declara estar ciente de que tem o prazo máximo e improrrogável de 6 meses para a conclusão de todo o curso (incluindo as aulas teóricas EAD e as aulas práticas presenciais)."} /></p>
                </div>

                <div className="terms-agreement-box">
                  <div className="agreement-header">
                    <button type="button" className="btn-site-primary btn-open-manual" onClick={() => setShowManual(true)}>
                      <FileText size={16} /> <EditableText path="enrollment_page.btn_manual_text" initialValue={content.enrollment_page?.btn_manual_text || "Ler Manual do Aluno (Obrigatório)"} />
                    </button>
                  </div>
                  <label className={`checkbox-label ${!manualReadToEnd ? 'disabled' : ''}`}>
                    <input 
                      type="checkbox" 
                      required 
                      disabled={!manualReadToEnd}
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    <span><EditableText path="enrollment_page.checkbox_text" initialValue={content.enrollment_page?.checkbox_text || "Li e concordo com o Manual do Aluno e Termos de Uso."} /></span>
                  </label>
                  {!manualReadToEnd && <p className="read-warning"><Info size={12}/> <EditableText path="enrollment_page.warning_text" initialValue={content.enrollment_page?.warning_text || "Abra o manual e role até o final para habilitar."} /></p>}
                </div>

                <button type="submit" className="btn-site-primary w-full btn-large" disabled={isSubmitting || !acceptedTerms}>
                  {isSubmitting ? (
                    'Gerando Cobrança...'
                  ) : (
                    <>
                      <EditableText path="enrollment_page.btn_submit_text" initialValue={content.enrollment_page?.btn_submit_text || "Confirmar Matrícula"} />
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="success-state text-center">
                <div className="success-icon"><CheckCircle size={60} /></div>
                <h2>Inscrição Iniciada!</h2>
                <div className="payment-action-box">
                  <p>Cobrança via {formData.paymentMethod.toUpperCase()} gerada com sucesso.</p>
                  <a href={paymentInfo.invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn-site-primary btn-large w-full mt-4">
                    Pagar Agora
                  </a>
                </div>
                <button onClick={() => setPaymentInfo(null)} className="btn-site-outline mt-4">Nova Matrícula</button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* MODAL DO MANUAL */}
      <AnimatePresence>
        {showManual && (
          <motion.div className="modal-overlay-manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="manual-modal" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}>
              <div className="manual-header">
                <h3>{manual.title}</h3>
                <button onClick={() => setShowManual(false)}><X size={24} /></button>
              </div>
              <div className="manual-body" ref={manualScrollRef} onScroll={handleManualScroll}>
                <div className="manual-content-text">
                  <p style={{ whiteSpace: 'pre-line' }}>{manual.content}</p>
                  <div className="end-marker">FIM DO DOCUMENTO</div>
                </div>
              </div>
              <div className="manual-footer">
                {!manualReadToEnd ? (
                  <p className="footer-warning">Continue lendo até o final para prosseguir...</p>
                ) : (
                  <button className="btn-site-primary" onClick={() => setShowManual(false)}>Entendi e desejo prosseguir</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />

      <style jsx="true">{`
        .enroll-main { background: #fdfdfd; padding-top: 10rem; min-height: 100vh; }
        .enroll-grid { display: grid; grid-template-columns: 1fr 500px; gap: 5rem; align-items: start; }
        .enroll-title { font-size: 3.5rem; line-height: 1.1; margin-bottom: 3rem; font-weight: 800; }
        
        .enroll-benefits-large { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 3rem; }
        .benefit-card { display: flex; gap: 1.5rem; background: white; padding: 1.5rem; border-radius: 1rem; border: 1px solid #f1f5f9; box-shadow: var(--shadow-sm); }
        .benefit-card h4 { color: var(--primary-dark); margin-bottom: 0.25rem; }
        .benefit-card p { font-size: 0.9rem; color: var(--text-muted); }

        .selected-class-info { background: #0f172a; color: white; padding: 2rem; border-radius: 1.5rem; margin-bottom: 2rem; }
        .selected-class-info h3 { font-size: 1.1rem; margin-bottom: 1rem; color: #10b981; }
        .class-details-row { display: flex; gap: 2rem; }
        .detail-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }

        .enroll-form-card { background: white; border-radius: 2rem; padding: 3rem; border: 1px solid #f1f5f9; }
        .form-head { margin-bottom: 2.5rem; text-align: center; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .input-group { margin-bottom: 1.5rem; }
        .input-group label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--primary); }
        .input-group input, .input-group select { width: 100%; padding: 0.85rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; background: #f8fafc; }

        .payment-methods { margin-bottom: 2rem; }
        .payment-methods label { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--primary); }
        .methods-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }
        .method-btn { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #f8fafc; cursor: pointer; transition: all 0.2s; }
        .method-btn.active { background: #e6f1f1; border-color: var(--primary); color: var(--primary); font-weight: 700; }
        .method-btn span { font-size: 0.7rem; }

        .price-summary { background: #f1f5f9; padding: 1.25rem; border-radius: 0.75rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .price-summary strong { font-size: 1.25rem; color: var(--primary-dark); }

        .enroll-deadline-notice { background: #fff5f5; padding: 1.25rem; border-radius: 1rem; border: 1px solid #fee2e2; margin-bottom: 1.5rem; color: #991b1b; font-size: 0.85rem; line-height: 1.4; }
        .notice-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .notice-icon { color: #ef4444; flex-shrink: 0; }
        .enroll-deadline-notice p { margin: 0; font-weight: 500; }
        .enroll-deadline-notice strong { color: #7f1d1d; }

        .terms-agreement-box { background: #fffbeb; padding: 1.5rem; border-radius: 1rem; border: 1px solid #fde68a; margin-bottom: 2rem; color: #78350f; }
        .btn-open-manual { width: 100%; justify-content: center; margin-bottom: 1rem; }
        .checkbox-label { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.85rem; cursor: pointer; color: #78350f; }
        .checkbox-label.disabled { opacity: 0.6; cursor: not-allowed; }
        .read-warning { font-size: 0.75rem; color: #b45309; margin-top: 0.75rem; display: flex; align-items: center; gap: 0.25rem; font-weight: 600; }

        /* MODAL MANUAL */
        .modal-overlay-manual { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .manual-modal { background: white; width: 100%; max-width: 700px; height: 80vh; border-radius: 1.5rem; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .manual-header { padding: 1.5rem 2rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .manual-body { flex: 1; overflow-y: auto; padding: 2rem; background: #fafafa; }
        .manual-content-text { font-size: 0.95rem; line-height: 1.6; color: #334155; }
        .end-marker { text-align: center; padding: 4rem 0 2rem; font-weight: 800; color: #cbd5e1; letter-spacing: 2px; }
        .manual-footer { padding: 1.5rem; border-top: 1px solid #eee; text-align: center; }
        .footer-warning { color: #f59e0b; font-weight: 700; font-size: 0.9rem; }

        @media (max-width: 1100px) { .enroll-grid { grid-template-columns: 1fr; gap: 4rem; } .enroll-form-card { max-width: 600px; margin-inline: auto; width: 100%; } }
        @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } .methods-grid { grid-template-columns: 1fr; } .class-details-row { flex-wrap: wrap; gap: 1rem; } .enroll-title { font-size: 2.5rem; } .enroll-form-card { padding: 1.75rem; } .enroll-main { padding-top: 8rem; } }
      `}</style>
    </div>
  );
};

export default Enrollment;
