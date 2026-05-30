import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Target, Eye, Star, Plus } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import EditableText from '../../components/site/EditableText';
import EditableImage from '../../components/site/EditableImage';
import Navbar from '../../components/site/Navbar';
import Footer from '../../components/site/Footer';
import AdminToolbar from '../../components/site/AdminToolbar';

const AboutUs = () => {
  const { content, isEditing, addItemToList, removeItemFromList, updateContent } = useEdit();
  const about_page = content.about_page || {};
  const valuesList = about_page.values?.list || [];
  const tableSection = about_page.table_section || {};
  const showTable = tableSection.show_table ?? true;

  if (!content.about_page) return null;

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
              <EditableImage 
                path="about_page.image" 
                initialValue={about_page.image} 
              />
            </div>
          </div>
        </section>

        {/* Missão, Visão e Valores */}
        <section className="mission-vision-section bg-soft section-padding">
          <div className="container">
            <div className="mvv-grid">
              <div className="mvv-card">
                <div className="mvv-image-container">
                  <EditableImage 
                    path="about_page.mission.image" 
                    initialValue={about_page.mission.image} 
                    className="mvv-img"
                  />
                </div>
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
                <div className="mvv-image-container">
                  <EditableImage 
                    path="about_page.vision.image" 
                    initialValue={about_page.vision.image} 
                    className="mvv-img"
                  />
                </div>
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
              {valuesList.map((item, index) => (
                <div key={index} className="value-item" style={{ position: 'relative' }}>
                  <div className="value-image-small">
                     <EditableImage 
                        path={`about_page.values.list.${index}.image`} 
                        initialValue={item.image} 
                      />
                  </div>
                  <div className="value-header">
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
                  {isEditing && (
                    <button 
                      className="btn-remove-tiny"
                      onClick={() => removeItemFromList('about_page.values.list', index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              
              {isEditing && (
                <div className="add-value-placeholder">
                  <button 
                    className="btn-add-circle large"
                    onClick={() => addItemToList('about_page.values.list', { 
                      title: 'Novo Valor', 
                      text: 'Descrição do valor...', 
                      image: 'https://images.unsplash.com/photo-1504917595217-d4dc5f566f63?q=80&w=300&auto=format&fit=crop' 
                    })}
                  >
                    <Plus size={32} />
                  </button>
                  <p>Adicionar Novo Valor</p>
                </div>
              )}
            </div>
          </div>
        </section>
 
        {/* TABELA DINÂMICA (NOVO) */}
        {(!showTable && !isEditing) ? null : (
          <section className="dynamic-table-section section-padding bg-soft" style={{ 
            opacity: showTable ? 1 : 0.55, 
            transition: 'all 0.3s ease',
            border: showTable ? 'none' : '2px dashed #f59e0b',
            background: showTable ? 'var(--bg-soft)' : '#fffbeb',
            borderRadius: showTable ? '0' : '1.5rem',
            margin: showTable ? '0' : '2rem auto',
            maxWidth: showTable ? '100%' : '1100px'
          }}>
            <div className="container">
              {isEditing && (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '2rem', 
                  background: 'white', 
                  padding: '1.25rem', 
                  borderRadius: '16px', 
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                  border: '1px solid #e2e8f0' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: showTable ? '#10b981' : '#f59e0b' }}>
                      {showTable ? '👁️ TABELA VISÍVEL PARA O PÚBLICO' : '👁️ TABELA OCULTADA PARA O PÚBLICO'}
                    </span>
                  </div>
                  <button 
                    onClick={() => updateContent('about_page.table_section.show_table', !showTable)}
                    style={{
                      background: showTable ? '#ef4444' : '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '0.55rem 1.25rem',
                      borderRadius: '30px',
                      fontWeight: '800',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {showTable ? 'Ocultar esta Seção' : 'Tornar Seção Visível'}
                  </button>
                  {!showTable && (
                    <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600', marginTop: '4px', textAlign: 'center' }}>
                      Esta tabela de Informações Adicionais NÃO aparecerá na página pública para os visitantes comuns do site.
                    </span>
                  )}
                </div>
              )}

              <h2 className="section-title text-center">
                <EditableText 
                  path="about_page.table_section.title" 
                  initialValue={about_page.table_section?.title || "Informações Adicionais"} 
                />
              </h2>
              
              <div className="table-responsive">
                <table className="custom-editable-table">
                  <thead>
                    <tr>
                      {(about_page.table_section?.headers || ["Coluna 1", "Coluna 2"]).map((header, hIndex) => (
                        <th key={hIndex}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <EditableText 
                              path={`about_page.table_section.headers.${hIndex}`} 
                              initialValue={header} 
                            />
                            {isEditing && (
                              <button className="btn-remove-tiny-table" onClick={() => removeItemFromList('about_page.table_section.headers', hIndex)}>×</button>
                            )}
                          </div>
                        </th>
                      ))}
                      {isEditing && (
                        <th>
                          <button className="btn-add-circle tiny" onClick={() => addItemToList('about_page.table_section.headers', 'Nova Coluna')}>+</button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(about_page.table_section?.rows || [["Dado 1", "Dado 2"]]).map((row, rIndex) => (
                      <tr key={rIndex}>
                        {row.map((cell, cIndex) => (
                          <td key={cIndex}>
                            <div style={{ position: 'relative' }}>
                              <EditableText 
                                path={`about_page.table_section.rows.${rIndex}.${cIndex}`} 
                                initialValue={cell} 
                              />
                            </div>
                          </td>
                        ))}
                        {isEditing && (
                          <td>
                            <button className="btn-remove-tiny-table" onClick={() => removeItemFromList('about_page.table_section.rows', rIndex)}>×</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {isEditing && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button className="btn-site-primary" onClick={() => {
                      const colCount = about_page.table_section?.headers?.length || 2;
                      addItemToList('about_page.table_section.rows', Array(colCount).fill("Novo Dado"));
                    }}>
                      <Plus size={16} /> Adicionar Linha
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      <style jsx>{`
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
          color: white !important;
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
        .intro-image {
          width: 100%;
          border-radius: 2rem;
          overflow: hidden;
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
          position: relative;
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
 
        .mvv-image-container {
          width: 100%;
          height: 200px;
          margin-bottom: 2rem;
          border-radius: 1rem;
          overflow: hidden;
          position: relative;
        }
        :global(.mvv-img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .value-image-small {
          width: 60px;
          height: 60px;
          margin-bottom: 1.5rem;
          border-radius: 0.75rem;
          overflow: hidden;
          background: var(--bg-soft);
        }
        .add-value-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          border: 2px dashed #ddd;
          border-radius: 1.5rem;
          padding: 3rem;
          color: var(--text-muted);
        }
        .btn-add-circle.large {
          width: 64px;
          height: 64px;
          background: var(--secondary);
          color: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-add-circle.large:hover { transform: scale(1.1); background: var(--secondary-dark); }

        .btn-remove-tiny {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .btn-remove-tiny-table {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          width: 18px;
          height: 18px;
          font-size: 10px;
          cursor: pointer;
        }
        .table-responsive {
          overflow-x: auto;
          margin-top: 2rem;
          background: white;
          border-radius: 1rem;
          padding: 1rem;
          box-shadow: var(--shadow-md);
        }
        .custom-editable-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        .custom-editable-table th, .custom-editable-table td {
          padding: 1rem;
          border: 1px solid var(--border);
          text-align: left;
        }
        .custom-editable-table th {
          background: var(--bg-soft);
          color: var(--primary-dark);
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.75rem;
        }
        .custom-editable-table td {
          font-size: 0.9rem;
          color: var(--text-main);
        }
 
        @media (max-width: 968px) {
          .intro-grid, .mvv-grid {
            grid-template-columns: 1fr;
          }
          .intro-image {
            order: -1;
          }
          .page-header-simple {
            padding: 6rem 0 3rem;
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
