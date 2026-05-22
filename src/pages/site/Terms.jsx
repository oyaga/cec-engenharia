import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Lock } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import EditableText from '../../components/site/EditableText';
import Navbar from '../../components/site/Navbar';
import Footer from '../../components/site/Footer';
import AdminToolbar from '../../components/site/AdminToolbar';

const Terms = () => {
  const { content } = useEdit();
  const { terms_page } = content;

  if (!terms_page) return null;

  return (
    <div className="legal-page-wrapper">
      <AdminToolbar />
      <Navbar />
      
      <main className="legal-main">
        {/* Header da Página */}
        <section className="legal-header">
          <div className="container">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="header-content"
            >
              <div className="icon-circle"><FileText size={32} /></div>
              <h1 className="page-title">
                <EditableText 
                  path="terms_page.title" 
                  initialValue={terms_page.title} 
                />
              </h1>
            </motion.div>
          </div>
        </section>

        {/* Conteúdo Legal */}
        <section className="legal-body section-padding">
          <div className="container narrow">
            <div className="legal-card">
              <div className="content-area">
                <EditableText 
                  path="terms_page.content" 
                  initialValue={terms_page.content} 
                  tagName="div"
                  style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}
                />
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
          gap: 1.5rem;
        }
        .icon-circle {
          width: 70px;
          height: 70px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0, 75, 73, 0.2);
        }
        .page-title {
          font-size: 3rem;
          color: var(--primary-dark);
          margin: 0;
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
        .last-updated {
          margin-top: 4rem;
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
            font-size: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Terms;
