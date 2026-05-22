import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AlertCircle, CheckCircle, Clock, Trophy, TrendingUp, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316'];

export default function Dashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState(null)
    const [metrics, setMetrics] = useState({
        pendingPix: 0,
        pendingInvoices: 0,
        totalRevenue: 0,
        totalCosts: 0,
        netProfit: 0
    })
    const [payables, setPayables] = useState([])
    const [pixList, setPixList] = useState([]) // Mock temporary list

    // Rankings & Analytics
    const [courseRanking, setCourseRanking] = useState({ month: [], year: [] })
    const [monthlySales, setMonthlySales] = useState([])
    const [classOccupancy, setClassOccupancy] = useState([])
    const [marketingSource, setMarketingSource] = useState([])

    // Performance de Prazos
    const [classDelays, setClassDelays] = useState({ delayed: [], onTime: 0, totalStarted: 0 })

    const formatMoney = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            // Auth Check
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const email = user.email?.toLowerCase() || ''
                const metadataRole = user.user_metadata?.role
                const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
                
                let effectiveRole = profile?.role || metadataRole

                // Bypass absoluto para Desenvolvedor ou Admin
                if (email.includes('desenvolvedor') || email.includes('carlos') || metadataRole === 'admin') {
                    setUserRole('admin')
                } else {
                    setUserRole(effectiveRole)
                }
            }

            // Fetch Payables
            const { data: costsData } = await supabase.from('financial_costs').select('*').order('date_incurred', { ascending: true })
            const activePayables = costsData || []

            // Analytics Extraction (Students & Classes)
            const { data: studentsData } = await supabase.from('students').select('created_at, how_knew, how_knew_other, turma_id, classes(name, course_name)')

            if (studentsData) {
                const now = new Date()
                const currentMonth = now.getMonth()
                const currentYear = now.getFullYear()

                // Courses Rankings
                let monthCourses = {}
                let yearCourses = {}
                let salesByMonth = {} // Month string -> count

                // Occupancy
                let classCounts = {} // turma_name -> count

                studentsData.forEach(st => {
                    if (!st.classes) return;
                    const cName = st.classes.course_name
                    const tName = st.classes.name
                    const stDate = new Date(st.created_at)

                    // Track By Course Name
                    if (stDate.getFullYear() === currentYear) {
                        yearCourses[cName] = (yearCourses[cName] || 0) + 1

                        if (stDate.getMonth() === currentMonth) {
                            monthCourses[cName] = (monthCourses[cName] || 0) + 1
                        }

                        // Track By Month (Jan, Fev, Mar...)
                        const monthLabel = stDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()
                        salesByMonth[monthLabel] = (salesByMonth[monthLabel] || 0) + 1
                    }

                    // Track Occupancy by Class
                    classCounts[tName] = (classCounts[tName] || 0) + 1
                })

                // Track Marketing Effectiveness (All Time or specific period, let's do All Time for broader stats)
                let marketingCounts = {}
                studentsData.forEach(st => {
                    const baseSource = st.how_knew || 'Não Informado'
                    const source = baseSource === 'Outro' && st.how_knew_other ? `Outro: ${st.how_knew_other}` : baseSource
                    marketingCounts[source] = (marketingCounts[source] || 0) + 1
                })

                // Sort Arrays
                const sortObject = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))

                setCourseRanking({
                    month: sortObject(monthCourses),
                    year: sortObject(yearCourses).slice(0, 5) // Top 5 Anual
                })

                setMonthlySales(sortObject(salesByMonth))
                setClassOccupancy(sortObject(classCounts).slice(0, 5)) // Top 5 turmas mais cheias
                setMarketingSource(sortObject(marketingCounts))
            }

            // Performance de Prazos (Analytics de Turmas)
            const { data: allClasses } = await supabase.from('classes').select('name, start_date, actual_start_date')
            if (allClasses) {
                const startedClasses = allClasses.filter(c => c.actual_start_date && c.start_date)
                const delayed = []
                let onTimeCount = 0

                startedClasses.forEach(c => {
                    const previsto = new Date(c.start_date + 'T00:00:00')
                    const real = new Date(c.actual_start_date + 'T00:00:00')
                    const diffTime = real - previsto
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                    if (diffDays > 0) {
                        delayed.push({ name: c.name, days: diffDays })
                    } else {
                        onTimeCount++
                    }
                })

                // Ordenar do maior atraso pro menor
                delayed.sort((a, b) => b.days - a.days)

                setClassDelays({
                    delayed,
                    onTime: onTimeCount,
                    totalStarted: startedClasses.length
                })
            }

            // Calculate Approximate Total Revenue from Students
            const totalRevenue = (studentsData?.length || 0) * 1500 // Ex: 1500 per student avg
            const totalCosts = activePayables.reduce((acc, curr) => acc + (curr.amount || 0), 0)

            // Filter payables to only show upcoming / pending in dashboard list
            const pendingCosts = activePayables.filter(p => p.status !== 'pago').slice(0, 5)
            setPayables(pendingCosts)

            const initialPixList = [
                { id: 1, student: 'João Guilherme Silva', amount: 1500, date: '2026-10-10' },
                { id: 2, student: 'Maria Oliveira Gomes', amount: 1500, date: '2026-10-15' }
            ]
            setPixList(initialPixList)

            setMetrics({
                pendingPix: initialPixList.length,
                pendingInvoices: 0,
                totalRevenue,
                totalCosts,
                netProfit: totalRevenue - totalCosts
            })

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    return (
        <div className="animate-fade-in">
            {/* Top Banner Alerts */}
            {(metrics.pendingPix > 0 || metrics.pendingInvoices > 0) && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    {metrics.pendingPix > 0 && (
                        <div style={{ flex: 1, backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400E' }}>
                            <AlertCircle size={24} />
                            <div>
                                <strong>Atenção:</strong> Há {metrics.pendingPix} pagamentos de PIX Parcelado aguardando checagem na conta.
                            </div>
                        </div>
                    )}
                    {metrics.pendingInvoices > 0 && (
                        <div style={{ flex: 1, backgroundColor: '#DBEAFE', border: '1px solid #3B82F6', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1E40AF' }}>
                            <AlertCircle size={24} />
                            <div>
                                <strong>Notas Fiscais:</strong> {metrics.pendingInvoices} notas pendentes de emissão.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3 className="text-secondary" style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Lucro Líquido Parcial (Real + Previsto)
                    </h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>
                        {formatMoney(metrics.netProfit)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <span>Receita Bruta Estimada: {formatMoney(metrics.totalRevenue)}</span>
                        <span style={{ color: 'var(--danger)' }}>Custos Lançados: {formatMoney(metrics.totalCosts)}</span>
                    </div>
                </div>
            </div>

            {/* Painel Estratégico de BI (Admin e Coordenador Somente - Bypass Ativado) */}
            {!loading && (
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} /> Inteligência de Negócios e Vendas
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                        {/* Cursos Campeões de Venda */}
                        <div className="card" style={{ backgroundColor: '#F8FAFC' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={18} className="text-warning" /> Cursos Mais Vendidos (Ano)</h3>
                            <div style={{ width: '100%', height: 250 }}>
                                {courseRanking.year.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={courseRanking.year} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                                            <XAxis
                                                type="number"
                                                allowDecimals={false}
                                                tick={{ fontSize: 11, fill: '#64748b' }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => `${v} aluno${v !== 1 ? 's' : ''}`}
                                            />
                                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <ChartTooltip
                                                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                                formatter={(value) => [`${value} aluno${value !== 1 ? 's' : ''}`, 'Matrículas']}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                                            />
                                            <Bar dataKey="count" barSize={18} radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: '#475569', formatter: (v) => v }}>
                                                {courseRanking.year.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sem registros.</span>}
                            </div>
                        </div>


                        {/* Histórico Mensal */}
                        <div className="card" style={{ backgroundColor: '#F8FAFC' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} className="text-primary" /> Meses Mais Fartos (Volume)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {monthlySales.map((m, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
                                        <div style={{ width: '40px', fontWeight: 600, color: 'var(--text-secondary)' }}>{m.name}</div>
                                        <div style={{ flex: 1, backgroundColor: 'var(--border-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min((m.count / Math.max(...monthlySales.map(x => x.count))) * 100, 100)}%`, backgroundColor: 'var(--primary)', height: '100%' }}></div>
                                        </div>
                                        <div style={{ width: '80px', textAlign: 'right', fontWeight: 600 }}>{m.count} alunos</div>
                                    </div>
                                ))}
                                {monthlySales.length === 0 && <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>O ano ainda não possui métricas fechadas.</span>}
                            </div>
                        </div>

                        {/* Taxa de Lotação */}
                        <div className="card" style={{ backgroundColor: '#F8FAFC' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} className="text-success" /> Lotação por Turma (Top 5)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {classOccupancy.map((t, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ fontWeight: 500 }}>{t.name}</span>
                                        <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '0.75rem' }}>{t.count} Cadeiras Cheias</span>
                                    </div>
                                ))}
                                {classOccupancy.length === 0 && <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nenhuma turma em aberto encontrada.</span>}
                            </div>
                        </div>

                        {/* Performance de Início das Turmas (Atrasos) */}
                        <div className="card" style={{ backgroundColor: '#F8FAFC' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} className="text-danger" /> Atrasos de Lançamento (SLA)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1, backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#065F46' }}>{classDelays.totalStarted > 0 ? Math.round((classDelays.onTime / classDelays.totalStarted) * 100) : 0}%</div>
                                        <div style={{ fontSize: '0.75rem', color: '#065F46', textTransform: 'uppercase' }}>No Prazo Exato</div>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#FEE2E2', border: '1px solid #FECACA', padding: '0.75rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991B1B' }}>{classDelays.delayed.length}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#991B1B', textTransform: 'uppercase' }}>Turmas Atrasadas</div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Histórico de Turmas Defasadas</h4>
                                    {classDelays.delayed.length > 0 ? classDelays.delayed.map((c, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                                            <span style={{ fontWeight: 500 }}>{c.name}</span>
                                            <strong style={{ color: 'var(--danger)' }}>+{c.days} dias de atraso</strong>
                                        </div>
                                    )) : <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sensacional! Todas as turmas iniciaram no prazo.</span>}
                                </div>
                            </div>
                        </div>

                        {/* Eficácia de Campanhas de Marketing */}
                        <div className="card" style={{ backgroundColor: '#F8FAFC' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} className="text-secondary" /> Origem / Captação de Alunos</h3>
                            <div style={{ width: '100%', height: 250 }}>
                                {marketingSource.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={marketingSource} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                {marketingSource.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Métricas zeradas.</span>}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Contas a Pagar / Rateio */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem' }}>Contas a Pagar (Próximas)</h3>
                    </div>
                    {loading ? <p className="text-muted">Carregando...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {payables.map(conta => (
                                <div key={conta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                    <div>
                                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{conta.description}</p>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Vence em: {conta.date_incurred ? new Date(conta.date_incurred + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '0.25rem' }}>- {formatMoney(conta.amount)}</p>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                                            PENDENTE
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {payables.length === 0 && <p className="text-muted" style={{ textAlign: 'center' }}>Nenhuma despesa pendente registrada.</p>}
                        </div>
                    )}
                </div>

                {/* PIX Verification */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem' }}>Verificação de PIX Parcelado</h3>
                        {pixList.length === 0 && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: '#D1FAE5', color: '#065F46' }}>
                                ✓ Tudo verificado
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pixList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#10b981' }}>
                                <CheckCircle size={40} style={{ margin: '0 auto 0.75rem' }} />
                                <p style={{ fontWeight: 600 }}>Nenhum PIX pendente de verificação!</p>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Todos os pagamentos parcelados foram conferidos.</p>
                            </div>
                        ) : pixList.map(pix => (
                            <div key={pix.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s' }}>
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{pix.student}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Data informada: {new Date(pix.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatMoney(pix.amount)}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn"
                                            style={{ padding: '0.5rem 0.75rem', backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }}
                                            title="Confirmar Recebimento"
                                            onClick={() => {
                                                const updated = pixList.filter(p => p.id !== pix.id)
                                                setPixList(updated)
                                                setMetrics(prev => ({ ...prev, pendingPix: updated.length }))
                                            }}
                                        >
                                            <CheckCircle size={16} /> Confirmar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
