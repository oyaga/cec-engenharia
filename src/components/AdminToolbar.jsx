import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Save, X, Edit3, Trash2, LogOut, ShieldCheck, Users, Star, Move } from 'lucide-react';
import { useEdit } from '../context/EditContext';

const AdminToolbar = () => {
  const { isEditing, toggleEditing, saveChanges, discardChanges, user, logout, isMaster, hasPermission, userProfile } = useEdit();
  const [isVisible, setIsVisible] = useState(true);

  // Estados e Refs para arrastar a barra de ferramentas (Drag and Drop)
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('admin_toolbar_pos');
    return saved ? JSON.parse(saved) : { x: null, y: null };
  });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const toolbarRef = useRef(null);

  const onMouseDown = (e) => {
    if (e.target.closest('button, a')) return;
    
    const rect = toolbarRef.current.getBoundingClientRect();
    offset.current = { 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    };
    dragging.current = true;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging.current) return;
      
      const newX = e.clientX - offset.current.x;
      const newY = e.clientY - offset.current.y;
      
      const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 0);
      
      const finalPos = { 
        x: Math.max(0, Math.min(newX, maxX)), 
        y: Math.max(0, Math.min(newY, maxY)) 
      };
      setPos(finalPos);
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        localStorage.setItem('admin_toolbar_pos', JSON.stringify(pos));
      }
      dragging.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pos]);

  const toolbarStyle = {
    position: 'fixed',
    left: pos.x !== null ? `${pos.x}px` : '50%',
    top: pos.y !== null ? `${pos.y}px` : '15px',
    transform: pos.x !== null ? 'none' : 'translateX(-50%)',
    transition: dragging.current ? 'none' : 'all 0.3s ease-out'
  };

  // Se não houver usuário logado, não mostra a barra
  if (!user) return null;

  // Filtrar quem pode visualizar a barra administrativa no site público
  const isStaff = userProfile && ['admin', 'coordenador', 'atendente'].includes(userProfile.role);
  const masterEmails = [
    'webdesigner@cec.com.br',
    'secretaria@cursocec.com.br',
    'piticalyn@cec.com.br'
  ];
  const isMasterEmail = user?.email && masterEmails.includes(user.email.toLowerCase());
  const hasEditPermission = hasPermission && hasPermission('edit_site');

  if (!isStaff && !isMaster && !isMasterEmail && !hasEditPermission) {
    return null;
  }

  if (!isVisible) {
    return (
      <button 
        className="admin-toggle-mini" 
        onClick={() => setIsVisible(true)}
        title="Mostrar Ferramentas Admin"
      >
        <Settings size={20} />
      </button>
    );
  }

  return (
    <div 
      ref={toolbarRef} 
      className={`admin-toolbar ${isEditing ? 'active' : ''}`}
      style={toolbarStyle}
      onMouseDown={onMouseDown}
    >
      <div className="drag-handle" title="Arrastar barra"><Move size={14} /></div>
      <div className="admin-info">
        <div className="user-badge">
          {isMaster ? <ShieldCheck size={14} className="text-accent" /> : <Settings size={14} />}
          <span className="user-email">{user.email}</span>
          {isMaster && <span className="master-tag">MASTER</span>}
        </div>
        <span className="status-text">
          {isEditing ? 'MODO EDIÇÃO' : 'VISUALIZAÇÃO'}
        </span>
      </div>
      
      <div className="admin-actions">
        {!isEditing ? (
          <>
            <button className="btn-admin-edit" onClick={toggleEditing}>
              <Edit3 size={16} />
              Editar Conteúdo
            </button>
            
            {/* Atalho para Gestão de Usuários (Apenas Master) */}
            <Link to="/admin/testimonials" className="action-btn-highlight" title="Gerenciar Depoimentos Pendentes">
              <Star size={18} fill="#ffcc00" color="#ffcc00" />
              <span style={{ color: '#ffcc00', fontWeight: '800' }}>MODERAR DEPOIMENTOS</span>
            </Link>
            
            {isMaster && (
              <Link to="/admin/users" className="btn-admin-users" title="Gerenciar Usuários">
                <Users size={16} />
                <span>Usuários</span>
              </Link>
            )}

            <button className="btn-admin-logout" onClick={logout} title="Sair do sistema">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <>
            <button className="btn-admin-discard" onClick={discardChanges}>
              <Trash2 size={16} />
              Descartar
            </button>
            <button className="btn-admin-save" onClick={saveChanges}>
              <Save size={16} />
              Salvar no Banco
            </button>
          </>
        )}
        <button className="btn-admin-close" onClick={() => setIsVisible(false)}>
          <X size={18} />
        </button>
      </div>

      <style>{`
        .drag-handle { 
          color: rgba(255,255,255,0.35); 
          cursor: grab; 
          display: flex; 
          align-items: center; 
          padding-right: 0.5rem; 
          border-right: 1px solid rgba(255,255,255,0.1); 
          margin-right: 0.5rem; 
        }
        .admin-toolbar {
          position: fixed;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: white;
          padding: 0.6rem 1.25rem;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          z-index: 10000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.3s ease;
        }
        .admin-toolbar.active {
          border-color: #10b981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .admin-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .user-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .user-email {
          font-size: 0.75rem;
          font-weight: 500;
          color: #94a3b8;
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .master-tag {
          font-size: 0.6rem;
          background: #f59e0b;
          color: #000;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 800;
        }
        .status-text {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: white;
        }
        .admin-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          border-left: 1px solid rgba(255,255,255,0.15);
          padding-left: 1rem;
        }
        .btn-admin-edit, .btn-admin-save, .btn-admin-discard, .btn-admin-users {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.9rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .btn-admin-edit { background: var(--primary); color: white; }
        .btn-admin-save { background: #10b981; color: white; }
        .btn-admin-discard { background: #ef4444; color: white; }
        
        .btn-admin-users { 
          background: #334155; 
          color: #f1f5f9;
        }
        .btn-admin-users:hover {
          background: #475569;
        }
        
        .btn-admin-logout, .btn-admin-close {
          color: #94a3b8;
          transition: color 0.2s;
        }
        .btn-admin-logout:hover { color: #f87171; }
        .btn-admin-close:hover { color: white; }

        .admin-toggle-mini {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #0f172a;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .text-accent { color: #f59e0b; }
      `}</style>
    </div>
  );
};

export default AdminToolbar;
