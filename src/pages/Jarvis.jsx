import { useState, useRef, useEffect } from "react";

const AGENTS = [
  { id: "architect", name: "Architect", icon: "🏗️", desc: "Design de sistemas", color: "#00d4ff" },
  { id: "developer", name: "Developer", icon: "💻", desc: "Programação e implementação", color: "#00d4ff" },
  { id: "ux", name: "UX Designer", icon: "🎨", desc: "Interfaces e UX", color: "#a78bfa" },
  { id: "qa", name: "QA Tester", icon: "🧪", desc: "Testes e qualidade", color: "#34d399" },
  { id: "pm", name: "Project Manager", icon: "📋", desc: "Planejamento e orquestração", color: "#fbbf24" },
  { id: "po", name: "Product Owner", icon: "🚀", desc: "Priorização e produto", color: "#f472b6" },
  { id: "scrum", name: "Scrum Master", icon: "⚡", desc: "Gestão de tarefas", color: "#00d4ff" },
  { id: "analyst", name: "Analyst", icon: "📊", desc: "Pesquisa e estratégia", color: "#60a5fa" },
  { id: "devops", name: "DevOps", icon: "⚙️", desc: "Deploy e infraestrutura", color: "#f97316" },
  { id: "data", name: "Data Engineer", icon: "🗄️", desc: "Banco de dados e pipelines", color: "#34d399" },
  { id: "critico", name: "Conclave Crítico", icon: "🔍", desc: "Audita lógica e falhas", color: "#f87171" },
  { id: "advogado", name: "Conclave Advogado", icon: "⚖️", desc: "Ataca o plano", color: "#fbbf24" },
  { id: "sintetizador", name: "Conclave Sintetizador", icon: "🔮", desc: "Integra a melhor solução", color: "#a78bfa" },
  { id: "aios", name: "AIOS Master", icon: "🛡️", desc: "Coordena a squad", color: "#00d4ff" },
  { id: "squad", name: "Squad Creator", icon: "👥", desc: "Cria squads novas", color: "#34d399" },
  { id: "soul", name: "Jarvis Soul", icon: "✨", desc: "Identidade e tom", color: "#f472b6" },
  { id: "rootcause", name: "RootCause", icon: "🔧", desc: "Diagnóstico de bugs", color: "#f97316" },
];

const DELIVERABLES = [
  { icon: "📊", name: "Dashboard de Vendas", time: "~2 min", desc: "HTML interativo com gráficos de linha, barra, pizza. Filtros por período e metas." },
  { icon: "📄", name: "Proposta Comercial", time: "~3 min", desc: "Layout profissional com identidade visual, escopo, valores e cronograma." },
  { icon: "📈", name: "Relatório de Campanhas", time: "~2 min", desc: "Análise de Meta Ads — gasto, CPC, CTR, ROAS e recomendações." },
  { icon: "🌐", name: "Landing Page", time: "~4 min", desc: "Página com hero, benefícios, depoimentos, CTA e formulário." },
  { icon: "🤖", name: "Script de Automação", time: "~3 min", desc: "Python para web scraping, processamento de dados, automação de APIs." },
  { icon: "📋", name: "Planilha Inteligente", time: "~1 min", desc: "Estrutura Excel com dados, fórmulas e gráficos prontos." },
];

const SYSTEM_PROMPT = `Você é JARVIS, um orquestrador de agentes de IA superinteligente criado pela AgênciaDeIA.

Você possui 3 Cérebros:
1. CÉREBRO PRINCIPAL (você) — raciocínio estratégico de nível PhD
2. MEGA-BRAIN CONCLAVE — 3 especialistas internos que debatem: Crítico (audita falhas), Advogado (ataca o plano), Sintetizador (integra a melhor solução)
3. OBSIDIAN MEMORY — você usa o histórico da conversa como memória permanente

Você coordena 17 agentes especializados:
Architect, Developer, UX Designer, QA Tester, Project Manager, Product Owner, Scrum Master, Analyst, DevOps, Data Engineer, Conclave Crítico, Conclave Advogado, Conclave Sintetizador, AIOS Master, Squad Creator, Jarvis Soul, RootCause

COMPORTAMENTO:
- Responda SEMPRE em português do Brasil
- Use formatação rica com emojis e estrutura clara
- Quando receber uma tarefa, indique quais agentes estão sendo ativados
- Para tarefas complexas, simule o Conclave (debate interno entre Crítico, Advogado e Sintetizador) antes de entregar a resposta final
- Entregue resultados completos e prontos para usar, não rascunhos
- Seja direto, poderoso e impressionante
- Sempre finalize com: qual agente executou, tempo estimado real, e próximo passo sugerido

Formato das respostas para tarefas:
🧠 **AGENTES ATIVADOS:** [lista os agentes relevantes]
⚡ **CONCLAVE INTERNO:** [se complexo, mostra o debate rápido]
📦 **ENTREGA:** [o resultado completo]
🎯 **PRÓXIMO PASSO:** [sugestão do que fazer depois]`;

