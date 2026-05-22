import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, User, Mail, MessageSquare, CheckCircle, MapPin, BookOpen } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import { supabase } from '../../lib/supabase';
import EditableText from '../../components/site/EditableText';
import Navbar from '../../components/site/Navbar';
import Footer from '../../components/site/Footer';
import AdminToolbar from '../../components/site/AdminToolbar';

const Contact = () => {
  const { content } = useEdit();
  const { contact_page } = content;
  const courses_section = content.courses_section || { courses: [] };
  const coursesList = courses_section.courses || [];
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    courseInterest: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!contact_page) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Salvar no Supabase
      const { error } = await supabase
        .from('leads')
        .insert([{
          name: formData.name,
          phone: formData.phone,
          course_interest: formData.courseInterest,
          message: formData.message
        }]);

      if (error) throw error;

      // 2. Preparar mensagem do WhatsApp (Aviso Diretoria)
      const messageText = `*NOVA DÚVIDA/CONTATO - CEC*%0A%0A*Nome:* ${formData.name}%0A*Telefone:* ${formData.phone}%0A*Interesse:* ${formData.courseInterest}%0A*Dúvida:* ${formData.message}`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=5521965554180&text=${messageText}`;

      // 3. Abrir WhatsApp
      window.open(whatsappUrl, '_blank');

      setIsSuccess(true);
      setFormData({ name: '', phone: '', message: '' });
    } catch (err) {
      console.error('Error submitting contact form:', err);
      alert('Erro ao enviar mensagem. Fale direto pelo WhatsApp se preferir!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page-wrapper">
      <AdminToolbar />
      <Navbar />
      
      <main className="contact-main">
        {/* Header da Página */}
        <section className="contact-header section-padding">
          <div className="container">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="contact-title">
                <EditableText 
                  path="contact_page.title" 
                  initialValue={contact_page.title || "Fale Conosco"} 
                />
              </h1>
              <div className="contact-subtitle">
                <EditableText 
                  path="contact_page.subtitle" 
                  initialValue={contact_page.subtitle || "Estamos prontos para tirar suas dúvidas e ajudar na sua carreira."} 
                  tagName="p"
                />
              </div>
            </motion.div>
          </div>
        </section>
 
        {/* Grid de Contato */}
        <section className="contact-grid-section section-padding">
          <div className="container contact-content-grid">
            {/* Informações de Suporte */}
            <div className="contact-info">
              <div className="info-card">
                <div className="icon-badge"><Phone size={24} /></div>
                <h3><EditableText path="contact_page.direct_title" initialValue={contact_page.direct_title || 'Atendimento Direto'} /></h3>
                <p><EditableText path="contact_page.direct_desc" initialValue={contact_page.direct_desc || 'Nossa equipe técnica está pronta para ajudar com sua escolha.'} tagName="span" /></p>
                <a href={`https://wa.me/${contact_page.whatsapp_direct || '5521965554180'}`} className="info-link">
                  <EditableText path="contact_page.direct_phone" initialValue={contact_page.direct_phone || '+55 21 96555-4180'} />
                </a>
              </div>
 
              <div className="info-card secondary">
                <div className="icon-badge"><MapPin size={24} /></div>
                <h3><EditableText path="contact_page.address_title" initialValue={contact_page.address_title || 'Matriz Rio de Janeiro'} /></h3>
                <p><EditableText path="contact_page.address" initialValue={contact_page.address || 'Rua Carlos Anselmo de Brito, 19, Santa Cruz - RJ'} tagName="span" /></p>
                <div className="badge-local">
                  <EditableText path="contact_page.address_badge" initialValue={contact_page.address_badge || 'Presencial + EAD'} />
                </div>
              </div>
            </div>

            {/* Formulário */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="contact-form-container shadow-lg"
            >
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="premium-form">
                  <div className="input-field">
                    <label>Nome Completo</label>
                    <div className="input-with-icon">
                      <User size={18} />
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: Carlos Silva"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>Telefone / WhatsApp</label>
                    <div className="input-with-icon">
                      <Phone size={18} />
                      <input 
                        type="tel" 
                        required 
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>Curso de Interesse</label>
                    <div className="input-with-icon">
                      <BookOpen size={18} />
                      <select 
                        required 
                        value={formData.courseInterest}
                        onChange={(e) => setFormData({...formData, courseInterest: e.target.value})}
                        className="w-full bg-transparent border-none outline-none"
                        style={{ appearance: 'none', cursor: 'pointer' }}
                      >
                        <option value="">Selecione um curso...</option>
                        <option value="Geral / Outros">Geral / Outros</option>
                        {coursesList.map(c => (
                          <option key={c.id} value={c.title}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="input-field">
                    <label>Sua Dúvida ou Mensagem</label>
                    <div className="input-with-icon textarea-variant">
                      <MessageSquare size={18} />
                      <textarea 
                        required 
                        placeholder="Descreva em que podemos ajudar..."
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary w-full btn-large" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="success-overlay text-center">
                  <div className="icon-success-circle"><CheckCircle size={60} /></div>
                  <h2>Mensagem Recebida!</h2>
                  <p>Sua dúvida foi enviada para o nosso atendimento via WhatsApp e registrada no sistema. Responderemos em instantes.</p>
                  <button onClick={() => setIsSuccess(false)} className="btn-outline">Enviar outra dúvida</button>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .contact-main { background: white; }
        .contact-header { 
          background: var(--primary-dark);
          color: white;
          padding-top: 10rem;
        }
        .contact-title { 
          font-size: 3.5rem; 
          margin-bottom: 1rem; 
          color: white !important; 
        }
        .contact-subtitle { font-size: 1.25rem; color: rgba(255,255,255,0.7); max-width: 600px; margin-inline: auto; }
        
        .contact-content-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 6rem;
          margin-top: -5rem; /* Efeito sobreposto */
        }
        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .info-card {
          background: white;
          padding: 2.5rem;
          border-radius: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          border: 1px solid #f1f5f9;
        }
        .info-card.secondary { background: #eef2ff; border: 1px solid #e2e8f0; }
        .icon-badge {
          width: 50px;
          height: 50px;
          background: var(--primary);
          color: white;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .info-link {
          display: block;
          margin-top: 1rem;
          font-weight: 800;
          font-size: 1.5rem;
          color: var(--primary);
        }
        .badge-local {
          display: inline-block;
          margin-top: 1rem;
          background: white;
          padding: 0.35rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--primary-dark);
        }

        .contact-form-container {
          background: white;
          padding: 3.5rem;
          border-radius: 2rem;
          border: 1px solid #f1f5f9;
          height: auto !important;
          display: block !important;
        }
        
        .input-field { margin-bottom: 1.5rem; }
        .input-field label { display: block; font-size: 0.85rem; font-weight: 800; color: #475569; margin-bottom: 0.75rem; }
        
        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1.25rem;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          transition: all 0.3s;
          background: #f8fafc;
        }
        
        .input-with-icon input, .input-with-icon textarea {
          flex: 1;
          border: none;
          outline: none;
          font-size: 1rem;
          color: var(--text-main);
          background: transparent;
          width: 100%;
        }
        
        .input-with-icon.textarea-variant { align-items: flex-start; }
        .input-with-icon textarea { min-height: 120px; }
        .input-with-icon:focus-within { 
          border-color: var(--primary); 
          box-shadow: 0 0 0 4px rgba(0, 75, 73, 0.05);
          background: white;
        }
        .input-with-icon svg { color: var(--primary); opacity: 0.5; }

        .btn-primary.btn-large {
          display: flex !important;
          width: 100% !important;
          background: var(--primary) !important;
          color: white !important;
          padding: 1.25rem !important;
          border-radius: 1rem !important;
          border: none !important;
          font-weight: 700 !important;
          font-size: 1.1rem !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.75rem !important;
          cursor: pointer !important;
          margin-top: 2rem !important;
          transition: all 0.3s !important;
        }
        
        .btn-primary.btn-large:hover {
          background: var(--primary-dark) !important;
          transform: translateY(-2px) !important;
        }
        .btn-primary.btn-large:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .success-overlay { padding: 4rem 0; }
        .icon-success-circle { color: #10b981; margin-bottom: 2rem; }
        
        @media (max-width: 968px) {
          .contact-content-grid { grid-template-columns: 1fr; margin-top: 2rem; gap: 3rem; }
          .contact-header { padding-top: 8rem; }
          .contact-title { font-size: 2.8rem; }
          .contact-form-container { padding: 2.5rem; }
        }
      `}</style>
    </div>
  );
};

export default Contact;
