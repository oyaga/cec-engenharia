import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  MessageCircle, 
  BookOpen, 
  Trophy, 
  Star, 
  AlertCircle, 
  Check, 
  Trash2,
  X 
} from 'lucide-react';

export default function NotificationBell() {
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Mocks realistas se a tabela física falhar ou estiver vazia
  const getMockNotifications = () => {
    return [
      {
        id: 'mock-1',
        title: 'Bem-vindo ao Curso CEC! 🎓',
        content: 'Parabéns por iniciar sua jornada educacional. Acesse a aba Meus Cursos e comece hoje mesmo!',
        type: 'info',
        link: '/meus-cursos',
        is_read: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'mock-2',
        title: 'Calibração PR-127 🛠️',
        content: 'Seu instrutor enviou uma nova resposta no tópico de debate sobre concentricidade no fórum.',
        type: 'forum',
        link: '/meus-cursos',
        is_read: false,
        created_at: new Date(Date.now() - 3600000 * 18).toISOString()
      }
    ];
  };

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('lms_notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
        localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify(data));
      }
    } catch (err) {
      console.warn("Erro ao buscar notificações físicas, usando localStorage/mocks:", err.message);
      const local = localStorage.getItem(`notifications_${session.user.id}`);
      if (local) {
        const parsed = JSON.parse(local);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.is_read).length);
      } else {
        const mocks = getMockNotifications();
        setNotifications(mocks);
        setUnreadCount(mocks.filter(n => !n.is_read).length);
        localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify(mocks));
      }
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from('lms_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', session.user.id);

      if (error) throw error;

      const updated = notifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.is_read).length);
      localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify(updated));
    } catch (err) {
      console.warn("Erro ao atualizar notificação física:", err.message);
      const updated = notifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.is_read).length);
      localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify(updated));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!session?.user?.id || notifications.length === 0) return;
    try {
      const { error } = await supabase
        .from('lms_notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) throw error;

      const updated = notifications.map(n => ({ ...n, is_read: true }));
      setNotifications(updated);
      setUnreadCount(0);
      localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify(updated));
    } catch (err) {
      console.warn("Erro ao marcar todas como lidas física:", err.message);
      const updated = notifications.map(n => ({ ...n, is_read: true }));
      setNotifications(updated);
      setUnreadCount(0);
      localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify(updated));
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleClearAll = async () => {
    if (!session?.user?.id || notifications.length === 0) return;
    try {
      const { error } = await supabase
        .from('lms_notifications')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify([]));
    } catch (err) {
      console.warn("Erro ao limpar notificações físicas:", err.message);
      setNotifications([]);
      setUnreadCount(0);
      localStorage.setItem(`notifications_${session.user.id}`, JSON.stringify([]));
    }
  };

  // Click away listener para fechar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Polling leve e auto-carregamento ao montar
  useEffect(() => {
    fetchNotifications();
    
    // Polling a cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const renderIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageCircle size={16} color="#38bdf8" />;
      case 'forum':
        return <BookOpen size={16} color="#c084fc" />;
      case 'grade':
        return <Trophy size={16} color="#fbbf24" />;
      case 'review':
        return <Star size={16} color="#facc15" fill="#facc15" />;
      default:
        return <AlertCircle size={16} color="#94a3b8" />;
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / (3600000 * 24));

      if (diffMin < 1) return 'Agora';
      if (diffMin < 60) return `Há ${diffMin} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      if (diffDays < 7) return `Há ${diffDays} dias`;
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      return '';
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Ícone de Sino Acionador */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? 'var(--primary)' : '#64748b',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        className="hover-bell"
        title="Notificações"
      >
        <Bell size={22} style={{ transition: 'transform 0.2s' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Painel Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.75rem',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          width: '320px',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'scaleIn 0.15s ease-out'
        }}>
          {/* Cabeçalho */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc'
          }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>
              Notificações {unreadCount > 0 && `(${unreadCount})`}
            </span>
            {notifications.length > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  className="bell-header-btn"
                  title="Marcar todas como lidas"
                >
                  Ler tudo
                </button>
                <button
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  className="bell-header-btn-clear"
                  title="Limpar todas as notificações"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          {/* Listagem de Itens */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {notifications.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1.5rem',
                color: '#94a3b8',
                textAlign: 'center',
                gap: '0.75rem'
              }}>
                <Bell size={32} style={{ opacity: 0.3 }} />
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', margin: '0 0 2px 0' }}>
                    Nenhuma novidade por aqui
                  </h4>
                  <p style={{ fontSize: '0.78rem', margin: 0, lineHeight: 1.4 }}>
                    Você receberá alertas automáticos quando novos eventos acontecerem.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'start',
                    backgroundColor: n.is_read ? 'white' : 'rgba(59, 130, 246, 0.03)',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                  className="notification-item"
                >
                  {/* Bolha de Nova Notificação */}
                  {!n.is_read && (
                    <div style={{
                      position: 'absolute',
                      left: '4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)'
                    }} />
                  )}

                  {/* Círculo do Ícone */}
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: n.is_read ? '#f1f5f9' : 'rgba(59, 130, 246, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {renderIcon(n.type)}
                  </div>

                  {/* Conteúdo de Texto */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        fontWeight: n.is_read ? '600' : '750',
                        fontSize: '0.82rem',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '0.78rem',
                      color: n.is_read ? '#64748b' : '#334155',
                      margin: 0,
                      lineHeight: '1.35',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {n.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé Opcional */}
          <div style={{
            padding: '0.75rem',
            textAlign: 'center',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#64748b'
          }}>
            Central de Avisos C&C Engenharia
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hover-bell:hover {
          background-color: #f1f5f9 !important;
          color: var(--primary) !important;
        }
        .hover-bell:hover svg {
          transform: rotate(15deg) scale(1.05);
        }
        .bell-header-btn:hover {
          background-color: rgba(59, 130, 246, 0.08) !important;
        }
        .bell-header-btn-clear:hover {
          background-color: rgba(239, 68, 68, 0.08) !important;
        }
        .notification-item:hover {
          background-color: #f8fafc !important;
        }
      `}} />
    </div>
  );
}
