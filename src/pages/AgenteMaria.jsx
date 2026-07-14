import { useState, useEffect } from 'react'
import { Bot, Save, Loader2, Eye, EyeOff, RotateCcw, MessageSquare, KeyRound, Sparkles, Power } from 'lucide-react'
import { mariaApi } from '../services/maria'
import { useAuth } from '../contexts/AuthContext'

const MODELOS = [
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (rápido e econômico — recomendado)', provider: 'anthropic' },
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 (mais inteligente)', provider: 'anthropic' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (máxima qualidade)', provider: 'anthropic' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini (OpenAI)', provider: 'openai' },
    { value: 'gpt-4o', label: 'GPT-4o (OpenAI)', provider: 'openai' },
]

export default function AgenteMaria() {
    const { userProfile, loading: authLoading } = useAuth()
    const isGerencial = userProfile && ['admin', 'coordenador'].includes(userProfile.role)

    const [loadingData, setLoadingData] = useState(true)
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState({ type: '', message: '' })

    const [enabled, setEnabled] = useState(true)
    const [systemPrompt, setSystemPrompt] = useState('')
    const [defaultPrompt, setDefaultPrompt] = useState('')
    const [model, setModel] = useState('claude-haiku-4-5')
    const [provider, setProvider] = useState('anthropic')
    const [attendant, setAttendant] = useState('')
    const [handoffKeywords, setHandoffKeywords] = useState('')
    const [evolutionUrl, setEvolutionUrl] = useState('')

    const [aiKey, setAiKey] = useState('')
    const [aiKeySet, setAiKeySet] = useState(false)
    const [showAiKey, setShowAiKey] = useState(false)
    const [evoKey, setEvoKey] = useState('')
    const [evoKeySet, setEvoKeySet] = useState(false)
    const [showEvoKey, setShowEvoKey] = useState(false)

    useEffect(() => {
        if (authLoading || !isGerencial) return
        const load = async () => {
            setLoadingData(true)
            try {
                const cfg = await mariaApi.getConfig()
                setEnabled(cfg.enabled ?? true)
                setSystemPrompt(cfg.system_prompt || '')
                setDefaultPrompt(cfg.default_prompt || '')
                setModel(cfg.model || 'claude-haiku-4-5')
                setProvider(cfg.provider || 'anthropic')
                setAttendant(cfg.attendant || '')
                setHandoffKeywords(cfg.handoff_keywords || '')
                setEvolutionUrl(cfg.evolution_url || '')
                setAiKeySet(!!cfg.ai_api_key_set)
                setEvoKeySet(!!cfg.evolution_key_set)
            } catch (err) {
                setFeedback({ type: 'error', message: 'Falha ao carregar a configuração do agente.' })
            } finally {
                setLoadingData(false)
            }
        }
        load()
    }, [authLoading, isGerencial])

    const onModelChange = (value) => {
        setModel(value)
        const found = MODELOS.find(m => m.value === value)
        if (found) setProvider(found.provider)
    }

    const handleSave = async () => {
        setSaving(true)
        setFeedback({ type: '', message: '' })
        try {
            const payload = {
                enabled,
                system_prompt: systemPrompt,
                model,
                provider,
                attendant,
                handoff_keywords: handoffKeywords,
                evolution_url: evolutionUrl,
            }
            if (aiKey.trim()) payload.ai_api_key = aiKey.trim()
            if (evoKey.trim()) payload.evolution_key = evoKey.trim()
            await mariaApi.saveConfig(payload)
            if (aiKey.trim()) { setAiKeySet(true); setAiKey('') }
            if (evoKey.trim()) { setEvoKeySet(true); setEvoKey('') }
            setFeedback({ type: 'success', message: 'Configuração salva! As mudanças já valem para as próximas conversas.' })
        } catch (err) {
            setFeedback({ type: 'error', message: err?.message || 'Falha ao salvar.' })
        } finally {
            setSaving(false)
            setTimeout(() => setFeedback({ type: '', message: '' }), 5000)
        }
    }

    if (authLoading || loadingData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem', color: 'var(--text-muted)' }}>
                <Loader2 size={22} className="spin" /> Carregando configuração do agente...
            </div>
        )
    }

    if (!isGerencial) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Acesso restrito a administradores e coordenação.
            </div>
        )
    }

    const label = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }
    const input = { width: '100%', padding: '0.65rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.9rem', background: 'var(--bg-color)' }
    const card = { background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem' }
    const cardTitle = { display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-color)', marginBottom: '1.1rem' }

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0.5rem' }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bot size={28} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-color)' }}>Agente Maria Antônia</h1>
                    <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure o comportamento do atendente virtual do WhatsApp.</p>
                </div>
            </div>

            {feedback.message && (
                <div style={{
                    padding: '0.85rem 1rem', borderRadius: 12, marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 500,
                    background: feedback.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: feedback.type === 'success' ? '#059669' : '#dc2626',
                    border: `1px solid ${feedback.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                }}>
                    {feedback.message}
                </div>
            )}

            {/* Liga/desliga */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <Power size={20} color={enabled ? '#059669' : '#94a3b8'} />
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-color)' }}>Atendimento automático</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {enabled ? 'A Maria responde os clientes automaticamente.' : 'Desligada — nenhuma resposta automática é enviada.'}
                        </div>
                    </div>
                </div>
                <button onClick={() => setEnabled(v => !v)} style={{
                    position: 'relative', width: 52, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: enabled ? '#10b981' : '#cbd5e1', transition: 'background .2s'
                }} aria-label="Ativar/desativar">
                    <span style={{ position: 'absolute', top: 3, left: enabled ? 25 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                </button>
            </div>

            {/* Personalidade / prompt */}
            <div style={card}>
                <div style={cardTitle}><Sparkles size={18} color="#8b5cf6" /> Personalidade e instruções</div>
                <label style={label}>Prompt do agente (define como a Maria conversa, o fluxo de vendas e as regras)</label>
                <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={14}
                    style={{ ...input, fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', lineHeight: 1.5, resize: 'vertical' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Os cursos e preços são injetados automaticamente do sistema — não precisa listar aqui.</span>
                    <button onClick={() => setSystemPrompt(defaultPrompt)} disabled={!defaultPrompt}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.4rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <RotateCcw size={14} /> Restaurar padrão
                    </button>
                </div>
            </div>

            {/* Modelo de IA + chave */}
            <div style={card}>
                <div style={cardTitle}><KeyRound size={18} color="#3b82f6" /> Motor de IA</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div>
                        <label style={label}>Modelo</label>
                        <select value={model} onChange={e => onModelChange(e.target.value)} style={input}>
                            {MODELOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Provedor: <strong>{provider}</strong></span>
                    </div>
                    <div>
                        <label style={label}>
                            Chave de API {provider === 'openai' ? '(OpenAI)' : '(Anthropic)'}
                            {aiKeySet && <span style={{ color: '#059669', marginLeft: 6 }}>● configurada</span>}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input type={showAiKey ? 'text' : 'password'} value={aiKey} onChange={e => setAiKey(e.target.value)}
                                placeholder={aiKeySet ? '•••••••••• (deixe em branco para manter)' : 'cole a chave aqui'} style={{ ...input, paddingRight: 44 }} />
                            <button onClick={() => setShowAiKey(v => !v)} type="button"
                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                {showAiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>A chave nunca é exibida de volta por segurança.</span>
                    </div>
                </div>
            </div>

            {/* Handoff / atendente */}
            <div style={card}>
                <div style={cardTitle}><MessageSquare size={18} color="#f59e0b" /> Atendimento humano</div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={label}>WhatsApp da atendente (recebe avisos de handoff e leads quentes)</label>
                    <input value={attendant} onChange={e => setAttendant(e.target.value)} placeholder="5521999999999" style={input} />
                </div>
                <div>
                    <label style={label}>Palavras que acionam o atendente humano (uma por linha)</label>
                    <textarea value={handoffKeywords} onChange={e => setHandoffKeywords(e.target.value)} rows={5}
                        style={{ ...input, fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', resize: 'vertical' }}
                        placeholder={'falar com atendente\nquero um humano'} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Digitar "8" também sempre chama um atendente.</span>
                </div>
            </div>

            {/* Evolution / WhatsApp */}
            <div style={card}>
                <div style={cardTitle}><MessageSquare size={18} color="#10b981" /> Conexão WhatsApp (Evolution API)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div>
                        <label style={label}>URL da Evolution API</label>
                        <input value={evolutionUrl} onChange={e => setEvolutionUrl(e.target.value)} placeholder="https://evolution.cursocec.com.br" style={input} />
                    </div>
                    <div>
                        <label style={label}>
                            Chave da Evolution API
                            {evoKeySet && <span style={{ color: '#059669', marginLeft: 6 }}>● configurada</span>}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input type={showEvoKey ? 'text' : 'password'} value={evoKey} onChange={e => setEvoKey(e.target.value)}
                                placeholder={evoKeySet ? '•••••••••• (deixe em branco para manter)' : 'cole a chave aqui'} style={{ ...input, paddingRight: 44 }} />
                            <button onClick={() => setShowEvoKey(v => !v)} type="button"
                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                {showEvoKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.8rem', marginBottom: 0 }}>
                    Aponte o webhook da sua instância Evolution para <code>/api/v1/webhooks/whatsapp</code> deste servidor.
                </p>
            </div>

            {/* Salvar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: 12 }}>
                <button onClick={handleSave} disabled={saving} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.6rem', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: saving ? 'default' : 'pointer',
                    boxShadow: '0 8px 20px rgba(59,130,246,0.3)', opacity: saving ? 0.7 : 1
                }}>
                    {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Salvar configuração
                </button>
            </div>

            <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}