export default function Jarvis() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const [view, setView] = useState("chat"); // chat | agents | deliverables
  const [particles, setParticles] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Generate particles
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 20 + 10,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    setParticles(p);

    // Welcome message
    setMessages([{
      role: "assistant",
      content: `🤖 **JARVIS ONLINE**

Olá! Sou seu orquestrador de agentes IA pessoal, powered by AgênciaDeIA.

**3 Cérebros ativos** • **17 Agentes prontos** • **Memória ativa**

Posso criar para você em minutos:
• 📊 Dashboards e relatórios completos
• 📄 Propostas comerciais profissionais  
• 🌐 Landing pages prontas para publicar
• 🤖 Scripts de automação em Python
• 📈 Análises estratégicas detalhadas
• ⚡ Muito mais...

**O que deseja criar hoje?**`,
      agents: [],
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detectAgents = (text) => {
    const lower = text.toLowerCase();
    const activated = [];
    if (lower.includes("código") || lower.includes("script") || lower.includes("python") || lower.includes("programar")) {
      activated.push("developer", "architect", "qa");
    }
    if (lower.includes("design") || lower.includes("interface") || lower.includes("ux") || lower.includes("landing")) {
      activated.push("ux", "architect");
    }
    if (lower.includes("dados") || lower.includes("banco") || lower.includes("pipeline") || lower.includes("dashboard")) {
      activated.push("data", "analyst", "developer");
    }
    if (lower.includes("projeto") || lower.includes("plano") || lower.includes("estratégia")) {
      activated.push("pm", "po", "analyst");
    }
    if (lower.includes("bug") || lower.includes("erro") || lower.includes("problema")) {
      activated.push("rootcause", "qa", "developer");
    }
    if (lower.includes("proposta") || lower.includes("comercial") || lower.includes("venda")) {
      activated.push("po", "analyst", "soul");
    }
    if (activated.length === 0) activated.push("soul", "analyst");
    if (lower.includes("complexo") || lower.includes("sistema") || activated.length > 2) {
      activated.push("critico", "advogado", "sintetizador");
    }
    return [...new Set(activated)];
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const detected = detectAgents(input);
    setActiveAgents(detected);

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("") || "Erro ao processar.";

      setMessages(prev => [...prev, {
        role: "assistant",
        content: text,
        agents: detected,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Erro de conexão. Tente novamente.",
        agents: [],
      }]);
    } finally {
      setLoading(false);
      setActiveAgents([]);
      inputRef.current?.focus();
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c10",
      color: "#e2e8f0",
      fontFamily: "'Rajdhani', 'Orbitron', sans-serif",
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Orbitron:wght@400;700;900&family=Space+Mono&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #00d4ff44; border-radius: 2px; }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 10px #00d4ff44; }
          50% { opacity: 1; box-shadow: 0 0 20px #00d4ff88, 0 0 40px #00d4ff22; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes agent-activate {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .particle {
          position: absolute;
          border-radius: 50%;
          background: #00d4ff;
          pointer-events: none;
          animation: float linear infinite;
        }
        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, #00d4ff33, transparent);
          animation: scan 8s linear infinite;
          pointer-events: none;
        }
        .nav-btn {
          background: none;
          border: 1px solid #00d4ff22;
          color: #94a3b8;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          letter-spacing: 2px;
          transition: all 0.2s;
        }
        .nav-btn:hover, .nav-btn.active {
          border-color: #00d4ff;
          color: #00d4ff;
          background: #00d4ff11;
        }
        .agent-card {
          background: #0d1117;
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
          cursor: default;
        }
        .agent-card:hover {
          border-color: #00d4ff44;
          background: #0d1a24;
        }
        .agent-card.active {
          animation: agent-activate 0.4s ease;
          border-color: #00d4ff;
          background: #001a2e;
          box-shadow: 0 0 15px #00d4ff22;
        }
        .send-btn {
          background: linear-gradient(135deg, #00d4ff, #0088ff);
          border: none;
          color: #000;
          padding: 12px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 1px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .send-btn:hover { opacity: 0.9; transform: scale(1.02); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        
        .msg-user {
          animation: fadeIn 0.3s ease;
          align-self: flex-end;
          max-width: 80%;
          background: linear-gradient(135deg, #003a5c, #001d3d);
          border: 1px solid #00d4ff44;
          border-radius: 16px 16px 4px 16px;
          padding: 14px 18px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          line-height: 1.5;
        }
        .msg-assistant {
          animation: fadeIn 0.3s ease;
          align-self: flex-start;
          max-width: 90%;
          background: #0d1117;
          border: 1px solid #1e293b;
          border-radius: 4px 16px 16px 16px;
          padding: 16px 20px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          line-height: 1.6;
        }
        .typing-dot {
          display: inline-block;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #00d4ff;
          animation: blink 1s infinite;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #00d4ff, #ffffff, #00d4ff);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .deliverable-card {
          background: #0d1117;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .deliverable-card:hover {
          border-color: #00d4ff55;
          background: #0d1a24;
          transform: translateY(-2px);
        }
        textarea {
          background: #0d1117 !important;
          border: 1px solid #1e293b !important;
          color: #e2e8f0 !important;
          font-family: 'Rajdhani', sans-serif !important;
          font-size: 15px !important;
          resize: none !important;
          outline: none !important;
          border-radius: 10px !important;
          padding: 14px !important;
          width: 100% !important;
          transition: border-color 0.2s !important;
          line-height: 1.5 !important;
        }
        textarea:focus {
          border-color: #00d4ff44 !important;
        }
        textarea::placeholder { color: #4a5568 !important; }
      `}</style>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          opacity: p.opacity,
          animationDuration: `${p.speed}s`,
          animationDelay: `${-Math.random() * p.speed}s`,
        }} />
      ))}

      {/* Scan line */}
      <div className="scan-line" />

      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(#00d4ff08 1px, transparent 1px), linear-gradient(90deg, #00d4ff08 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#080c10ee",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #00d4ff22",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #00d4ff, #0088ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
            animation: "pulse-glow 2s infinite",
          }}>🤖</div>
          <div>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: 3,
            }} className="shimmer-text">JARVIS</div>
            <div style={{ fontSize: 10, color: "#4a9eff", letterSpacing: 2, fontFamily: "'Space Mono'" }}>
              {loading ? "PROCESSANDO..." : "3 CÉREBROS • 17 AGENTES • ONLINE"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className={`nav-btn ${view === "chat" ? "active" : ""}`} onClick={() => setView("chat")}>CHAT</button>
          <button className={`nav-btn ${view === "agents" ? "active" : ""}`} onClick={() => setView("agents")}>AGENTES</button>
          <button className={`nav-btn ${view === "deliverables" ? "active" : ""}`} onClick={() => setView("deliverables")}>ENTREGAS</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid #0d1a24",
        background: "#0a0e14",
      }}>
        {[
          { label: "AGENTES IA", value: "17" },
          { label: "CÉREBROS", value: "3" },
          { label: "AVALIAÇÃO", value: "5/5 ⭐" },
          { label: "JARVIS PRONTO", value: "< 1h" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1,
            padding: "10px 8px",
            textAlign: "center",
            borderRight: i < 3 ? "1px solid #0d1a24" : "none",
          }}>
            <div style={{ fontFamily: "'Orbitron'", fontSize: 16, fontWeight: 700, color: "#00d4ff" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "#4a5568", letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* CHAT VIEW */}
        {view === "chat" && (
          <>
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "msg-user" : "msg-assistant"}>
                  {msg.role === "assistant" && msg.agents?.length > 0 && (
                    <div style={{
                      marginBottom: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}>
                      {msg.agents.map(aid => {
                        const a = AGENTS.find(x => x.id === aid);
                        return a ? (
                          <span key={aid} style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: "#001a2e",
                            border: `1px solid ${a.color}44`,
                            color: a.color,
                            fontFamily: "'Space Mono'",
                          }}>{a.icon} {a.name}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                </div>
              ))}

              {loading && (
                <div className="msg-assistant">
                  <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {activeAgents.map(aid => {
                      const a = AGENTS.find(x => x.id === aid);
                      return a ? (
                        <span key={aid} className="agent-card active" style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 20,
                          background: "#001a2e", border: `1px solid ${a.color}`,
                          color: a.color, fontFamily: "'Space Mono'",
                        }}>{a.icon} {a.name}</span>
                      ) : null;
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#4a9eff" }}>Processando</span>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} className="typing-dot" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "16px",
              borderTop: "1px solid #00d4ff22",
              background: "#080c10",
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Descreva o que deseja criar... (Enter para enviar)"
                rows={2}
                disabled={loading}
              />
              <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
                ⚡<br/>ENVIAR
              </button>
            </div>

            {/* Quick actions */}
            <div style={{
              padding: "0 16px 14px",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              background: "#080c10",
            }}>
              {[
                "Cria uma landing page para minha agência de IA",
                "Faz uma proposta comercial para automação WhatsApp",
                "Script Python para automação de e-mails",
                "Dashboard de vendas mensal",
              ].map((q, i) => (
                <button key={i} onClick={() => setInput(q)} style={{
                  background: "none",
                  border: "1px solid #1e293b",
                  color: "#64748b",
                  padding: "6px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'Rajdhani'",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { e.target.style.borderColor = "#00d4ff44"; e.target.style.color = "#94a3b8"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#1e293b"; e.target.style.color = "#64748b"; }}
                >{q}</button>
              ))}
            </div>
          </>
        )}

        {/* AGENTS VIEW */}
        {view === "agents" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Orbitron'", fontSize: 22, fontWeight: 900 }} className="shimmer-text">
                17 AGENTES ESPECIALIZADOS
              </div>
              <div style={{ color: "#4a5568", fontSize: 13, marginTop: 6, fontFamily: "'Space Mono'" }}>
                Trabalhando simultaneamente pela sua missão
              </div>
            </div>

            {/* Brains */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: 2, marginBottom: 12, fontFamily: "'Orbitron'" }}>
                ⚡ 3 CÉREBROS ORQUESTRANDO
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "👑", name: "Claude Opus", label: "CÉREBRO PRINCIPAL", desc: "Raciocínio de nível PhD. Toma decisões estratégicas e coordena tudo.", color: "#fbbf24" },
                  { icon: "🧬", name: "Mega-Brain Conclave", label: "CÉREBRO COLETIVO", desc: "Crítico audita falhas. Advogado ataca o plano. Sintetizador integra a melhor solução.", color: "#a78bfa" },
                  { icon: "💎", name: "Obsidian Memory", label: "MEMÓRIA ETERNA", desc: "Cada conversa, preferência e aprendizado é armazenado. JARVIS fica mais inteligente.", color: "#34d399" },
                ].map((b, i) => (
                  <div key={i} style={{
                    background: "#0d1117",
                    border: `1px solid ${b.color}33`,
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                  }}>
                    <div style={{ fontSize: 32 }}>{b.icon}</div>
                    <div>
                      <div style={{ fontSize: 10, color: b.color, letterSpacing: 2, fontFamily: "'Orbitron'" }}>{b.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{b.name}</div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 4, fontFamily: "'Rajdhani'" }}>{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agents grid */}
            <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: 2, marginBottom: 12, fontFamily: "'Orbitron'" }}>
              ⚡ AGENTES ESPECIALIZADOS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {AGENTS.map(a => (
                <div key={a.id} className={`agent-card ${activeAgents.includes(a.id) ? "active" : ""}`}>
                  <span style={{ fontSize: 24 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: a.color, fontFamily: "'Orbitron'", fontSize: 11 }}>{a.name}</div>
                    <div style={{ color: "#4a5568", fontSize: 12, fontFamily: "'Rajdhani'" }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DELIVERABLES VIEW */}
        {view === "deliverables" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Orbitron'", fontSize: 20, fontWeight: 900 }} className="shimmer-text">
                DE IDEIA AO ENTREGÁVEL
              </div>
              <div style={{ color: "#4a5568", fontSize: 13, marginTop: 6, fontFamily: "'Space Mono'" }}>
                Você descreve — JARVIS constrói o arquivo completo
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {DELIVERABLES.map((d, i) => (
                <div key={i} className="deliverable-card" onClick={() => {
                  setView("chat");
                  setInput(`Cria um ${d.name.toLowerCase()} completo para mim`);
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: "#001a2e",
                        border: "1px solid #00d4ff22",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24,
                      }}>{d.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{d.name}</div>
                        <div style={{ color: "#64748b", fontSize: 13, marginTop: 4, fontFamily: "'Rajdhani'" }}>{d.desc}</div>
                      </div>
                    </div>
                    <div style={{
                      background: "#001a2e",
                      border: "1px solid #00d4ff33",
                      borderRadius: 20,
                      padding: "4px 10px",
                      fontSize: 11,
                      color: "#00d4ff",
                      fontFamily: "'Space Mono'",
                      whiteSpace: "nowrap",
                    }}>⏱ {d.time}</div>
                  </div>
                  <div style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    background: "#001a2e",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#4a9eff",
                    fontFamily: "'Space Mono'",
                  }}>
                    → Clique para criar agora
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 20,
              padding: 16,
              background: "#0d1117",
              border: "1px solid #00d4ff22",
              borderRadius: 12,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'Rajdhani'", lineHeight: 1.6 }}>
                Todos os 17 agentes trabalham <span style={{ color: "#00d4ff" }}>simultaneamente</span>.<br/>
                O que uma equipe humana levaria semanas, o JARVIS entrega em <span style={{ color: "#00d4ff" }}>minutos</span>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid #0d1117",
        background: "#080c10",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ fontSize: 10, color: "#1e293b", fontFamily: "'Space Mono'" }}>
          POWERED BY AGÊNCIADEIA
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: loading ? "#fbbf24" : "#00d4ff",
              animation: "pulse-glow 2s infinite",
              animationDelay: `${i * 0.3}s`,
            }} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#1e293b", fontFamily: "'Space Mono'" }}>
          v1.0 • 17 AGENTS
        </div>
      </div>
    </div>
  );
}
