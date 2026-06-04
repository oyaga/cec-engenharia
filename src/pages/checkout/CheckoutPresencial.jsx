import React from 'react';
import { CreditCard, QrCode, FileText, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// TODO Sprint B — Página de checkout presencial para atendente
// Fluxos: PIX | Boleto | Cartão de Crédito (10x sem juros)

export default function CheckoutPresencial() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', animation: 'fade-in 0.5s ease' }}>
      <button 
        className="btn btn-secondary" 
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
        onClick={() => navigate('/alunos')}
      >
        <ArrowLeft size={16} /> Voltar para Alunos
      </button>

      <div className="card" style={{ border: '2px dashed #F43F5E', backgroundColor: '#FFF1F2', padding: '2.5rem', textAlign: 'center', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', color: '#F43F5E', marginBottom: '1rem' }}>
          <ShieldAlert size={56} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#9F1239', marginBottom: '0.75rem' }}>
          💳 Módulo de Pagamento Presencial (Asaas)
        </h2>
        <p style={{ color: '#E11D48', fontSize: '1rem', maxWidt: '600px', margin: '0 auto 1.5rem', lineHeight: '1.6', fontWeight: 600 }}>
          Este módulo está agendado para ativação na **Sprint B**. A atendente poderá processar pagamentos na recepção em tempo real!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '2rem', textAlign: 'left' }}>
          
          <div style={{ padding: '1.25rem', backgroundColor: '#FFF', border: '1px solid #FECDD3', borderRadius: '12px', opacity: 0.8 }}>
            <div style={{ color: '#F43F5E', marginBottom: '0.5rem' }}><QrCode size={28} /></div>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem', margin: '0 0 4px 0', color: '#9F1239' }}>1. PIX Instantâneo</h4>
            <p style={{ fontSize: '0.78rem', color: '#BE123C', margin: 0 }}>QR Code na tela para o aluno escanear e pagar na hora, com baixa automática.</p>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: '#FFF', border: '1px solid #FECDD3', borderRadius: '12px', opacity: 0.8 }}>
            <div style={{ color: '#F43F5E', marginBottom: '0.5rem' }}><FileText size={28} /></div>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem', margin: '0 0 4px 0', color: '#9F1239' }}>2. Emissão de Boleto</h4>
            <p style={{ fontSize: '0.78rem', color: '#BE123C', margin: 0 }}>Geração e impressão de boleto bancário no ato, ou envio imediato via WhatsApp.</p>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: '#FFF', border: '1px solid #FECDD3', borderRadius: '12px', opacity: 0.8 }}>
            <div style={{ color: '#F43F5E', marginBottom: '0.5rem' }}><CreditCard size={28} /></div>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem', margin: '0 0 4px 0', color: '#9F1239' }}>3. Cartão de Crédito</h4>
            <p style={{ fontSize: '0.78rem', color: '#BE123C', margin: 0 }}>Digitação de dados ou integração com maquininha (parcelamento em até 10x sem juros).</p>
          </div>

        </div>

        <div style={{ marginTop: '2.5rem', borderTop: '1px solid #FCA5A5', paddingTop: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', backgroundColor: '#FDA4AF', color: '#9F1239', padding: '4px 12px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Aguardando Sprint B
          </span>
        </div>
      </div>
    </div>
  );
}
