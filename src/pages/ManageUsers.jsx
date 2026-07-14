import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usersApi } from '../services/users';
import { UserPlus, ArrowLeft, ShieldCheck, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useEdit } from '../context/EditContext';

const ManageUsers = () => {
  const { isMaster } = useEdit();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Bloqueio de segurança extra além da Rota Protegida
  if (!isMaster) {
    return (
      <div className="unauthorized">
        <ShieldCheck size={50} color="#ef4444" />
        <h1>Acesso Negado</h1>
        <p>Apenas o Master Admin pode acessar esta página.</p>
        <Link to="/" className="btn-primary">Voltar para Home</Link>
      </div>
    );
  }

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await usersApi.create({ email, password, role: 'admin' });

      setMessage(`Administrador ${email} criado com sucesso!`);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Erro ao criar usuário.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manage-users-container">
      <div className="manage-card">
        <header className="manage-header">
          <Link to="/" className="btn-back">
            <ArrowLeft size={20} />
            Voltar
          </Link>
          <div className="master-badge">
            <ShieldCheck size={16} />
            MASTER ADMIN
          </div>
          <h1>Gestão de Usuários</h1>
          <p>Cadastre novos administradores para o site CEC Engenharia</p>
        </header>

        {message && (
          <div className="alert-success">
            <CheckCircle size={20} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateUser} className="manage-form">
          <div className="form-row">
            <div className="form-group">
              <label><Mail size={16} /> E-mail do Novo Admin</label>
              <input 
                type="email" 
                placeholder="exemplo@cec.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label><Lock size={16} /> Senha Temporária</label>
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-create" disabled={loading}>
            <UserPlus size={20} />
            {loading ? 'Criando Usuário...' : 'Cadastrar Administrador'}
          </button>
        </form>

        <div className="manage-footer">
          <p>⚠️ <strong>Aviso:</strong> A senha definida é temporária — o novo administrador será obrigado a trocá-la no primeiro acesso.</p>
        </div>
      </div>

      <style jsx="true">{`
        .manage-users-container {
          min-height: 100vh;
          background: #f1f5f9;
          padding: 3rem 1rem;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .manage-card {
          width: 100%;
          max-width: 700px;
          background: white;
          padding: 3rem;
          border-radius: 1.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .manage-header {
          margin-bottom: 3rem;
          position: relative;
        }
        .btn-back {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .master-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fef3c7;
          color: #92400e;
          padding: 0.4rem 0.8rem;
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 800;
          width: fit-content;
          margin-bottom: 1rem;
        }
        .manage-header h1 {
          font-size: 2rem;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }
        .manage-header p {
          color: #64748b;
        }
        .alert-success {
          background: #f0fdf4;
          color: #15803d;
          padding: 1.25rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          border: 1px solid #bbf7d0;
        }
        .alert-error {
          background: #fef2f2;
          color: #b91c1c;
          padding: 1.25rem;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          border: 1px solid #fee2e2;
        }
        .manage-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
        }
        .form-group input {
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1.5px solid #e2e8f0;
          outline: none;
        }
        .btn-create {
          background: var(--primary);
          color: white;
          padding: 1rem 2rem;
          border-radius: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: transform 0.2s;
        }
        .btn-create:hover {
          transform: translateY(-2px);
          background: var(--primary-dark);
        }
        .manage-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.6;
        }
        .unauthorized {
          text-align: center;
          padding: 5rem 2rem;
        }
        @media (max-width: 600px) {
          .form-row { grid-template-columns: 1fr; }
          .manage-users-container { padding: 1.5rem 1rem; }
          .manage-card { padding: 1.75rem 1.25rem; }
          .manage-header { margin-bottom: 2rem; }
          .manage-header h1 { font-size: 1.6rem; }
        }
      `}</style>
    </div>
  );
};

export default ManageUsers;
