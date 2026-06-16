import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Search, 
  X, 
  Check, 
  CheckCheck,
  User,
  Shield,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function StaffChat() {
  const { userProfile } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef(null);

  // Auto-scroll para a última mensagem
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  const messagesLength = chatMessages.length;
  const contactId = selectedContact?.id;

  useEffect(() => {
    scrollToBottom(true);
  }, [messagesLength, contactId]);

  // 1. Carregar contatos (colaboradores da secretaria)
  const fetchCollaborators = async (showLoader = false) => {
    if (!userProfile?.id) return;
    if (showLoader) setLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['admin', 'coordenador', 'atendente', 'administrativo'])
        .neq('id', userProfile.id)
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Para cada colaborador, vamos buscar se tem alguma mensagem não lida
      const collaboratorsWithUnread = await Promise.all((data || []).map(async (collab) => {
        const { count, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', collab.id)
          .eq('receiver_id', userProfile.id)
          .eq('is_read', false);

        return {
          ...collab,
          unreadCount: !countError ? count : 0
        };
      }));

      setCollaborators(collaboratorsWithUnread);
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    fetchCollaborators(true);
  }, [userProfile]);

  // 2. Carregar mensagens do contato selecionado
  const fetchMessages = async (contact, showLoader = false) => {
    if (!userProfile?.id || !contact?.id) return;
    if (showLoader) setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userProfile.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${userProfile.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);

      // Marcar mensagens recebidas como lidas no banco
      const unreadReceived = (data || []).filter(m => m.sender_id === contact.id && m.receiver_id === userProfile.id && !m.is_read);
      if (unreadReceived.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', contact.id)
          .eq('receiver_id', userProfile.id)
          .eq('is_read', false);

        // Atualizar lista de contatos para limpar contadores de não lidas localmente
        setCollaborators(prev => prev.map(c => c.id === contact.id ? { ...c, unreadCount: 0 } : c));
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      if (showLoader) setLoadingMessages(false);
    }
  };

  // Efeito para carregar as mensagens ao selecionar o contato
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact, true);
    }
  }, [selectedContact]);

  // Polling a cada 4 segundos para carregar novas mensagens e atualizar status de não lidos
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedContact) {
        fetchMessages(selectedContact, false);
      }
      fetchCollaborators(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedContact, userProfile]);

  // 3. Enviar mensagem
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile?.id || !selectedContact?.id || sending) return;

    setSending(true);
    const textToSend = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: userProfile.id,
            receiver_id: selectedContact.id,
            content: textToSend,
            is_read: false
          }
        ])
        .select();

      if (error) throw error;
      
      // Adicionar na lista local imediatamente para melhor experiência
      if (data && data[0]) {
        setChatMessages(prev => [...prev, data[0]]);
      }
    } catch (err) {
      alert('Erro ao enviar mensagem: ' + err.message);
      setNewMessage(textToSend); // Restaura se falhar
    } finally {
      setSending(false);
    }
  };

  // Filtro de busca na lista de colaboradores
  const filteredContacts = collaborators.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return { bg: '#fee2e2', text: '#991b1b', label: 'Admin' };
      case 'coordenador': return { bg: '#fef3c7', text: '#92400e', label: 'Coord' };
      case 'administrativo': return { bg: '#e0e7ff', text: '#3730a3', label: 'Administrativo' };
      default: return { bg: '#e0f2fe', text: '#075985', label: 'Atendente' };
    }
  };

  return (
    <div className="animate-fade-in" style={{
      height: 'calc(100vh - 120px)',
      display: 'flex',
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* 1. PAINEL DE CONTATOS (ESQUERDA) */}
      <div style={{
        width: '320px',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        flexShrink: 0
      }} className="chat-contacts-panel">
        
        {/* Cabeçalho da Lista */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 1rem 0', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--primary)" /> Chat da Equipe
          </h2>
          
          {/* Campo de Busca */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar colega de equipe..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '0.85rem',
                backgroundColor: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Lista de Contatos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loadingContacts ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', flexDirection: 'column', gap: '0.5rem' }}>
              <RefreshCw size={24} className="animate-spin text-muted" />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Buscando equipe...</span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
              <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Nenhum colega encontrado.</p>
            </div>
          ) : (
            filteredContacts.map(contact => {
              const badge = getRoleBadgeColor(contact.role);
              const isSelected = selectedContact?.id === contact.id;
              
              return (
                <div 
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                    marginBottom: '4px'
                  }}
                  className="contact-item"
                >
                  {/* Avatar com Letra */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? 'var(--primary)' : '#cbd5e1',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1rem',
                    flexShrink: 0
                  }}>
                    {contact.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Detalhes do Contato */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: '750', fontSize: '0.85rem', color: isSelected ? 'var(--primary-dark)' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contact.full_name}
                      </span>
                      {contact.unreadCount > 0 && (
                        <span style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '2px 6px',
                          fontSize: '0.65rem',
                          fontWeight: '800'
                        }}>
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contact.email}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. ÁREA DE CONVERSA (DIREITA) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        minWidth: 0
      }}>
        {selectedContact ? (
          <>
            {/* Cabeçalho do Chat Ativo */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.1rem'
                }}>
                  {selectedContact.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{selectedContact.full_name}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={12} color="var(--primary)" /> {selectedContact.email}
                  </span>
                </div>
              </div>

              {/* Botão de Fechar Conversa no Mobile */}
              <button 
                onClick={() => setSelectedContact(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'none'
                }}
                className="chat-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo das Mensagens (Scrollable) */}
            <div 
              ref={messagesContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                backgroundColor: '#f1f5f9',
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              {loadingMessages ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '0.5rem' }}>
                  <RefreshCw size={28} className="animate-spin text-muted" />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Carregando conversa...</span>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.sender_id === userProfile.id;
                  
                  return (
                    <div 
                      key={msg.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {/* Balão de Fala */}
                      <div style={{
                        backgroundColor: isMe ? 'var(--primary)' : 'white',
                        color: isMe ? 'white' : '#1e293b',
                        padding: '0.75rem 1.15rem',
                        borderRadius: isMe ? '18px 18px 0px 18px' : '18px 18px 18px 0px',
                        boxShadow: '0 2px 4px rgba(15,23,42,0.04)',
                        fontSize: '0.88rem',
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.content}
                      </div>

                      {/* Hora e Status */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '3px',
                        fontSize: '0.68rem',
                        color: '#64748b'
                      }}>
                        <span>{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && (
                          msg.is_read ? (
                            <CheckCheck size={12} color="var(--primary)" />
                          ) : (
                            <Check size={12} color="#94a3b8" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input de Envio (Rodapé) */}
            <form 
              onSubmit={handleSendMessage}
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: 'white',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center'
              }}
            >
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Escreva sua mensagem interna aqui..."
                rows="1"
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'none',
                  maxHeight: '120px'
                }}
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() || sending}
                style={{
                  backgroundColor: newMessage.trim() ? 'var(--primary)' : '#f1f5f9',
                  color: newMessage.trim() ? 'white' : '#94a3b8',
                  border: 'none',
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: newMessage.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  boxShadow: newMessage.trim() ? '0 4px 10px rgba(0,75,73,0.2)' : 'none',
                  flexShrink: 0
                }}
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          /* Estado Vazio - Nenhuma conversa selecionada */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            color: '#64748b',
            padding: '2rem'
          }}>
            <div style={{
              backgroundColor: '#e2e8f0',
              padding: '1.5rem',
              borderRadius: '50%',
              color: 'var(--primary)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={36} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '800', color: '#1e293b', fontSize: '1.1rem' }}>Comunicação Interna Segura</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', textAlign: 'center', maxWidth: '320px', lineHeight: 1.5 }}>
              Selecione um colega da equipe na barra lateral para iniciar uma conversa. Todas as mensagens são privadas e criptografadas em trânsito.
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 640px) {
          .chat-contacts-panel {
            width: 100% !important;
            display: ${selectedContact ? 'none' : 'flex'} !important;
          }
          .chat-close-btn {
            display: flex !important;
          }
        }
        .contact-item:hover {
          background-color: #f1f5f9;
        }
      `}} />
    </div>
  );
}
