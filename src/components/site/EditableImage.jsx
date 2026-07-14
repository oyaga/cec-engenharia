import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, UploadCloud, Image as ImageIcon, Video } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import { uploadFile } from '../../lib/api';

const EditableImage = ({ path, initialValue, className, alt = "Mídia Editável", compact = false }) => {
  const { isEditing, updateContent, content } = useEdit();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('url'); // 'url' | 'upload'
  const [tempUrl, setTempUrl] = useState(initialValue);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const getNestedValue = (obj, path) => {
    if (!obj || !path) return null;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const currentValue = getNestedValue(content, path) || initialValue;
  const savedSettings = getNestedValue(content, `${path}_settings`) || { scale: 1, y: 50 };

  console.log(`[EditableImage] Renderizando ${path}:`, { currentValue, savedSettings });

  const [tempSettings, setTempSettings] = useState(savedSettings);

  const isVideo = (url, file) => {
    if (file) {
      return file.type.startsWith('video/');
    }
    if (!url) return false;
    if (url.startsWith('blob:')) {
      const inputFile = fileInputRef.current?.files[0];
      if (inputFile) {
        return inputFile.type.startsWith('video/');
      }
    }
    try {
      const cleanUrl = url.split('?')[0];
      return !!cleanUrl.match(/\.(mp4|webm|ogg|mov)$/i);
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    setTempUrl(currentValue);
    setTempSettings(savedSettings);
  }, [isOpen, currentValue, JSON.stringify(savedSettings)]);

  const handleUpdate = () => {
    console.log(`Atualizando ${path} com URL:`, tempUrl);
    updateContent(path, tempUrl);
    updateContent(`${path}_settings`, tempSettings);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setPreview(null);
    setSelectedFile(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setTab('upload');
  };

  const handleFileUpload = async () => {
    try {
      const file = fileInputRef.current?.files[0];
      if (!file) {
        handleUpdate();
        return;
      }
      setIsUploading(true);
      const { url: publicUrl } = await uploadFile(file, 'site-assets');

      if (!publicUrl) throw new Error("Não foi possível gerar a URL pública do arquivo.");

      updateContent(path, publicUrl);
      updateContent(`${path}_settings`, tempSettings);
      setIsOpen(false);
      setPreview(null);
      setSelectedFile(null);
    } catch (err) {
      console.error('Erro detalhado no upload:', err);
      alert('Erro ao enviar: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const mediaStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${savedSettings.scale || 1})`,
    objectPosition: `center ${savedSettings.y || 50}%`,
    transition: 'all 0.3s'
  };

  const containerStyle = {
    maxWidth: savedSettings.width ? `${savedSettings.width}px` : '100%',
    margin: '0 auto'
  };

  const renderMedia = (url, style, customSettings) => {
    if (!url) return null;
    
    // Só adiciona timestamp se NÃO for um link temporário (blob:) e se estiver em modo de edição
    const isBlob = url.startsWith('blob:');
    const finalUrl = (isBlob || !isEditing) ? url : (url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`);
    
    console.log(`[renderMedia] Renderizando SRC:`, finalUrl);

    const settings = customSettings || savedSettings;

    if (isVideo(url, isBlob ? selectedFile : null)) {
      const showControls = settings.controls ?? false;
      const isMuted = settings.muted ?? true;
      const shouldLoop = settings.loop ?? true;
      const shouldAutoplay = settings.autoplay ?? true;

      return (
        <video 
          ref={el => { if (el) el.muted = isMuted; }}
          src={finalUrl} 
          style={style} 
          autoPlay={shouldAutoplay} 
          muted={isMuted} 
          defaultMuted={isMuted}
          loop={shouldLoop} 
          playsInline 
          controls={showControls}
          preload="auto"
        />
      );
    }
    return <img src={finalUrl} alt={alt} style={style} />;
  };

  if (!isEditing) {
    return (
      <div key={currentValue} className={`img-wrapper-fluid ${className || ''}`} style={{ ...containerStyle, overflow: 'hidden' }}>
        {renderMedia(currentValue, mediaStyle)}
      </div>
    );
  }

  return (
    <>
      <div 
        key={currentValue} 
        className={`editable-image-container ${className || ''} ${compact ? 'compact-edit' : ''}`} 
        style={{ ...containerStyle, overflow: compact ? 'visible' : 'hidden' }}
        onClick={() => setIsOpen(true)}
      >
        <div className="img-wrapper-fluid h-100">
          {renderMedia(currentValue, mediaStyle)}
        </div>
        <div className="image-edit-overlay">
          <Camera size={compact ? 14 : 22} />
          {!compact && <span>Trocar / Vídeo</span>}
        </div>
      </div>

      {isOpen && createPortal(
        <div
          onClick={handleCancel}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            zIndex: 99999, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1e293b', borderRadius: '20px', padding: '2rem',
              width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)', display: 'flex',
              flexDirection: 'column', gap: '1.5rem'
            }}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ color:'white', margin:0, fontSize:'1.1rem', fontWeight:'700', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <Video size={20} color="#10b981" /> Editor de Mídia (Foto/Vídeo)
              </h3>
              <button onClick={handleCancel} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display:'flex', gap:'0.5rem', background:'#0f172a', borderRadius:'12px', padding:'4px' }}>
              {[['url','🔗 Link'], ['upload','⬆️ Arquivo']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  style={{
                    flex:1, padding:'0.6rem', borderRadius:'10px', border:'none', cursor:'pointer',
                    fontWeight:'700', fontSize:'0.85rem',
                    background: tab === key ? '#10b981' : 'transparent',
                    color: tab === key ? 'white' : '#64748b', transition:'all 0.2s'
                  }}>{label}</button>
              ))}
            </div>

            {tab === 'url' ? (
              <input
                type="text"
                value={tempUrl}
                onChange={e => setTempUrl(e.target.value)}
                placeholder="Cole link da foto ou vídeo (mp4)..."
                style={{
                  background:'#0f172a', border:'1px solid #334155', borderRadius:'10px',
                  padding:'0.75rem', color:'white', width:'100%', outline:'none'
                }}
              />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div onClick={() => fileInputRef.current?.click()}
                  style={{ border:'2px dashed #334155', borderRadius:'12px', padding:'1.5rem', textAlign:'center', cursor:'pointer', background:'#0f172a' }}>
                  <UploadCloud size={32} style={{ margin:'0 auto 0.5rem', display:'block', color:'#10b981' }} />
                  <span style={{ color:'#94a3b8', fontSize:'0.9rem' }}>{preview ? 'Trocar arquivo' : 'Foto ou Vídeo MP4'}</span>
                </div>
                <input type="file" accept="image/*,video/mp4" ref={fileInputRef} style={{ display:'none' }} onChange={handleFileSelect} />
              </div>
            )}

            {/* Pré-visualização */}
            <div style={{ position:'relative', height:'180px', background:'#0f172a', borderRadius:'12px', overflow:'hidden', border:'1px solid #334155' }}>
               {renderMedia(preview || tempUrl, {
                   width:'100%', height:'100%', objectFit:'cover',
                   transform: `scale(${tempSettings.scale})`,
                   objectPosition: `center ${tempSettings.y}%`
               }, tempSettings)}
               <div style={{ position:'absolute', top:10, left:10, background:'rgba(0,0,0,0.5)', color:'white', padding:'2px 8px', borderRadius:'4px', fontSize:'10px' }}>PRÉVIA</div>
            </div>

            {/* Sliders */}
            <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', background:'#0f172a', padding:'1.25rem', borderRadius:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ color:'#94a3b8', fontSize:'0.75rem', width:'60px', fontWeight:'700' }}>LARGURA</span>
                <input type="range" min="100" max="1600" step="10" value={tempSettings.width || 800} onChange={e => setTempSettings({...tempSettings, width: parseInt(e.target.value)})} style={{ flex:1, accentColor:'#10b981' }} />
                <span style={{ color:'#10b981', fontSize:'0.75rem', width:'40px' }}>{tempSettings.width || 'Auto'}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ color:'#94a3b8', fontSize:'0.75rem', width:'60px', fontWeight:'700' }}>ZOOM</span>
                <input type="range" min="1" max="3" step="0.1" value={tempSettings.scale} onChange={e => setTempSettings({...tempSettings, scale: parseFloat(e.target.value)})} style={{ flex:1, accentColor:'#10b981' }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ color:'#94a3b8', fontSize:'0.75rem', width:'60px', fontWeight:'700' }}>POS. Y</span>
                <input type="range" min="0" max="100" step="1" value={tempSettings.y} onChange={e => setTempSettings({...tempSettings, y: parseInt(e.target.value)})} style={{ flex:1, accentColor:'#10b981' }} />
              </div>

              {isVideo(preview || tempUrl, preview ? selectedFile : null) && (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', borderTop:'1px solid #334155', paddingTop:'0.75rem', marginTop:'0.25rem' }}>
                  <span style={{ color:'#10b981', fontSize:'0.75rem', fontWeight:'700', letterSpacing:'0.05em' }}>CONFIGURAÇÕES DO VÍDEO</span>
                  
                  <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'#e2e8f0', fontSize:'0.8rem', cursor:'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={tempSettings.muted ?? true} 
                        onChange={e => setTempSettings({...tempSettings, muted: e.target.checked})}
                        style={{ accentColor:'#10b981', cursor:'pointer' }}
                      />
                      Mudo (Sem Som)
                    </label>

                    <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'#e2e8f0', fontSize:'0.8rem', cursor:'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={tempSettings.controls ?? false} 
                        onChange={e => setTempSettings({...tempSettings, controls: e.target.checked})}
                        style={{ accentColor:'#10b981', cursor:'pointer' }}
                      />
                      Exibir Controles (Play/Volume)
                    </label>

                    <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'#e2e8f0', fontSize:'0.8rem', cursor:'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={tempSettings.loop ?? true} 
                        onChange={e => setTempSettings({...tempSettings, loop: e.target.checked})}
                        style={{ accentColor:'#10b981', cursor:'pointer' }}
                      />
                      Repetir (Loop)
                    </label>

                    <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', color:'#e2e8f0', fontSize:'0.8rem', cursor:'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={tempSettings.autoplay ?? true} 
                        onChange={e => setTempSettings({...tempSettings, autoplay: e.target.checked})}
                        style={{ accentColor:'#10b981', cursor:'pointer' }}
                      />
                      Auto-reproduzir
                    </label>
                  </div>
                  
                  {!(tempSettings.muted ?? true) && (tempSettings.autoplay ?? true) && (
                    <span style={{ color:'#f59e0b', fontSize:'0.7rem', display:'block', lineHeight:'1.2' }}>
                      ⚠️ <strong>Atenção:</strong> Navegadores bloqueiam o início automático de vídeos com som. Para reprodução automática, mantenha "Mudo" ativado ou desative "Auto-reproduzir".
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:'1rem' }}>
              <button onClick={handleCancel} style={{ flex:1, padding:'0.8rem', borderRadius:'12px', border:'1px solid #334155', background:'transparent', color:'#94a3b8', fontWeight:'700', cursor:'pointer' }}>Cancelar</button>
              <button onClick={tab === 'upload' ? handleFileUpload : handleUpdate} disabled={isUploading}
                style={{ flex:2, padding:'0.8rem', borderRadius:'12px', border:'none', background:'#10b981', color:'white', fontWeight:'700', cursor:'pointer' }}>
                {isUploading ? 'Enviando...' : '✓ Salvar Mídia'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EditableImage;
