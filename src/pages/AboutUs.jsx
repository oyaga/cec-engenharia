import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, Eye, Star } from 'lucide-react';
import { useEdit } from '../context/EditContext';
import EditableText from '../components/EditableText';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AdminToolbar from '../components/AdminToolbar';

const AboutUs = () => {
  const { content } = useEdit();
  const { about_page } = content;

  if (!about_page) return null;

  return (
    <div className="about-page-wrapper">
      <AdminToolbar />
      <Navbar />
      
      <main className="about-main">
        {/* Header da Página */}
        <section className="page-header-simple">
          <div className="container">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="page-title"
            >
              <EditableText 
                path="about_page.title" 
                initialValue={about_page.title} 
              />
            </motion.h1>
          </div>
        </section>

        {/* História / Quem Somos */}
        <section className="about-intro section-padding">
          <div className="container intro-grid">
            <div className="intro-text">
              <div className="text-content">
                <EditableText 
                  path="about_page.content" 
                  initialValue={about_page.content} 
                  tagName="p"
                  className="main-description"
                />
              </div>
              <div className="quote-box">
                <EditableText 
                  path="about_page.quote" 
                  initialValue={about_page.quote} 
                  tagName="blockquote"
                />
              </div>
            </div>
            <div className="intro-image">
              <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop" alt="C&C Engenharia Team" />
            </div>
          </div>
        </section>

        {/* Missão, Visão e Valores */}
        <section className="mission-vision-section bg-soft section-padding">
          <div className="container">
            <div className="mvv-grid">
              <div className="mvv-card">
                <div className="icon-box"><Target size={32} /></div>
                <h3>
                  <EditableText 
                    path="about_page.mission.title" 
                    initialValue={about_page.mission.title} 
                  />
                </h3>
                <EditableText 
                  path="about_page.mission.text" 
                  initialValue={about_page.mission.text} 
                  tagName="p"
                />
              </div>

              <div className="mvv-card">
                <div className="icon-box"><Eye size={32} /></div>
                <h3>
                  <EditableText 
                    path="about_page.vision.title" 
                    initialValue={about_page.vision.title} 
                  />
                </h3>
                <EditableText 
                  path="about_page.vision.text" 
                  initialValue={about_page.vision.text} 
                  tagName="p"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Valores Detalhados */}
        <section className="values-section section-padding">
          <div className="container">
            <h2 className="section-title text-center">
              <EditableText 
                path="about_page.values.title" 
                initialValue={about_page.values.title} 
              />
            </h2>
            <div className="values-grid">
              {about_page.values.list.map((item, index) => (
                <div key={index} className="value-item">
                  <div className="value-header">
                    <Shield size={20} className="text-secondary" />
                    <h4>
                      <EditableText 
                        path={`about_page.values.list.${index}.title`} 
                        initialValue={item.title} 
                      />
                    </h4>
                  </div>
                  <EditableText 
                    path={`about_page.values.list.${index}.text`} 
                    initialValue={item.text} 
                    tagName="p"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx="true">{`
        .about-main {
          background: white;
        }
        .page-header-simple {
          background: var(--primary-dark);
          padding: 8rem 0 4rem;
          color: white;
          text-align: center;
        }
        .page-title {
          font-size: 3.5rem;
          margin: 0;
        }
        .intro-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }
        .main-description {
          font-size: 1.25rem;
          line-height: 1.8;
          color: var(--text-main);
          margin-bottom: 2rem;
        }
        .quote-box {
          padding: 2rem;
          border-left: 4px solid var(--primary);
          background: var(--bg-soft);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
          font-style: italic;
        }
        .intro-image img {
          width: 100%;
          border-radius: 2rem;
          box-shadow: var(--shadow-lg);
        }
        .mvv-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .mvv-card {
          background: white;
          padding: 3rem;
          border-radius: 1.5rem;
          box-shadow: var(--shadow-md);
          text-align: center;
        }
        .icon-box {
          color: var(--primary);
          margin-bottom: 1.5rem;
        }
        .mvv-card h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 3rem;
          margin-top: 4rem;
        }
        .value-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          color: var(--primary);
        }
        .value-header h4 {
          font-size: 1.1rem;
          margin: 0;
        }
        .value-item p {
          color: var(--text-muted);
          line-height: 1.6;
        }

        @media (max-width: 968px) {
          .intro-grid, .mvv-grid {
            grid-template-columns: 1fr;
          }
          .intro-image {
            order: -1;
          }
          .page-title {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AboutUs;
