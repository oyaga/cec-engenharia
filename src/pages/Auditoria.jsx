import { useState, useEffect } from 'react'
import { Shield, FileText, User, Trash2, Key, Search, RefreshCw } from 'lucide-react'
import { auditApi } from '../services/financial'

export default function Auditoria() {
    const [searchTerm, setSearchTerm] = useState('')
    const [logs, setLogs] = useState([])
	const [loading, setLoading] = useState(true)

	const fetchLogs = () => {
		setLoading(true)
        auditApi.list()
            .then(({ logs }) => setLogs((logs || []).map(l => ({
                id: l.id,
                action: l.action,
				user: l.user_name || l.user_email || l.user_id || '—',
				email: l.user_email || '',
				role: l.user_role || '',
                date: l.created_at,
				entity: l.entity_type || 'sistema',
                details: l.details ? (typeof l.details === 'string' ? l.details : JSON.stringify(l.details)) : `${l.entity_type}${l.entity_id ? ' · ' + l.entity_id : ''}`,
            }))))
            .catch(() => setLogs([]))
			.finally(() => setLoading(false))
	}

    useEffect(() => {
		fetchLogs()
    }, [])

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
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
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
					<button className="btn btn-secondary" onClick={fetchLogs} disabled={loading}>
						<RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Atualizar
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '1rem', width: '40px' }}></th>
                            <th style={{ padding: '1rem' }}>Ação Executada</th>
                            <th style={{ padding: '1rem' }}>Usuário Pessoal</th>
							<th style={{ padding: '1rem' }}>Papel</th>
							<th style={{ padding: '1rem' }}>Módulo</th>
                            <th style={{ padding: '1rem' }}>Data & Hora</th>
                            <th style={{ padding: '1rem' }}>Detalhes Contextuais</th>
                        </tr>
                    </thead>
                    <tbody>
						{logs.filter(l => `${l.user} ${l.email} ${l.role} ${l.action} ${l.entity} ${l.details}`.toLowerCase().includes(searchTerm.toLowerCase())).map(log => (
                            <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: getLogColor(log.action) }}>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    {getActionIcon(log.action)}
                                </td>
                                <td style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>{log.action}</td>
								<td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 500 }}>
									{log.user}{log.email && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{log.email}</div>}
								</td>
								<td style={{ padding: '1rem', fontSize: '0.8rem' }}>{log.role || '—'}</td>
								<td style={{ padding: '1rem', fontSize: '0.8rem' }}>{log.entity}</td>
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
        </div>
    )
}
