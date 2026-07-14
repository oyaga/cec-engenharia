import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studentsApi } from '../services/academic';
import { ordersApi, upcomingClassesApi } from '../services/misc';
import { enrollmentsApi } from '../services/site';
import { financialApi } from '../services/financial';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Users, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Wallet,
  ChevronRight,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  Legend 
} from 'recharts';

const COLORS = ['#004b49', '#14b8a6', '#0ea5e9', '#8b5cf6', '#d946ef', '#f97316'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  
  const isGerencial = ['admin', 'coordenador'].includes(userRole);
  
  // KPIs do Dashboard
  const [kpis, setKpis] = useState({
    activeStudents: 0,
    monthlyRevenue: 0,
    monthlyEnrollments: 0,
    upcomingClassesCount: 0
  });

  // Alertas e Listagens
  const [overdueOrdersCount, setOverdueOrdersCount] = useState(0);
  const [criticalClasses, setCriticalClasses] = useState([]);
  const [upcomingPracticalClasses, setUpcomingPracticalClasses] = useState([]);
  const [payables, setPayables] = useState([]);
  const [pixPendingList, setPixPendingList] = useState([]);

  // Analytics e Gráficos
  const [salesHistory, setSalesHistory] = useState([]);
  const [courseRanking, setCourseRanking] = useState([]);

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Papel do usuário (via contexto de auth)
      if (userProfile) {
        setUserRole(userProfile.role || 'atendente');
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const todayStr = now.toISOString().split('T')[0];
      
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];

      // 2. Alunos Ativos
      let studentsData = null, stError = null;
      try { studentsData = (await studentsApi.list()).students; } catch (e) { stError = e; }

      let activeStudents = 0;
      if (!stError && studentsData) {
        activeStudents = studentsData.filter(s => s.status !== 'inativo').length || studentsData.length;
      }

      // 3. Faturamento e Histórico de Vendas (orders)
      let ordersData = null, ordError = null;
      try { ordersData = (await ordersApi.list()).orders; } catch (e) { ordError = e; }

      let monthlyRevenue = 0;
      let overdueCount = 0;
      let pendingPixList = [];
      const salesByMonth = {};

      // Inicializa meses no gráfico de faturamento
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
        salesByMonth[label] = 0;
      }

      if (!ordError && ordersData) {
        // Cobranças vencidas
        overdueCount = ordersData.filter(o => o.status === 'overdue').length;

        // Data de compensação: usa paid_at quando existir, senão created_at.
        const paidDate = (o) => o.paid_at || o.created_at;

        // Faturamento mensal do mês atual
        const currentPaid = ordersData.filter(o =>
          o.status === 'paid' &&
          paidDate(o) &&
          new Date(paidDate(o)) >= startOfMonth
        );
        monthlyRevenue = currentPaid.reduce((sum, o) => sum + Number(o.amount || 0), 0);

        // Agrupamento para gráfico de faturamento
        ordersData.forEach(o => {
          if (o.status === 'paid' && paidDate(o)) {
            const date = new Date(paidDate(o));
            if (date >= sixMonthsAgo) {
              const label = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
              if (salesByMonth[label] !== undefined) {
                salesByMonth[label] += Number(o.amount || 0);
              }
            }
          }
        });

        // Filtrar PIX pendentes para verificação
        pendingPixList = ordersData.filter(o =>
          o.payment_method === 'pix' &&
          o.status === 'pending'
        ).slice(0, 5).map(o => ({
          id: o.id,
          student: o.customer_name || o.student_name || 'Aluno CEC',
          amount: Number(o.amount || 0),
          date: o.created_at ? o.created_at.split('T')[0] : todayStr
        }));
      }

      const formattedSalesHistory = Object.entries(salesByMonth).map(([name, count]) => ({ name, count }));
      setSalesHistory(formattedSalesHistory);
      setOverdueOrdersCount(overdueCount);
      setPixPendingList(pendingPixList);

      // 4. Matrículas e Cursos (enrollments)
      let enrollmentsData = null, enrError = null;
      try { enrollmentsData = (await enrollmentsApi.list()).enrollments; } catch (e) { enrError = e; }

      let monthlyEnrollments = 0;
      const courseCounts = {};

      if (!enrError && enrollmentsData) {
        // Matrículas no mês atual
        monthlyEnrollments = enrollmentsData.filter(e => 
          new Date(e.created_at) >= startOfMonth
        ).length;

        // Ranking de matrículas por curso
        enrollmentsData.forEach(e => {
          const title = e.course_name || 'Curso EAD';
          courseCounts[title] = (courseCounts[title] || 0) + 1;
        });
      }

      const formattedCourseRanking = Object.entries(courseCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }))
        .slice(0, 5);
      
      setCourseRanking(formattedCourseRanking);
      
      // 5. Turmas Abertas e Aulas Práticas (upcoming_classes)
      let upcomingClasses = null, classError = null;
      try { upcomingClasses = (await upcomingClassesApi.list()).classes; } catch (e) { classError = e; }

      let upcomingCount = 0;
      let criticalList = [];
      let practicalClasses = [];

      if (!classError && upcomingClasses) {
        upcomingCount = upcomingClasses.filter(c => c.status === 'scheduled').length;

        // Filtrar turmas críticas (vagas < 20%)
        criticalList = upcomingClasses.filter(c => {
          if (!c.capacity || c.status !== 'scheduled') return false;
          const remaining = c.capacity - (c.enrolled_count || 0);
          return (remaining / c.capacity) < 0.2 && remaining > 0;
        });

        // Filtrar aulas práticas presenciais nos finais de semana
        practicalClasses = upcomingClasses.filter(c => 
          c.lesson_type === 'pratica' && 
          c.status === 'scheduled'
        ).slice(0, 5);
      }

      setCriticalClasses(criticalList);
      setUpcomingPracticalClasses(practicalClasses);

      // 6. Custos Financeiros (financial_records)
      let costsData = null, costsError = null;
      try { costsData = (await financialApi.listRecords()).records; } catch (e) { costsError = e; }

      let pendingCosts = [];
      if (!costsError && costsData) {
        pendingCosts = costsData.filter(c => c.status !== 'pago').slice(0, 5).map(c => ({
          id: c.id,
          description: c.description || 'Despesa',
          amount: Number(c.amount || 0),
          date: c.due_date || todayStr
        }));
      }
      setPayables(pendingCosts);

      // Salvar todos os KPIs consolidados
      setKpis({
        activeStudents,
        monthlyRevenue,
        monthlyEnrollments,
        upcomingClassesCount: upcomingCount
      });

    } catch (error) {
      console.error('Erro geral ao carregar dados do Dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* Cabeçalho do Dashboard com Título e Botão de Chat */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-dark)', margin: 0 }}>Painel de Gestão da Secretaria</h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>Métricas gerais, faturamento e controle de atividades.</p>
        </div>
        <button 
          onClick={() => navigate('/secretaria/chat')}
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #14b8a6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            fontWeight: '750',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(0, 75, 73, 0.25)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseOut={e => e.currentTarget.style.transform = 'none'}
        >
          <MessageSquare size={18} /> Chat da Equipe
        </button>
      </div>
      
      {/* 1. Top Banner Alerts */}
      {((isGerencial && overdueOrdersCount > 0) || criticalClasses.length > 0 || (isGerencial && pixPendingList.length > 0)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {isGerencial && overdueOrdersCount > 0 && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991B1B' }}>
              <AlertCircle size={20} />
              <div>
                <strong>Atenção Financeira:</strong> Há {overdueOrdersCount} cobranças / parcelas atualmente <strong>vencidas</strong> no sistema.
              </div>
            </div>
          )}
          {criticalClasses.length > 0 && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400E' }}>
              <AlertCircle size={20} />
              <div>
                <strong>Vagas Críticas:</strong> A turma de <strong>{criticalClasses[0].lms_courses?.title || 'Curso'}</strong> possui menos de 20% das vagas restantes disponíveis!
              </div>
            </div>
          )}
          {isGerencial && pixPendingList.length > 0 && (
            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1E40AF' }}>
              <AlertCircle size={20} />
              <div>
                <strong>PIX Pendente:</strong> Existem pagamentos em PIX aguardando verificação manual de recebimento da conta.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. KPIs - Métricas em Tempo Real */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* KPI: Faturamento Real */}
        {isGerencial && (
          <div className="card" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 className="text-secondary" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Receita Real (Mês)
                </h3>
                <Wallet size={16} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', margin: '0.25rem 0' }}>
                {formatMoney(kpis.monthlyRevenue)}
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Soma total de cobranças compensadas</p>
          </div>
        )}

        {/* KPI: Alunos Ativos */}
        <div className="card" style={{ borderLeft: '4px solid #14b8a6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 className="text-secondary" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Alunos Ativos
              </h3>
              <Users size={16} color="#14b8a6" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#14b8a6', margin: '0.25rem 0' }}>
              {kpis.activeStudents}
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Total de alunos cadastrados e ativos</p>
        </div>

        {/* KPI: Inscrições no Mês */}
        <div className="card" style={{ borderLeft: '4px solid #0ea5e9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 className="text-secondary" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Matrículas (Mês)
              </h3>
              <BookOpen size={16} color="#0ea5e9" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0ea5e9', margin: '0.25rem 0' }}>
              {kpis.monthlyEnrollments}
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Inscrições feitas nos últimos 30 dias</p>
        </div>

        {/* KPI: Próximas Turmas */}
        <div className="card" style={{ borderLeft: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 className="text-secondary" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Aulas Agendadas
              </h3>
              <Calendar size={16} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6', margin: '0.25rem 0' }}>
              {kpis.upcomingClassesCount}
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Turmas e encontros nos próximos 30 dias</p>
        </div>

      </div>

      {/* 3. Painel de BI e Analytics */}
      {isGerencial && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Gráfico 1: Evolução Mensal da Receita (últimos 6 meses) */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} /> Histórico Mensal de Faturamento (Real)
            </h3>
            <div style={{ width: '100%', height: 230 }}>
              {salesHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} unit="R$" />
                    <ChartTooltip 
                      formatter={(value) => [formatMoney(value), 'Faturamento']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-muted" style={{ textAlign: 'center', paddingTop: '4rem' }}>Carregando dados...</p>}
            </div>
          </div>

          {/* Gráfico 2: Matrículas por Curso */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} /> Cursos Campeões de Matrículas (Semestre)
            </h3>
            <div style={{ width: '100%', height: 230 }}>
              {courseRanking.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseRanking} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <ChartTooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      formatter={(value) => [`${value} aluno${value !== 1 ? 's' : ''}`, 'Matrículas']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}
                    />
                    <Bar dataKey="count" barSize={14} radius={[0, 4, 4, 0]}>
                      {courseRanking.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted" style={{ textAlign: 'center', paddingTop: '4rem' }}>Nenhuma matrícula registrada.</p>}
            </div>
          </div>

        </div>
      )}

      {/* 4. Próximas Aulas Práticas (Finais de Semana) */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} color="var(--primary)" /> Próximas Aulas Práticas (Finais de Semana - 30 dias)
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {upcomingPracticalClasses.map((classItem) => {
            const classDate = new Date(classItem.date + 'T00:00:00');
            const remainingSeats = classItem.capacity - (classItem.enrolled_count || 0);
            
            return (
              <div key={classItem.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--primary)' }}></div>
                
                <div>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary-dark)', fontSize: '0.95rem', fontWeight: '700', lineHeight: '1.4' }}>
                    {classItem.lms_courses?.title || 'Curso Eletivo'}
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', color: 'var(--primary)' }}>
                      <Calendar size={14} />
                      <span>{classDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} className="text-muted" />
                      <span>{classItem.start_time?.substring(0, 5) || '08:00'} às {classItem.end_time?.substring(0, 5) || '17:00'} · <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Aula Prática</span></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.4rem' }}>
                      <MapPin size={14} className="text-muted" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{classItem.address || 'Sede C&C Engenharia'}</span>
                    </div>
                    
                    {classItem.instructor_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={14} className="text-muted" />
                        <span>Instrutor: <strong>{classItem.instructor_name}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capacidade: <strong>{classItem.capacity}</strong></span>
                  <span style={{ 
                    fontSize: '0.78rem', 
                    fontWeight: '800', 
                    padding: '3px 10px', 
                    borderRadius: '12px', 
                    background: remainingSeats <= 3 ? '#fee2e2' : '#dcfce7', 
                    color: remainingSeats <= 3 ? '#b91c1c' : '#166534' 
                  }}>
                    {remainingSeats <= 0 ? 'Lotação Esgotada' : `${remainingSeats} vagas restantes`}
                  </span>
                </div>
              </div>
            );
          })}
          {upcomingPracticalClasses.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Clock size={32} style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Nenhuma aula prática presencial agendada para os próximos 30 dias.</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Financeiro e Rateio (Despesas / Verificação de PIX) */}
      {isGerencial && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Rateio / Contas a Pagar */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={18} color="var(--primary)" /> Despesas Financeiras Pendentes
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {payables.map(conta => (
                  <div key={conta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary-dark)', margin: '0 0 2px 0' }}>{conta.description}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Vence em: {new Date(conta.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '800', color: '#b91c1c', margin: '0 0 2px 0', fontSize: '0.9rem' }}>- {formatMoney(conta.amount)}</p>
                      <span style={{ fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e' }}>
                        AGUARDANDO
                      </span>
                    </div>
                  </div>
                ))}
                {payables.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem 0' }}>Tudo em dia! Nenhuma despesa pendente.</p>
                )}
              </div>
            </div>
            
            <Link to="/financeiro" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary)', textDecoration: 'none', marginTop: '1.5rem', width: 'fit-content' }}>
              <span>Ir para o Financeiro Completo</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Verificação de PIX Parcelado */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} color="#14b8a6" /> Verificação de PIX Parcelado
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pixPendingList.map(pix => (
                  <div key={pix.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary-dark)', margin: '0 0 2px 0' }}>{pix.student}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Enviado em: {new Date(pix.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <p style={{ fontWeight: '800', color: 'var(--primary)', margin: 0, fontSize: '0.9rem' }}>{formatMoney(pix.amount)}</p>
                      <button
                        onClick={async () => {
                          try {
                            await ordersApi.update(pix.id, { status: 'paid', paid_at: new Date().toISOString() });
                            setPixPendingList(prev => prev.filter(p => p.id !== pix.id));
                            setKpis(prev => ({ ...prev, monthlyRevenue: prev.monthlyRevenue + pix.amount }));
                            alert('PIX confirmado com sucesso!');
                          } catch (err) {
                            alert('Erro ao confirmar recebimento: ' + err.message);
                          }
                        }}
                        className="btn"
                        style={{ 
                          padding: '4px 10px', 
                          backgroundColor: '#dcfce7', 
                          color: '#166534', 
                          fontWeight: '800', 
                          fontSize: '0.72rem', 
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ))}
                {pixPendingList.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#166534' }}>
                    <CheckCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
                    <p style={{ fontWeight: '700', fontSize: '0.85rem', margin: 0 }}>Nenhum PIX pendente!</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>Todos os parcelados estão conferidos.</p>
                  </div>
                )}
              </div>
            </div>
            
            <Link to="/alunos" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary)', textDecoration: 'none', marginTop: '1.5rem', width: 'fit-content' }}>
              <span>Ver Listagem de Alunos</span>
              <ChevronRight size={14} />
            </Link>
          </div>

        </div>
      )}

    </div>
  );
}
