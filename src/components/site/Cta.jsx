import React from 'react';
import { motion } from 'framer-motion';
import { useEdit } from '../../context/EditContext';
import EditableText from './EditableText';

const Cta = () => {
  const { content } = useEdit();
  const { cta_section } = content;

  return (
    <section className="cta-section section-padding">
      <div className="container">
        <motion.div 
          className="cta-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="cta-title">
            <EditableText 
              path="cta_section.title" 
              initialValue={cta_section.title} 
              tagName="div" 
            />
          </h2>
          <div className="cta-text">
            <EditableText 
              path="cta_section.text" 
              initialValue={cta_section.text} 
              tagName="p" 
            />
          </div>
          <div className="cta-actions">
            <a href="#cursos" className="btn-site-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <EditableText 
                path="cta_section.buttons.0" 
                initialValue={cta_section.buttons[0]} 
              />
            </a>
            <a href="https://wa.me/5521965554180" target="_blank" rel="noopener noreferrer" className="btn-consult" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <EditableText 
                path="cta_section.buttons.1" 
                initialValue={cta_section.buttons[1]} 
              />
            </a>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .cta-section {
          padding-bottom: 8rem;
        }
        .cta-card {
          background: var(--primary);
          color: white;
          padding: 5rem 3rem;
          border-radius: var(--radius-lg);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-card::before {
          content: '';
          position: absolute;
          top: -100px;
          right: -100px;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
        }
        .cta-title {
          font-size: 3rem;
          color: white;
          margin-bottom: 1.5rem;
          position: relative;
          z-index: 2;
        }
        :global(.cta-text) {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.9);
          max-width: 600px;
          margin: 0 auto 3rem;
          position: relative;
          z-index: 2;
        }
        .cta-actions {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          position: relative;
          z-index: 2;
        }
        .btn-secondary {
          background: white;
          color: var(--primary);
          padding: 1rem 2.5rem;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 1.1rem;
        }
        .btn-consult {
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 1rem 2.5rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .cta-title { font-size: 2rem; }
          .cta-actions { flex-direction: column; }
        }
      `}</style>
    </section>
  );
};

export default Cta;
