import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCheck, MessageCircle, Plus, Search, Send, Users, X } from 'lucide-react'
import { messagesApi } from '../services/misc'
import { connectSocket, isSocketConnected, onSocketMessage, onSocketStatus } from '../lib/socket'
import { useAuth } from '../contexts/AuthContext'
import './ChatPanel.css'

const targetKey = target => target?.kind === 'class' ? `class:${target.id}` : `user:${target?.id}`
const firstName = name => (name || '').trim().split(' ')[0]
const messageTime = value => value ? new Date(value).getTime() : 0

export default function ChatPanel() {
  const { session, userProfile } = useAuth()
  const myId = session?.user?.id
  const role = userProfile?.role || 'aluno'
  const isStaff = ['admin', 'coordenador', 'atendente', 'administrativo'].includes(role)

  const [contacts, setContacts] = useState({ professores: [], secretaria: [], alunos: [], turmas: [] })
  const [activeTab, setActiveTab] = useState('recentes')
  const [onlineIds, setOnlineIds] = useState([])
  const [wsConnected, setWsConnected] = useState(false)
  const [search, setSearch] = useState('')
  const [modalSearch, setModalSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [summaries, setSummaries] = useState({})
  const [unreadBy, setUnreadBy] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [sendError, setSendError] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const endRef = useRef(null)
  const selectedRef = useRef(null)

  const tabs = useMemo(() => {
    if (role === 'instrutor') return ['recentes', 'turmas', 'alunos', 'secretaria']
    if (isStaff) return ['recentes', 'turmas', 'alunos', 'professores', 'secretaria']
    return ['recentes', 'turmas', 'professores', 'secretaria', 'alunos']
  }, [role, isStaff])

  const labels = {
    recentes: 'Recentes',
    turmas: 'Turmas',
    alunos: role === 'aluno' ? 'Colegas' : 'Alunos',
    professores: 'Professores',
    secretaria: isStaff ? 'Equipe' : 'Secretaria'
  }

  const allTargets = useMemo(() => {
    const users = ['alunos', 'professores', 'secretaria'].flatMap(category =>
      (contacts[category] || []).map(item => ({ ...item, kind: 'user', category }))
    )
    const classes = (contacts.turmas || []).map(item => ({
      ...item,
      full_name: item.name,
      kind: 'class',
      category: 'turmas'
    }))
    const unique = new Map()
    ;[...classes, ...users].forEach(item => unique.set(targetKey(item), item))
    return [...unique.values()]
  }, [contacts])

  const displayList = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR')
    let list = activeTab === 'recentes'
      ? allTargets.filter(item => summaries[targetKey(item)])
      : allTargets.filter(item => item.category === activeTab)
    if (q) list = list.filter(item =>
      `${item.full_name || ''} ${item.course_name || ''}`.toLocaleLowerCase('pt-BR').includes(q)
    )
    return [...list].sort((a, b) => {
      const delta = messageTime(summaries[targetKey(b)]?.created_at) - messageTime(summaries[targetKey(a)]?.created_at)
      return delta || (a.full_name || '').localeCompare(b.full_name || '', 'pt-BR')
    })
  }, [activeTab, allTargets, search, summaries])

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadConversation = async target => {
    setSelected(target)
    setMessages([])
    setSendError('')
    setUnreadBy(current => ({ ...current, [targetKey(target)]: 0 }))
    setShowNewChat(false)
    setModalSearch('')
    try {
      const data = target.kind === 'class'
        ? await messagesApi.listClass(target.id)
        : await messagesApi.list(target.id)
      setMessages(data.messages || [])
    } catch {
      setSendError('Não foi possível carregar esta conversa.')
    }
  }

  const loadContacts = async () => {
    try {
      const data = await messagesApi.contacts()
      const next = {
        professores: data.professores || [],
        secretaria: data.secretaria || [],
        alunos: data.alunos || [],
        turmas: data.turmas || []
      }
      setContacts(next)
      setOnlineIds(data.online || [])

      const directHistory = await messagesApi.list()
      const nextSummaries = {}
      ;(directHistory.messages || []).forEach(message => {
        const partner = message.sender_id === myId ? message.receiver_id : message.sender_id
        const key = `user:${partner}`
        if (!nextSummaries[key] || messageTime(message.created_at) > messageTime(nextSummaries[key].created_at)) {
          nextSummaries[key] = message
        }
        if (message.receiver_id === myId && !message.is_read) {
          setUnreadBy(current => ({ ...current, [key]: (current[key] || 0) + 1 }))
        }
      })
      const classHistories = await Promise.all((next.turmas || []).map(async turma => {
        try { return [turma.id, (await messagesApi.listClass(turma.id)).messages || []] } catch { return [turma.id, []] }
      }))
      classHistories.forEach(([classID, items]) => {
        if (items.length) nextSummaries[`class:${classID}`] = items[items.length - 1]
      })
      setSummaries(nextSummaries)

      if (!selectedRef.current) {
        const targets = [
          ...(next.turmas || []).map(item => ({ ...item, full_name: item.name, kind: 'class', category: 'turmas' })),
          ...['alunos', 'professores', 'secretaria'].flatMap(category =>
            (next[category] || []).map(item => ({ ...item, kind: 'user', category }))
          )
        ]
        const latest = targets.sort((a, b) =>
          messageTime(nextSummaries[targetKey(b)]?.created_at) - messageTime(nextSummaries[targetKey(a)]?.created_at)
        )[0]
        if (latest && nextSummaries[targetKey(latest)]) loadConversation(latest)
      }
    } catch {
      setSendError('Não foi possível carregar os contatos.')
    }
  }

  useEffect(() => {
    if (!myId) return undefined
    loadContacts()
    connectSocket()
    setWsConnected(isSocketConnected())
    const offMessage = onSocketMessage(data => {
      if (data?.type !== 'message' || !data.message) return
      const message = data.message
      const key = message.class_id
        ? `class:${message.class_id}`
        : `user:${message.sender_id === myId ? message.receiver_id : message.sender_id}`
      setSummaries(current => ({ ...current, [key]: message }))
      if (targetKey(selectedRef.current) === key) {
        setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message])
      } else if (message.sender_id !== myId) {
        setUnreadBy(current => ({ ...current, [key]: (current[key] || 0) + 1 }))
      }
    })
    const offStatus = onSocketStatus(setWsConnected)
    return () => { offMessage(); offStatus() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId])

  const sendMessage = async event => {
    event.preventDefault()
    const content = newMessage.trim()
    if (!content || !selected) return
    setNewMessage('')
    setSendError('')
    try {
      const payload = selected.kind === 'class'
        ? { class_id: selected.id, content }
        : { receiver_id: selected.id, content }
      const { message } = await messagesApi.create(payload)
      if (message) {
        const key = targetKey(selected)
        setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message])
        setSummaries(current => ({ ...current, [key]: message }))
      }
    } catch (error) {
      setNewMessage(content)
      setSendError(error?.message || 'Não foi possível enviar a mensagem.')
    }
  }

  const senderName = senderID => {
    if (senderID === myId) return 'Você'
    return allTargets.find(item => item.kind === 'user' && item.id === senderID)?.full_name || 'Participante'
  }
  const selectedOnline = selected?.kind === 'user' && onlineIds.includes(selected.id)

  return (
    <div className={`cec-chat ${selected ? 'has-selection' : ''}`}>
      <aside className="cec-chat-sidebar">
        <header className="cec-chat-sidebar-head">
          <div className="cec-chat-title-row">
            <div>
              <h2>Mensagens</h2>
              <span className={wsConnected ? 'is-online' : ''}>
                <i /> {wsConnected ? 'Online' : 'Reconectando'}
              </span>
            </div>
            <button className="cec-chat-new-button" type="button" onClick={() => { setModalSearch(''); setShowNewChat(true) }} title="Iniciar conversa">
              <Plus size={19} />
            </button>
          </div>
          <label className="cec-chat-search">
            <Search size={17} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar conversa..." />
          </label>
          <nav className="cec-chat-tabs">
            {tabs.map(tab => (
              <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                {labels[tab]}
              </button>
            ))}
          </nav>
        </header>

        <div className="cec-chat-list">
          {displayList.map(target => {
            const key = targetKey(target)
            const latest = summaries[key]
            const unread = unreadBy[key] || 0
            const isSelected = key === targetKey(selected)
            return (
              <button type="button" className={`cec-chat-contact ${isSelected ? 'active' : ''}`} key={key} onClick={() => loadConversation(target)}>
                <div className={`cec-chat-avatar ${target.kind === 'class' ? 'group' : ''}`}>
                  {target.kind === 'class' ? <Users size={20} /> : (target.full_name || '?').charAt(0).toUpperCase()}
                  {target.kind === 'user' && onlineIds.includes(target.id) && <i />}
                </div>
                <div className="cec-chat-contact-copy">
                  <div><strong>{target.full_name}</strong><time>{latest?.created_at ? new Date(latest.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</time></div>
                  <p>{latest?.content || (target.kind === 'class' ? target.course_name : labels[target.category])}</p>
                </div>
                {unread > 0 && <b className="cec-chat-unread">{unread > 99 ? '99+' : unread}</b>}
              </button>
            )
          })}
          {!displayList.length && (
            <div className="cec-chat-empty-list">
              <MessageCircle size={28} />
              <p>{search ? 'Nenhuma conversa encontrada.' : activeTab === 'recentes' ? 'Suas novas conversas aparecerão aqui.' : 'Nenhum contato nesta categoria.'}</p>
            </div>
          )}
        </div>
      </aside>

      <main className="cec-chat-conversation">
        {selected ? (
          <>
            <header className="cec-chat-conversation-head">
              <button type="button" className="cec-chat-back" onClick={() => setSelected(null)}><ArrowLeft size={20} /></button>
              <div className={`cec-chat-avatar ${selected.kind === 'class' ? 'group' : ''}`}>
                {selected.kind === 'class' ? <Users size={20} /> : selected.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3>{selected.full_name}</h3>
                <p>{selected.kind === 'class' ? `${selected.course_name} · conversa da turma` : selectedOnline ? 'Online agora' : labels[selected.category]}</p>
              </div>
            </header>
            <section className="cec-chat-messages">
              <div className="cec-chat-message-column">
                {!messages.length && (
                  <div className="cec-chat-start">
                    {selected.kind === 'class' ? <Users size={34} /> : <MessageCircle size={34} />}
                    <h4>{selected.kind === 'class' ? 'Conversa da turma iniciada' : `Converse com ${firstName(selected.full_name)}`}</h4>
                    <p>{selected.kind === 'class' ? 'Todos os alunos da turma, os instrutores vinculados e a Secretaria podem acompanhar.' : 'Envie a primeira mensagem desta conversa privada.'}</p>
                  </div>
                )}
                {messages.map(message => {
                  const mine = message.sender_id === myId
                  return (
                    <article className={`cec-chat-bubble-row ${mine ? 'mine' : ''}`} key={message.id}>
                      {selected.kind === 'class' && !mine && <span>{senderName(message.sender_id)}</span>}
                      <div className="cec-chat-bubble">{message.content}</div>
                      <time>
                        {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {mine && <CheckCheck size={13} />}
                      </time>
                    </article>
                  )
                })}
                <div ref={endRef} />
              </div>
            </section>
            <footer className="cec-chat-composer">
              {sendError && <p>{sendError}</p>}
              <form onSubmit={sendMessage}>
                <input value={newMessage} onChange={event => setNewMessage(event.target.value)} maxLength={4000} placeholder={selected.kind === 'class' ? 'Mensagem para toda a turma...' : `Mensagem para ${firstName(selected.full_name)}...`} />
                <button type="submit" disabled={!newMessage.trim()} aria-label="Enviar mensagem"><Send size={19} /></button>
              </form>
            </footer>
          </>
        ) : (
          <div className="cec-chat-placeholder">
            <div><MessageCircle size={38} /></div>
            <h3>Suas conversas em um só lugar</h3>
            <p>Escolha uma conversa recente ou inicie uma nova mensagem.</p>
            <button type="button" onClick={() => { setModalSearch(''); setShowNewChat(true) }}><Plus size={17} /> Nova conversa</button>
          </div>
        )}
      </main>

      {showNewChat && (
        <div className="cec-chat-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
          <div className="cec-chat-modal">
            <header><div><h3 id="new-chat-title">Iniciar conversa</h3><p>Escolha uma turma ou uma pessoa.</p></div><button type="button" onClick={() => { setShowNewChat(false); setModalSearch('') }}><X size={20} /></button></header>
            <label className="cec-chat-search"><Search size={17} /><input autoFocus value={modalSearch} onChange={event => setModalSearch(event.target.value)} placeholder="Buscar aluno, turma ou equipe..." /></label>
            <div className="cec-chat-modal-list">
              {allTargets.filter(target => !modalSearch.trim() || `${target.full_name} ${target.course_name || ''}`.toLocaleLowerCase('pt-BR').includes(modalSearch.trim().toLocaleLowerCase('pt-BR'))).map(target => (
                <button type="button" key={targetKey(target)} onClick={() => loadConversation(target)}>
                  <span className={`cec-chat-avatar ${target.kind === 'class' ? 'group' : ''}`}>{target.kind === 'class' ? <Users size={19} /> : target.full_name.charAt(0).toUpperCase()}</span>
                  <span><strong>{target.full_name}</strong><small>{target.kind === 'class' ? `Turma · ${target.course_name}` : labels[target.category]}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
