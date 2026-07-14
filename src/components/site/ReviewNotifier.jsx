import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, X, Star } from 'lucide-react';
import { testimonialsApi } from '../../services/site';

const ReviewNotifier = () => {
  const [reviews, setReviews] = useState([]);
  const [currentReview, setCurrentReview] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { testimonials: data } = await testimonialsApi.listPublic();

      if (data && data.length > 0) {
        setReviews(data);
        startCycling(data);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    }
  };

  const startCycling = (data) => {
    // Primeira notificação após 5 segundos
    setTimeout(() => {
      showNextReview(data);
    }, 5000);
  };

  const showNextReview = (data) => {
    const randomIdx = Math.floor(Math.random() * data.length);
    setCurrentReview(data[randomIdx]);
    setIsVisible(true);

    // Esconde após 6 segundos
    setTimeout(() => {
      setIsVisible(false);
      // Agenda a próxima para daqui a 15-20 segundos
      setTimeout(() => showNextReview(data), 15000 + Math.random() * 5000);
    }, 6000);
  };

  if (!currentReview) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="review-notifier-toast"
          initial={{ x: 300, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 300, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
          <button className="close-notifier" onClick={() => setIsVisible(false)}>
            <X size={12} />
          </button>
          
          <div className="notifier-content">
            <div className="notifier-icon">
              <Quote size={14} fill="var(--primary)" color="var(--primary)" />
            </div>
            <div className="notifier-body">
              <div className="notifier-stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="#f59e0b" color="#f59e0b" />)}
              </div>
              <p className="notifier-text">
                {currentReview.type === 'screenshot' 
                  ? currentReview.admin_description 
                  : ((currentReview.content || '').substring(0, 80) + '...')}
              </p>
              <div className="notifier-user">
                <strong>{currentReview.name}</strong> • <span>{currentReview.course}</span>
              </div>
            </div>
          </div>

          <style jsx="true">{`
            .review-notifier-toast {
              position: fixed;
              bottom: 8rem;
              right: 2rem;
              background: white;
              width: 320px;
              padding: 1.25rem;
              border-radius: 1.25rem;
              box-shadow: 0 20px 40px -10px rgba(0,0,0,0.2);
              border: 1px solid #e2e8f0;
              z-index: 99999;
              cursor: pointer;
            }
            .close-notifier {
              position: absolute;
              top: 0.5rem;
              right: 0.5rem;
              background: #f1f5f9;
              border: none;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #64748b;
              cursor: pointer;
            }
            .notifier-content {
              display: flex;
              gap: 1rem;
            }
            .notifier-icon {
              background: rgba(0, 75, 73, 0.05);
              width: 32px;
              height: 32px;
              min-width: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .notifier-body {
              flex: 1;
            }
            .notifier-stars {
              display: flex;
              gap: 2px;
              margin-bottom: 0.25rem;
            }
            .notifier-text {
              font-size: 0.85rem;
              color: var(--text-main);
              line-height: 1.4;
              margin: 0.5rem 0;
              font-weight: 500;
              font-style: italic;
            }
            .notifier-user {
              font-size: 0.75rem;
              color: #64748b;
            }
            .notifier-user strong {
              color: var(--primary);
            }

            @media (max-width: 640px) {
              .review-notifier-toast {
                right: 1rem;
                left: 1rem;
                width: calc(100% - 2rem);
                bottom: 7rem;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReviewNotifier;
