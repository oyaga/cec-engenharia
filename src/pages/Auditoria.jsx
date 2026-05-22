import { useState } from 'react'
import { Shield, FileText, User, Trash2, Key, Search, Calendar as CalendarIcon } from 'lucide-react'

const MOCK_LOGS = [
    { id: 1, action: 'IMPRESSAO_CONTRATO_ALUNO', user: 'atendimento1@icc.com', date: '2026-03-09T14:30:00', details: 'Contrato gerado - ID Aluno 45' },
    { id: 2, action: 'MODIFICACAO_FICHARIO_PROFESSOR', user: 'coordenador@icc.com', date: '2026-03-09T14:15:00', details: 'Alterou o Fichário da Turma T1 (Cd-to) de 05/03' },
    { id: 3, action: 'EXCLUSAO_PARCELA_FINANCEIRO', user: 'admin@icc.com', date: '2026-03-09T10:00:00', details: 'Excluiu parcela R$ 1.500,00 - ID 992' },
    { id: 4, action: 'LOGIN_SISTEMA', user: 'professor_rt@icc.com', date: '2026-03-09T08:00:00', details: 'Sessão iniciada via MacOS' },
    { id: 5, action: 'BAIXA_PIX_PARCELADO', user: 'coordenador@icc.com', date: '2026-03-08T17:45:00', details: 'PIX validado para o Aluno Maxwel Lima da Costa' },
]

export default function Auditoria() {
    const [searchTerm, setSearchTerm] = useState('')

    const getActionIcon = (action) => {
        if (action.includes('IMPRESSAO')) return <FileText size={18} className="text-primary" />
        if (action.includes('MODIFICACAO')) return <Shield size={18} className="text-warning" />
        if (action.includes('EXCLUSAO')) return <Trash2 size={18} className="text-danger" />
        if (action.includes('LOGIN')) return <Key size={18} className="text-success" />
        return <User size={18} className="text-secondary" />
    }

    const getLogColor = (action) => {
        if (action.includes('EXCLUSAO')) return '#FEE2E2' // Light red
        if (action.includes('MODIFICACAO')) return '#FEF3C7' // Light yellow
        return 'transparent'
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Auditoria do Sistema (Logs)</h2>
                    <p className="text-muted">Rastreio completo e inalterável de todas as ações de usuários dentro da plataforma.</p>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por usuário (ex: coordenador) ou ação..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <button className="btn btn-secondary">
                        <CalendarIcon size={18} /> Últimos 7 Dias
                    </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '1rem', width: '40px' }}></th>
                            <th style={{ padding: '1rem' }}>Ação Executada</th>
                            <th style={{ padding: '1rem' }}>Usuário Pessoal</th>
                            <th style={{ padding: '1rem' }}>Data & Hora</th>
                            <th style={{ padding: '1rem' }}>Detalhes Contextuais</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_LOGS.filter(l => l.user.includes(searchTerm) || l.action.toLowerCase().includes(searchTerm.toLowerCase())).map(log => (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: getLogColor(log.action) }}>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    {getActionIcon(log.action)}
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>{log.action}</td>
                                <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 500 }}>{log.user}</td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    {new Date(log.date).toLocaleString('pt-BR')}
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
