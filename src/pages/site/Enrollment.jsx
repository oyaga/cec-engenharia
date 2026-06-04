import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, Send, Phone, User, Mail, BookOpen, 
  CreditCard, MapPin, Hash, X, ShieldCheck, Info,
  Smartphone, FileText, Calendar
} from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import { supabase } from '../../lib/supabase';
import EditableText from '../../components/site/EditableText';
import Navbar from '../../components/site/Navbar';
import Footer from '../../components/site/Footer';
import AdminToolbar from '../../components/site/AdminToolbar';

const Enrollment = () => {
  const { content } = useEdit();
  const courses_section = content.courses_section || { courses: [] };
  const coursesList = courses_section.courses || [];
  const manual = content.manual_do_aluno || { title: 'Manual do Aluno', content: 'Carregando...' };
  const location = useLocation();
  
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

  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  
  // Buscar detalhes da turma (preço e data) quando o curso mudar
  useEffect(() => {
    const fetchClassInfo = async () => {
      if (!formData.course) {
        setSelectedClass(null);
        return;
      }
      
      setLoadingPrice(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Tenta extrair a sigla (ex: CD-CL) ou usar partes do nome
        const match = formData.course.match(/\((.*?)\)/);
        const acronym = match ? match[1] : formData.course.split(' ')[0];

        // Busca por turmas futuras que contenham a sigla ou parte do nome
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .or(`course_name.ilike.%${acronym}%,course_name.ilike.%${formData.course.substring(0, 10)}%`)
          .gte('start_date', today)
          .order('start_date', { ascending: true })
          .limit(1);

        if (data && data.length > 0) {
          setSelectedClass(data[0]);
        } else {
          // Fallback: busca qualquer turma futura se a busca específica falhar
          const { data: fallbackData } = await supabase
            .from('classes')
            .select('*')
            .gte('start_date', today)
            .order('start_date', { ascending: true })
            .limit(1);
          
          if (fallbackData && fallbackData.length > 0) {
             setSelectedClass(fallbackData[0]);
          } else {
             setSelectedClass(null);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar info da turma:", err);
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
      // 1. Salvar intenção de matrícula no Supabase
      const { data: enrollment, error } = await supabase
        .from('enrollments')
        .insert([{
          name: formData.name,
          social_name: formData.social_name,
          phone: formData.phone,
          email: formData.email,
          course_name: formData.course,
          payment_method: formData.paymentMethod,
          status: 'pending_payment',
          turma_id: selectedClass?.id || null
        }])
        .select()
        .single();

      // 2. Chamar a Edge Function do Supabase para gerar cobrança no Asaas
      const { data: result, error: funcError } = await supabase.functions.invoke('asaas-checkout', {
        body: {
          ...formData,
          price: getSelectedPrice(),
          enrollmentId: enrollment?.id || 'NO_ID',
          turmaId: selectedClass?.id || null
        }
      });
      
      if (funcError) throw new Error(funcError.message);
      
      if (result && result.invoiceUrl) {
        setPaymentInfo(result);
      } else {
        throw new Error('Não foi possível gerar o link de pagamento.');
      }

    } catch (err) {
      console.error('Error:', err);
      const message = `*NOVA MATRÍCULA - CEC ENGENHARIA*%0A%0A*Nome:* ${formData.name}%0A*Curso:* ${formData.course}%0A*Pagamento:* ${formData.paymentMethod}`;
      window.open(`https://api.whatsapp.com/send?phone=5521965554180&text=${message}`, '_blank');
      setPaymentInfo({ success: true, message: "Redirecionando para o WhatsApp..." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedPrice = () => {
    if (!selectedClass) return 'Sob Consulta';
    if (formData.paymentMethod === 'pix') return selectedClass.price_cash;
    if (formData.paymentMethod === 'credit_card') return selectedClass.price_card_10x;
    if (formData.paymentMethod === 'boleto') return selectedClass.price_installments_3x;
    return '0.00';
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
            <h1 className="enroll-title">Sua carreira de elite <span className="text-primary">começa aqui.</span></h1>
            
            <div className="enroll-benefits-large">
              <div className="benefit-card">
                <ShieldCheck size={32} className="text-secondary" />
                <div>
                  <h4>Garantia CEC</h4>
                  <p>Início garantido e suporte total durante o curso.</p>
                </div>
              </div>
              <div className="benefit-card">
                <Smartphone size={32} className="text-secondary" />
                <div>
                  <h4>Acesso Digital</h4>
                  <p>Liberação imediata do portal do aluno pós-pagamento.</p>
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
                  <h3>Inscrição Online</h3>
                  <p>Preencha os dados abaixo para gerar seu acesso.</p>
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
                    <input type="tel" required placeholder="(00) 00000-0000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <div className="input-group">
                  <label><Mail size={16} /> E-mail Profissional</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>

                <div className="input-group">
                  <label><BookOpen size={16} /> Escolha a Formação</label>
                  <select required value={formData.course} onChange={(e) => setFormData({...formData, course: e.target.value})}>
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
                    {loadingPrice ? <div className="loading-small"></div> : <strong>R$ {getSelectedPrice()}</strong>}
                  </div>
                )}

                <div className="terms-agreement-box">
                  <div className="agreement-header">
                    <button type="button" className="btn-open-manual" onClick={() => setShowManual(true)}>
                      <FileText size={16} /> Ler Manual do Aluno (Obrigatório)
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
                    <span>Li e concordo com o Manual do Aluno e Termos de Uso.</span>
                  </label>
                  {!manualReadToEnd && <p className="read-warning"><Info size={12}/> Abra o manual e role até o final para habilitar.</p>}
                </div>

                <button type="submit" className="btn-site-primary w-full btn-large" disabled={isSubmitting || !acceptedTerms}>
                  {isSubmitting ? 'Gerando Cobrança...' : 'Confirmar Matrícula'}
                  <Send size={18} />
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

        .terms-agreement-box { background: #fffbeb; padding: 1.5rem; border-radius: 1rem; border: 1px solid #fef3c7; margin-bottom: 2rem; }
        .btn-open-manual { background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin-bottom: 1rem; width: 100%; justify-content: center; }
        .checkbox-label { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.85rem; cursor: pointer; }
        .checkbox-label.disabled { opacity: 0.5; cursor: not-allowed; }
        .read-warning { font-size: 0.7rem; color: #b45309; margin-top: 0.75rem; display: flex; align-items: center; gap: 0.25rem; }

        /* MODAL MANUAL */
        .modal-overlay-manual { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .manual-modal { background: white; width: 100%; max-width: 700px; height: 80vh; border-radius: 1.5rem; display: flex; flexDirection: column; overflow: hidden; position: relative; }
        .manual-header { padding: 1.5rem 2rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .manual-body { flex: 1; overflow-y: auto; padding: 2rem; background: #fafafa; }
        .manual-content-text { font-size: 0.95rem; line-height: 1.6; color: #334155; }
        .end-marker { text-align: center; padding: 4rem 0 2rem; font-weight: 800; color: #cbd5e1; letter-spacing: 2px; }
        .manual-footer { padding: 1.5rem; border-top: 1px solid #eee; text-align: center; }
        .footer-warning { color: #f59e0b; font-weight: 700; font-size: 0.9rem; }

        @media (max-width: 1100px) { .enroll-grid { grid-template-columns: 1fr; gap: 4rem; } .enroll-form-card { max-width: 600px; margin-inline: auto; width: 100%; } }
        @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } .methods-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default Enrollment;
