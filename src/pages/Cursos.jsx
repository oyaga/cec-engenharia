import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Plus, Search, Edit2, Loader2, Save, X, DollarSign, Clock, Award, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { coursesApi } from '../services/academic'

const formatCurrencyBRL = (value) => {
    if (value === null || value === undefined || value === '') return '';
    let num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const parseCurrencyBRL = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value.indexOf(',') === -1 && value.indexOf('.') !== -1) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) return parsed;
    }
    const cleanStr = value.replace(/[^\d,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
}

const maskCurrencyBRL = (value) => {
    if (!value) return '';
    if (typeof value === 'number') return formatCurrencyBRL(value);
    let onlyDigits = value.replace(/\D/g, '');
    if (!onlyDigits) return '';
    let num = parseFloat(onlyDigits) / 100;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Cursos() {
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('todos')
    
    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [selectedCourse, setSelectedCourse] = useState(null)
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    
    // Form state
    const [form, setForm] = useState({
        title: '',
        code: '',
        description: '',
        min_theoretical_hours: 40,
        practical_hours: 20,
        min_attendance: 75,
        min_grade: 6.0,
        default_value: '',
        max_instructors: 8,
        is_published: false,
        thumbnail_url: '',
        price_card: '',
        price_pix: '',
        price_boleto: '',
        price_financing: '',
        max_installments: 10,
        financing_installments: 6,
        price_notes: '',
        asaas_product_id: '',
        // Retreinamento (Ex-Alunos)
        retrain_teorico_days: 1,
        retrain_teorico_price_day: '',
        retrain_pratico_days: 1,
        retrain_pratico_price_day: ''
    })

    const [pixDiscountPercent, setPixDiscountPercent] = useState(15)

    const fetchCourses = async () => {
        setLoading(true)
        try {
            const { courses: data } = await coursesApi.list()

            // Campos ausentes ficam como estão: inventar preço/código aqui fazia o
            // valor fictício ser gravado no banco ao abrir e salvar o curso.
            const mapped = (data || []).map(c => ({
                id: c.id,
                title: c.title || '',
                code: c.code || '',
                description: c.description || '',
                min_theoretical_hours: c.min_theoretical_hours || c.theoretical_hours || 40,
                practical_hours: c.practical_hours || 20,
                min_attendance: c.min_attendance || 75,
                min_grade: c.min_grade || 6.0,
                default_value: c.default_value ?? null,
                max_instructors: c.max_instructors || 8,
                is_published: !!c.is_published,
                thumbnail_url: c.thumbnail_url || '',
                created_at: c.created_at,
                price_card: c.price_card || null,
                price_pix: c.price_pix || null,
                price_boleto: c.price_boleto || null,
                price_financing: c.price_financing || null,
                max_installments: c.max_installments || 10,
                financing_installments: c.financing_installments || 6,
                price_notes: c.price_notes || '',
                asaas_product_id: c.asaas_product_id || '',
                retrain_teorico_days: c.retrain_teorico_days || 1,
                retrain_teorico_price_day: c.retrain_teorico_price_day || null,
                retrain_pratico_days: c.retrain_pratico_days || 1,
                retrain_pratico_price_day: c.retrain_pratico_price_day || null
            }))
            
            setCourses(mapped)
        } catch (err) {
            console.error('Erro ao buscar cursos reais:', err)
            setCourses([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCourses()
    }, [])

    const handleOpenCreate = () => {
        setSelectedCourse(null)
        setForm({
            title: '',
            code: '',
            description: '',
            min_theoretical_hours: 40,
            practical_hours: 20,
            min_attendance: 75,
            min_grade: 6.0,
            default_value: '',
            max_instructors: 8,
            is_published: false,
            thumbnail_url: '',
            price_card: '',
            price_pix: '',
            price_boleto: '',
            price_financing: '',
            max_installments: 10,
            financing_installments: 6,
            price_notes: '',
            asaas_product_id: '',
            retrain_teorico_days: 1,
            retrain_teorico_price_day: '',
            retrain_pratico_days: 1,
            retrain_pratico_price_day: ''
        })
        setPixDiscountPercent(15)
        setErrorMsg('')
        setShowModal(true)
    }

    const handleOpenEdit = (course) => {
        setSelectedCourse(course)
        setForm({
            title: course.title,
            code: course.code,
            description: course.description,
            min_theoretical_hours: course.min_theoretical_hours,
            practical_hours: course.practical_hours,
            min_attendance: course.min_attendance,
            min_grade: course.min_grade,
            default_value: course.default_value ? formatCurrencyBRL(course.default_value) : '',
            max_instructors: course.max_instructors,
            is_published: course.is_published,
            thumbnail_url: course.thumbnail_url,
            price_card: course.price_card ? formatCurrencyBRL(course.price_card) : '',
            price_pix: course.price_pix ? formatCurrencyBRL(course.price_pix) : '',
            price_boleto: course.price_boleto ? formatCurrencyBRL(course.price_boleto) : '',
            price_financing: course.price_financing ? formatCurrencyBRL(course.price_financing) : '',
            max_installments: course.max_installments || 10,
            financing_installments: course.financing_installments || 6,
            price_notes: course.price_notes || '',
            asaas_product_id: course.asaas_product_id || '',
            retrain_teorico_days: course.retrain_teorico_days || 1,
            retrain_teorico_price_day: course.retrain_teorico_price_day ? formatCurrencyBRL(course.retrain_teorico_price_day) : '',
            retrain_pratico_days: course.retrain_pratico_days || 1,
            retrain_pratico_price_day: course.retrain_pratico_price_day ? formatCurrencyBRL(course.retrain_pratico_price_day) : ''
        })
        
        const cardNum = parseCurrencyBRL(course.price_card)
        const pixNum = parseCurrencyBRL(course.price_pix)
        if (cardNum && pixNum) {
            setPixDiscountPercent(Math.round((1 - pixNum / cardNum) * 100))
        } else {
            setPixDiscountPercent(15)
        }
        setErrorMsg('')
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.title || !form.code) {
            setErrorMsg('Nome do curso e Código são obrigatórios.')
            return
        }

        setSaving(true)
        setErrorMsg('')

        // Faz o parse das strings com máscara para salvar valores reais no Supabase
        const cardVal = parseCurrencyBRL(form.price_card)
        const pixVal = parseCurrencyBRL(form.price_pix)
        const boletoVal = parseCurrencyBRL(form.price_boleto)
        const financingVal = parseCurrencyBRL(form.price_financing)

        // Calcula o default_value automaticamente baseando-se nos preços detalhados.
        // Sem nenhum preço informado o curso fica sem valor (null) — gravar 0.0
        // faria um curso "sob consulta" virar um curso gratuito.
        const calculatedDefaultValue = pixVal ||
                                     cardVal ||
                                     boletoVal ||
                                     financingVal ||
                                     parseCurrencyBRL(form.default_value) ||
                                     null

        try {
            const payload = {
                title: form.title,
                description: form.description,
                min_theoretical_hours: parseInt(form.min_theoretical_hours) || 40,
                thumbnail_url: form.thumbnail_url,
                code: form.code,
                practical_hours: parseFloat(form.practical_hours) || 0,
                min_attendance: parseFloat(form.min_attendance) || 75,
                min_grade: parseFloat(form.min_grade) || 6.0,
                default_value: calculatedDefaultValue,
                max_instructors: parseInt(form.max_instructors) || 8,
                is_published: form.is_published,
                price_card: cardVal || null,
                price_pix: pixVal || null,
                price_boleto: boletoVal || null,
                price_financing: financingVal || null,
                max_installments: parseInt(form.max_installments) || 10,
                financing_installments: parseInt(form.financing_installments) || 6,
                price_notes: form.price_notes || null,
                asaas_product_id: form.asaas_product_id || null,
                retrain_teorico_days: parseInt(form.retrain_teorico_days) || 1,
                retrain_teorico_price_day: parseCurrencyBRL(form.retrain_teorico_price_day) || null,
                retrain_pratico_days: parseInt(form.retrain_pratico_days) || 1,
                retrain_pratico_price_day: parseCurrencyBRL(form.retrain_pratico_price_day) || null
            }

            if (selectedCourse && !selectedCourse.id.toString().startsWith('mock-')) {
                await coursesApi.update(selectedCourse.id, payload)
            } else {
                await coursesApi.create(payload)
            }

            fetchCourses()
            setShowModal(false)
        } catch (err) {
            console.error('Erro ao salvar curso:', err)
            setErrorMsg(err.message || 'Ocorreu um erro ao salvar o curso.')
        } finally {
            setSaving(false)
        }
    }

    const filtered = courses.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.description.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'todos' ||
                              (statusFilter === 'publicados' ? c.is_published : !c.is_published)
        return matchesSearch && matchesStatus
    })

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem', fontFamily: 'system-ui, -apple-system, sans-serif' }} className="animate-fade-in">
            {/* CABEÇALHO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📚 Gestão de Cursos e Métodos
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                        Configure a grade técnica dos cursos do CEC, ementas, cargas horárias e regras de aprovação.
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
                    onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}
                >
                    <Plus size={18} /> Novo Curso
                </button>
            </div>

            {/* FILTROS E BUSCA */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'white' }}>
                <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                    <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome do curso, código ou ementa..."
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
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Status:</span>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{
                            padding: '0.75rem 2rem 0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="todos">Todos os Cursos</option>
                        <option value="publicados">Apenas Publicados</option>
                        <option value="nao_publicados">Apenas Não Publicados</option>
                    </select>
                </div>
            </div>

            {/* LISTAGEM DE CURSOS */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '1rem' }}>
                    <Loader2 size={36} className="animate-spin" color="var(--primary)" />
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Carregando catálogo de cursos...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '16px', backgroundColor: 'white' }}>
                    <BookOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                    <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#334155' }}>Nenhum curso encontrado</h4>
                    <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Tente alterar os termos da sua pesquisa ou crie um novo curso.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {filtered.map(course => {
                        // "Publicado" é o que o site público, a vitrine do aluno e o
                        // vínculo de turma realmente enxergam (is_published).
                        const isAtivo = course.is_published;
                        return (
                            <div 
                                key={course.id}
                                className="card"
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s',
                                    opacity: isAtivo ? 1 : 0.8
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {/* Imagem de Capa do Curso */}
                                <div style={{ height: '150px', background: 'linear-gradient(135deg, #171E36 0%, #2AB0A5 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {course.thumbnail_url ? (
                                        <img src={course.thumbnail_url} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <BookOpen size={52} color="white" style={{ opacity: 0.35 }} />
                                    )}
                                    
                                    <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', backgroundColor: course.code ? 'var(--primary)' : '#94a3b8', color: 'white', padding: '3px 8px', borderRadius: '4px' }}>
                                            {course.code || 'SEM CÓDIGO'}
                                        </span>
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            fontWeight: '800', 
                                            backgroundColor: isAtivo ? '#dcfce7' : '#fee2e2', 
                                            color: isAtivo ? '#15803d' : '#ef4444', 
                                            padding: '3px 8px', 
                                            borderRadius: '4px' 
                                        }}>
                                            {isAtivo ? 'PUBLICADO' : 'NÃO PUBLICADO'}
                                        </span>
                                    </div>
                                </div>

                                {/* Conteúdo */}
                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: '750', color: '#0f172a', lineHeight: '1.4' }}>
                                        {course.title}
                                    </h4>
                                    
                                    <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5', flex: 1 }}>
                                        {course.description || 'Nenhuma descrição técnica informada.'}
                                    </p>

                                    {/* Ficha técnica em Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#475569', fontWeight: '500' }}>
                                            <Clock size={14} color="var(--primary)" /> Teórica: <strong>{course.min_theoretical_hours}h</strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#475569', fontWeight: '500' }}>
                                            <Clock size={14} color="#f59e0b" /> Prática: <strong>{course.practical_hours}h</strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#475569', fontWeight: '500' }}>
                                            <FileText size={14} color="#10b981" /> Presença: <strong>{course.min_attendance}%</strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#475569', fontWeight: '500' }}>
                                            <Award size={14} color="#7c3aed" /> Média: <strong>{course.min_grade}</strong>
                                        </div>
                                    </div>

                                    {/* Preço e Botão de Ação */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                                        <div>
                                            {course.price_pix ? (
                                                <>
                                                    <span style={{ fontSize: '0.65rem', color: '#15803d', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>⚡ PIX / À Vista</span>
                                                    <strong style={{ fontSize: '1.15rem', color: '#15803d', fontWeight: '800' }}>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.price_pix)}
                                                    </strong>
                                                    {course.price_card && course.max_installments && (
                                                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>
                                                            ou {course.max_installments}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.price_card / course.max_installments)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Valor Padrão</span>
                                                    <strong style={{ fontSize: '1.15rem', color: course.default_value ? 'var(--primary-dark)' : '#94a3b8', fontWeight: '800' }}>
                                                        {course.default_value
                                                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.default_value)
                                                            : 'Sob consulta'}
                                                    </strong>
                                                </>
                                            )}
                                        </div>
                                        
                                        <button
                                            onClick={() => handleOpenEdit(course)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                backgroundColor: '#f1f5f9',
                                                color: '#334155',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontWeight: '700',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => {
                                                e.currentTarget.style.backgroundColor = 'var(--primary-light)'
                                                e.currentTarget.style.color = 'var(--primary)'
                                            }}
                                            onMouseOut={e => {
                                                e.currentTarget.style.backgroundColor = '#f1f5f9'
                                                e.currentTarget.style.color = '#334155'
                                            }}
                                        >
                                            <Edit2 size={12} /> Editar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* MODAL DE CADASTRO / EDIÇÃO — via Portal no body p/ cobrir a tela toda */}
            {showModal && createPortal((
                <div style={{
                    position: 'fixed', inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column'
                    }} className="animate-scale-up">
                        
                        {/* HEADER MODAL */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 3, borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BookOpen size={20} color="var(--primary)" /> {selectedCourse ? 'Editar Curso' : 'Novo Curso Técnico'}
                            </h3>
                            <button 
                                onClick={() => setShowModal(false)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* CORPO DO FORMULÁRIO */}
                        <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {errorMsg && (
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991B1B', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={16} /> {errorMsg}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Nome Completo do Curso *</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Líquido Penetrante Técnico (LP)"
                                        value={form.title}
                                        onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Código *</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: CD-CL"
                                        value={form.code}
                                        onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Descrição / Ementa *</label>
                                <textarea 
                                    rows="3"
                                    placeholder="Detalhe a grade curricular e o escopo da ementa..."
                                    value={form.description}
                                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Carga Horária Teórica (h) *</label>
                                    <input 
                                        type="number" 
                                        value={form.min_theoretical_hours}
                                        onChange={e => setForm(prev => ({ ...prev, min_theoretical_hours: parseInt(e.target.value) || 0 }))}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Carga Horária Prática (h) *</label>
                                    <input 
                                        type="number" 
                                        value={form.practical_hours}
                                        onChange={e => setForm(prev => ({ ...prev, practical_hours: parseInt(e.target.value) || 0 }))}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Frequência Prática Mínima (%) *</label>
                                    <input 
                                        type="number" 
                                        value={form.min_attendance}
                                        onChange={e => setForm(prev => ({ ...prev, min_attendance: parseFloat(e.target.value) || 0 }))}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Média de Aprovação *</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value={form.min_grade}
                                        onChange={e => setForm(prev => ({ ...prev, min_grade: parseFloat(e.target.value) || 0 }))}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Max de Instrutores Habilitados</label>
                                    <input 
                                        type="number" 
                                        value={form.max_instructors}
                                        onChange={e => setForm(prev => ({ ...prev, max_instructors: parseInt(e.target.value) || 8 }))}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Publicação *</label>
                                    <select
                                        value={form.is_published ? 'sim' : 'nao'}
                                        onChange={e => setForm(prev => ({ ...prev, is_published: e.target.value === 'sim' }))}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem', backgroundColor: 'white' }}
                                    >
                                        <option value="nao">Não publicado</option>
                                        <option value="sim">Publicado (visível no site e para alunos)</option>
                                    </select>
                                </div>
                            </div>

                            {/* ═══ SEÇÃO DE PREÇOS E PAGAMENTOS ═══ */}
                            <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #d1fae5', paddingBottom: '0.75rem' }}>
                                    <DollarSign size={18} color="var(--primary)" /> Preços e Condições de Pagamento
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>💳 Cartão de Crédito (R$)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8', fontWeight: '600' }}>R$</span>
                                            <input 
                                                type="text" placeholder="R$ 0,00"
                                                value={form.price_card}
                                                onChange={e => {
                                                    const maskedVal = maskCurrencyBRL(e.target.value)
                                                    const numVal = parseCurrencyBRL(maskedVal)
                                                    const newPix = numVal && pixDiscountPercent ? formatCurrencyBRL(numVal * (1 - pixDiscountPercent / 100)) : form.price_pix
                                                    setForm(prev => ({ ...prev, price_card: maskedVal, price_pix: newPix }))
                                                }}
                                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                            />
                                        </div>
                                        {parseCurrencyBRL(form.price_card) > 0 && parseInt(form.max_installments) > 0 && (
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                                Simulação: até {form.max_installments}x de {formatCurrencyBRL(parseCurrencyBRL(form.price_card) / (parseInt(form.max_installments) || 10))}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Parcelas Cartão (máx)</label>
                                        <input 
                                            type="number" min="1" max="12"
                                            value={form.max_installments}
                                            onChange={e => setForm(prev => ({ ...prev, max_installments: parseInt(e.target.value) || 10 }))}
                                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '700', fontSize: '0.82rem', color: '#15803d', marginBottom: '0.35rem' }}>⚡ PIX / À Vista (R$)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8', fontWeight: '600' }}>R$</span>
                                            <input 
                                                type="text" placeholder="R$ 0,00"
                                                value={form.price_pix}
                                                onChange={e => {
                                                    const maskedVal = maskCurrencyBRL(e.target.value)
                                                    const pixNum = parseCurrencyBRL(maskedVal)
                                                    const cardNum = parseCurrencyBRL(form.price_card)
                                                    if (cardNum && pixNum) {
                                                        setPixDiscountPercent(Math.round((1 - pixNum / cardNum) * 100))
                                                    }
                                                    setForm(prev => ({ ...prev, price_pix: maskedVal }))
                                                }}
                                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', borderRadius: '8px', border: '1px solid #86efac', outline: 'none', fontSize: '0.875rem', backgroundColor: '#f0fdf4' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>% Desconto PIX (auto-cálculo)</label>
                                        <input 
                                            type="number" step="1" min="0" max="50"
                                            value={pixDiscountPercent}
                                            onChange={e => {
                                                const pct = parseInt(e.target.value) || 0
                                                setPixDiscountPercent(pct)
                                                const cardNum = parseCurrencyBRL(form.price_card)
                                                if (cardNum) {
                                                    setForm(prev => ({ ...prev, price_pix: formatCurrencyBRL(cardNum * (1 - pct / 100)) }))
                                                }
                                            }}
                                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                        />
                                        {parseCurrencyBRL(form.price_card) > 0 && parseCurrencyBRL(form.price_pix) > 0 && (parseCurrencyBRL(form.price_card) - parseCurrencyBRL(form.price_pix)) > 0 && (
                                            <span style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                                                Economia de {formatCurrencyBRL(parseCurrencyBRL(form.price_card) - parseCurrencyBRL(form.price_pix))} para o aluno
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>📄 Boleto Bancário (R$)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8', fontWeight: '600' }}>R$</span>
                                        <input 
                                            type="text" placeholder="R$ 0,00"
                                            value={form.price_boleto}
                                            onChange={e => setForm(prev => ({ ...prev, price_boleto: maskCurrencyBRL(e.target.value) }))}
                                            style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>🤝 Financiamento C&C (R$)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8', fontWeight: '600' }}>R$</span>
                                            <input 
                                                type="text" placeholder="R$ 0,00"
                                                value={form.price_financing}
                                                onChange={e => setForm(prev => ({ ...prev, price_financing: maskCurrencyBRL(e.target.value) }))}
                                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                            />
                                        </div>
                                        {parseCurrencyBRL(form.price_financing) > 0 && parseInt(form.financing_installments) > 0 && (
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                                Simulação: até {form.financing_installments}x de {formatCurrencyBRL(parseCurrencyBRL(form.price_financing) / (parseInt(form.financing_installments) || 6))} sem juros
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>Parcelas Financiamento</label>
                                        <input 
                                            type="number" min="1" max="24"
                                            value={form.financing_installments}
                                            onChange={e => setForm(prev => ({ ...prev, financing_installments: parseInt(e.target.value) || 6 }))}
                                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: '600', fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>📝 Observações sobre preço</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Inclui material didático e taxa de certificação"
                                        value={form.price_notes}
                                        onChange={e => setForm(prev => ({ ...prev, price_notes: e.target.value }))}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                </div>


                            </div>

                            {/* ═══ SEÇÃO RETREINAMENTO (EX-ALUNOS) ═══ */}
                            <div style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #faf5ff 100%)', border: '1.5px solid #e9d5ff', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #ddd6fe', paddingBottom: '0.75rem' }}>
                                    🔁 Retreinamento — Preços para Ex-Alunos
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#7c3aed', fontWeight: '500', backgroundColor: '#f5f3ff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #ede9fe' }}>
                                    💡 Ex-alunos que precisam renovar certificação pagam por dia cursado. Defina abaixo a duração e o valor diário para cada modalidade.
                                </p>

                                {/* RETREINAMENTO TEÓRICO */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#5b21b6', marginBottom: '0.5rem' }}>📖 Retreinamento Teórico</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.78rem', color: '#475569', marginBottom: '0.35rem' }}>Duração (dias)</label>
                                            <input
                                                type="number" min="1" max="30"
                                                value={form.retrain_teorico_days}
                                                onChange={e => setForm(prev => ({ ...prev, retrain_teorico_days: parseInt(e.target.value) || 1 }))}
                                                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd6fe', outline: 'none', fontSize: '0.875rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.78rem', color: '#475569', marginBottom: '0.35rem' }}>Valor por dia (R$)</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8', fontWeight: '600' }}>R$</span>
                                                <input
                                                    type="text" placeholder="R$ 0,00"
                                                    value={form.retrain_teorico_price_day}
                                                    onChange={e => setForm(prev => ({ ...prev, retrain_teorico_price_day: maskCurrencyBRL(e.target.value) }))}
                                                    style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', borderRadius: '8px', border: '1px solid #ddd6fe', outline: 'none', fontSize: '0.875rem', backgroundColor: '#faf5ff' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {parseCurrencyBRL(form.retrain_teorico_price_day) > 0 && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: '#ede9fe', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: '600' }}>
                                                {form.retrain_teorico_days} dia{form.retrain_teorico_days > 1 ? 's' : ''} × {form.retrain_teorico_price_day}/dia
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: '#4c1d95', fontWeight: '800' }}>
                                                Total: {formatCurrencyBRL(parseCurrencyBRL(form.retrain_teorico_price_day) * (parseInt(form.retrain_teorico_days) || 1))}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* RETREINAMENTO PRÁTICO */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: '#5b21b6', marginBottom: '0.5rem' }}>🔧 Retreinamento Prático</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.78rem', color: '#475569', marginBottom: '0.35rem' }}>Duração (dias)</label>
                                            <input
                                                type="number" min="1" max="30"
                                                value={form.retrain_pratico_days}
                                                onChange={e => setForm(prev => ({ ...prev, retrain_pratico_days: parseInt(e.target.value) || 1 }))}
                                                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd6fe', outline: 'none', fontSize: '0.875rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.78rem', color: '#475569', marginBottom: '0.35rem' }}>Valor por dia (R$)</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8', fontWeight: '600' }}>R$</span>
                                                <input
                                                    type="text" placeholder="R$ 0,00"
                                                    value={form.retrain_pratico_price_day}
                                                    onChange={e => setForm(prev => ({ ...prev, retrain_pratico_price_day: maskCurrencyBRL(e.target.value) }))}
                                                    style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', borderRadius: '8px', border: '1px solid #ddd6fe', outline: 'none', fontSize: '0.875rem', backgroundColor: '#faf5ff' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {parseCurrencyBRL(form.retrain_pratico_price_day) > 0 && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', backgroundColor: '#ede9fe', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: '600' }}>
                                                {form.retrain_pratico_days} dia{form.retrain_pratico_days > 1 ? 's' : ''} × {form.retrain_pratico_price_day}/dia
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: '#4c1d95', fontWeight: '800' }}>
                                                Total: {formatCurrencyBRL(parseCurrencyBRL(form.retrain_pratico_price_day) * (parseInt(form.retrain_pratico_days) || 1))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BOTOES MODAL */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', paddingBottom: '0.25rem', position: 'sticky', bottom: '-1.5rem', background: 'white', marginTop: '1rem', marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', boxShadow: '0 -6px 12px -6px rgba(0,0,0,0.08)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
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
                                    {selectedCourse ? 'Salvar Alterações' : 'Cadastrar Curso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}
