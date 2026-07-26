package maria

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

// ChatMsg é uma mensagem do histórico de conversa (memória do agente).
type ChatMsg struct {
	Role    string // "user" | "assistant"
	Content string
}

// systemPrompt replica o agente de vendas "Maria Antônia" que rodava no n8n,
// agora interno. A lista de cursos/preços é injetada em {contextInfo} a cada
// chamada a partir do banco (nunca inventada).
const systemPrompt = `Você é a Maria Antônia, assistente virtual de vendas da C&C Engenharia e Capacitação, especializada em cursos de Ensaios Não Destrutivos (END) e Controle Dimensional, localizada no Rio de Janeiro/RJ (Rua Treze nº 2, Santa Cruz – RJ). Seu objetivo é qualificar leads, tirar dúvidas com boa técnica de vendas e conduzir o interessado até a matrícula. Ao iniciar um atendimento, apresente-se como Maria Antônia e informe que é um agente virtual.

# OBJETIVO
Converter cada contato em aluno matriculado. Todo contato deve ser tratado como um lead.

# FLUXO OBRIGATÓRIO (siga sempre esta ordem)
1) PRIMEIRA MENSAGEM: cumprimente, apresente-se como Maria Antônia e pergunte o *nome completo* do interessado. NUNCA explique cursos ou dê preços antes de saber o nome.
2) APÓS RECEBER O NOME: apresente os cursos disponíveis SOMENTE a partir da lista real do sistema (abaixo). Envie apenas uma lista numerada com o TÍTULO e a SIGLA de cada curso (ex.: "1. Inspetor Dimensional Caldeiraria e Tubulação (CD-CL)"), SEM valores nem carga horária. Cada curso (código) aparece uma única vez. Inclua também a opção de falar com um atendente humano.
3) APÓS ESCOLHER O CURSO: mostre os detalhes completos do curso escolhido com os DADOS REAIS do sistema (carga horária e condições de pagamento: PIX, cartão, boleto, financiamento). Na mesma mensagem, oriente a matrícula. Se o curso tiver turma/data confirmada no sistema, informe a data; caso contrário, ofereça pré-cadastro para avisar quando a turma abrir. Convide para o grupo da comunidade no WhatsApp quando fizer sentido.
4) OBJEÇÕES ("está caro", "vou pensar", indecisão): seja simpática e convide para o grupo da comunidade no WhatsApp para acompanhar novidades e promoções, mantendo o contato.

# REGRAS
- NUNCA invente valores, carga horária ou datas. Use SOMENTE os dados do sistema abaixo. Se um dado não existir, diga "Consultar".
- Trate erros de digitação com barra (ex.: "/2") como a opção "2".
- Datas sempre no formato brasileiro DD/MM/AAAA (nunca ISO).
- Não discuta assuntos fora do contexto da C&C. Não aceite pagamentos diretos — direcione para o site/checkout. Não compartilhe dados de outros alunos. Não prometa aprovação em certificações (Abendi/SNQC).
- Diferencial: treinamentos práticos focados nos exames da Abendi, com alto índice de aprovação; cursos preparatórios para certificação.
- Horário de atendimento humano: seg a sex, 8h às 18h.

# HANDOFF PARA HUMANO
Se o cliente pedir para falar com um atendente humano, responda: "Com certeza! Vou chamar uma atendente agora. Aguarde um momento. 😊"

# FECHAMENTO / LEAD (IMPORTANTE)
Quando você souber o NOME e o CURSO de interesse e o cliente confirmar que quer se matricular, finalize assim, terminando a mensagem exatamente com o marcador:
"Perfeito, [NOME]! Anotei seu interesse no curso [CURSO]. Nossa equipe entra em contato em breve pelo WhatsApp! 😊 INTERESSE_MATRICULA"
O marcador INTERESSE_MATRICULA deve aparecer apenas nesse momento e sempre no fim da mensagem.`

// GenerateReply chama o provedor de IA configurado (Settings) com o histórico
// da conversa. Sem chave, devolve um fallback útil que oferece atendente humano.
func GenerateReply(s Settings, contextInfo string, history []ChatMsg, userMessage string) string {
	if s.APIKey == "" {
		return "Olá! Sou a Maria Antônia da C&C Engenharia. No momento o atendimento automático está limitado — posso te encaminhar para uma atendente humana. Digite *8* para falar com uma pessoa."
	}
	system := s.SystemPrompt + "\n\n# CURSOS DISPONÍVEIS NO SISTEMA (use apenas estes dados)\n" + contextInfo
	model := s.Model
	if model == "" {
		model = defaultModel
	}
	switch s.Provider {
	case "openai":
		if r, err := callOpenAI(s.APIKey, model, system, history, userMessage); err == nil && r != "" {
			return r
		}
	default: // anthropic (padrão)
		if r, err := callAnthropic(s.APIKey, model, system, history, userMessage); err == nil && r != "" {
			return r
		}
	}
	return "Desculpe, tive um problema para responder agora. Posso te encaminhar para uma atendente? Digite *8*."
}

// buildMessages converte o histórico + mensagem atual num array de mensagens
// válido (começa em user, alterna papéis) para a API de chat.
func buildMessages(history []ChatMsg, userMessage string) []map[string]any {
	msgs := make([]map[string]any, 0, len(history)+1)
	last := ""
	for _, m := range history {
		role := m.Role
		if role != "user" && role != "assistant" {
			continue
		}
		// Garante início em user e alternância (a API rejeita papéis repetidos).
		if len(msgs) == 0 && role != "user" {
			continue
		}
		if role == last {
			continue
		}
		msgs = append(msgs, map[string]any{"role": role, "content": m.Content})
		last = role
	}
	// Mensagem atual é sempre um turno de user no fim.
	if last == "user" && len(msgs) > 0 {
		// evita dois user seguidos: funde na última
		msgs[len(msgs)-1]["content"] = msgs[len(msgs)-1]["content"].(string) + "\n" + userMessage
	} else {
		msgs = append(msgs, map[string]any{"role": "user", "content": userMessage})
	}
	return msgs
}

func callAnthropic(key, model, system string, history []ChatMsg, userMessage string) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model":      model,
		"max_tokens": 700,
		"system":     system,
		"messages":   buildMessages(history, userMessage),
	})
	req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", key)
	req.Header.Set("anthropic-version", "2023-06-01")
	return doAI(req, func(m map[string]any) string {
		if content, ok := m["content"].([]any); ok && len(content) > 0 {
			if first, ok := content[0].(map[string]any); ok {
				if t, ok := first["text"].(string); ok {
					return t
				}
			}
		}
		return ""
	})
}

func callOpenAI(key, model, system string, history []ChatMsg, userMessage string) (string, error) {
	msgs := []map[string]any{{"role": "system", "content": system}}
	msgs = append(msgs, buildMessages(history, userMessage)...)
	if model == "" {
		model = "gpt-4o-mini"
	}
	body, _ := json.Marshal(map[string]any{
		"model":    model,
		"messages": msgs,
	})
	req, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	return doAI(req, func(m map[string]any) string {
		if ch, ok := m["choices"].([]any); ok && len(ch) > 0 {
			if c0, ok := ch[0].(map[string]any); ok {
				if msg, ok := c0["message"].(map[string]any); ok {
					if t, ok := msg["content"].(string); ok {
						return t
					}
				}
			}
		}
		return ""
	})
}

func doAI(req *http.Request, extract func(map[string]any) string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return "", err
	}
	return extract(m), nil
}
