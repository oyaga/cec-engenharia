import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Send, Phone, User, MessageSquare, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useEdit } from '../context/EditContext';
import { supabase } from '../lib/supabaseClient';
import EditableText from '../components/EditableText';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AdminToolbar from '../components/AdminToolbar';

const Complaint = () => {
  const { content } = useEdit();
  const { complaint_page } = content;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!complaint_page) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Salvar no Supabase
      const { error } = await supabase
        .from('complaints')
        .insert([{
          name: formData.name || 'Anônimo',
          phone: formData.phone || 'Não informado',
          description: formData.description
        }]);

      if (error) throw error;

      // 2. Preparar mensagem do WhatsApp (Aviso DIRETO para Diretoria)
      const messageText = `*NOVO FEEDBACK/OUVIDORIA - CEC*%0A%0A*Nome:* ${formData.name || 'Anônimo'}%0A*Telefone:* ${formData.phone || 'Não informado'}%0A*Descrição:* ${formData.description}`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=5521965554180&text=${messageText}`;

      // 3. Abrir WhatsApp (Canal de Reclamação Aberto)
      window.open(whatsappUrl, '_blank');

      setIsSuccess(true);
      setFormData({ name: '', phone: '', description: '' });
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('Erro ao processar sua mensagem. Se preferir, tente outro canal de contato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="complaint-page-wrapper">
      <AdminToolbar />
      <Navbar />
      
      <main className="complaint-main">
        {/* Header da Página */}
        <section className="complaint-header section-padding">
          <div className="container">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="icon-warning-top"><ShieldAlert size={40} /></div>
              <h1 className="complaint-title">
                <EditableText 
                  path="complaint_page.title" 
                  initialValue={complaint_page.title} 
                />
              </h1>
              <div className="complaint-subtitle">
                <EditableText 
                  path="complaint_page.subtitle" 
                  initialValue={complaint_page.subtitle} 
                  tagName="p"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Formulário de Ouvidoria */}
        <section className="complaint-form-section section-padding">
          <div className="container narrow-form">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="complaint-card"
            >
              <div className="alert-banner">
                <AlertCircle size={20} />
                <span>Os dados de Nome e Telefone são opcionais. Sinta-se à vontade para se expressar anonimamente.</span>
              </div>

              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="complaint-form-body">
                  <div className="form-grid">
                    <div className="input-group">
                      <label>Seu Nome (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: João da Silva"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>

                    <div className="input-group">
                      <label>Seu Telefone (Opcional)</label>
                      <input 
                        type="tel" 
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Descreva sua Reclamação ou Sugestão *</label>
                    <textarea 
                      required 
                      placeholder="Relate aqui o ocorrido com o máximo de detalhes possível..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full btn-large btn-danger-dark" disabled={isSubmitting}>
                    {isSubmitting ? 'Registrando...' : 'Registrar na Ouvidoria'}
                    <Send size={18} />
                  </button>
                </form>
              ) : (
                <div className="success-feedback text-center">
                  <div className="success-icon-badge"><CheckCircle size={64} className="text-secondary" /></div>
                  <h2>Mensagem Registrada!</h2>
                  <p>Sua voz foi ouvida pela nossa diretoria e registrada no sistema sob o protocolo confidencial. Agradecemos por nos ajudar a evoluir.</p>
                  <button onClick={() => setIsSuccess(false)} className="btn-secondary">Registrar outro feedback</button>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx="true">{`
        .complaint-main { background: #fafafa; }
        .complaint-header { 
          background: #1e293b; 
          color: white; 
          padding-top: 10rem;
          padding-bottom: 6rem;
        }
        .icon-warning-top { color: #f87171; margin-bottom: 1.5rem; }
        .complaint-title { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
        .complaint-subtitle { font-size: 1.15rem; color: #94a3b8; max-width: 600px; margin-inline: auto; opacity: 0.8; }
        
        .container.narrow-form { max-width: 750px; margin-inline: auto; }
        .complaint-card {
          margin-top: -6rem;
          background: white;
          padding: 4rem;
          border-radius: 1.5rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
        }
        .alert-banner {
          display: flex;
          gap: 1rem;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          padding: 1.25rem;
          border-radius: 0.75rem;
          color: #9a3412;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 3rem;
          align-items: center;
        }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
        .input-group label { display: block; font-size: 0.85rem; font-weight: 750; color: #475569; margin-bottom: 0.75rem; }
        .input-group input, .input-group textarea {
          width: 100%;
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          outline: none;
          background: #f8fafc;
          transition: all 0.3s;
        }
        .input-group textarea { min-height: 180px; resize: vertical; }
        .input-group input:focus, .input-group textarea:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 4px rgba(0, 75, 73, 0.05); }
        
        .btn-danger-dark { background: #1e293b; }
        .btn-danger-dark:hover { background: #0f172a; transform: translateY(-3px); }
        
        .success-feedback { padding: 4rem 0; }
        .success-feedback h2 { margin-bottom: 1rem; font-size: 2rem; color: #1e293b; }
        .success-feedback p { color: #64748b; font-size: 1.1rem; line-height: 1.6; margin-bottom: 3rem; }

        @media (max-width: 768px) {
          .complaint-card { padding: 2.5rem 2rem; margin-top: -4rem; }
          .form-grid { grid-template-columns: 1fr; }
          .complaint-title { font-size: 2.2rem; }
        }
      `}</style>
    </div>
  );
};

export default Complaint;
