import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, Shield, Plus, UserCheck, RefreshCw, Trash2, 
  UserX, UserCheck2, Lock, Edit3, DollarSign, 
  GraduationCap, MessageSquare, FileText, Check 
} from 'lucide-react'

export default function Equipe() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        email: '', 
        password: '', 
        full_name: '', 
        role: 'atendente',
        permissions: { 
          edit_site: false,
          manage_legal_docs: false,
          view_finance: false,
          manage_classes: false,
          manage_leads: true,
          manage_team: false
        }
    })
    const [errorMsg, setErrorMsg] = useState('')
    const [currentUser, setCurrentUser] = useState(null)

    // Definição de permissões padrão por cargo para facilitar o cadastro
    const applyDefaultPermissions = (role) => {
      const perms = {
        edit_site: false,
        manage_legal_docs: false,
        view_finance: false,
        manage_classes: false,
        manage_leads: false,
        manage_team: false
      };

      if (role === 'admin') {
        Object.keys(perms).forEach(k => perms[k] = true);
      } else if (role === 'coordenador') {
        perms.manage_classes = true;
        perms.manage_leads = true;
      } else if (role === 'atendente') {
        perms.manage_leads = true;
      } else if (role === 'marketing') {
        perms.edit_site = true;
        perms.manage_legal_docs = true;
        perms.manage_leads = true;
      } else if (role === 'financeiro') {
        perms.view_finance = true;
      }

      setFormData(prev => ({ ...prev, role, permissions: perms }));
    };

    const isDeveloperAccount = (u) => {
        if (!u) return false
        const email = u.email?.toLowerCase() || ''
        return u.role === 'admin' || email.includes('desenvolvedor') || email.includes('carlos') || email.includes('piticalyn')
    }

    const fetchUsers = async () => {
        setLoading(true)
        setErrorMsg('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setUsers(data || [])
        } catch (e) {
            setErrorMsg("Erro ao carregar equipe: " + e.message)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleCreateUser = async (e) => {
        e.preventDefault()
        setErrorMsg('')
        setLoading(true)

        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.full_name,
                    role: formData.role,
                    permissions: formData.permissions
                }
            }
        })

        if (error) {
            setErrorMsg(error.message)
        } else {
            const { error: dbError } = await supabase.from('users').insert([{
                id: data.user.id,
                email: formData.email,
                full_name: formData.full_name,
                role: formData.role,
                permissions: formData.permissions,
                is_active: true
            }])

            if (dbError) {
                setErrorMsg("Erro ao salvar perfil: " + dbError.message)
            } else {
                alert('Membro da equipe cadastrado com sucesso!')
                setShowModal(false)
                setFormData({ email: '', password: '', full_name: '', role: 'atendente', permissions: {} })
                fetchUsers()
            }
        }
        setLoading(false)
    }

    const handleToggleActive = async (user, currentStatus) => {
        if (isDeveloperAccount(user)) return alert("Conta mestre não pode ser bloqueada.")
        if (!confirm(`Deseja ${currentStatus ? 'BLOQUEAR' : 'ATIVAR'} este usuário?`)) return
        setLoading(true)
        try {
            const { error } = await supabase.from('users').update({ is_active: !currentStatus }).eq('id', user.id)
            if (error) throw error
            fetchUsers()
        } catch (e) { alert(e.message) }
        setLoading(false)
    }

    const deleteUser = async (user) => {
      if (isDeveloperAccount(user)) return alert("Conta mestre não pode ser excluída.")
      if (!confirm('Excluir este usuário permanentemente?')) return
      setLoading(true)
      try {
          const { error } = await supabase.from('users').delete().eq('id', user.id)
          if (error) throw error
          fetchUsers()
      } catch (e) { alert(e.message) }
      setLoading(false)
    }

    return (
        <div className="p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Shield className="text-primary" /> Gestão da Equipe & Permissões
                    </h2>
                    <p className="text-secondary text-sm">Controle quem pode editar o site, ver o financeiro e gerenciar alunos.</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading}>
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} /> Novo Membro
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {users.map(u => (
                    <div key={u.id} className={`card ${!u.is_active ? 'opacity-60 grayscale' : ''}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${u.role === 'admin' ? 'bg-red-500' : 'bg-primary'}`}>
                                    {u.full_name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold">{u.full_name}</h3>
                                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{u.role}</span>
                                    </div>
                                    <p className="text-xs text-secondary">{u.email}</p>
                                    
                                    <div className="flex gap-2 mt-2">
                                        {u.permissions?.edit_site && <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100"><Edit3 size={10}/> Site</span>}
                                        {u.permissions?.view_finance && <span className="flex items-center gap-1 text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100"><DollarSign size={10}/> Financeiro</span>}
                                        {u.permissions?.manage_classes && <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100"><GraduationCap size={10}/> Turmas</span>}
                                        {u.permissions?.manage_leads && <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100"><MessageSquare size={10}/> Leads</span>}
                                        {u.permissions?.manage_legal_docs && <span className="flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100"><FileText size={10}/> Docs Legais</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {!isDeveloperAccount(u) && (
                                  <>
                                    <button onClick={() => handleToggleActive(u, u.is_active)} className="btn btn-secondary p-2" title="Bloquear/Ativar">
                                      {u.is_active ? <UserX size={18} className="text-red-500"/> : <UserCheck2 size={18} className="text-green-500"/>}
                                    </button>
                                    <button onClick={() => deleteUser(u)} className="btn btn-secondary p-2 text-red-400 hover:text-red-600">
                                      <Trash2 size={18} />
                                    </button>
                                  </>
                                )}
                                {isDeveloperAccount(u) && <Lock size={18} className="text-slate-300 m-2" />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[5000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="text-primary"/> Novo Colaborador</h3>
                        
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">Nome Completo</label>
                                <input type="text" required className="form-control" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">E-mail de Acesso</label>
                                <input type="email" required className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Cargo / Nível</label>
                                <select className="form-control" value={formData.role} onChange={e => applyDefaultPermissions(e.target.value)}>
                                    <option value="atendente">Atendente (Secretaria)</option>
                                    <option value="coordenador">Coordenador Pedagógico</option>
                                    <option value="financeiro">Gestor Financeiro</option>
                                    <option value="marketing">Marketing / Site</option>
                                    <option value="instrutor">Instrutor</option>
                                    <option value="admin">Diretoria (Admin Total)</option>
                                </select>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Permissões Detalhadas</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.keys(formData.permissions).map(key => (
                                      <label key={key} className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded border hover:border-primary transition-colors">
                                        <input 
                                          type="checkbox" 
                                          checked={formData.permissions[key]} 
                                          onChange={e => setFormData({...formData, permissions: {...formData.permissions, [key]: e.target.checked}})}
                                        />
                                        <span className="text-xs font-medium capitalize">{key.replace('_', ' ')}</span>
                                      </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Senha Inicial</label>
                                <input type="password" required minLength={6} className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
                                <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                                    {loading ? 'Cadastrando...' : 'Salvar Colaborador'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
