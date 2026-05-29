import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, XCircle, Clock, Star, User, Trash2, RefreshCw } from 'lucide-react'

export default function TestimonialsAdmin() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { fetchAll() }, [filter])

  const fetchAll = async () => {
    setLoading(true)
    let query = supabase.from('testimonials').select('*').order('created_at', { ascending: false })
    
    if (filter === 'pending') {
      query = query.eq('status', 'pending')
    } else if (filter === 'approved') {
      query = query.eq('status', 'approved')
    } else if (filter === 'rejected') {
      query = query.eq('status', 'rejected')
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Erro ao buscar depoimentos:', error)
    }
    setTestimonials(data || [])
    setLoading(false)
  }

  const approve = async (id) => {
    const { error } = await supabase.from('testimonials').update({ status: 'approved' }).eq('id', id)
    if (error) {
      console.error('Erro ao aprovar depoimento:', error)
      alert('Erro ao aprovar o depoimento: ' + error.message)
    } else {
      fetchAll()
    }
  }

  const reject = async (id) => {
    const { error } = await supabase.from('testimonials').update({ status: 'rejected' }).eq('id', id)
    if (error) {
      console.error('Erro ao rejeitar depoimento:', error)
      alert('Erro ao rejeitar o depoimento: ' + error.message)
    } else {
      fetchAll()
    }
  }

  const remove = async (id) => {
    if (!confirm('Excluir este depoimento?')) return
    const { error } = await supabase.from('testimonials').delete().eq('id', id)
    if (error) {
      console.error('Erro ao excluir depoimento:', error)
      alert('Erro ao excluir o depoimento: ' + error.message)
    } else {
      fetchAll()
    }
  }

  const filterCounts = async () => {
    const { data: pending } = await supabase.from('testimonials').select('id', { count: 'exact' }).eq('status', 'pending')
    return pending?.length || 0
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>
            ⭐ Moderação de Depoimentos
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Aprove ou rejeite os depoimentos enviados pelos alunos</p>
        </div>
        <button onClick={fetchAll} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'pending', label: '⏳ Pendentes', color: '#f59e0b' },
          { key: 'approved', label: '✅ Aprovados', color: '#10b981' },
          { key: 'rejected', label: '❌ Rejeitados', color: '#ef4444' },
          { key: 'all', label: '📋 Todos', color: 'var(--primary)' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '20px',
              border: filter === f.key ? `2px solid ${f.color}` : '2px solid transparent',
              background: filter === f.key ? f.color + '22' : 'var(--card-bg)',
              color: filter === f.key ? f.color : 'var(--text-muted)',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : testimonials.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            {filter === 'pending' ? '🎉 Nenhum depoimento pendente!' : 'Nenhum depoimento encontrado.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {testimonials.map(t => (
            <div key={t.id} className="card" style={{
              padding: '1.25rem',
              borderLeft: `4px solid ${t.status === 'approved' ? '#10b981' : t.status === 'rejected' ? '#ef4444' : '#f59e0b'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'var(--primary)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', fontSize: '0.9rem', fontWeight: '700'
                    }}>
                      {(t.name || t.author || 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', color: 'var(--text-color)' }}>{t.name || t.author || 'Anônimo'}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.course || ''} · {new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} fill={s <= (t.rating || 5) ? '#f59e0b' : 'none'} color="#f59e0b" />
                      ))}
                    </div>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-color)', lineHeight: '1.6', fontStyle: 'italic' }}>
                    "{t.content || t.text || t.message}"
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '120px' }}>
                  {t.status !== 'approved' && (
                    <button onClick={() => approve(t.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.4rem 0.75rem', borderRadius: '8px',
                      background: '#10b981', color: 'white', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: 'none'
                    }}>
                      <CheckCircle size={14} /> Aprovar
                    </button>
                  )}
                  {t.status !== 'rejected' && (
                    <button onClick={() => reject(t.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.4rem 0.75rem', borderRadius: '8px',
                      background: '#f59e0b', color: 'white', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: 'none'
                    }}>
                      <XCircle size={14} /> Rejeitar
                    </button>
                  )}
                  <button onClick={() => remove(t.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.75rem', borderRadius: '8px',
                    background: '#ef444422', color: '#ef4444', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', border: '1px solid #ef444444'
                  }}>
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {t.status === 'approved' && <span style={{ fontSize: '0.75rem', background: '#10b98122', color: '#10b981', padding: '2px 10px', borderRadius: '20px', fontWeight: '700' }}>✅ Aprovado</span>}
                {t.status === 'rejected' && <span style={{ fontSize: '0.75rem', background: '#ef444422', color: '#ef4444', padding: '2px 10px', borderRadius: '20px', fontWeight: '700' }}>❌ Rejeitado</span>}
                {t.status === 'pending' && <span style={{ fontSize: '0.75rem', background: '#f59e0b22', color: '#f59e0b', padding: '2px 10px', borderRadius: '20px', fontWeight: '700' }}>⏳ Pendente</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
