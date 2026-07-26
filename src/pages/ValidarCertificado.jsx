import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lmsApi } from '../services/lms';
import { Award, CheckCircle, AlertTriangle, ShieldCheck, Calendar, Clock, User, BookOpen, FileText } from 'lucide-react';

export default function ValidarCertificado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCertificate = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Validar via endpoint público
      const { certificate: data } = await lmsApi.validateCertificate(id);

      if (data) {
        setCertData(data);
      } else {
        setErrorMsg('Código de certificado não encontrado em nossos registros oficiais.');
      }
    } catch (err) {
      console.warn("Erro ao buscar no banco:", err.message);
      setErrorMsg('Erro de conexão ao consultar autenticidade. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCertificate();
    } else {
      setLoading(false);
      setErrorMsg('Nenhum código de certificado foi fornecido na URL.');
    }
  }, [id]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(3, 105, 161, 0.15) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 45%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#f8fafc'
    }}>
      
      {/* CARD DE VALIDAÇÃO GLASSMORPHIC */}
      <div className="animate-fade-in" style={{
        width: '100%',
        maxWidth: '560px',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.75rem'
      }}>
        
        {/* LOGO E TÍTULO DA INSTITUIÇÃO */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            backgroundColor: 'rgba(14, 165, 233, 0.12)', 
            color: '#0ea5e9', 
            marginBottom: '1rem' 
          }}>
            <Award size={36} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.025em' }}>C&amp;C Engenharia e Capacitação</h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Portal Oficial de Verificação Técnica
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              border: '3px solid rgba(14, 165, 233, 0.2)', borderTopColor: '#0ea5e9',
              animation: 'spin 1s linear infinite' 
            }} />
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>Consultando registro de autenticidade...</span>
          </div>
        ) : errorMsg ? (
          /* TELA DE ERRO / INVÁLIDO */
          <div className="animate-slide-up" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '1rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              width: '100%'
            }}>
              <AlertTriangle size={24} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: 0, fontWeight: '750', fontSize: '0.95rem' }}>Documento não verificado!</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>{errorMsg}</p>
              </div>
            </div>
            
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.5', margin: 0 }}>
              Certifique-se de que digitou o código corretamente ou de que a leitura do QR Code foi concluída sem ruídos de imagem. Em caso de dúvidas, contacte a secretaria acadêmica.
            </p>
            
            <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', fontSize: '0.88rem', fontWeight: 700 }}>
              Voltar ao Login
            </button>
          </div>
        ) : (
          /* TELA DE SUCESSO / VÁLIDO */
          <div className="animate-slide-up" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Banner de Validade Verde Premium */}
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              color: '#10b981', 
              padding: '1.25rem 1.5rem', 
              borderRadius: '16px', 
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              width: '100%'
            }}>
              <ShieldCheck size={32} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: 0, fontWeight: '800', fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  ✓ CERTIFICADO AUTÊNTICO
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#a7f3d0', fontWeight: '500' }}>
                  Este certificado técnico técnico foi emitido pela C&amp;C Engenharia e é 100% válido.
                </p>
              </div>
            </div>

            {/* Ficha com Dados do Registro */}
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid rgba(255, 255, 255, 0.05)', 
              borderRadius: '16px', 
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                <User size={18} color="#0ea5e9" style={{ marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Aluno Diplomado</span>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.92rem', fontWeight: '750', color: '#f8fafc' }}>{certData.student_name}</p>
                  {certData.student_cpf && (
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>CPF: {certData.student_cpf}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'start', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                <BookOpen size={18} color="#0ea5e9" style={{ marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Curso Concluído</span>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.92rem', fontWeight: '750', color: '#f8fafc' }}>{certData.course_name}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', flex: 1 }}>
                  <Clock size={18} color="#0ea5e9" style={{ marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Carga Horária</span>
                    <p style={{ margin: '1px 0 0 0', fontSize: '0.92rem', fontWeight: '750', color: '#f8fafc' }}>{certData.hours} horas</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', flex: 1 }}>
                  <Calendar size={18} color="#0ea5e9" style={{ marginTop: '3px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Emissão</span>
                    <p style={{ margin: '1px 0 0 0', fontSize: '0.92rem', fontWeight: '750', color: '#f8fafc' }}>
                      {new Date(certData.issued_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'start', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                <FileText size={18} color="#0ea5e9" style={{ marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>ID do Certificado (Rastreabilidade)</span>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', fontFamily: 'monospace', color: '#e2e8f0', wordBreak: 'break-all' }}>
                    {certData.id}
                  </p>
                </div>
              </div>

            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', lineHeight: '1.4', margin: '0.25rem 0 0 0' }}>
              Este certificado está registrado sob a chancela da Diretoria CEC e cumpre os requisitos de conformidade pedagógica das turmas de ensaios não destrutivos.
            </p>

            <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', fontWeight: 700, backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}>
              Acessar o Portal de Estudos
            </button>
          </div>
        )}

      </div>
      
      {/* ESTILOS DE ANIMAÇÃO */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
}
