import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, AlertCircle, ShieldCheck } from 'lucide-react';

export default function OuvidoriaAdmin() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Erro ao buscar ouvidoria:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = complaints.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ouvidoria</h1>
          <p className="admin-page-subtitle">Caixa de entrada confidencial para reclamações e sugestões.</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={20} className="text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou conteúdo..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando denúncias...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nenhuma reclamação ou sugestão encontrada.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(c => (
              <div key={c.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>{c.name || 'Anônimo'}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.phone || 'Sem contato'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(c.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6 }}>{c.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
