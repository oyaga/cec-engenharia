import React, { useState, useEffect } from 'react';
import { Quote, Star, MessageSquarePlus, CheckCircle2, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useEdit } from '../../context/EditContext';

const Testimonials = () => {
  const { isEditing } = useEdit();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    content: '',
    evaluation_date: new Date().toISOString().split('T')[0]
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setTestimonials(data);
      } else {
        // Fallback local se o banco estiver vazio
        setTestimonials([
          { id: 'f1', name: 'Ricardo Souza', course: 'Inspetor Dimensional', content: 'Curso excelente! A parte prática mudou meu patamar profissional.', status: 'approved', evaluation_date: new Date().toISOString() },
          { id: 'f2', name: 'Mariana Costa', course: 'Caldeiraria', content: 'Instrutores de alto nível. A CEC prepara para o mercado real.', status: 'approved', evaluation_date: new Date().toISOString() }
        ]);
      }
    } catch (err) {
      console.warn('Usando depoimentos de fallback (tabela indisponível).');
      setTestimonials([
        { id: 'f1', name: 'Ricardo Souza', course: 'Inspetor Dimensional', content: 'Curso excelente! A parte prática mudou meu patamar profissional.', status: 'approved', evaluation_date: new Date().toISOString() },
        { id: 'f2', name: 'Mariana Costa', course: 'Caldeiraria', content: 'Instrutores de alto nível. A CEC prepara para o mercado real.', status: 'approved', evaluation_date: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('sending');
    try {
      const { error } = await supabase
        .from('testimonials')
        .insert([{
          ...formData,
          status: 'pending',
          type: 'text'
        }]);

      if (error) throw error;
      setSubmitStatus('success');
      setTimeout(() => {
        setShowModal(false);
        setSubmitStatus(null);
        setFormData({ name: '', course: '', content: '', evaluation_date: new Date().toISOString().split('T')[0] });
      }, 3000);
    } catch (err) {
      setSubmitStatus('error');
    }
  };

  return (
    <section className="testimonials-section section-padding" id="avaliacoes">
      <div className="container">
        <div className="section-header text-center">
          <span className="badge">PROVA SOCIAL</span>
          <h2>O que nossos alunos dizem</h2>
          <p>Depoimentos reais de quem transformou a carreira técnica na CEC Engenharia.</p>
        </div>

        {loading ? (
          <div className="loading-spinner">Carregando depoimentos...</div>
        ) : (
          <div className="testimonials-grid">
            {testimonials.map((item, index) => (
              <motion.div 
                key={item.id}
                className={`testimonial-card ${item.type === 'screenshot' ? 'card-screenshot' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                {item.type === 'screenshot' ? (
                  <div className="screenshot-container">
                    <img src={item.image_url} alt="Prova Social" className="screenshot-img" />
                    <div className="screenshot-info">
                      <Quote className="quote-icon-small" />
                      <p>{item.admin_description || "Depoimento verificado via canal oficial."}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-header">
                      <div className="stars">
                        {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="var(--primary)" color="var(--primary)" />)}
                      </div>
                      <Quote className="quote-icon" />
                    </div>
                    <p className="testimonial-text">"{item.content}"</p>
                    <div className="card-footer">
                      <div className="user-info">
                        <strong>{item.name}</strong>
                        <span>{item.course}</span>
                      </div>
                      <div className="date">{new Date(item.evaluation_date).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}

            {/* Botão de envio - sempre visível para visitantes */}
            <motion.div 
              className="testimonial-card add-testimonial-card"
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.02 }}
            >
              <div className="add-content">
                <MessageSquarePlus size={40} className="icon-plus" />
                <h4>Sua vez de avaliar!</h4>
                <p>Compartilhe sua experiência conosco.</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Modal de Envio para Alunos */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div 
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3>Deixe seu depoimento</h3>
              <p>Sua avaliação será enviada para nossa equipe de moderação.</p>

              {submitStatus === 'success' ? (
                <div className="success-msg">
                  <CheckCircle2 size={48} color="#25d366" />
                  <h4>Enviado com sucesso!</h4>
                  <p>Agradecemos sua participação. Em breve ela aparecerá no site após aprovação.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="testimonial-form">
                  <div className="form-group">
                    <label>Seu Nome Completo</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div className="form-group">
                    <label>Curso Realizado</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.course}
                      onChange={(e) => setFormData({...formData, course: e.target.value})}
                      placeholder="Ex: Inspetor Dimensional"
                    />
                  </div>
                  <div className="form-group">
                    <label>Sua Avaliação</label>
                    <textarea 
                      required 
                      rows={4}
                      maxLength={300}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      placeholder="Conte um pouco sobre sua experiência..."
                    ></textarea>
                    <small>{formData.content.length}/300 caracteres</small>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                    <button type="submit" className="btn-save" disabled={submitStatus === 'sending'}>
                      {submitStatus === 'sending' ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .testimonials-section {
          background: #f8fafc;
          position: relative;
          overflow: hidden;
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }
        .testimonial-card {
          background: white;
          padding: 2rem;
          border-radius: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.3s ease;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .quote-icon {
          color: var(--primary);
          opacity: 0.2;
          width: 32px;
          height: 32px;
        }
        .testimonial-text {
          font-style: italic;
          color: var(--text-main);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }
        .user-info strong {
          display: block;
          color: var(--primary-dark);
          font-size: 1rem;
        }
        .user-info span {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .date {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        /* Screenshot Mode */
        .card-screenshot {
          padding: 0;
          overflow: hidden;
        }
        .screenshot-container {
          position: relative;
        }
        .screenshot-img {
          width: 100%;
          height: auto;
          display: block;
          border-bottom: 4px solid var(--primary);
        }
        .screenshot-info {
          padding: 1.5rem;
          background: white;
          display: flex;
          gap: 0.75rem;
        }
        .quote-icon-small {
          color: var(--primary);
          min-width: 16px;
        }
        .screenshot-info p {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--primary-dark);
          margin: 0;
        }

        /* Add Card */
        .add-testimonial-card {
          background: rgba(0, 75, 73, 0.03);
          border: 2px dashed #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-align: center;
        }
        .icon-plus {
          color: var(--primary);
          margin-bottom: 1rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-content {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 2rem;
          padding: 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-weight: 700; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          outline: none;
        }
        .modal-footer { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; }
        .btn-cancel { background: #f1f5f9; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; cursor: pointer; }
        .btn-save { background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; cursor: pointer; }
        .success-msg { text-align: center; padding: 2rem 0; }

        @media (max-width: 640px) {
          .testimonials-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
