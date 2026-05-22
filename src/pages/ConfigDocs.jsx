import { useState, useEffect } from 'react'
import { FileText, Save, Eye, LayoutTemplate, Briefcase, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'

const AVAILABLE_VARIABLES = [
    { code: '{{NOME_ALUNO}}', desc: 'Nome completo do aluno' },
    { code: '{{CPF}}', desc: 'CPF formatado' },
    { code: '{{RG}}', desc: 'RG do aluno' },
    { code: '{{NOME_TURMA}}', desc: 'Nome da Turma (Ex: T1 15/12)' },
    { code: '{{NOME_CURSO}}', desc: 'Nome do Curso Matriculado' },
    { code: '{{VALOR_CURSO}}', desc: 'Valor total do curso contratado' },
    { code: '{{DATA_HOJE}}', desc: 'Data da geração do documento' },
]

const defaultContrato = `C&C ENGENHARIA e CAPACITAÇÃO.
Rua Treze, n° 2, Caminho do Zepelin – Santa Cruz – Rio de Janeiro – RJ
Fone/Fax: (21) 965554180 ensino@cecengenhariaecapacitacao

CONTRATO DE TREINAMENTO E CAPACITAÇÃO PROFISSIONAL

CONTRATANTE (ALUNO): {{NOME_ALUNO}}, Identidade RG nº {{RG}}, inscrita no CPF sob o nº {{CPF}}, cujo Curso Matriculado é: {{NOME_CURSO}} / Turma: {{NOME_TURMA}}. 

Valor Total Carga Horária e Turma: {{VALOR_CURSO}}.

CLÁUSULA PRIMEIRA – DAS OBRIGAÇÕES
A CONTRATADA estabelece que o treinamento a ser ministrado está de acordo com as informações contidas no material informativo fornecido na contratação e que o material didático será entregue até a data do início das aulas, porém, reserva-se o direito de propor alterações referentes a datas, horários ou docente(s), caso necessário.
§ 1°. O ALUNO declara estar ciente de todas as informações sobre o treinamento e submete-se aos planos de ensino e estrutura de funcionamento do mesmo.
§ 2°. O ALUNO que deixar de assistir a algum módulo não terá direito à reposição do mesmo ou à compensação do valor pago pelo referido curso, mesmo tendo sua falta justificada.
§ 3°. As faltas só serão justificadas mediante apresentação de atestado médico ou em caso de óbito familiar.
§ 4°. O ALUNO poderá solicitar o cancelamento da matrícula, devendo requerê-lo em até 10 dias antes da ocorrência da primeira aula. Neste caso, lhe será devolvido 70% do valor pago.
`

const defaultDeclaracao = `C&C ENGENHARIA e CAPACITAÇÃO.
CNPJ: 00.000.000/0000-00

DECLARAÇÃO DE INSCRITO

Declaramos para os devidos fins que o aluno {{NOME_ALUNO}}, portador do CPF {{CPF}}, encontra-se regularmente inscrito no curso {{NOME_CURSO}} correspondente à turma {{NOME_TURMA}}.

Rio de Janeiro, {{DATA_HOJE}}.`

const defaultRecibo = `RECIBO DE PAGAMENTO

Recebemos de {{NOME_ALUNO}}, inscrito no CPF {{CPF}}, a importância referente à parcela ou quitação do curso {{NOME_CURSO}} - Turma {{NOME_TURMA}}.

Valor: {{VALOR_CURSO}}

Por ser verdade, firmamos o presente.
Rio de Janeiro, {{DATA_HOJE}}
Assinatura: ___________________________`

export default function ConfigDocs() {
    const [activeDoc, setActiveDoc] = useState('contrato')
    const [templateContent, setTemplateContent] = useState(defaultContrato)
    const [userAuth, setUserAuth] = useState({ role: null, canUpload: false })
    const [manualBase64, setManualBase64] = useState('')
    const [bgImageBase64, setBgImageBase64] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isUploadingBg, setIsUploadingBg] = useState(false)
    const [loading, setLoading] = useState(true)
    const [configError, setConfigError] = useState(null)

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true)
            setConfigError(null)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase.from('users').select('role, permissions').eq('id', user.id).maybeSingle()
                    const email = user.email?.toLowerCase() || ''
                    const metadata = user.user_metadata || {}
                    const isDev = email.includes('desenvolvedor') || email.includes('carlos') || email.includes('piticalym') || metadata.role === 'admin'

                    if (isDev) {
                        setUserAuth({ role: 'admin', canUpload: true })
                    } else if (profile) {
                        setUserAuth({
                            role: profile.role,
                            canUpload: profile.role === 'admin' || profile.role === 'developer' || (profile.permissions?.upload_manual)
                        })
                    } else if (metadata.role) {
                        setUserAuth({
                            role: metadata.role,
                            canUpload: metadata.role === 'admin' || (metadata.permissions?.upload_manual)
                        })
                    }
                }

                // Buscar Configurações
                const { data: settings, error: settingsError } = await supabase.from('system_settings').select('key, value')
                if (settingsError) throw settingsError

                if (settings) {
                    const manual = settings.find(s => s.key === 'manual_aluno_url')
                    if (manual) setManualBase64(manual.value)

                    const currentBgKey = `bg_doc_${activeDoc}`
                    const bg = settings.find(s => s.key === currentBgKey)
                    setBgImageBase64(bg ? bg.value : '')
                }
            } catch (err) {
                console.error("Erro ao carregar configurações:", err)
                setConfigError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchConfig()
    }, [activeDoc])

    const handleTabChange = (docType) => {
        setActiveDoc(docType)
        if (docType === 'contrato') setTemplateContent(defaultContrato)
        if (docType === 'declaracao') setTemplateContent(defaultDeclaracao)
        if (docType === 'recibo') setTemplateContent(defaultRecibo)
    }

    const testPdfSimulator = () => {
        const doc = new jsPDF()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)

        let simText = templateContent
        simText = simText.replace(/{{NOME_ALUNO}}/g, 'João Silva de Teste')
        simText = simText.replace(/{{CPF}}/g, '123.456.789-00')
        simText = simText.replace(/{{RG}}/g, '12.345.678-9')
        simText = simText.replace(/{{NOME_TURMA}}/g, 'Simulação-T1')
        simText = simText.replace(/{{NOME_CURSO}}/g, 'Mecânica CD-CM')
        simText = simText.replace(/{{VALOR_CURSO}}/g, 'R$ 1.500,00')
        simText = simText.replace(/{{DATA_HOJE}}/g, new Date().toLocaleDateString('pt-BR'))

        const lines = doc.splitTextToSize(simText, 180)
        doc.text(lines, 15, 20)
        window.open(doc.output('bloburl'), '_blank')
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.type !== 'application/pdf') {
            alert('Apenas arquivos PDF são aceitos.')
            return
        }
        setIsUploading(true)
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64Data = reader.result
            const { error } = await supabase.from('system_settings').upsert({ key: 'manual_aluno_url', value: base64Data, updated_at: new Date() }, { onConflict: 'key' })
            if (error) alert("Erro: " + error.message)
            else { setManualBase64(base64Data); alert("Manual Atualizado!"); }
            setIsUploading(false)
        }
        reader.readAsDataURL(file)
    }

    const handleBgUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            alert('Apenas imagens PNG ou JPG são aceitas.')
            return
        }
        setIsUploadingBg(true)
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64Data = reader.result
            const key = `bg_doc_${activeDoc}`
            const { error } = await supabase.from('system_settings').upsert({ key, value: base64Data, updated_at: new Date() }, { onConflict: 'key' })
            if (error) alert("Erro: " + error.message)
            else { setBgImageBase64(base64Data); alert(`Timbre para ${activeDoc} atualizado!`); }
            setIsUploadingBg(false)
        }
        reader.readAsDataURL(file)
    }

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando Configurações...</div>

    if (configError) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
            <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
            <h3>Erro ao carregar configurações</h3>
            <p>{configError}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>Recarregar Página</button>
        </div>
    )

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Modelos de Documentos Oficiais</h2>
                    <p className="text-muted">Ajuste os textos padrões de Contratos e Declarações.</p>
                </div>
                <button className="btn btn-primary">
                    <Save size={18} /> Salvar Modelo
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Menu Lateral */}
                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Tipos de Documento</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button className={`btn ${activeDoc === 'contrato' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleTabChange('contrato')}><Briefcase size={16} /> Contrato</button>
                        <button className={`btn ${activeDoc === 'declaracao' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleTabChange('declaracao')}><FileText size={16} /> Declaração</button>
                        <button className={`btn ${activeDoc === 'recibo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleTabChange('recibo')}><LayoutTemplate size={16} /> Recibo</button>
                    </div>

                    {userAuth.canUpload && (
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Manual do Aluno</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                                <UploadCloud size={32} color="var(--primary)" />
                                <label htmlFor="manual-upload" className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.75rem' }}>{isUploading ? '...' : 'Subir PDF'}</label>
                                <input type="file" id="manual-upload" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
                                {manualBase64 && <span style={{ fontSize: '0.7rem', color: '#059669' }}>✓ Atualizado</span>}
                            </div>
                        </div>
                    )}

                    {userAuth.canUpload && (
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Papel Timbrado ({activeDoc})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', backgroundColor: '#F0F9FF' }}>
                                <LayoutTemplate size={32} color="var(--primary)" />
                                <label htmlFor="bg-upload" className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.75rem' }}>{isUploadingBg ? '...' : 'Subir Timbre'}</label>
                                <input type="file" id="bg-upload" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleBgUpload} />
                                {bgImageBase64 && <img src={bgImageBase64} alt="Previa" style={{ width: '50px', height: '60px', objectFit: 'cover' }} />}
                            </div>
                        </div>
                    )}
                </div>

                {/* Editor */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem' }}>Texto-Base</h3>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={testPdfSimulator}><Eye size={14} /> Prévia PDF</button>
                    </div>
                    <textarea className="form-control" style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: '0.8rem' }} value={templateContent} onChange={(e) => setTemplateContent(e.target.value)}></textarea>
                </div>

                {/* Variáveis */}
                <div className="card" style={{ padding: '1rem', backgroundColor: '#F1F5F9' }}>
                    <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Variáveis</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {AVAILABLE_VARIABLES.map(v => (
                            <div key={v.code} style={{ padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px', fontSize: '0.75rem', cursor: 'copy' }} onClick={() => navigator.clipboard.writeText(v.code)}>
                                <code style={{ color: 'var(--primary)' }}>{v.code}</code>
                                <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{v.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
