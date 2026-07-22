import { useState, useEffect } from 'react'
import { testimonialsApi } from '../services/site'
import { CheckCircle, XCircle, Clock, Star, User, Trash2, RefreshCw, Plus } from 'lucide-react'

export default function TestimonialsAdmin() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [loadError, setLoadError] = useState('')

  // Estados para depoimento manual (Zap / E-mail)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCourse, setFormCourse] = useState('')
  const [formRating, setFormRating] = useState(5)
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [filter])

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await testimonialsApi.create({
        name: formName,
        course: formCourse,
        rating: parseInt(formRating),
        content: formContent,
        status: 'approved', // Depoimentos manuais já entram aprovados
        type: 'text',
        evaluation_date: new Date().toISOString(),
      })

      setFormName('')
      setFormCourse('')
      setFormRating(5)
      setFormContent('')
      setShowAddForm(false)
      fetchAll()
      alert('Depoimento cadastrado e publicado com sucesso!')
    } catch (err) {
      console.error('Erro ao cadastrar depoimento:', err)
      alert('Erro ao cadastrar o depoimento: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { testimonials } = await testimonialsApi.list(filter === 'all' ? undefined : filter)
      setTestimonials(testimonials || [])
    } catch (err) {
      console.error('Erro ao buscar depoimentos:', err)
      setTestimonials([])
      setLoadError(err.message || 'Não foi possível carregar os depoimentos.')
    } finally {
      setLoading(false)
    }
  }

  const approve = async (id) => {
    try {
      await testimonialsApi.update(id, { status: 'approved' })
      fetchAll()
    } catch (err) {
      alert('Erro ao aprovar o depoimento: ' + err.message)
    }
  }

  const reject = async (id) => {
    try {
      await testimonialsApi.update(id, { status: 'rejected' })
      fetchAll()
    } catch (err) {
      alert('Erro ao rejeitar o depoimento: ' + err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Excluir este depoimento?')) return
    try {
      await testimonialsApi.remove(id)
      fetchAll()
    } catch (err) {
      alert('Erro ao excluir o depoimento: ' + err.message)
    }
  }

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-color)', margin: 0 }}>
            ⭐ Moderação de Depoimentos
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Aprove ou rejeite os depoimentos enviados pelos alunos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '0.6rem 1.25rem', 
              borderRadius: '10px', 
              fontWeight: '700', 
              cursor: 'pointer' 
            }}
          >
            <Plus size={16} /> Novo Depoimento
          </button>
          <button 
            onClick={fetchAll} 
            className="btn btn-secondary" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: 'white',
              color: 'var(--text-color)'
            }}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {/* Formulário de Depoimento Manual */}
      {showAddForm && (
        <div className="card" style={{
          background: 'var(--card-bg, white)',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-color)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✍️ Inserir Depoimento Recebido (WhatsApp / E-mail)
          </h3>
          <form onSubmit={handleAddSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Nome do Aluno</label>
                <input 
                  type="text" 
                  required 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: João Silva"
                  style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Curso / Legenda</label>
                <input 
                  type="text" 
                  required 
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                  placeholder="Ex: Aluno de Engenharia / WhatsApp"
                  style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Avaliação (Estrelas)</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFormRating(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      <Star 
                        size={24} 
                        fill={star <= formRating ? '#f59e0b' : 'none'} 
                        color="#f59e0b" 
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', marginLeft: '0.5rem', color: 'var(--text-muted)' }}>{formRating} de 5 estrelas</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Texto do Depoimento</label>
                <textarea 
                  required 
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Cole aqui o depoimento que você recebeu por WhatsApp, E-mail ou redes sociais..."
                  style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={saving}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {saving ? 'Salvando...' : 'Salvar e Publicar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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

      {loadError ? (
        <div role="alert" className="card" style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <p style={{ margin: '0 0 1rem', fontWeight: 700 }}>{loadError}</p>
          <button type="button" onClick={fetchAll} className="btn btn-secondary">Tentar novamente</button>
        </div>
      ) : loading ? (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
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
                  <p style={{ margin: 0, color: 'var(--text-color)', lineHeight: '1.6', fontStyle: 'italic', overflowWrap: 'anywhere' }}>
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
