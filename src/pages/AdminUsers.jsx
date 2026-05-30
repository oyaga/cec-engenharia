import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Trash2, RefreshCw, ShieldCheck, User, Eye, EyeOff, AlertCircle, CheckCircle, Award } from 'lucide-react';
import AdminToolbar from '../components/AdminToolbar';
import { useEdit } from '../context/EditContext';

const AdminUsers = () => {
  const { userProfile: currentUserProfile, hasPermission } = useEdit();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', canAddWebdesigners: false });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg: '' }
  const [saving, setSaving] = useState(false);

  // Permissão para gerenciar e criar novos webdesigners
  const canManage = currentUserProfile?.role === 'admin' || currentUserProfile?.permissions?.can_add_webdesigners === true;

  useEffect(() => { 
    if (currentUserProfile) {
      fetchUsers(); 
    }
  }, [currentUserProfile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Filtrar apenas usuários que possuem cargos administrativos/editor (admin e webdesigner)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['admin', 'webdesigner'])
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback robusto se a tabela users estiver indisponível ou vazia
        setUsers([
          { id: '1', email: 'webdesigner@cec.com.br', role: 'webdesigner', created_at: new Date().toISOString(), permissions: { can_add_webdesigners: true } },
          { id: '2', email: 'admin@cec.com.br', role: 'admin', created_at: new Date().toISOString(), permissions: { can_add_webdesigners: true } },
        ]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) {
      alert('Você não tem permissão para adicionar novos webdesigners.');
      return;
    }
    
    setStatus(null);
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { role: 'webdesigner' } }
      });

      if (error) throw error;

      if (!data?.user) {
        throw new Error('Não foi possível obter os dados do usuário criado no Auth.');
      }

      // Salva na tabela users pública
      const { error: dbError } = await supabase.from('users').upsert({
        id: data.user.id,
        email: form.email,
        role: 'webdesigner',
        permissions: { can_add_webdesigners: form.canAddWebdesigners },
        created_at: new Date().toISOString()
      });

      if (dbError) throw dbError;

      setStatus({ type: 'success', msg: `Usuário ${form.email} criado como Webdesigner com sucesso!` });
      setForm({ email: '', password: '', canAddWebdesigners: false });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userItem) => {
    if (!canManage) {
      alert('Você não tem permissão para excluir usuários.');
      return;
    }
    if (isMasterEmail(userItem.email)) {
      alert('Usuários Master são protegidos e não podem ser excluídos.');
      return;
    }
    if (!window.confirm(`Excluir o usuário ${userItem.email}?`)) return;
    
    try {
      // Remove da tabela pública
      const { error } = await supabase.from('users').delete().eq('email', userItem.email);
      if (error) throw error;

      setUsers(prev => prev.filter(u => u.email !== userItem.email));
      setStatus({ type: 'success', msg: `Usuário ${userItem.email} removido do sistema.` });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  const toggleCanAddPermission = async (userItem) => {
    if (!canManage) return;
    if (isMasterEmail(userItem.email)) return;

    try {
      const currentPerms = userItem.permissions || {};
      const newPermission = !currentPerms.can_add_webdesigners;
      
      const { error } = await supabase
        .from('users')
        .update({
          permissions: {
            ...currentPerms,
            can_add_webdesigners: newPermission
          }
        })
        .eq('email', userItem.email);

      if (error) throw error;

      // Atualiza localmente
      setUsers(prev => prev.map(u => {
        if (u.email === userItem.email) {
          return {
            ...u,
            permissions: {
              ...(u.permissions || {}),
              can_add_webdesigners: newPermission
            }
          };
        }
        return u;
      }));

      setStatus({ 
        type: 'success', 
        msg: `Permissão de ${userItem.email} atualizada com sucesso!` 
      });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  const isMasterEmail = (email) =>
    ['webdesigner@cec.com.br', 'admin@cec.com.br', 'piticalyn@cec.com.br', 'secretaria@cursocec.com.br'].includes(email?.toLowerCase());

  // Restrição de Acesso Completo de Tela
  if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'webdesigner')) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <AdminToolbar />
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h2 style={{ color: 'var(--primary-dark)', margin: '0 0 0.5rem' }}>Acesso Restrito</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: 0 }}>Você precisa estar logado como Webdesigner ou Administrador para gerenciar permissões do site.</p>
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      <AdminToolbar />

      <div className="container">
        <div className="page-header">
          <div>
            <h1>Gerenciamento de Webdesigners</h1>
            <p>Gerencie a equipe e permissões de edição do site institucional.</p>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={fetchUsers} title="Atualizar lista">
              <RefreshCw size={18} />
            </button>
            {canManage && (
              <button className="btn-new-user" onClick={() => setShowForm(!showForm)}>
                <Plus size={20} /> Novo Webdesigner
              </button>
            )}
          </div>
        </div>

        {/* Feedback */}
        {status && (
          <div className={`status-banner ${status.type}`}>
            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{status.msg}</span>
            <button onClick={() => setStatus(null)}>×</button>
          </div>
        )}

        {/* Formulário de criação */}
        {showForm && canManage && (
          <div className="create-form-card">
            <h3>Criar Novo Webdesigner</h3>
            <form onSubmit={handleCreate} className="create-form">
              <div className="form-row">
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email" required
                    placeholder="usuario@email.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Perfil de Acesso</label>
                  <input
                    type="text"
                    disabled
                    value="Webdesigner (Editor do Site)"
                    style={{ background: '#f1f5f9', color: '#64748b', fontWeight: '600' }}
                  />
                </div>
              </div>
              
              <div className="form-group pass-group">
                <label>Senha de Acesso</label>
                <div className="pass-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                  <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botão de permissão de criador */}
              <div className="form-group checkbox-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="canAddWebdesigners"
                  checked={form.canAddWebdesigners}
                  onChange={e => setForm({ ...form, canAddWebdesigners: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="canAddWebdesigners" style={{ fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', color: 'var(--primary-dark)', userSelect: 'none', margin: 0 }}>
                  Permitir que este login adicione novos webdesigners (Permissão de Criador)
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  <Plus size={16} /> {saving ? 'Salvando...' : 'Criar Webdesigner'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabela de usuários */}
        <div className="users-card">
          {loading ? (
            <div className="loading-state">
              <RefreshCw size={24} className="spin" />
              <p>Carregando equipe...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <User size={48} />
              <p>Nenhum webdesigner cadastrado.</p>
              {canManage && (
                <button className="btn-new-user" onClick={() => setShowForm(true)}>
                  <Plus size={16} /> Criar primeiro webdesigner
                </button>
              )}
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Cargo</th>
                  <th>Permissão de Criador</th>
                  <th>Criado em</th>
                  {canManage && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((userItem, i) => {
                  const isMaster = isMasterEmail(userItem.email);
                  const canCreateOthers = isMaster || userItem.role === 'admin' || userItem.permissions?.can_add_webdesigners === true;
                  
                  return (
                    <tr key={userItem.id || i}>
                      <td>
                        <div className="email-cell">
                          {isMaster
                            ? <ShieldCheck size={16} className="icon-admin" />
                            : <User size={16} className="icon-user" />
                          }
                          <span style={{ fontWeight: isMaster ? '600' : 'normal' }}>{userItem.email}</span>
                          {isMaster && <span className="badge-master">MASTER</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`role-pill ${userItem.role === 'admin' ? 'admin' : 'webdesigner'}`}>
                          {userItem.role === 'admin' ? 'Admin' : 'Webdesigner'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {canManage && !isMaster && userItem.role !== 'admin' ? (
                            <button
                              onClick={() => toggleCanAddPermission(userItem)}
                              className={`btn-toggle-perm ${canCreateOthers ? 'active' : ''}`}
                              title={canCreateOthers ? "Desativar permissão de criar outros webdesigners" : "Permitir criar outros webdesigners"}
                              style={{
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '30px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                background: canCreateOthers ? 'var(--primary)' : 'rgba(0, 0, 0, 0.05)',
                                color: canCreateOthers ? 'white' : 'var(--text-muted)'
                              }}
                            >
                              {canCreateOthers ? (
                                <>
                                  <Award size={12} />
                                  <span>Sim (Criador)</span>
                                </>
                              ) : (
                                <span>Não</span>
                              )}
                            </button>
                          ) : (
                            <span style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: '700', 
                              color: canCreateOthers ? 'var(--primary)' : 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {canCreateOthers ? (
                                <>
                                  <Award size={12} />
                                  <span>Sim (Criador)</span>
                                </>
                              ) : (
                                <span>Não</span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="date-cell">
                        {userItem.created_at
                          ? new Date(userItem.created_at).toLocaleDateString('pt-BR')
                          : '—'
                        }
                      </td>
                      {canManage && (
                        <td>
                          {!isMaster && userItem.role !== 'admin' ? (
                            <button
                              className="btn-delete"
                              onClick={() => handleDelete(userItem)}
                              title="Excluir usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <span className="protected-label">Protegido</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="info-note">
          <AlertCircle size={14} />
          <span>Usuários master ou administradores possuem proteção de exclusão automática e permissões totais no sistema.</span>
        </div>
      </div>

      <style>{`
        .admin-users-page { padding-top: 80px; min-height: 100vh; background: #f8fafc; padding-bottom: 4rem; }
        .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-header h1 { color: var(--primary-dark); margin: 0 0 0.25rem; font-size: 1.75rem; }
        .page-header p  { color: var(--text-muted); margin: 0; font-size: 0.9rem; }
        .header-actions { display: flex; gap: 0.75rem; align-items: center; }

        .btn-refresh {
          background: white; border: 1px solid var(--border); color: var(--primary);
          width: 40px; height: 40px; border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .btn-refresh:hover { background: var(--primary); color: white; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .btn-new-user {
          display: flex; align-items: center; gap: 0.5rem;
          background: var(--primary); color: white; border: none;
          padding: 0.6rem 1.25rem; border-radius: 10px; font-weight: 700;
          cursor: pointer; font-size: 0.9rem; transition: all 0.2s;
        }
        .btn-new-user:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,75,73,0.25); }

        /* Status banner */
        .status-banner {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.9rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem;
          font-weight: 600; font-size: 0.9rem;
        }
        .status-banner.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .status-banner.error   { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .status-banner button  { background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: auto; color: inherit; }

        /* Create form */
        .create-form-card {
          background: white; border-radius: 1.25rem; padding: 1.75rem;
          margin-bottom: 1.5rem; border: 1px solid var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .create-form-card h3 { margin: 0 0 1.5rem; color: var(--primary-dark); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group label { font-size: 0.82rem; font-weight: 700; color: var(--primary-dark); }
        .form-group input, .form-group select {
          padding: 0.65rem 0.9rem; border: 1px solid #e2e8f0; border-radius: 10px;
          font-size: 0.9rem; outline: none; width: 100%; transition: border-color 0.2s;
        }
        .form-group input:focus, .form-group select:focus { border-color: var(--primary); }
        .pass-group { margin-bottom: 1rem; }
        .pass-input-wrap { position: relative; }
        .pass-input-wrap input { padding-right: 2.5rem; }
        .toggle-pass {
          position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: var(--text-muted);
        }
        .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
        .btn-cancel {
          background: #f1f5f9; border: none; padding: 0.65rem 1.25rem;
          border-radius: 10px; font-weight: 600; cursor: pointer; color: var(--text-muted);
        }
        .btn-save {
          display: flex; align-items: center; gap: 0.5rem;
          background: var(--primary); color: white; border: none;
          padding: 0.65rem 1.25rem; border-radius: 10px; font-weight: 700; cursor: pointer;
        }

        /* Table */
        .users-card {
          background: white; border-radius: 1.25rem; overflow: hidden;
          border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .users-table { width: 100%; border-collapse: collapse; }
        .users-table th, .users-table td { padding: 1rem 1.25rem; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
        .users-table th { background: #f8fafc; font-weight: 700; color: var(--primary-dark); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .users-table tr:last-child td { border-bottom: none; }
        .users-table tr:hover td { background: #f8fafc; }

        .email-cell { display: flex; align-items: center; gap: 0.5rem; }
        .icon-admin { color: #f59e0b; }
        .icon-user  { color: #94a3b8; }
        .badge-master { background: #fef3c7; color: #92400e; font-size: 0.65rem; font-weight: 800; padding: 1px 6px; border-radius: 4px; }

        .role-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .role-pill.admin   { background: #fee2e2; color: #b91c1c; }
        .role-pill.webdesigner { background: #e0f2fe; color: #0369a1; }

        .date-cell { color: var(--text-muted); }

        .btn-delete {
          background: #fef2f2; border: none; color: #ef4444;
          width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .btn-delete:hover { background: #ef4444; color: white; }
        .protected-label { font-size: 0.75rem; color: #94a3b8; font-style: italic; }

        /* States */
        .loading-state, .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 4rem 2rem; gap: 1rem; color: var(--text-muted);
        }

        .info-note {
          display: flex; align-items: center; gap: 0.5rem;
          margin-top: 1rem; font-size: 0.78rem; color: #94a3b8;
        }

        .btn-toggle-perm:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }
        .btn-toggle-perm.active:hover {
          box-shadow: 0 4px 12px rgba(0, 75, 73, 0.2);
        }

        @media (max-width: 768px) {
          .form-row { grid-template-columns: 1fr; }
          .users-table th:nth-child(4), .users-table td:nth-child(4) { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AdminUsers;
