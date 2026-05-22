import { useState, useRef, useCallback, useEffect } from 'react';
import { useEdit } from '../../context/EditContext';
import { Move } from 'lucide-react';

/**
 * DraggableInEdit - Torna qualquer elemento arrastável dentro do pai no modo edição.
 * Fora do modo edição, renderiza normalmente sem nenhum overhead.
 *
 * Props:
 *   path         - caminho no content para salvar a posição (ex: "hero.cert_badge_pos")
 *   initialPos   - posição inicial { top, left } em % (ex: { top: '5%', left: '60%' })
 *   children     - o elemento filho
 *   className    - classe extra no wrapper
 */
const DraggableInEdit = ({ path, initialPos = { top: '5%', left: '60%' }, children, className = '' }) => {
  const { isEditing, updateContent, content } = useEdit();

  // Resolve posição salva ou usa a inicial
  const getInitialPos = () => {
    if (!path) return initialPos;
    // Tenta ler do content via path (ex: "hero.cert_badge_pos")
    try {
      const keys = path.split('.');
      let val = content;
      for (const k of keys) val = val?.[k];
      if (val && val.top !== undefined) return val;
    } catch {}
    return initialPos;
  };

  const [pos, setPos] = useState(getInitialPos);

  // Sincroniza estado local se o content global mudar (ex: carregamento inicial ou descarte)
  useEffect(() => {
    setPos(getInitialPos());
  }, [content, path]);
  const containerRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startTop: 0, startLeft: 0 });

  const getParent = () => containerRef.current?.parentElement;

  const toPercent = (px, total) => `${Math.max(0, Math.min(95, (px / total) * 100)).toFixed(1)}%`;

  const onDragStart = useCallback((clientX, clientY) => {
    const parent = getParent();
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const elRect = containerRef.current.getBoundingClientRect();

    dragRef.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      startTop: elRect.top - parentRect.top,
      startLeft: elRect.left - parentRect.left,
    };
  }, []);

  const onDragMove = useCallback((clientX, clientY) => {
    if (!dragRef.current.dragging) return;
    const parent = getParent();
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;

    const newTop = toPercent(dragRef.current.startTop + dy, parentRect.height);
    const newLeft = toPercent(dragRef.current.startLeft + dx, parentRect.width);

    setPos({ top: newTop, left: newLeft });
  }, []);

  const onDragEnd = useCallback(() => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    // Salva a posição final no contexto global
    if (path) {
      updateContent(path, pos);
    }
  }, [path, updateContent, pos]);

  // Mouse events
  const handleMouseDown = (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); // Impede que o clique chegue na imagem de baixo
    onDragStart(e.clientX, e.clientY); 
  };

  useEffect(() => {
    if (!isEditing) return;
    const move = (e) => onDragMove(e.clientX, e.clientY);
    const up = () => onDragEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [isEditing, onDragMove, onDragEnd]);

  // Touch events
  const handleTouchStart = (e) => { 
    e.stopPropagation(); // Impede interferência no mobile
    const t = e.touches[0]; 
    onDragStart(t.clientX, t.clientY); 
  };
  useEffect(() => {
    if (!isEditing) return;
    const move = (e) => { const t = e.touches[0]; onDragMove(t.clientX, t.clientY); };
    const end = () => onDragEnd();
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    return () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end); };
  }, [isEditing, onDragMove, onDragEnd]);

  // Fora do modo edição — renderiza normalmente (sem wrapper extra)
  if (!isEditing) {
    return (
      <div
        className={`draggable-static ${className}`}
        style={{ position: 'absolute', top: pos.top, left: pos.left }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`draggable-edit-wrapper ${className}`}
      style={{ position: 'absolute', top: pos.top, left: pos.left, cursor: 'grab', zIndex: 20 }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Handle de arraste */}
      <div className="drag-handle" title="Arraste para mover">
        <Move size={12} />
        <span>mover</span>
      </div>
      {children}

      <style>{`
        .draggable-edit-wrapper {
          user-select: none;
          touch-action: none;
        }
        .draggable-edit-wrapper:active { cursor: grabbing; }
        .drag-handle {
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          background: #f59e0b;
          color: #000;
          padding: 2px 8px;
          border-radius: 6px 6px 0 0;
          font-size: 0.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 3px;
          white-space: nowrap;
          cursor: grab;
          z-index: 30;
          box-shadow: 0 -2px 6px rgba(0,0,0,0.15);
        }
        .draggable-static { z-index: 10; }
      `}</style>
    </div>
  );
};

export default DraggableInEdit;
