import { useState, useEffect } from 'react'
import { Settings, Save, ShieldCheck, Eye, EyeOff, Loader2, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { settingsApi } from '../services/financial'
import { testAsaasConnection } from '../services/asaas'
import { useAuth } from '../contexts/AuthContext'

// URL do webhook no backend (mesma origem da API). Deriva o domínio apex a
// partir do host atual, para funcionar tanto no domínio raiz quanto nos
// subdomínios de portal (portal./secretaria./aluno.).
const webhookUrl = () => {
    const { protocol, hostname, port } = window.location
    const base = hostname.replace(/^(aluno|secretaria|portal|www)\./, '')
    return `${protocol}//${base}${port ? `:${port}` : ''}/api/v1/webhooks/asaas`
}

export default function ConfigAsaas() {
    const { userProfile, loading: authLoading } = useAuth()
    const [apiKey, setApiKey] = useState('')
    const [keyConfigured, setKeyConfigured] = useState(false)
    const [webhookToken, setWebhookToken] = useState('')
    const [tokenConfigured, setTokenConfigured] = useState(false)
    const [environment, setEnvironment] = useState('sandbox')
    const [maxInstallmentsCard, setMaxInstallmentsCard] = useState('10')
    const [maxInstallmentsFinancing, setMaxInstallmentsFinancing] = useState('6')
    const [pixDiscount, setPixDiscount] = useState('15')
    const [showKey, setShowKey] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState({ type: '', message: '' })
    const [testingConnection, setTestingConnection] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState(null)
    const [copied, setCopied] = useState(false)

    const isGerencial = userProfile && ['admin', 'coordenador'].includes(userProfile.role)

    useEffect(() => {
        if (!isGerencial) return;

        const loadAsaasSettings = async () => {
            setLoadingData(true)
            try {
                const { settings } = await settingsApi.list()
                const byKey = Object.fromEntries((settings || []).map(s => [s.key, s]))

                // A chave e o token nunca são devolvidos ao browser (C1/C2): só sabemos se estão definidos.
                setKeyConfigured(!!byKey['asaas_api_key']?.is_set)
                setTokenConfigured(!!byKey['asaas_webhook_token']?.is_set)
                if (byKey['asaas_environment']?.value) setEnvironment(byKey['asaas_environment'].value)
                if (byKey['asaas_max_installments_card']?.value) setMaxInstallmentsCard(byKey['asaas_max_installments_card'].value)
                if (byKey['asaas_max_installments_financing']?.value) setMaxInstallmentsFinancing(byKey['asaas_max_installments_financing'].value)
                if (byKey['asaas_pix_discount_percent']?.value) setPixDiscount(byKey['asaas_pix_discount_percent'].value)
            } catch (err) {
                console.error('Erro ao buscar chaves do Asaas:', err)
                setFeedback({ type: 'error', message: 'Falha ao buscar configurações salvas.' })
            } finally {
                setLoadingData(false)
            }
        }

        loadAsaasSettings()
    }, [isGerencial])

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleTestConnection = async () => {
        if (!apiKey.trim()) {
            setConnectionStatus({ connected: false, message: 'Digite a chave de API para testar.' })
            return
        }
        setTestingConnection(true)
        setConnectionStatus(null)
        try {
            // Teste feito no backend (chave nunca sai pro Asaas pelo browser;
            // funciona em produção, sem depender do proxy do Vite).
            const data = await testAsaasConnection(apiKey.trim(), environment)
            if (data.connected) {
                setConnectionStatus({ connected: true, name: data.name, cpfCnpj: data.cpfCnpj })
            } else {
                setConnectionStatus({ connected: false, message: data.message || 'API Key inválida.' })
            }
        } catch (err) {
            console.error("Erro ao testar conexão:", err)
            setConnectionStatus({ connected: false, message: err?.message || 'Erro ao testar conexão.' })
        } finally {
            setTestingConnection(false)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        setFeedback({ type: '', message: '' })

        try {
            const toSave = {
                asaas_environment: environment,
                asaas_max_installments_card: maxInstallmentsCard,
                asaas_max_installments_financing: maxInstallmentsFinancing,
                asaas_pix_discount_percent: pixDiscount,
            }
            // Só envia chave/token se o admin digitou um novo (vazio mantém o atual no servidor).
            if (apiKey) toSave.asaas_api_key = apiKey
            if (webhookToken) toSave.asaas_webhook_token = webhookToken

            await settingsApi.save(toSave)

            if (apiKey) { setKeyConfigured(true); setApiKey('') }
            if (webhookToken) { setTokenConfigured(true); setWebhookToken('') }
            setFeedback({ type: 'success', message: 'Configurações do Asaas salvas com sucesso!' })
        } catch (err) {
            console.error('Erro ao salvar chaves do Asaas:', err)
            setFeedback({ type: 'error', message: 'Erro ao salvar as configurações.' })
        } finally {
            setSaving(false)
        }
    }

    if (authLoading || (isGerencial && loadingData)) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
                <Loader2 size={40} className="animate-spin" color="var(--primary)" />
                <span className="text-muted" style={{ fontWeight: '500' }}>Carregando configurações...</span>
            </div>
        )
    }

    if (!isGerencial) {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#EF4444', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={36} />
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Acesso Restrito</h2>
                    <p className="text-muted" style={{ fontSize: '0.925rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                        Esta página contém informações confidenciais do Asaas e está restrita apenas aos níveis gerenciais autorizados do sistema.
                    </p>
                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => window.history.back()}>
                        Voltar para a Página Anterior
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        <Settings size={24} />⚙️ Configurações Asaas
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>Configure os dados de acesso da API do Asaas para emissão automática de pagamentos.</p>
                </div>
            </div>

            {feedback.message && (
                <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                    color: feedback.type === 'success' ? '#065F46' : '#991B1B',
                    border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}>
                    <ShieldCheck size={18} />
                    <span>{feedback.message}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="card animate-slide-up" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Campo API Key */}
                    <div>
                        <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem' }}>
                            🔑 API Key (Access Token)
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type={showKey ? 'text' : 'password'}
                                className="form-control"
                                placeholder={keyConfigured ? 'Chave configurada — deixe em branco para manter' : 'Cole a chave da sua conta Asaas aqui'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px'
                                }}
                            >
                                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <small className="text-muted" style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.8rem' }}>
                            Chave gerada no painel do Asaas em Configurações do Sistema → Integrações → Gerar chave de API.
                        </small>
                    </div>

                    {/* Campo Ambiente */}
                    <div>
                        <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem' }}>
                            🌐 Ambiente:
                        </label>
                        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                                <input
                                    type="radio"
                                    name="environment"
                                    value="sandbox"
                                    checked={environment === 'sandbox'}
                                    onChange={() => setEnvironment('sandbox')}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                Sandbox (testes)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                                <input
                                    type="radio"
                                    name="environment"
                                    value="production"
                                    checked={environment === 'production'}
                                    onChange={() => setEnvironment('production')}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                Produção (real)
                            </label>
                        </div>
                    </div>

                    {/* Webhook URL (Copiar) */}
                    <div>
                        <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem' }}>
                            🔗 Webhook URL (configure no painel Asaas → Integrações → Webhooks):
                        </label>
                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <code style={{ fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all', minWidth: 0, flex: '1 1 200px' }}>
                                {webhookUrl()}
                            </code>
                            <button
                                type="button"
                                onClick={copyToClipboard}
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem', minWidth: '120px', justifyContent: 'center' }}
                            >
                                {copied ? <Check size={14} color="green" /> : <Copy size={14} />}
                                {copied ? 'Copiado!' : 'Copiar URL'}
                            </button>
                        </div>
                        <small className="text-muted" style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.8rem' }}>
                            No Asaas, marque os eventos de <strong>pagamento recebido/confirmado</strong>. Ao confirmar o pagamento, o aluno é criado e o acesso ao curso é liberado automaticamente.
                        </small>
                    </div>

                    {/* Token do Webhook (segurança) */}
                    <div>
                        <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block', fontSize: '0.95rem' }}>
                            🛡️ Token do Webhook (Access Token do Asaas)
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder={tokenConfigured ? 'Token configurado — deixe em branco para manter' : 'Defina um token secreto (ex.: openssl rand -base64 24)'}
                            value={webhookToken}
                            onChange={(e) => setWebhookToken(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                        />
                        <small className="text-muted" style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.8rem' }}>
                            Cole este mesmo token no campo <strong>"Token de autenticação"</strong> do webhook no painel do Asaas. O sistema rejeita chamadas sem ele — protege contra confirmações de pagamento falsas.
                        </small>
                    </div>

                    {/* Status da conexão (Testar Conexão) */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label style={{ fontWeight: '600', display: 'block', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                            📋 Status da conexão:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleTestConnection}
                                disabled={testingConnection || !apiKey}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {testingConnection ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                Testar Conexão
                            </button>
                            
                            {connectionStatus && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    {connectionStatus.connected ? (
                                        <>
                                            <ShieldCheck size={18} color="green" />
                                            <span style={{ color: 'green', fontWeight: '500' }}>
                                                ✅ Conectado — Conta: <strong>{connectionStatus.name}</strong> (CPF/CNPJ: {connectionStatus.cpfCnpj})
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={18} color="red" />
                                            <span style={{ color: 'red', fontWeight: '500' }}>
                                                ❌ Falha: {connectionStatus.message}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Configurações de Parcelamento e Desconto */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                        <div>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem' }}>
                                Máx. parcelas cartão:
                            </label>
                            <select
                                className="form-control"
                                value={maxInstallmentsCard}
                                onChange={(e) => setMaxInstallmentsCard(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{i+1}x</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem' }}>
                                Máx. parcelas financ.:
                            </label>
                            <select
                                className="form-control"
                                value={maxInstallmentsFinancing}
                                onChange={(e) => setMaxInstallmentsFinancing(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                            >
                                {[...Array(24)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{i+1}x</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem' }}>
                                Desconto PIX (%):
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="form-control"
                                    value={pixDiscount}
                                    onChange={(e) => setPixDiscount(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem 2rem 0.75rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                                />
                                <span style={{ position: 'absolute', right: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>%</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Botão de Salvar */}
                <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'center' }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Salvar Configurações
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
