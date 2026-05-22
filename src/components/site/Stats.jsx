import React from 'react';
import { motion } from 'framer-motion';
import { useEdit } from '../../context/EditContext';
import EditableText from './EditableText';

const Stats = () => {
  const { content } = useEdit();
  const stats = content.stats || {};
  const statsGrid = stats.grid || [];
  const statsBenefits = stats.benefits || [];

  return (
    <section className="stats-section section-padding">
      <div className="container stats-container">
        <div className="stats-grid">
          {statsGrid.map((stat, index) => (
            <motion.div 
              key={index}
              className="stat-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="stat-value">
                <EditableText 
                  path={`stats.grid.${index}.value`} 
                  initialValue={stat.value} 
                />
              </h3>
              <p className="stat-label">
                <EditableText 
                  path={`stats.grid.${index}.label`} 
                  initialValue={stat.label} 
                />
              </p>
            </motion.div>
          ))}
        </div>
        
        <div className="stats-content">
          <h2 className="stats-title">
            <EditableText 
              path="stats.title" 
              initialValue={stats.title} 
              tagName="div" 
            />
          </h2>
          <div className="stats-desc">
            <EditableText 
              path="stats.description" 
              initialValue={stats.description} 
              tagName="p" 
            />
          </div>
          <ul className="stats-list">
            {statsBenefits.map((benefit, index) => (
              <li key={index}>
                <span className="dot"></span>
                <EditableText 
                  path={`stats.benefits.${index}`} 
                  initialValue={benefit} 
                  tagName="div" 
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style jsx>{`
        .stats-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6rem;
          align-items: center;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .stat-card {
          background: var(--bg-soft);
          padding: 2.5rem;
          border-radius: var(--radius-lg);
          text-align: left;
          border: 1px solid var(--border);
        }
        .stat-value {
          font-size: 2.5rem;
          color: var(--primary);
          margin-bottom: 0.5rem;
          font-weight: 800;
        }
        .stat-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 1px;
        }
        .stats-title {
          font-size: 2.5rem;
          margin-bottom: 2rem;
        }
        :global(.stats-desc) {
          color: var(--text-muted);
          margin-bottom: 2rem;
          font-size: 1.125rem;
          line-height: 1.6;
        }
        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .stats-list li {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          font-size: 1rem;
          color: var(--text-main);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          margin-top: 0.5rem;
          flex-shrink: 0;
        }

        @media (max-width: 968px) {
          .stats-container {
            grid-template-columns: 1fr;
            gap: 4rem;
          }
          .stats-content {
            text-align: center;
          }
          .stats-list li {
            text-align: left;
          }
        }
      `}</style>
    </section>
  );
};

export default Stats;
