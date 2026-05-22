import React, { useRef, useEffect, useState } from 'react';
import { useEdit } from '../../context/EditContext';

const FONT_SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px','40px','48px'];

const EditableText = ({ path, initialValue, tagName: Tag = 'span', className = '' }) => {
  const { isEditing, updateContent } = useEdit();
  const elementRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (elementRef.current && !isEditing && elementRef.current.innerHTML !== initialValue) {
      elementRef.current.innerHTML = initialValue;
    }
  }, [initialValue, isEditing]);

  const handleBlur = (e) => {
    if (e.relatedTarget && e.relatedTarget.closest('.editable-toolbar')) return;
    setFocused(false);
    if (elementRef.current) {
      updateContent(path, elementRef.current.innerHTML);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && Tag !== 'p' && Tag !== 'div') {
      e.preventDefault();
      elementRef.current.blur();
    }
  };

  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    elementRef.current.focus();
  };

  if (!isEditing) {
    return (
      <Tag
        ref={elementRef}
        className={className}
        dangerouslySetInnerHTML={{ __html: initialValue }}
      />
    );
  }

  return (
    <div style={{ position: 'relative', display: Tag === 'span' ? 'inline-block' : 'block' }}>
      {/* Toolbar — aparece quando focused */}
      {focused && (
        <div
          className="editable-toolbar"
          contentEditable={false}
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px',
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: '8px', padding: '4px 8px', display: 'flex',
            alignItems: 'center', gap: '4px', zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)', whiteSpace: 'nowrap'
          }}
        >
          {/* Negrito */}
          <button onMouseDown={() => execCmd('bold')}
            style={{ fontWeight:'800', color:'white', background:'transparent', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:'4px' }}
            title="Negrito">B</button>

          {/* Itálico */}
          <button onMouseDown={() => execCmd('italic')}
            style={{ fontStyle:'italic', color:'white', background:'transparent', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:'4px' }}
            title="Itálico">I</button>

          {/* Sublinhado */}
          <button onMouseDown={() => execCmd('underline')}
            style={{ textDecoration:'underline', color:'white', background:'transparent', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:'4px' }}
            title="Sublinhado">U</button>

          <div style={{ width:'1px', height:'18px', background:'#334155', margin:'0 2px' }} />

          {/* Tamanho da fonte */}
          <select
            onMouseDown={e => e.stopPropagation()}
            onChange={e => {
              elementRef.current.focus();
              document.execCommand('fontSize', false, '7');
              document.querySelectorAll('font[size="7"]').forEach(el => {
                el.removeAttribute('size');
                el.style.fontSize = e.target.value;
              });
            }}
            style={{ background:'#0f172a', color:'white', border:'1px solid #334155', borderRadius:'4px', fontSize:'0.75rem', cursor:'pointer', padding:'1px 2px' }}
            title="Tamanho"
          >
            <option value="">Tam</option>
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Cor do texto */}
          <label title="Cor do texto" style={{ display:'flex', alignItems:'center', gap:'2px', color:'rgba(255,255,255,0.7)', fontSize:'0.7rem', cursor:'pointer' }}>
            A
            <input type="color" defaultValue="#000000"
              onInput={e => execCmd('foreColor', e.target.value)}
              style={{ width:'20px', height:'20px', padding:0, border:'none', cursor:'pointer', borderRadius:'3px' }} />
          </label>

          {/* Cor de fundo */}
          <label title="Cor de fundo" style={{ display:'flex', alignItems:'center', gap:'2px', color:'rgba(255,255,255,0.7)', fontSize:'0.7rem', cursor:'pointer' }}>
            BG
            <input type="color" defaultValue="#ffffff"
              onInput={e => execCmd('hiliteColor', e.target.value)}
              style={{ width:'20px', height:'20px', padding:0, border:'none', cursor:'pointer', borderRadius:'3px' }} />
          </label>

          <div style={{ width:'1px', height:'18px', background:'#334155', margin:'0 2px' }} />

          {/* Alinhamentos */}
          {[['justifyLeft','◀'],['justifyCenter','■'],['justifyRight','▶']].map(([cmd, icon]) => (
            <button key={cmd} onMouseDown={() => execCmd(cmd)}
              style={{ color:'rgba(255,255,255,0.7)', background:'transparent', border:'none', cursor:'pointer', padding:'2px 4px', borderRadius:'4px', fontSize:'0.8rem' }}
              title={cmd}>{icon}</button>
          ))}
        </div>
      )}

      <Tag
        ref={elementRef}
        contentEditable={true}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        className={`${className} editable-active`}
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{ __html: initialValue }}
        style={{
          outline: '2px dashed var(--accent, #00d1b2)',
          padding: '2px 4px',
          borderRadius: '4px',
          backgroundColor: 'rgba(0, 209, 178, 0.05)',
          cursor: 'text',
          display: Tag === 'span' ? 'inline-block' : 'block',
          minWidth: '20px'
        }}
      />
    </div>
  );
};

export default EditableText;
