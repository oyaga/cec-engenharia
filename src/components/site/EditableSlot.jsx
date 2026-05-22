import React, { useState, useEffect } from 'react';
import { useEdit } from '../../context/EditContext';
import { Settings, Image as ImageIcon, Type, X, Check } from 'lucide-react';

const EditableSlot = ({ path, initialValue, className = "", tagName: Tag = "div", style = {} }) => {
  const { isEditing, updateContent } = useEdit();
  const [showEditor, setShowEditor] = useState(false);
  
  // O valor pode ser uma string simples ou um objeto { type: 'text'|'image', value: '...' }
  const [content, setContent] = useState(() => {
    if (typeof initialValue === 'object' && initialValue !== null) return initialValue;
    // Se for string, tentamos inferir se é imagem pela extensão ou formato
    const isImg = initialValue?.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || initialValue?.startsWith('http');
    return { type: isImg ? 'image' : 'text', value: initialValue };
  });

  const [tempValue, setTempValue] = useState(content.value);
  const [tempType, setTempType] = useState(content.type);

  const handleSave = () => {
    const newContent = { type: tempType, value: tempValue };
    setContent(newContent);
    updateContent(path, newContent);
    setShowEditor(false);
  };

  const renderContent = () => {
    if (content.type === 'image') {
      // Resolve caminhos relativos para imagens internas
      const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, "");
      const fileName = content.value.startsWith('/') ? content.value.substring(1) : content.value;
      const imgSrc = content.value.startsWith('http') || content.value.startsWith('data:')
        ? content.value 
        : `${baseUrl}/${fileName}`;

      return (
        <img 
          src={imgSrc} 
          alt="CEC" 
          className={`slot-img ${className}`}
          style={{ ...style, objectFit: 'contain' }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    }
    return (
      <Tag className={className} style={style}>
        {content.value}
      </Tag>
    );
  };

  if (!isEditing) return renderContent();

  return (
    <div className="editable-slot-container">
      {renderContent()}
      
      <button 
        className="slot-edit-trigger"
        onClick={() => {
          setTempValue(content.value);
          setTempType(content.type);
          setShowEditor(true);
        }}
        title="Editar Conteúdo Híbrido"
      >
        <Settings size={14} />
      </button>

      {showEditor && (
        <div className="slot-modal-overlay">
          <div className="slot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="slot-modal-header">
              <h3>Configurar Elemento</h3>
              <button onClick={() => setShowEditor(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="slot-type-toggle">
              <button 
                className={tempType === 'text' ? 'active' : ''} 
                onClick={() => setTempType('text')}
              >
                <Type size={16} /> Texto
              </button>
              <button 
                className={tempType === 'image' ? 'active' : ''} 
                onClick={() => setTempType('image')}
              >
                <ImageIcon size={16} /> Imagem
              </button>
            </div>

            <div className="slot-input-group">
              <label>{tempType === 'image' ? 'URL da Imagem' : 'Conteúdo do Texto'}</label>
              {tempType === 'text' ? (
                <textarea 
                  value={tempValue} 
                  onChange={(e) => setTempValue(e.target.value)}
                  rows={4}
                  placeholder="Digite o texto aqui..."
                />
              ) : (
                <input 
                  type="text" 
                  value={tempValue} 
                  onChange={(e) => setTempValue(e.target.value)}
                  placeholder="Cole o link (URL) da imagem aqui..."
                />
              )}
              <p className="hint">
                {tempType === 'image' 
                  ? "Dica: Você pode copiar o link da imagem do seu Google Drive ou Nuvem." 
                  : "Dica: Use quebras de linha para textos longos."}
              </p>
            </div>

            <div className="slot-modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditor(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSave}>
                <Check size={18} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .editable-slot-container {
          position: relative;
          display: inline-block;
          width: 100%;
          min-height: 20px;
          outline: 2px dashed rgba(0, 75, 73, 0.35);
          outline-offset: 2px;
          border-radius: 6px;
        }
        .slot-edit-trigger {
          position: absolute;
          top: 4px;
          right: 4px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 100;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          opacity: 1;
          transition: transform 0.2s ease;
        }
        .slot-edit-trigger:hover {
          transform: scale(1.15);
        }
        /* Modal Styles */
        .slot-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 75, 73, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }
        .slot-modal {
          background: white;
          width: 100%;
          max-width: 450px;
          border-radius: 1.5rem;
          padding: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalSlide 0.3s ease-out;
        }
        @keyframes modalSlide {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .slot-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .slot-modal-header h3 {
          color: var(--primary-dark);
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        
        .slot-type-toggle {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 2rem;
        }
        .slot-type-toggle button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .slot-type-toggle button.active {
          background: white;
          color: var(--primary);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .slot-input-group {
          margin-bottom: 2rem;
        }
        .slot-input-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary-dark);
          margin-bottom: 0.5rem;
        }
        .slot-input-group input, 
        .slot-input-group textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .slot-input-group input:focus, 
        .slot-input-group textarea:focus {
          border-color: var(--primary);
        }
        .hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
          font-style: italic;
        }
        
        .slot-modal-footer {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }
        .btn-cancel {
          background: #f1f5f9;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
        }
        .btn-save {
          background: var(--primary);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 75, 73, 0.2);
        }
        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 20px -3px rgba(0, 75, 73, 0.3);
        }

        /* Mobile Adjustments for Touch */
        @media (max-width: 640px) {
          .slot-modal {
            padding: 1.5rem;
            max-width: 100%;
          }
          .slot-edit-trigger {
            width: 32px;
            height: 32px;
            opacity: 0.8;
            top: 5px;
            right: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default EditableSlot;
