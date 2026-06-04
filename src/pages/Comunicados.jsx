import { useState, useEffect } from 'react'
import { Megaphone, Plus, Search, Trash2, Calendar, ShieldAlert, Pin, Users, Loader2, Save, X, Eye, Edit } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Comunicados() {
    const { userProfile } = useAuth()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('todos')
    
    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [selectedAnn, setSelectedAnn] = useState(null)
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    
    // Form state
    const [form, setForm] = useState({
        title: '',
        body: '',
        target_aluno: true,
        target_instrutor: true,
        target_atendente: true,
        target_coordenador: true,
        is_pinned: false,
        expires_at: ''
    })

    const fetchAnnouncements = async () => {
        setLoading(true)
        try {
            // Buscar comunicados na tabela announcements
            const { data, error } = await supabase
                .from('announcements')
                .select('*, author:users!created_by(full_name)')
                .order('created_at', { ascending: false })
            
            if (error) throw error
            setAnnouncements(data || [])
        } catch (err) {
            console.error('Erro ao buscar comunicados da nuvem (usando local mocks):', err)
            // Fallback mock caso a tabela no Supabase não tenha sido migrada
            const mockAnnouncements = [
                {
                    id: 'mock-1',
                    title: '🚨 Manutenção Programada no Portal do Aluno',
                    body: 'Prezados, informamos que no dia 05/06/2026 das 22h às 02h, a plataforma passará por uma atualização de servidores para melhoria de desempenho. Durante esse período, o player EAD poderá ficar instável.',
                    target_roles: ['aluno', 'instrutor', 'atendente', 'coordenador'],
                    is_pinned: true,
                    expires_at: '2026-06-06T02:00:00Z',
                    created_at: '2026-05-30T10:00:00Z',
                    author: { full_name: 'Coordenação Pedagógica' }
                },
                {
                    id: 'mock-2',
                    title: '⚠️ Prazo Limite para Notas do Método CD-MC',
                    body: 'Atenção instrutores, lembramos que o prazo limite para lançamento de notas das avaliações práticas da Turma ME-2026.2 encerra na próxima sexta-feira. A liberação de certificados depende dessas notas.',
                    target_roles: ['instrutor', 'coordenador'],
                    is_pinned: false,
                    expires_at: '2026-06-07T23:59:59Z',
                    created_at: '2026-05-29T14:20:00Z',
                    author: { full_name: 'Diretoria Administrativa' }
                },
                {
                    id: 'mock-3',
                    title: '📢 Lançamento da Campanha de Matrículas do Inverno',
                    body: 'A equipe de vendas e atendimento já pode acessar os novos materiais de divulgação dos cursos de Ultrassom CD-TO na pasta compartilhada. Dúvidas, procurem a coordenação comercial.',
                    target_roles: ['atendente', 'coordenador'],
                    is_pinned: false,
                    expires_at: null,
                    created_at: '2026-05-25T08:00:00Z',
                    author: { full_name: 'Marketing C&C' }
                }
            ]
            setAnnouncements(mockAnnouncements)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAnnouncements()
    }, [])

    const handleOpenCreate = () => {
        setForm({
            title: '',
            body: '',
            target_aluno: true,
            target_instrutor: true,
            target_atendente: true,
            target_coordenador: true,
            is_pinned: false,
            expires_at: ''
        })
        setErrorMsg('')
        setShowCreateModal(true)
    }

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault()
        if (!form.title || !form.body) {
            setErrorMsg('Título e Conteúdo do comunicado são obrigatórios.')
            return
        }

        const targetRoles = []
        if (form.target_aluno) targetRoles.push('aluno')
        if (form.target_instrutor) targetRoles.push('instrutor')
        if (form.target_atendente) targetRoles.push('atendente')
        if (form.target_coordenador) targetRoles.push('coordenador')

        if (targetRoles.length === 0) {
            setErrorMsg('Selecione pelo menos um público-alvo para o comunicado.')
            return
        }

        setSaving(true)
        setErrorMsg('')

        try {
            const payload = {
                title: form.title,
                body: form.body,
                target_roles: targetRoles,
                is_pinned: form.is_pinned,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
                created_by: userProfile?.id || null
            }

            if (announcements[0]?.id.toString().startsWith('mock-')) {
                // Mock insert
                const mockNew = {
                    id: 'mock-' + Date.now(),
                    ...payload,
                    created_at: new Date().toISOString(),
                    author: { full_name: userProfile?.full_name || 'Admin/Coordenador' }
                }
                setAnnouncements([mockNew, ...announcements])
            } else {
                // Real insert
                const { error } = await supabase
                    .from('announcements')
                    .insert([payload])
                
                if (error) throw error
            }

            fetchAnnouncements()
            setShowCreateModal(false)
            alert('Comunicado publicado com sucesso!')
        } catch (err) {
            console.error('Erro ao salvar comunicado:', err)
            setErrorMsg(err.message || 'Falha ao salvar comunicado.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja apagar este comunicado? ele sumirá do mural dos destinatários.')) return

        try {
            if (id.toString().startsWith('mock-')) {
                setAnnouncements(prev => prev.filter(a => a.id !== id))
            } else {
                const { error } = await supabase
                    .from('announcements')
                    .delete()
                    .eq('id', id)
                if (error) throw error
            }
            alert('Comunicado excluído.')
            fetchAnnouncements()
        } catch (err) {
            alert('Erro ao excluir: ' + err.message)
        }
    }

    const filtered = announcements.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              a.body.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesRole = roleFilter === 'todos' || a.target_roles.includes(roleFilter)
        return matchesSearch && matchesRole
    })

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'system-ui, -apple-system, sans-serif' }} className="animate-fade-in">
            {/* CABEÇALHO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📢 Mural de Comunicados Gerais
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                        Publique avisos importantes direcionados para alunos, instrutores ou colaboradores internos.
                    </p>
                </div>
                <button 
                    onClick={handleOpenCreate}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'brightness 0.2s'
                    }}
                >
                    <Plus size={18} /> Novo Comunicado
                </button>
            </div>

            {/* FILTROS E BUSCA */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white' }}>
                <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                    <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar comunicados por título ou conteúdo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            outline: 'none'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Público Alvo:</span>
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        style={{
                            padding: '0.75rem 2rem 0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="todos">Todos os Públicos</option>
                        <option value="aluno">Apenas Alunos</option>
                        <option value="instrutor">Apenas Instrutores</option>
                        <option value="atendente">Apenas Atendentes</option>
                        <option value="coordenador">Apenas Coordenadores</option>
                    </select>
                </div>
            </div>

            {/* LISTAGEM DE COMUNICADOS */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '1rem' }}>
                    <Loader2 size={36} className="animate-spin" color="var(--primary)" />
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Carregando comunicados ativos...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '16px', backgroundColor: 'white' }}>
                    <Megaphone size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                    <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#334155' }}>Nenhum comunicado publicado</h4>
                    <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Publique um aviso importante para os usuários no botão superior.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map(ann => {
                        const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date()
                        return (
                            <div 
                                key={ann.id}
                                className="card"
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid #cbd5e1',
                                    borderLeft: ann.is_pinned ? '5px solid #ef4444' : '5px solid var(--primary)',
                                    padding: '1.5rem',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                                    position: 'relative',
                                    opacity: isExpired ? 0.6 : 1
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {ann.is_pinned && (
                                            <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <Pin size={10} fill="#ef4444" /> FIXADO
                                            </span>
                                        )}
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '750', color: '#0f172a' }}>
                                            {ann.title}
                                        </h3>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button 
                                            onClick={() => { setSelectedAnn(ann); setShowPreviewModal(true); }}
                                            style={{ padding: '0.4rem', border: 'none', backgroundColor: '#f1f5f9', borderRadius: '6px', cursor: 'pointer' }}
                                            title="Visualizar"
                                        >
                                            <Eye size={14} color="#475569" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(ann.id)}
                                            style={{ padding: '0.4rem', border: 'none', backgroundColor: '#fee2e2', borderRadius: '6px', cursor: 'pointer' }}
                                            title="Excluir"
                                        >
                                            <Trash2 size={14} color="#ef4444" />
                                        </button>
                                    </div>
                                </div>

                                <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                                    {ann.body.length > 220 ? `${ann.body.slice(0, 220)}...` : ann.body}
                                </p>

                                {/* Footer do card */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Users size={14} color="var(--primary)" /> Destinatários: 
                                            <strong style={{ textTransform: 'capitalize' }}>
                                                {ann.target_roles.join(', ')}
                                            </strong>
                                        </span>
                                        <span>
                                            Autor: <strong>{ann.author?.full_name || 'Admin'}</strong>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Calendar size={14} /> Publicado em: {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                        {ann.expires_at && (
                                            <span style={{ color: isExpired ? '#ef4444' : '#64748b', fontWeight: isExpired ? '600' : 'normal' }}>
                                                🕒 Expira: {new Date(ann.expires_at).toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* MODAL PREVIEW COMUNICADO */}
            {showPreviewModal && selectedAnn && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', overflow: 'hidden' }} className="animate-scale-up">
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                                Visualizar Comunicado
                            </h3>
                            <button onClick={() => setShowPreviewModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#0f172a' }}>{selectedAnn.title}</h2>
                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    Publicado por {selectedAnn.author?.full_name || 'Admin'} em {new Date(selectedAnn.created_at).toLocaleString('pt-BR')}
                                </span>
                            </div>
                            
                            <div style={{ 
                                backgroundColor: '#f8fafc', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '8px', 
                                padding: '1.25rem', 
                                fontSize: '0.9rem', 
                                lineHeight: '1.6', 
                                color: '#1e293b',
                                whiteSpace: 'pre-line' 
                            }}>
                                {selectedAnn.body}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                                <div>
                                    Público Alvo: <strong style={{ textTransform: 'capitalize', color: '#0f172a' }}>{selectedAnn.target_roles.join(', ')}</strong>
                                </div>
                                {selectedAnn.expires_at && (
                                    <div>
                                        Expira em: <strong style={{ color: '#0f172a' }}>{new Date(selectedAnn.expires_at).toLocaleString('pt-BR')}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowPreviewModal(false)} style={{ padding: '0.5rem 1.25rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CRIAR COMUNICADO */}
            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }} className="animate-scale-up">
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Megaphone size={20} color="var(--primary)" /> Criar Novo Comunicado Oficial
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleCreateAnnouncement} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {errorMsg && (
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991B1B', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ShieldAlert size={16} /> {errorMsg}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Título do Comunicado *</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: 🚨 Manutenção do Servidor Pedagógico"
                                    value={form.title}
                                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Conteúdo do Comunicado *</label>
                                <textarea 
                                    rows="5"
                                    placeholder="Redija o texto oficial do comunicado em detalhes..."
                                    value={form.body}
                                    onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                                />
                            </div>

                            {/* Publico Alvo Checkboxes */}
                            <div>
                                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.5rem' }}>Público Alvo (Destinatários) *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.target_aluno} onChange={e => setForm(prev => ({ ...prev, target_aluno: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                                        Alunos (Portal do Aluno)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.target_instrutor} onChange={e => setForm(prev => ({ ...prev, target_instrutor: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                                        Instrutores (Portal do Instrutor)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.target_atendente} onChange={e => setForm(prev => ({ ...prev, target_atendente: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                                        Atendentes (Secretaria)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.target_coordenador} onChange={e => setForm(prev => ({ ...prev, target_coordenador: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                                        Coordenadores & Admins
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Data de Expiração (Opcional)</label>
                                    <input 
                                        type="date" 
                                        value={form.expires_at}
                                        onChange={e => setForm(prev => ({ ...prev, expires_at: e.target.value }))}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0.5rem', paddingTop: '1.25rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--primary)', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={form.is_pinned} 
                                            onChange={e => setForm(prev => ({ ...prev, is_pinned: e.target.checked }))} 
                                            style={{ width: '18px', height: '18px' }} 
                                        />
                                        Fixar no topo do Mural?
                                    </label>
                                </div>
                            </div>

                            {/* BOTOES MODAL */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{
                                        padding: '0.6rem 1.25rem',
                                        backgroundColor: 'white',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        padding: '0.6rem 1.5rem',
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Publicar Comunicado
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
