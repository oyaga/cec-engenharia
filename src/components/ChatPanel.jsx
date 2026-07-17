import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle } from 'lucide-react'
import { messagesApi } from '../services/misc'
import { connectSocket, onSocketMessage, onSocketStatus, isSocketConnected } from '../lib/socket'
import { useAuth } from '../contexts/AuthContext'

// Chat 1:1 em tempo real, reutilizado por aluno, instrutor e secretaria.
// Preenche 100% do container em que for colocado. Os contatos e categorias vêm
// do backend conforme o papel (GET /messages/contacts).
export default function ChatPanel() {
  const { session, userProfile } = useAuth()
  const myId = session?.user?.id
  const role = userProfile?.role || 'aluno'
  const isStaff = ['admin', 'coordenador', 'atendente'].includes(role)

  const [contacts, setContacts] = useState({ professores: [], secretaria: [], alunos: [] })
  const [contactTab, setContactTab] = useState('professores')
  const [onlineIds, setOnlineIds] = useState([])
  const [unreadBy, setUnreadBy] = useState({})
  const [wsConnected, setWsConnected] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const endRef = useRef(null)
  const selectedRef = useRef(null)

  // Ordem das abas e rótulos por papel.
  const tabOrder = role === 'aluno' ? ['professores', 'secretaria', 'alunos']
    : role === 'instrutor' ? ['alunos', 'secretaria', 'professores']
    : ['alunos', 'professores', 'secretaria']
  const labelFor = (k) => k === 'alunos' ? (role === 'aluno' ? 'Colegas' : 'Alunos')
    : k === 'professores' ? 'Professores'
    : (isStaff ? 'Equipe' : 'Secretaria')
  const subtitleFor = (k) => k === 'alunos' ? (role === 'aluno' ? 'Colega de turma' : 'Aluno')
    : k === 'professores' ? 'Instrutor' : 'Secretaria'

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, selected])

  const loadContacts = async () => {
    try {
      const data = await messagesApi.contacts()
      const next = { professores: data.professores || [], secretaria: data.secretaria || [], alunos: data.alunos || [] }
      setContacts(next)
      setOnlineIds(data.online || [])
      const firstTab = tabOrder.find(k => next[k].length) || tabOrder[0]
      setContactTab(firstTab)
      const first = next[firstTab]?.[0]
      if (first && !selectedRef.current) selectContact(first)
    } catch { /* sem contatos */ }
  }

  const selectContact = async (c) => {
    setSelected(c)
    setMessages([])
    setUnreadBy(prev => ({ ...prev, [c.id]: 0 }))
    try {
      const { messages: m } = await messagesApi.list(c.id)
      setMessages(m || [])
    } catch { setMessages([]) }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selected) return
    const text = newMessage.trim()
    setNewMessage('')
    try {
      const { message } = await messagesApi.create({ receiver_id: selected.id, content: text })
      if (message) setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message])
    } catch {
      alert('Não foi possível enviar a mensagem. Verifique a conexão.')
    }
  }

  useEffect(() => {
    if (!myId) return
    loadContacts()
    connectSocket()
    setWsConnected(isSocketConnected())
    const offMsg = onSocketMessage((data) => {
      if (data?.type !== 'message' || !data.message) return
      const msg = data.message
      const partnerId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id
      if (selectedRef.current?.id === partnerId) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      } else if (msg.sender_id !== myId) {
        setUnreadBy(prev => ({ ...prev, [partnerId]: (prev[partnerId] || 0) + 1 }))
      }
    })
    const offStatus = onSocketStatus(setWsConnected)
    return () => { offMsg(); offStatus() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId])

  const online = (id) => onlineIds.includes(id)
  const q = search.trim().toLowerCase()
  const list = (contacts[contactTab] || []).filter(c => !q || (c.full_name || '').toLowerCase().includes(q))
  const selOnline = selected ? online(selected.id) : false
  const firstName = (n) => (n || '').split(' ')[0]

  return (
    <div className="aa-stack" style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '340px 1fr', gridTemplateRows: '100%', minHeight: 0, backgroundColor: 'white', overflow: 'hidden' }}>

      {/* ── LISTA DE CONTATOS ── */}
      <div style={{ borderRight: '1px solid #eef2f7', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fbfcfe', minHeight: 0 }}>
        <div style={{ padding: '1.15rem 1.25rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-dark)' }}>Mensagens</h3>
            <span title={wsConnected ? 'Conectado em tempo real' : 'Reconectando...'} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: wsConnected ? '#10b981' : '#94a3b8' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: wsConnected ? '#10b981' : '#cbd5e1', boxShadow: wsConnected ? '0 0 0 3px rgba(16,185,129,0.15)' : 'none' }} />
              {wsConnected ? 'Online' : 'Off'}
            </span>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contato..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.82rem', outline: 'none', marginBottom: '0.85rem' }} />
          <div style={{ display: 'flex', gap: 4, backgroundColor: '#eef2f7', padding: 4, borderRadius: 12 }}>
            {tabOrder.map(k => {
              const count = (contacts[k] || []).length
              const active = contactTab === k
              return (
                <button key={k} onClick={() => { setContactTab(k); setSearch('') }}
                  style={{ flex: 1, padding: '0.45rem 0.2rem', borderRadius: 9, border: 'none', backgroundColor: active ? 'white' : 'transparent', color: active ? 'var(--primary-dark)' : '#64748b', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all .15s', boxShadow: active ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
                  {labelFor(k)} {count ? <span style={{ opacity: 0.55 }}>{count}</span> : ''}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 0.5rem 0.5rem' }}>
          {list.map(c => {
            const isSel = selected?.id === c.id
            const unread = unreadBy[c.id] || 0
            const on = online(c.id)
            return (
              <div key={c.id} onClick={() => selectContact(c)}
                style={{ padding: '0.7rem 0.85rem', borderRadius: 12, cursor: 'pointer', backgroundColor: isSel ? 'var(--primary-light)' : 'transparent', display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: 2 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem' }}>
                    {(c.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  {on && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10b981', border: '2.5px solid #fbfcfe' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</div>
                  <div style={{ fontSize: '0.72rem', color: on ? '#10b981' : '#94a3b8', fontWeight: on ? 600 : 400 }}>{on ? '● online agora' : subtitleFor(contactTab)}</div>
                </div>
                {unread > 0 && <span style={{ minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11, backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{unread}</span>}
              </div>
            )
          })}
          {list.length === 0 && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ fontSize: '0.82rem', margin: 0 }}>{q ? 'Nenhum contato encontrado.' : 'Ninguém nesta categoria ainda.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── CONVERSA ── */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'radial-gradient(circle at 50% 0%, #f5f8fc 0%, #eef2f7 100%)' }}>
        {selected ? (
          <>
            <div style={{ padding: '0.9rem 1.5rem', borderBottom: '1px solid #e8edf3', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  {selected.full_name.charAt(0).toUpperCase()}
                </div>
                {selOnline && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10b981', border: '2.5px solid white' }} />}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{selected.full_name}</h4>
                <span style={{ fontSize: '0.72rem', color: selOnline ? '#10b981' : '#94a3b8', fontWeight: 600 }}>{selOnline ? 'Online agora' : 'Offline'}</span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '1.5rem' }}>
              <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '3rem' }}>
                    <MessageCircle size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ margin: 0 }}>Nenhuma mensagem ainda.<br />Diga olá para {firstName(selected.full_name)}! 👋</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender_id === myId
                  return (
                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                      <div style={{ backgroundColor: isMe ? 'var(--primary)' : 'white', color: isMe ? 'white' : '#1e293b', padding: '0.6rem 0.9rem', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', fontSize: '0.88rem', lineHeight: 1.45, boxShadow: '0 1px 2px rgba(15,23,42,0.08)', border: isMe ? 'none' : '1px solid #eef2f7', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: 3, textAlign: isMe ? 'right' : 'left', padding: '0 4px' }}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
            </div>

            <div style={{ padding: '0.9rem 1.5rem 1.1rem', flexShrink: 0 }}>
              <form onSubmit={sendMessage} style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input type="text" placeholder={`Mensagem para ${firstName(selected.full_name)}...`} value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  style={{ flex: 1, padding: '0.8rem 1.15rem', borderRadius: 24, border: '1px solid #dbe3ec', backgroundColor: 'white', fontSize: '0.88rem', outline: 'none', boxShadow: '0 1px 2px rgba(15,23,42,0.05)' }} />
                <button type="submit" aria-label="Enviar" style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', background: newMessage.trim() ? 'var(--primary)' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background .15s' }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 8px 24px -8px rgba(15,23,42,0.2)' }}>
              <MessageCircle size={36} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1.1rem' }}>Escolha uma conversa</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '8px 0 0 0', maxWidth: 340 }}>Selecione um contato à esquerda para conversar em tempo real.</p>
          </div>
        )}
      </div>
    </div>
  )
}
