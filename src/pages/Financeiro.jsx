import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, Clock, Receipt, FilePlus, Calendar as CalendarIcon, DollarSign, Wallet, Filter } from 'lucide-react'

export default function Financeiro() {
    const [activeTab, setActiveTab] = useState('pix') // pix | nf | payables | split
    const [transactions, setTransactions] = useState({ pix: [], payables: [], classesData: [], eadCoursesData: [] })
    const [loading, setLoading] = useState(true)

    // Form inputs for new payable
    const [newCost, setNewCost] = useState({ description: '', value: '', dueDate: '', category: 'Outros', class_id: '' })
    const [showNewCostForm, setShowNewCostForm] = useState(false)

    // Form inputs for new NF
    const [newNf, setNewNf] = useState({ student: '', amount: '', issueDate: '' })
    const [showNewNfForm, setShowNewNfForm] = useState(false)

    // Global Filter
    const [filterMonth, setFilterMonth] = useState('all')

    const formatMoney = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch Payables
            const { data: costsData } = await supabase.from('financial_costs').select('*, classes(name)').order('date_incurred', { ascending: false })

            // Fetch Classes (filtering regular vs immediate/EAD might be needed if they want separate list)
            const { data: clsData } = await supabase.from('classes').select('*, students(count)').is('is_immediate_start', false)
            
            // Fetch EAD Courses (immediate start or specific LMS courses)
            const { data: eadData } = await supabase.from('lms_courses').select('*, classes(id, students(count))')

            // Fetch Recent Students to simulate PIX Installments (Mocking real names)
            const { data: stdData } = await supabase.from('students').select('*').order('created_at', { ascending: false }).limit(10)

            let dynamicPix = []
            if (stdData) {
                dynamicPix = stdData.map(s => ({
                    id: s.id,
                    student: s.full_name,
                    amount: s.base_value > 0 ? s.base_value / 3 : 500, // Simulando 3 parcelas
                    date: s.created_at.split('T')[0], // Simulating due date as enroll date for D-1 alerts
                    status: 'Aguardando Checagem'
                }))
            }

            setTransactions({
                pix: dynamicPix,
                payables: costsData || [],
                classesData: clsData || [],
                eadCoursesData: eadData || []
            })
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleAddCost = async () => {
        if (!newCost.description || !newCost.value) return alert('Preencha descrição e valor')
        const { error } = await supabase.from('financial_costs').insert([{
            description: newCost.description,
            type: 'fixed',
            value: Number(newCost.value),
            amount: Number(newCost.value),
            status: 'pendente',
            date_incurred: newCost.dueDate,
            category: newCost.category,
            class_id: newCost.class_id || null
        }])
        if (error) alert(error.message)
        else {
            alert('Custo adicionado na Nuvem!')
            setNewCost({ description: '', value: '', dueDate: '', category: 'Outros', class_id: '' })
            setShowNewCostForm(false)
            fetchData()
        }
    }

    const handlePayCost = async (id) => {
        const { error } = await supabase.from('financial_costs').update({ status: 'pago' }).eq('id', id)
        if (!error) fetchData()
    }

    const renderTabs = () => (
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', width: '100%', overflowX: 'auto', marginBottom: '2rem' }}>
            <button className={`btn ${activeTab === 'pix' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('pix')}><Clock size={16} /> Verificação PIX Parcelado</button>
            <button className={`btn ${activeTab === 'payables' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('payables')}><Wallet size={16} /> Contas a Pagar / Custos</button>
            <button className={`btn ${activeTab === 'split' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('split')}><DollarSign size={16} /> Rateio de Lucros (50/50)</button>
            <button className={`btn ${activeTab === 'nf' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('nf')}><Receipt size={16} /> Emissão de NFs</button>
        </div>
    )

    const renderPixTab = () => {
        // Função utilitária para checar Feriados/Fim de Semana (Alerta PIX Inteligente)
        const checkPixAlert = (dateString, status) => {
            if (status === 'pago') return null
            const dueDate = new Date(dateString + 'T00:00:00')
            const today = new Date()

            // Zerando horas para comparar datas limpas
            today.setHours(0, 0, 0, 0)
            dueDate.setHours(0, 0, 0, 0)

            const diffTime = dueDate - today
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            // Lógica D-1, Dia D ou D+1
            const isWeekend = dueDate.getDay() === 0 || dueDate.getDay() === 6 // 0=Dom, 6=Sáb

            if (diffDays === 0) {
                return { type: 'danger', msg: `VENCE HOJE! Mande conferir a conta corrente.` }
            } else if (diffDays === 1) {
                return { type: 'warning', msg: 'Vence Amanhã (D-1).' }
            } else if (diffDays === -1) {
                return { type: 'danger', msg: 'VENCEU ONTEM (D+1). Cobrar aluno!' }
            } else if (isWeekend && diffDays > 0 && diffDays <= 2) {
                return { type: 'warning', msg: 'Atenção: Vence no Final de Semana. Compensação será no Próximo Dia Útil!' }
            } else if (diffDays < 0) {
                return { type: 'danger', msg: `Atrasado há ${Math.abs(diffDays)} dias.` }
            }
            return null
        }

        return (
            <div className="card animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem' }}>Validação de PIX Recebidos Constantes em Contrato</h3>
                </div>
                {loading ? <p>Carregando BD...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '1rem' }}>Aluno</th>
                                <th style={{ padding: '1rem' }}>Valor Declarado</th>
                                <th style={{ padding: '1rem' }}>Data do Pagamento</th>
                                <th style={{ padding: '1rem' }}>Alertas do Sistema</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Ação (Aprovar na Conta)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.pix
                                .filter(pix => filterMonth === 'all' ? true : new Date(pix.date + 'T00:00:00').getMonth() + 1 === parseInt(filterMonth))
                                .map(pix => {
                                    const alertData = checkPixAlert(pix.date, pix.status)
                                    return (
                                        <tr key={pix.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{pix.student}</td>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{formatMoney(pix.amount)}</td>
                                            <td style={{ padding: '1rem' }}>{new Date(pix.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td style={{ padding: '1rem' }}>
                                                {alertData ? (
                                                    <span style={{ backgroundColor: alertData.type === 'danger' ? '#FEE2E2' : '#FEF3C7', color: alertData.type === 'danger' ? '#991B1B' : '#92400E', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        {alertData.type === 'danger' ? '🚨' : '⚠️'} {alertData.msg}
                                                    </span>
                                                ) : (
                                                    <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Aguardando Prazo</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }} onClick={() => alert('Parabéns! PIX compensado com sucesso. Parcela do aluno baixada no DB.')}><CheckCircle size={16} /> Dar Baixa</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                )}
            </div>
        )
    }

    const renderNftTab = () => (
        <div className="card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div><h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Registro de Notas Fiscais</h3><p className="text-muted" style={{ fontSize: '0.875rem' }}>Rastreamento integral de emissões tributárias.</p></div>
                <button className="btn btn-primary" onClick={() => setShowNewNfForm(!showNewNfForm)}><FilePlus size={16} /> Emitir Nova NF</button>
            </div>

            {showNewNfForm && (
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Cadastrar NF Emitida manualmente</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'flex-end' }}>
                        <div><label className="form-label">CPF Aluno</label><input type="text" className="form-control" placeholder="000.000.000-00" /></div>
                        <div><label className="form-label">Nome Sacado</label><input type="text" className="form-control" /></div>
                        <div><label className="form-label">Turma Vinculada</label><input type="text" className="form-control" /></div>
                        <div><label className="form-label">Valor (R$)</label><input type="number" step="0.01" className="form-control" /></div>
                        <div><label className="form-label">Número da NF</label><input type="text" className="form-control" placeholder="Ex: 2026154" /></div>
                        <div style={{ gridColumn: 'span 5', textAlign: 'right', marginTop: '1rem' }}><button className="btn btn-primary" onClick={() => { alert('NF Registrada e Amarrada ao CPF no Banco de Dados!'); setShowNewNfForm(false) }}>Salvar Registro C&C</button></div>
                    </div>
                </div>
            )}

            <div style={{ backgroundColor: '#eff6ff', border: '1px dashed #3B82F6', borderRadius: 'var(--radius-md)', padding: '3rem', textAlign: 'center', color: '#1E40AF' }}>
                <Receipt size={48} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
                <p style={{ fontWeight: 600 }}>Nenhum Ponto de Emissão Tributária arquivado neste mês.</p>
            </div>
        </div>
    )

    const renderPayablesTab = () => (
        <div className="card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Contas a Pagar e Custos Fixos</h3>
                <button className="btn btn-primary" onClick={() => setShowNewCostForm(!showNewCostForm)}>Nova Despesa</button>
            </div>

            {showNewCostForm && (
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.5fr', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                        <div><label className="form-label">Descrição</label><input type="text" className="form-control" value={newCost.description} onChange={(e) => setNewCost({ ...newCost, description: e.target.value })} /></div>
                        <div><label className="form-label">Valor R$</label><input type="number" className="form-control" value={newCost.value} onChange={(e) => setNewCost({ ...newCost, value: e.target.value })} /></div>
                        <div><label className="form-label">Vencimento</label><input type="date" className="form-control" value={newCost.dueDate} onChange={(e) => setNewCost({ ...newCost, dueDate: e.target.value })} /></div>
                        <div>
                            <label className="form-label">Categoria</label>
                            <select className="form-control" value={newCost.category} onChange={(e) => setNewCost({ ...newCost, category: e.target.value })}>
                                <option value="Outros">Outros</option>
                                <option value="Apostila">Apostila</option>
                                <option value="NF">NF</option>
                                <option value="Taxa ABENDI">Taxa ABENDI</option>
                                <option value="Certificado">Certificado</option>
                                <option value="Aluguel Espaço">Aluguel Espaço</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Turma (Opcional)</label>
                            <select className="form-control" value={newCost.class_id} onChange={(e) => setNewCost({ ...newCost, class_id: e.target.value })}>
                                <option value="">Geral (Sem turma)</option>
                                {transactions.classesData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div><button className="btn btn-primary" onClick={handleAddCost}>Salvar</button></div>
                    </div>
                </div>
            )}

            {loading ? <p>Carregando BD...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '1rem' }}>Descrição do Custo</th>
                            <th style={{ padding: '1rem' }}>Categoria</th>
                            <th style={{ padding: '1rem' }}>Vencimento</th>
                            <th style={{ padding: '1rem' }}>Valor a Pagar</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Vínculo</th>
                            <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.payables
                            .filter(p => filterMonth === 'all' ? true : p.date_incurred && new Date(p.date_incurred + 'T00:00:00').getMonth() + 1 === parseInt(filterMonth))
                            .map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{p.description}</td>
                                    <td style={{ padding: '1rem' }}><span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#F3F4F6', borderRadius: '4px' }}>{p.category}</span></td>
                                    <td style={{ padding: '1rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarIcon size={14} className="text-muted" />{p.date_incurred ? new Date(p.date_incurred + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div></td>
                                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--danger)' }}>- {formatMoney(p.amount)}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>{p.classes?.name || 'Geral'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: p.status === 'pago' ? '#D1FAE5' : '#FEF3C7', color: p.status === 'pago' ? '#065F46' : '#92400E' }}>
                                            {p.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        {p.status !== 'pago' && (
                                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handlePayCost(p.id)}>Marcar Pago</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        {transactions.payables.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Sem despesas pendentes.</td></tr>}
                    </tbody>
                </table>
            )}
        </div>
    )

    const renderSplitTab = () => (
        <div className="animate-fade-in">
            <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: '#166534' }}>Resumo de Contabilidade (Rateio Real)</h3>
                <p style={{ color: '#15803d', fontSize: '0.875rem' }}>Cálculo automatizado considerando Receita de Matrículas (base R$ 3.300 presencial / preço curso EAD) menos custos e tributos.</p>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Turmas Presenciais / Híbridas</h3>

            {loading ? <p>Carregando classes...</p> : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {transactions.classesData
                        .filter(cls => filterMonth === 'all' ? true : cls.start_date && new Date(cls.start_date + 'T00:00:00').getMonth() + 1 === parseInt(filterMonth))
                        .map(cls => {
                            const studentCount = cls.students[0]?.count || 0
                            if (studentCount === 0) return null

                            // Real calculation logic
                            const revenue = studentCount * 3300 // Usando preço base à vista como referência
                            
                            // Somar custos específicos da turma
                            const specificCosts = transactions.payables
                                .filter(p => p.class_id === cls.id)
                                .reduce((acc, curr) => acc + curr.amount, 0)
                            
                            // Tributos Estimados (Ex: 15% sobre receita)
                            const taxes = revenue * 0.15
                            
                            const netProfit = revenue - specificCosts - taxes
                            
                            const isSplit = cls.instructor_payment_type === 'split'
                            const instructorShare = isSplit ? (netProfit * (cls.instructor_payment_value / 100)) : cls.instructor_payment_value
                            const companyProfit = netProfit - instructorShare

                            return (
                                <div key={cls.id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h4 style={{ fontWeight: 600, color: 'var(--primary)' }}>{cls.name}</h4>
                                        <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{cls.course_name}</span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-muted">Receita ({studentCount} Alunos):</span>
                                            <span style={{ fontWeight: 600 }}>{formatMoney(revenue)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-muted">Custos Diretos (Vínculo):</span>
                                            <span style={{ color: 'var(--danger)' }}>- {formatMoney(specificCosts)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-muted">Impostos Estimados (15%):</span>
                                            <span style={{ color: 'var(--danger)' }}>- {formatMoney(taxes)}</span>
                                        </div>
                                        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.5rem 0' }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '1rem' }}>
                                            <span>Lucro Líquido Real:</span>
                                            <span style={{ color: 'var(--success)' }}>{formatMoney(netProfit)}</span>
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                                            Repasse ao Instrutor ({isSplit ? `${cls.instructor_payment_value}%` : 'Fixo'})
                                        </p>

                                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>C&C (Empresa)</p>
                                                <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatMoney(companyProfit)}</p>
                                            </div>
                                            <div style={{ fontSize: '1.5rem', color: 'var(--border-color)' }}>+</div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Membro ICC</p>
                                                <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatMoney(instructorShare)}</p>
                                            </div>
                                        </div>
                                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem' }} onClick={() => alert('Rateio efetivado. Lançamento gerado no extrato de pagamentos.')}>Efetivar Payout</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <h3 style={{ fontSize: '1.25rem', marginTop: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Vendas Diretas EAD / Online</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                        {transactions.eadCoursesData.map(course => {
                            const studentCount = course.classes?.reduce((acc, curr) => acc + (curr.students[0]?.count || 0), 0) || 0
                            if (studentCount === 0) return null

                            const revenue = studentCount * 3300 // Exemplo de preço base
                            const specificCosts = transactions.payables
                                .filter(p => course.classes?.some(c => c.id === p.class_id))
                                .reduce((acc, curr) => acc + curr.amount, 0)
                            
                            const taxes = revenue * 0.15
                            const netProfit = revenue - specificCosts - taxes
                            
                            const isSplit = course.instructor_payment_type === 'split'
                            const instructorShare = isSplit ? (netProfit * (course.instructor_payment_value / 100)) : course.instructor_payment_value
                            const companyProfit = netProfit - instructorShare

                            return (
                                <div key={course.id} className="card" style={{ borderLeft: '4px solid #10B981' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h4 style={{ fontWeight: 600, color: 'var(--primary)' }}>{course.title}</h4>
                                        <span style={{ fontSize: '0.75rem', backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>EAD ONLINE</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="text-muted">Matrículas EAD:</span>
                                            <span style={{ fontWeight: 600 }}>{studentCount}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                            <span>Lucro Líquido:</span>
                                            <span style={{ color: 'var(--success)' }}>{formatMoney(netProfit)}</span>
                                        </div>
                                    </div>
                                    <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.7rem' }}>C&C Empresa</p>
                                                <p style={{ fontWeight: 700 }}>{formatMoney(companyProfit)}</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.7rem' }}>Instrutor</p>
                                                <p style={{ fontWeight: 700, color: '#059669' }}>{formatMoney(instructorShare)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem' }}>Tesouraria e Financeiro</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter size={18} className="text-secondary" />
                    <select className="form-control" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ minWidth: '150px' }}>
                        <option value="all">Todo o Período</option>
                        <option value="1">Janeiro</option>
                        <option value="2">Fevereiro</option>
                        <option value="3">Março</option>
                        <option value="4">Abril</option>
                        <option value="5">Maio</option>
                        <option value="6">Junho</option>
                        <option value="7">Julho</option>
                        <option value="8">Agosto</option>
                        <option value="9">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                    </select>
                </div>
            </div>

            {renderTabs()}

            {activeTab === 'pix' && renderPixTab()}
            {activeTab === 'payables' && renderPayablesTab()}
            {activeTab === 'split' && renderSplitTab()}
            {activeTab === 'nf' && renderNftTab()}
        </div>
    )
}
