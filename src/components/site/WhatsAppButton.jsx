import React from 'react';
import { MessageCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEdit } from '../../context/EditContext';
import EditableSlot from './EditableSlot';

const WhatsAppButton = () => {
  const { content, isEditing } = useEdit();
  const whatsapp = content.whatsapp || {
    number: "+5521965554180",
    message: "Olá! Gostaria de saber mais sobre os cursos da CEC Engenharia.",
    tooltip: "Como podemos ajudar hoje?"
  };

  const whatsappUrl = `https://wa.me/${whatsapp.number.replace(/\D/g, '')}?text=${encodeURIComponent(whatsapp.message)}`;

  return (
    <div className="whatsapp-floating">
      <div className="whatsapp-wrapper">
        <motion.a 
          href={isEditing ? "#" : whatsappUrl}
          target={isEditing ? "_self" : "_blank"} 
          rel="noopener noreferrer"
          className="whatsapp-btn"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <div className="btn-badge">1</div>
          <MessageCircle size={32} />
        </motion.a>

        {isEditing && (
          <div className="whatsapp-admin-controls">
            <EditableSlot 
              path="whatsapp.number" 
              initialValue={whatsapp.number} 
              className="wa-config-trigger"
            >
              <Settings size={14} />
            </EditableSlot>
          </div>
        )}
      </div>

      <motion.div 
        className="whatsapp-tooltip-container"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
      >
        <EditableSlot 
          path="whatsapp.tooltip" 
          initialValue={whatsapp.tooltip} 
          className="wa-tooltip-text"
        />
      </motion.div>

      <style jsx>{`
        .whatsapp-floating {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-direction: row-reverse;
        }
        .whatsapp-wrapper {
          position: relative;
        }
        .whatsapp-btn {
          background: #25d366;
          color: white;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(37, 211, 102, 0.4);
          cursor: pointer;
        }
        .whatsapp-admin-controls {
          position: absolute;
          top: -10px;
          left: -10px;
          z-index: 100;
        }
        :global(.wa-config-trigger) {
          background: var(--primary-dark);
          color: white;
          padding: 6px;
          border-radius: 50%;
          display: flex !important;
          box-shadow: var(--shadow-sm);
        }
        .btn-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff4b4b;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }
        .whatsapp-tooltip-container {
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
        }
        :global(.wa-tooltip-text) {
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
          color: var(--text-main);
        }

        @media (max-width: 768px) {
          .whatsapp-floating { bottom: 1.5rem; right: 1.5rem; }
          .whatsapp-btn { width: 60px; height: 60px; }
          .whatsapp-tooltip-container { display: none; }
        }
      `}</style>
    </div>
  );
};

export default WhatsAppButton;
