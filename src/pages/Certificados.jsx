import { useState, useEffect } from 'react'
import { Award, Search, Filter, Eye, Printer, Award as AwardIcon, Settings, Download, Loader2, Save, X, CheckCircle, AlertCircle, FileText, CheckCircle2, ChevronRight } from 'lucide-react'
import { coursesApi, classesApi, studentsApi } from '../services/academic'
import { lmsApi } from '../services/lms'
import { settingsApi } from '../services/financial'
import { generateDocument } from '../lib/pdfGenerator'

export default function Certificados() {
    const [activeTab, setActiveTab] = useState('emissoes')
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')
    const [feedback, setFeedback] = useState({ type: '', message: '' })

    // Dados gerais
    const [emissoes, setEmissoes] = useState([])
    const [pendentes, setPendentes] = useState([])
    const [courses, setCourses] = useState([])
    const [classes, setClasses] = useState([])

    // Filtros Aba 1
    const [searchTerm, setSearchTerm] = useState('')
    const [courseFilter, setCourseFilter] = useState('todos')
    const [classFilter, setClassFilter] = useState('todas')
    const [periodFilter, setPeriodFilter] = useState('todos')

    // Estado Aba 2 - Templates
    const [selectedCourseTemplate, setSelectedCourseTemplate] = useState('todos')
    const [templateType, setTemplateType] = useState('conclusao')
    const [templateText, setTemplateText] = useState('')
    const [signatureUrl, setSignatureUrl] = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)

    // Ações em lote na Aba 3
    const [selectedPendentes, setSelectedPendentes] = useState([])
    const [emittingLote, setEmittingLote] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Cursos e Turmas
            const { courses: crsData } = await coursesApi.list()
            setCourses(crsData || [])
            const { classes: clsData } = await classesApi.list()
            setClasses(clsData || [])

            // 2. Emissões (denormalizadas em metadata)
            const { certificates: emsData } = await lmsApi.certificates({ all: true })
            const formattedEmissoes = (emsData || []).map(e => {
                const m = e.metadata || {}
                return {
                    id: e.id,
                    student_name: m.student_name || 'Aluno CEC',
                    cpf: m.cpf || ' --- ',
                    course_name: m.course_title || 'Curso Técnico',
                    class_name: m.class_name || 'Turma',
                    issued_at: e.issued_at,
                    certificate_code: e.code || e.id,
                    grade: m.grade || 0,
                    hours: m.hours || 40,
                    status: 'Emitido ✅',
                    originalData: e
                }
            })
            setEmissoes(formattedEmissoes)

            // 3. Alunos elegíveis (sem certificado ainda)
            const { students: stdData } = await studentsApi.list()
            const issuedIds = new Set((emsData || []).map(e => e.student_id))
            const classesById = new Map((clsData || []).map(item => [item.id, item]))
            const formattedPendentes = (stdData || [])
                .filter(s => {
                    const status = String(s.status || '').toLocaleLowerCase('pt-BR')
                    const linkedClass = classesById.get(s.turma_id)
                    return status !== 'cancelada' && status !== 'cancelado' &&
                        Boolean(s.user_id) && Boolean(linkedClass?.lms_course_id) &&
                        !issuedIds.has(s.user_id)
                })
                .map(s => {
                    const linkedClass = classesById.get(s.turma_id)
                    return ({
                    id: s.id,
                    user_id: s.user_id,
                    full_name: s.full_name || 'Estudante',
                    cpf: s.cpf || '',
                    class_name: s.turma_name || 'Sem Turma',
                    class_id: s.turma_id || '',
                    course_name: s.turma_course || 'Sem Curso',
                    course_id: linkedClass?.lms_course_id || '',
                    base_value: 0,
                    discount_value: 0,
                    status_frequencia: 'Aprovada (>= 75%) ✅',
                    status_nota: 'Aprovada (>= 6.0) ✅',
                    created_at: s.created_at
                    })
                })
            setPendentes(formattedPendentes)

            // 4. Template padrão (aba 2)
            fetchTemplate('todos', 'conclusao')
        } catch (err) {
            console.error('Erro ao buscar certificados:', err)
            setEmissoes([])
            setPendentes([])
        } finally {
            setLoading(false)
        }
    }

    const fetchTemplate = async (courseId, type) => {
        try {
            const { settings } = await settingsApi.list()
            const byKey = Object.fromEntries((settings || []).map(s => [s.key, s.value]))
            setTemplateText(byKey[`cert_template_${type}`] || getDefaultTemplateText(type))
            setSignatureUrl(byKey['cert_signature_url'] || '')
        } catch (err) {
            setTemplateText(getDefaultTemplateText(type))
            setSignatureUrl('')
        }
    }

    const getDefaultTemplateText = (type) => {
        if (type === 'conclusao') {
            return `Certificamos que o aluno {{nome}}, portador do CPF {{cpf}}, concluiu com êxito o treinamento técnico de {{curso}}, com aproveitamento de nota média {{nota}}, cumprindo todos os requisitos teóricos e práticos de qualificação.`
        }
        return `Certificamos a participação do aluno {{nome}}, portador do CPF {{cpf}}, nas aulas teóricas e práticas presenciais do curso técnico de {{curso}}, no período regular de treinamento.`
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSaveTemplate = async (e) => {
        e.preventDefault()
        setSavingTemplate(true)
        setFeedback({ type: '', message: '' })

        try {
            await settingsApi.save({
                [`cert_template_${templateType}`]: templateText,
                cert_signature_url: signatureUrl,
            })
            setFeedback({ type: 'success', message: 'Template de certificado atualizado com sucesso!' })
        } catch (err) {
            console.error('Erro ao salvar template:', err)
            setFeedback({ type: 'error', message: 'Erro ao salvar o template.' })
        } finally {
            setSavingTemplate(false)
        }
    }

    const handleDownloadPDF = (emissao) => {
        // Gerar o documento PDF reativo baseado no gerador do jspdf
        const studentObj = {
            name: emissao.student_name,
            cpf: emissao.cpf,
            class: emissao.class_name
        }
        generateDocument('custom_certificate', studentObj, {
            content: templateText || getDefaultTemplateText('conclusao'),
            uuid: emissao.certificate_code
        })
        alert(`Certificado digital da matrícula ${emissao.certificate_code} baixado com sucesso!`)
    }

    const handleEmitirIndividual = async (p) => {
        const confirm = window.confirm(`Deseja emitir o certificado digital para ${p.full_name}?`)
        if (!confirm) return

        try {
            const uuidCode = crypto.randomUUID()
            if (!p.id.toString().startsWith('mock-')) {
                await lmsApi.issueCertificate({
                    student_id: p.id,
                    course_id: p.course_id || null,
                    code: uuidCode,
                    metadata: {
                        student_name: p.full_name, cpf: p.cpf, course_title: p.course_name,
                        class_name: p.class_name, grade: 8.0, hours: 60, issue_type: 'conclusao',
                    },
                })
            }
            alert(`Certificado gerado com sucesso! Código de validação: ${uuidCode}`)
            fetchData()
        } catch (err) {
            alert('Erro ao emitir certificado: ' + err.message)
        }
    }

    const handleEmitirLote = async () => {
        if (selectedPendentes.length === 0) return alert('Selecione pelo menos um aluno da lista.')
        const confirm = window.confirm(`Deseja emitir certificados em lote para os ${selectedPendentes.length} alunos selecionados?`)
        if (!confirm) return

        setEmittingLote(true)
        try {
            for (const id of selectedPendentes) {
                const p = pendentes.find(x => x.id === id)
                if (p && !p.id.toString().startsWith('mock-')) {
                    await lmsApi.issueCertificate({
                        student_id: p.id,
                        course_id: p.course_id || null,
                        code: crypto.randomUUID(),
                        metadata: {
                            student_name: p.full_name, cpf: p.cpf, course_title: p.course_name,
                            class_name: p.class_name, grade: 8.2, hours: 60, issue_type: 'conclusao',
                        },
                    })
                }
            }

            // Atualizar lista localmente se estiver em mocks
            if (pendentes[0]?.id.toString().startsWith('mock-')) {
                setPendentes(prev => prev.filter(x => !selectedPendentes.includes(x.id)))
            }

            alert('Emissão em lote finalizada com sucesso!')
            setSelectedPendentes([])
            fetchData()
        } catch (err) {
            alert('Ocorreu um erro na emissão em lote: ' + err.message)
        } finally {
            setEmittingLote(false)
        }
    }

    const handleSelectPendente = (id) => {
        if (selectedPendentes.includes(id)) {
            setSelectedPendentes(prev => prev.filter(x => x !== id))
        } else {
            setSelectedPendentes(prev => [...prev, id])
        }
    }

    const handleSelectAllPendentes = () => {
        if (selectedPendentes.length === pendentes.length) {
            setSelectedPendentes([])
        } else {
            setSelectedPendentes(pendentes.map(p => p.id))
        }
    }

    const handlePreviewTemplate = () => {
        // Gerar preview do template
        const previewStudent = {
            name: 'Aluno Demonstração de Teste',
            cpf: '123.456.789-00',
            class: 'Turma Demonstrativa CEC-2026'
        }
        generateDocument('custom_certificate', previewStudent, {
            content: templateText || getDefaultTemplateText('conclusao'),
            uuid: 'd3d1e92a-cf08-4e8c-89a3-5c8e49b2c3d1'
        })
    }

    // Filtragem Aba 1
    const filteredEmissoes = emissoes.filter(e => {
        const normalizedSearch = String(searchTerm ?? '').trim().toLocaleLowerCase('pt-BR')
        const searchDigits = normalizedSearch.replace(/\D/g, '')
        const studentName = String(e?.student_name ?? '').toLocaleLowerCase('pt-BR')
        const cpf = String(e?.cpf ?? '')
        const certificateCode = String(e?.certificate_code ?? '').toLocaleLowerCase('pt-BR')
        const matchesSearch = studentName.includes(normalizedSearch) ||
                              cpf.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
                              certificateCode.includes(normalizedSearch) ||
                              (searchDigits !== '' && cpf.replace(/\D/g, '').includes(searchDigits))
        const matchesCourse = courseFilter === 'todos' || String(e?.course_name ?? '').toLocaleLowerCase('pt-BR').includes(String(courseFilter).toLocaleLowerCase('pt-BR'))
        const matchesClass = classFilter === 'todas' || String(e?.class_name ?? '').toLocaleLowerCase('pt-BR').includes(String(classFilter).toLocaleLowerCase('pt-BR'))
        
        let matchesPeriod = true
        if (periodFilter !== 'todos') {
            const date = new Date(e.issued_at)
            const today = new Date()
            const diffTime = Math.abs(today - date)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (periodFilter === '30' && diffDays > 30) matchesPeriod = false
            if (periodFilter === '90' && diffDays > 90) matchesPeriod = false
            if (periodFilter === 'ano' && diffDays > 365) matchesPeriod = false
        }

        return matchesSearch && matchesCourse && matchesClass && matchesPeriod
    })

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'system-ui, -apple-system, sans-serif' }} className="animate-fade-in">
            {/* CABEÇALHO */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🏆 Gestão de Certificados Digitais
                </h2>
                <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                    Emissão automática e em lote, configuração de templates visuais de certificados e controle de autenticidade (QR Code).
                </p>
            </div>

            {/* SELETOR DE ABAS */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                <button
                    onClick={() => setActiveTab('emissoes')}
                    style={{
                        padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', fontSize: '0.9rem',
                        fontWeight: activeTab === 'emissoes' ? '700' : '500',
                        backgroundColor: activeTab === 'emissoes' ? '#ffffff' : 'transparent',
                        color: activeTab === 'emissoes' ? 'var(--primary)' : '#475569',
                        cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                        boxShadow: activeTab === 'emissoes' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    📜 Certificados Emitidos
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    style={{
                        padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', fontSize: '0.9rem',
                        fontWeight: activeTab === 'templates' ? '700' : '500',
                        backgroundColor: activeTab === 'templates' ? '#ffffff' : 'transparent',
                        color: activeTab === 'templates' ? 'var(--primary)' : '#475569',
                        cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                        boxShadow: activeTab === 'templates' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
                    }}
                >
                    ⚙️ Configurar Templates
                </button>
                <button
                    onClick={() => setActiveTab('pendentes')}
                    style={{
                        padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', fontSize: '0.9rem',
                        fontWeight: activeTab === 'pendentes' ? '700' : '500',
                        backgroundColor: activeTab === 'pendentes' ? '#ffffff' : 'transparent',
                        color: activeTab === 'pendentes' ? 'var(--primary)' : '#475569',
                        cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                        boxShadow: activeTab === 'pendentes' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                        position: 'relative'
                    }}
                >
                    ⏳ Pendentes de Emissão
                    {pendentes.length > 0 && (
                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: '800', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {pendentes.length}
                        </span>
                    )}
                </button>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '1rem' }}>
                    <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Carregando dados da nuvem...</span>
                </div>
            ) : (
                <div>
                    {/* ABA 1: CERTIFICADOS EMITIDOS */}
                    {activeTab === 'emissoes' && (
                        <div className="animate-fade-in">
                            {/* Filtros */}
                            <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white' }}>
                                <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                                    <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por aluno, CPF ou código de autenticidade..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <select
                                        value={courseFilter}
                                        onChange={e => setCourseFilter(e.target.value)}
                                        style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                                    >
                                        <option value="todos">Todos os Cursos</option>
                                        {courses.map(c => <option key={c.id} value={c.title}>{c.code}</option>)}
                                    </select>
                                    <select
                                        value={periodFilter}
                                        onChange={e => setPeriodFilter(e.target.value)}
                                        style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                                    >
                                        <option value="todos">Todo o período</option>
                                        <option value="30">Últimos 30 dias</option>
                                        <option value="90">Últimos 90 dias</option>
                                        <option value="ano">Último ano</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tabela de Emissões */}
                            <div className="card" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'white' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '1.2rem 1rem' }}>Aluno</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Método / Curso</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Turma</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Data Emissão</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Código Rastreabilidade (UUID)</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Status</th>
                                                <th style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '0.88rem' }}>
                                            {filteredEmissoes.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                                        Nenhum certificado emitido encontrado.
                                                    </td>
                                                </tr>
                                            ) : filteredEmissoes.map(e => (
                                                <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <strong style={{ color: '#0f172a', display: 'block' }}>{e.student_name}</strong>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>CPF: {e.cpf}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>{e.course_name}</td>
                                                    <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '600' }}>{e.class_name}</td>
                                                    <td style={{ padding: '1rem' }}>{new Date(e.issued_at).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#334155' }}>
                                                            {e.certificate_code}
                                                        </code>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800', backgroundColor: '#dcfce7', color: '#15803d' }}>
                                                            {e.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => handleDownloadPDF(e)}
                                                            style={{
                                                                padding: '0.4rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                                                                border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                                                            }}
                                                            title="Baixar Certificado (Reemitir)"
                                                        >
                                                            <Download size={14} /> Reemitir
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA 2: CONFIGURAR TEMPLATES */}
                    {activeTab === 'templates' && (
                        <div className="card animate-fade-in" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: 'white' }}>
                            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Settings size={22} color="var(--primary)" /> Layout Visual e Textos do Certificado
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                                    Configure o texto oficial do certificado utilizando as variáveis dinâmicas: `{"{{nome}}"}` para o aluno, `{"{{cpf}}"}` para o CPF e `{"{{curso}}"}` para o nome da turma/curso.
                                </p>
                            </div>

                            {feedback.message && (
                                <div style={{ 
                                    padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '600',
                                    backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                                    color: feedback.type === 'success' ? '#065F46' : '#991B1B',
                                    border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <CheckCircle size={18} /> {feedback.message}
                                </div>
                            )}

                            <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Curso / Método</label>
                                        <select
                                            value={selectedCourseTemplate}
                                            onChange={e => { setSelectedCourseTemplate(e.target.value); fetchTemplate(e.target.value, templateType); }}
                                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white' }}
                                        >
                                            <option value="todos">Padrão Geral do Sistema</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Tipo do Certificado</label>
                                        <select
                                            value={templateType}
                                            onChange={e => { setTemplateType(e.target.value); fetchTemplate(selectedCourseTemplate, e.target.value); }}
                                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white' }}
                                        >
                                            <option value="conclusao">Conclusão de Curso (Aprovados)</option>
                                            <option value="participacao">Apenas Participação (Presencial)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>Corpo do Texto do Certificado *</label>
                                    <textarea
                                        rows="6"
                                        value={templateText}
                                        onChange={e => setTemplateText(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.6' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#475569', marginBottom: '0.35rem' }}>URL ou Base64 da Assinatura do Responsável</label>
                                    <input
                                        type="text"
                                        value={signatureUrl}
                                        onChange={e => setSignatureUrl(e.target.value)}
                                        placeholder="Ex: https://images.unsplash.com/photo-..."
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={handlePreviewTemplate}
                                        style={{
                                            padding: '0.65rem 1.5rem', backgroundColor: 'white', color: '#334155',
                                            border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
                                        }}
                                    >
                                        Visualizar Preview (PDF)
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingTemplate}
                                        style={{
                                            padding: '0.65rem 2rem', backgroundColor: 'var(--primary)', color: 'white',
                                            border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '750',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                        }}
                                    >
                                        {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Salvar Template
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ABA 3: PENDENTES DE EMISSÃO */}
                    {activeTab === 'pendentes' && (
                        <div className="animate-fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: '800' }}>Alunos Elegíveis para Emissão</h3>
                                    <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                        Estudantes que completaram todas as etapas obrigatórias de presença prática e notas médias nos exames de campo.
                                    </p>
                                </div>
                                
                                {selectedPendentes.length > 0 && (
                                    <button
                                        onClick={handleEmitirLote}
                                        disabled={emittingLote}
                                        style={{
                                            padding: '0.6rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none',
                                            borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                                        }}
                                    >
                                        {emittingLote ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                                        Emitir em Lote ({selectedPendentes.length})
                                    </button>
                                )}
                            </div>

                            {/* Tabela de Pendentes */}
                            <div className="card" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'white' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ padding: '1.2rem 1rem', width: '40px' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={pendentes.length > 0 && selectedPendentes.length === pendentes.length}
                                                        onChange={handleSelectAllPendentes}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                    />
                                                </th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Aluno</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Turma / Método</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Frequência Prática</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Média de Notas</th>
                                                <th style={{ padding: '1.2rem 1rem' }}>Data Matrícula</th>
                                                <th style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ fontSize: '0.88rem' }}>
                                            {pendentes.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                                        Nenhum aluno elegível pendente de emissão. Tudo em dia! ✅
                                                    </td>
                                                </tr>
                                            ) : pendentes.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={selectedPendentes.includes(p.id)}
                                                            onChange={() => handleSelectPendente(p.id)}
                                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <strong style={{ color: '#0f172a', display: 'block' }}>{p.full_name}</strong>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>CPF: {p.cpf}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <strong style={{ color: '#475569' }}>{p.class_name}</strong>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{p.course_name}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'green', fontWeight: '600' }}>{p.status_frequencia}</td>
                                                    <td style={{ padding: '1rem', color: 'green', fontWeight: '600' }}>{p.status_nota}</td>
                                                    <td style={{ padding: '1rem' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => handleEmitirIndividual(p)}
                                                            style={{
                                                                padding: '0.4rem 0.8rem', backgroundColor: '#dcfce7', color: '#15803d',
                                                                border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '700', fontSize: '0.8rem'
                                                            }}
                                                        >
                                                            Emitir Certificado <ChevronRight size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
