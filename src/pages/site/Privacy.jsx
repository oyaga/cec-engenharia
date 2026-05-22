import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, FileText } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import EditableText from '../../components/site/EditableText';
import Navbar from '../../components/site/Navbar';
import Footer from '../../components/site/Footer';
import AdminToolbar from '../../components/site/AdminToolbar';

const Privacy = () => {
  const { content } = useEdit();
  const { privacy_page } = content;

  if (!privacy_page) return null;

  return (
    <div className="legal-page-wrapper">
      <AdminToolbar />
      <Navbar />
      
      <main className="legal-main">
        {/* Header da Página */}
        <section className="legal-header privacy-variant">
          <div className="container">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="header-content"
            >
              <div className="icon-circle privacy-icon"><Lock size={32} /></div>
              <h1 className="page-title">
                <EditableText 
                  path="privacy_page.title" 
                  initialValue={privacy_page.title} 
                />
              </h1>
              <p className="subtitle-legal">Seus dados protegidos pelo padrão CEC de segurança.</p>
            </motion.div>
          </div>
        </section>

        {/* Conteúdo Legal */}
        <section className="legal-body section-padding">
          <div className="container narrow">
            <div className="legal-card">
              <div className="content-area">
                <EditableText 
                  path="privacy_page.content" 
                  initialValue={privacy_page.content} 
                  tagName="div"
                  style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}
                />
              </div>
              <div className="trust-badges">
                <div className="badge-item">
                  <ShieldCheck size={24} />
                  <span>LGPD Compliance</span>
                </div>
                <div className="badge-item">
                  <Lock size={24} />
                  <span>Criptografia 256-bit</span>
                </div>
              </div>
              <div className="last-updated">
                <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .legal-main {
          background: #f8fafc;
        }
        .legal-header {
          background: white;
          padding: 8rem 0 4rem;
          border-bottom: 1px solid #e2e8f0;
          text-align: center;
        }
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }
        .icon-circle {
          width: 70px;
          height: 70px;
          background: #10b981; /* Cor Verde para Privacidade/Segurança */
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2);
        }
        .page-title {
          font-size: 3rem;
          color: var(--primary-dark);
          margin: 0;
        }
        .subtitle-legal {
          color: #64748b;
          font-size: 1.125rem;
          max-width: 500px;
        }
        .container.narrow {
          max-width: 850px;
          margin-inline: auto;
        }
        .legal-card {
          background: white;
          padding: 4rem;
          border-radius: 1.5rem;
          box-shadow: var(--shadow-md);
          border: 1px solid #e2e8f0;
        }
        .content-area {
          font-size: 1.1rem;
          color: #334155;
        }
        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 3rem;
          margin-top: 4rem;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 1rem;
        }
        .badge-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #10b981;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .last-updated {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.9rem;
          color: #64748b;
          text-align: center;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .legal-card {
            padding: 2rem;
            border-radius: 1rem;
          }
          .page-title {
            font-size: 2rem;
          }
          .trust-badges {
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Privacy;
