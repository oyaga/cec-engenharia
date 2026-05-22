import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Minus, Send, User, Bot, Plus } from 'lucide-react';

export default function WhatsAppChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Olá! Terminal de Atendimento Integrado ICC/C&C. Como posso ajudar?", sender: 'bot', timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    // Efeito para scroll automático
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Simulação de Integração com n8n / Webhook
        try {
            // Se o usuário configurar o webhook no futuro, aqui seria o fetch:
            /*
            await fetch('SEU_WEBHOOK_N8N', {
                method: 'POST',
                body: JSON.stringify({ message: input, user: 'Admin' })
            });
            */
            
            // Simular resposta do Bot/n8n após 1s
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: "Sua mensagem foi enviada ao n8n. Aguardando processamento da IA...",
                    sender: 'bot',
                    timestamp: new Date()
                }]);
            }, 1000);
        } catch (e) {
            console.error("Erro ao enviar para n8n:", e);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed', bottom: '2rem', right: '2rem',
                    width: '60px', height: '60px', borderRadius: '50%',
                    backgroundColor: '#25D366', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                    cursor: 'pointer', zIndex: 10000, border: 'none', transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <MessageSquare size={30} />
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            width: isMinimized ? '200px' : '350px',
            height: isMinimized ? '50px' : '500px',
            backgroundColor: 'white', borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', zIndex: 10000,
            overflow: 'hidden', border: '1px solid #e2e8f0', transition: 'all 0.3s ease'
        }}>
            {/* Header */}
            <div style={{
                backgroundColor: '#25D366', color: 'white', padding: '1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ade80' }}></div>
                    <span style={{ fontWeight: 600 }}>C&C Atendimento</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        {isMinimized ? <Plus size={18} /> : <Minus size={18} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages Body */}
                    <div ref={scrollRef} style={{ flex: 1, padding: '1rem', overflowY: 'auto', backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {messages.map(m => (
                            <div key={m.id} style={{
                                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '80%', padding: '0.75rem', borderRadius: '8px',
                                backgroundColor: m.sender === 'user' ? '#dcf8c6' : 'white',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontSize: '0.9rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', fontSize: '0.7rem', color: '#667781' }}>
                                    {m.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                                    <span>{m.sender === 'user' ? 'Você (Admin)' : 'Sistema n8n'}</span>
                                </div>
                                <div>{m.text}</div>
                                <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#667781', marginTop: '0.2rem' }}>
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Input */}
                    <div style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                        <input 
                            type="text" 
                            className="form-control" 
                            style={{ flex: 1, fontSize: '0.9rem' }} 
                            placeholder="Mande sua mensagem..." 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button className="btn btn-primary" style={{ padding: '0.5rem', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleSend}>
                            <Send size={18} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
