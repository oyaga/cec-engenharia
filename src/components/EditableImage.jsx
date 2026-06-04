import React, { useState } from 'react';
import { Camera, Link as LinkIcon, X, Check } from 'lucide-react';
import { useEdit } from '../context/EditContext';

const EditableImage = ({ path, initialValue, className, alt = "Imagem Editável" }) => {
  const { isEditing, updateContent } = useEdit();
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(initialValue);

  const handleUpdate = () => {
    updateContent(path, tempUrl);
    setIsPromptOpen(false);
  };

  const handleCancel = () => {
    setTempUrl(initialValue);
    setIsPromptOpen(false);
  };

  if (!isEditing) {
    return (
      <div className={`img-wrapper-fluid ${className}`}>
        <img src={initialValue} alt={alt} />
        <style jsx="true">{`
          .img-wrapper-fluid {
            overflow: hidden;
            display: block;
          }
          .img-wrapper-fluid img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`editable-image-container ${className}`}>
      <div className="img-wrapper-fluid h-100">
        <img src={initialValue} alt={alt} className="editable-img-preview" />
      </div>
      
      <div className="image-edit-overlay" onClick={() => setIsPromptOpen(true)}>
        <Camera size={24} />
        <span>Trocar</span>
      </div>

      {isPromptOpen && (
        <div className="image-url-prompt" onClick={(e) => e.stopPropagation()}>
          <div className="prompt-header">
            <LinkIcon size={14} />
            <span>Link da Imagem</span>
          </div>
          <input 
            type="text" 
            value={tempUrl} 
            onChange={(e) => setTempUrl(e.target.value)}
            placeholder="Cole o link da nova imagem..."
            autoFocus
          />
          <div className="prompt-actions">
            <button className="btn-cancel" onClick={handleCancel}>
              <X size={14} />
            </button>
            <button className="btn-confirm" onClick={handleUpdate}>
              <Check size={14} />
            </button>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .editable-image-container {
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }
        .img-wrapper-fluid {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .img-wrapper-fluid img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .h-100 { height: 100%; }
        
        .editable-img-preview {
          border: 2px dashed rgba(0, 209, 178, 0.4);
        }
        .image-edit-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          color: white;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 5;
        }
        .editable-image-container:hover .image-edit-overlay {
          opacity: 1;
        }
        .image-url-prompt {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          background: white;
          padding: 0.75rem;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .prompt-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #1e293b;
          text-transform: uppercase;
        }
        .image-url-prompt input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.8rem;
          outline: none;
        }
        .prompt-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.4rem;
        }
        .btn-cancel, .btn-confirm {
          padding: 0.3rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-cancel { background: #f1f5f9; color: #64748b; }
        .btn-confirm { background: var(--primary); color: white; }
      `}</style>
    </div>
  );
};

export default EditableImage;
