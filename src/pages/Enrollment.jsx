import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Send, Phone, User, Mail, BookOpen } from 'lucide-react';
import { useEdit } from '../context/EditContext';
import { enrollmentsApi } from '../services/site';
import EditableText from '../components/EditableText';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AdminToolbar from '../components/AdminToolbar';

const Enrollment = () => {
  const { content } = useEdit();
  const { courses_section } = content;
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    course: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Salvar via API pública
      await enrollmentsApi.createPublic({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        course_name: formData.course
      });

      // 2. Preparar mensagem do WhatsApp
      const message = `*NOVA MATRÍCULA - CEC ENGENHARIA*%0A%0A*Nome:* ${formData.name}%0A*Telefone:* ${formData.phone}%0A*E-mail:* ${formData.email}%0A*Curso:* ${formData.course}`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=5521965554180&text=${message}`;

      // 3. Abrir WhatsApp (Aviso Diretoria)
      window.open(whatsappUrl, '_blank');

      setIsSuccess(true);
      setFormData({ name: '', phone: '', email: '', course: '' });
    } catch (err) {
      console.error('Error submitting enrollment:', err);
      alert('Erro ao processar matrícula. Tente novamente ou fale no Zap!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="enroll-page-wrapper">
      <AdminToolbar />
      <Navbar />
      
      <main className="enroll-main section-padding">
        <div className="container enroll-grid">
          {/* Coluna de Texto */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="enroll-content"
          >
            <div className="badge-status">MATRÍCULAS ABERTAS 2026</div>
            <h1 className="enroll-title">Comece sua jornada de <span className="text-primary">Especialização.</span></h1>
            <p className="enroll-desc">Preencha o formulário abaixo para garantir sua vaga. Nossa equipe entrará em contato em até 24h para concluir o processo de pagamento e acesso.</p>
            
            <div className="enroll-benefits">
              <div className="benefit-item">
                <CheckCircle size={20} className="text-secondary" />
                <span>Certificado Reconhecido pela Abendi</span>
              </div>
              <div className="benefit-item">
                <CheckCircle size={20} className="text-secondary" />
                <span>Material Didático Atualizado</span>
              </div>
              <div className="benefit-item">
                <CheckCircle size={20} className="text-secondary" />
                <span>Suporte Direto com Instrutores</span>
              </div>
            </div>
          </motion.div>

          {/* Coluna do Formulário */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="enroll-form-card shadow-lg"
          >
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="enroll-form">
                <div className="form-head">
                  <h3>Dados da Matrícula</h3>
                  <p>Informe seus dados corretamente.</p>
                </div>

                <div className="input-group">
                  <label><User size={16} /> Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Como no certificado"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label><Phone size={16} /> Telefone / WhatsApp</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label><Mail size={16} /> E-mail Profissional</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label><BookOpen size={16} /> Escolha o Treinamento</label>
                  <select 
                    required 
                    value={formData.course}
                    onChange={(e) => setFormData({...formData, course: e.target.value})}
                  >
                    <option value="">Selecione um curso...</option>
                    {courses_section.courses.map(course => (
                      <option key={course.id} value={course.title}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="btn-primary w-full btn-large" disabled={isSubmitting}>
                  {isSubmitting ? 'Processando...' : 'Finalizar Solicitação de Matrícula'}
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <div className="success-state text-center">
                <div className="success-icon"><CheckCircle size={60} /></div>
                <h2>Solicitação Enviada!</h2>
                <p>Nossa diretoria já recebeu seu interesse via WhatsApp e no sistema. Entraremos em contato em breve.</p>
                <button onClick={() => setIsSuccess(false)} className="btn-secondary">Enviar outra matrícula</button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />

      <style jsx="true">{`
        .enroll-main {
          background: #fdfdfd;
          padding-top: 10rem;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }
        .enroll-grid {
          display: grid;
          grid-template-columns: 1fr 500px;
          gap: 6rem;
          align-items: center;
        }
        .badge-status {
          background: #eef2ff;
          color: var(--primary);
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          font-weight: 800;
          font-size: 0.75rem;
          display: inline-block;
          margin-bottom: 2rem;
        }
        .enroll-title {
          font-size: 3.5rem;
          line-height: 1.1;
          margin-bottom: 2rem;
          font-weight: 800;
          color: var(--primary-dark);
        }
        .enroll-desc {
          font-size: 1.25rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 3rem;
        }
        .enroll-benefits {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .benefit-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 600;
          color: var(--primary-dark);
        }
        .enroll-form-card {
          background: white;
          border-radius: 2rem;
          padding: 3rem;
          border: 1px solid #f1f5f9;
        }
        .form-head {
          margin-bottom: 2.5rem;
          text-align: center;
        }
        .form-head h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .form-head p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .input-group {
          margin-bottom: 1.5rem;
        }
        .input-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--primary);
        }
        .input-group input, .input-group select {
          width: 100%;
          padding: 0.85rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          outline: none;
          transition: all 0.3s;
        }
        .input-group input:focus, .input-group select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(0, 75, 73, 0.1);
        }
        .btn-large {
          padding: 1rem;
          font-size: 1rem;
          margin-top: 1rem;
        }
        .success-state {
          padding: 3rem 0;
        }
        .success-icon {
          color: #10b981;
          margin-bottom: 2rem;
        }
        .success-state h2 {
          margin-bottom: 1rem;
          font-size: 2rem;
        }
        
        @media (max-width: 1100px) {
          .enroll-grid { grid-template-columns: 1fr; gap: 4rem; text-align: center; }
          .enroll-content { display: flex; flex-direction: column; align-items: center; }
          .enroll-title { font-size: 2.8rem; }
          .enroll-form-card { max-width: 600px; margin-inline: auto; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Enrollment;
