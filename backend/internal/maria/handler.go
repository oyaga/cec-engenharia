// Package maria implementa a atendente Maria Antônia (WhatsApp) internamente,
// substituindo o fluxo n8n: recebe o webhook da Evolution API, gerencia o
// handoff humano (tabela atendimentos), mantém memória de conversa, detecta
// intenção, captura leads e responde via IA.
package maria

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewHandler(db *gorm.DB, cfg *config.Config) *Handler { return &Handler{db: db, cfg: cfg} }

// Payload da Evolution API (campos usados).
type evoPayload struct {
	Instance string `json:"instance"`
	Body     struct {
		Data struct {
			Key struct {
				RemoteJid    string `json:"remoteJid"`
				RemoteJidAlt string `json:"remoteJidAlt"`
				FromMe       bool   `json:"fromMe"`
			} `json:"key"`
			PushName string `json:"pushName"`
			Message  struct {
				Conversation    string `json:"conversation"`
				ExtendedTextMsg struct {
					Text string `json:"text"`
				} `json:"extendedTextMessage"`
			} `json:"message"`
		} `json:"data"`
		ServerURL string `json:"server_url"`
		Apikey    string `json:"apikey"`
	} `json:"body"`
}

// Marcador que o agente emite ao fechar um lead quente.
const interesseMarker = "INTERESSE_MATRICULA"

// historyLimit — quantas mensagens anteriores dar de contexto ao agente.
const historyLimit = 12

func isHandoff(msg string, keywords []string) bool {
	m := strings.ToLower(strings.TrimSpace(msg))
	if m == "8" || m == "8." || strings.Contains(m, "opção 8") || strings.Contains(m, "opcao 8") {
		return true
	}
	for _, k := range keywords {
		if strings.Contains(m, k) {
			return true
		}
	}
	return false
}

func (h *Handler) getStatus(sessionID string) string {
	var a models.Atendimento
	if err := h.db.First(&a, "session_id = ?", sessionID).Error; err != nil {
		return "bot"
	}
	return a.Status
}

func (h *Handler) setStatus(sessionID, status, name string) {
	h.db.Exec(`INSERT INTO atendimentos (session_id, status, nome_cliente, ultimo_contato)
		VALUES (?, ?, ?, NOW())
		ON CONFLICT (session_id) DO UPDATE SET status = EXCLUDED.status, ultimo_contato = NOW()`,
		sessionID, status, name)
}

// ── Memória de conversa ──────────────────────────────────────────────

func (h *Handler) loadHistory(sessionID string) []ChatMsg {
	var rows []models.MariaMessage
	h.db.Where("session_id = ?", sessionID).
		Order("created_at DESC").Limit(historyLimit).Find(&rows)
	// vieram do mais novo p/ o mais velho — inverter para ordem cronológica.
	out := make([]ChatMsg, 0, len(rows))
	for i := len(rows) - 1; i >= 0; i-- {
		out = append(out, ChatMsg{Role: rows[i].Role, Content: rows[i].Content})
	}
	return out
}

func (h *Handler) saveMessage(sessionID, role, content string) {
	if strings.TrimSpace(content) == "" {
		return
	}
	h.db.Create(&models.MariaMessage{SessionID: sessionID, Role: role, Content: content})
}

// ── Contexto de cursos para a IA ─────────────────────────────────────

func formatBRL(v *float64) string {
	if v == nil || *v <= 0 {
		return "Consultar"
	}
	return fmt.Sprintf("R$ %.2f", *v)
}

// courseContext monta um resumo dos cursos publicados (título, sigla, preços,
// parcelas, carga horária) para o agente usar — nunca inventar.
func (h *Handler) courseContext() string {
	var courses []models.LMSCourse
	h.db.Where("is_published = ?", true).Order("code").Find(&courses)
	if len(courses) == 0 {
		return "(nenhum curso publicado no momento — ofereça encaminhar para uma atendente humana)"
	}
	seen := map[string]bool{}
	var b strings.Builder
	for _, c := range courses {
		code := ""
		if c.Code != nil {
			code = *c.Code
		}
		if code != "" {
			if seen[code] {
				continue
			}
			seen[code] = true
		}
		// carga horária = teórica + prática
		hours := 0.0
		if c.MinTheoreticalHours != nil {
			hours += float64(*c.MinTheoreticalHours)
		}
		if c.PracticalHours != nil {
			hours += *c.PracticalHours
		}
		// parcelas no cartão
		card := "Consultar"
		if c.PriceCard != nil && *c.PriceCard > 0 {
			maxInst := 10
			if c.MaxInstallments != nil && *c.MaxInstallments > 0 {
				maxInst = *c.MaxInstallments
			}
			card = fmt.Sprintf("%dx de R$ %.2f", maxInst, *c.PriceCard/float64(maxInst))
		}
		financing := "Consultar"
		if c.FinancingInstallments != nil && *c.FinancingInstallments > 0 {
			financing = fmt.Sprintf("até %dx (financiamento C&C)", *c.FinancingInstallments)
		}
		sigla := code
		if sigla == "" {
			sigla = "sem código"
		}
		b.WriteString(fmt.Sprintf("- %s (%s) | PIX: %s | Cartão: %s | Boleto: %s | Financiamento: %s | Carga horária: %.0fh\n",
			c.Title, sigla, formatBRL(c.PricePix), card, formatBRL(c.PriceBoleto), financing, hours))
	}
	return b.String()
}

// ── Captura de lead ──────────────────────────────────────────────────

func phoneFromJid(jid string) string {
	if i := strings.Index(jid, "@"); i >= 0 {
		return jid[:i]
	}
	return jid
}

// upsertLead cria/atualiza um lead pelo telefone. Não rebaixa o status
// (novo → interessado é permitido; o contrário não).
func (h *Handler) upsertLead(phone, name, message, status string) {
	if phone == "" {
		return
	}
	origem := "whatsapp_maria"
	var lead models.Lead
	err := h.db.Where("phone = ?", phone).First(&lead).Error
	if err == nil {
		if name != "" {
			lead.Name = name
		}
		if message != "" {
			lead.Message = &message
		}
		if status == "interessado" {
			lead.Status = "interessado"
		}
		lead.Origem = &origem
		h.db.Save(&lead)
		return
	}
	if name == "" {
		name = phone
	}
	h.db.Create(&models.Lead{
		Name:    name,
		Phone:   phone,
		Message: &message,
		Status:  status,
		Origem:  &origem,
	})
}

// Webhook: POST /webhooks/whatsapp
func (h *Handler) Webhook(c *gin.Context) {
	var p evoPayload
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusOK, gin.H{"ignored": true})
		return
	}
	d := p.Body.Data
	remoteJid := d.Key.RemoteJidAlt
	if remoteJid == "" {
		remoteJid = d.Key.RemoteJid
	}
	conversation := d.Message.Conversation
	if conversation == "" {
		conversation = d.Message.ExtendedTextMsg.Text
	}
	serverURL, instance, apikey := p.Body.ServerURL, p.Instance, p.Body.Apikey

	// Config efetiva da Maria (system_settings > env > padrão) — editável pelo admin.
	cfgm := loadSettings(h.db, h.cfg)
	attendant := cfgm.Attendant

	// ── Comandos da atendente ──
	if attendant != "" && remoteJid == attendant {
		parts := strings.Fields(conversation)
		if len(parts) >= 1 {
			cmd := strings.ToLower(parts[0])
			target := ""
			if len(parts) >= 2 {
				target = parts[1]
				if !strings.Contains(target, "@") {
					target += "@s.whatsapp.net"
				}
			}
			if cmd == "/liberar" && target != "" {
				h.setStatus(target, "bot", "")
			} else if cmd == "/parar" && target != "" {
				h.setStatus(target, "humano", "")
			}
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
		return
	}

	// Ignora mensagens enviadas pela própria conta (evita loop).
	if d.Key.FromMe {
		c.JSON(http.StatusOK, gin.H{"ignored": "fromMe"})
		return
	}
	if strings.TrimSpace(conversation) == "" {
		c.JSON(http.StatusOK, gin.H{"ignored": "empty"})
		return
	}

	// ── Handoff: cliente pediu atendente ──
	if isHandoff(conversation, cfgm.HandoffKeywords) {
		h.setStatus(remoteJid, "humano", d.PushName)
		_ = SendText(serverURL, instance, apikey, remoteJid,
			"Entendido! 🙋 Vou chamar uma de nossas atendentes agora. Aguarde um instante que já te respondemos! 😊")
		if attendant != "" {
			_ = SendText(serverURL, instance, apikey, strings.TrimSuffix(attendant, "@s.whatsapp.net"),
				"🔔 Cliente "+d.PushName+" ("+remoteJid+") pediu atendimento humano.")
		}
		c.JSON(http.StatusOK, gin.H{"handoff": true})
		return
	}

	// ── Em atendimento humano: bot fica em silêncio ──
	if h.getStatus(remoteJid) == "humano" {
		c.JSON(http.StatusOK, gin.H{"silent": "humano"})
		return
	}

	// ── Bot desligado pelo admin: não responde automaticamente ──
	if !cfgm.Enabled {
		c.JSON(http.StatusOK, gin.H{"disabled": true})
		return
	}

	// ── Resposta da IA (com memória de conversa) ──
	history := h.loadHistory(remoteJid)
	reply := GenerateReply(cfgm, h.courseContext(), history, conversation)

	// Registra a conversa (memória).
	h.saveMessage(remoteJid, "user", conversation)
	h.saveMessage(remoteJid, "assistant", reply)

	// Todo contato vira lead (status novo). Se o agente sinalizou interesse
	// de matrícula, sobe para "interessado" e avisa a atendente.
	phone := phoneFromJid(remoteJid)
	if strings.Contains(reply, interesseMarker) {
		reply = strings.TrimSpace(strings.ReplaceAll(reply, interesseMarker, ""))
		reply = strings.TrimSpace(strings.TrimSuffix(reply, "##"))
		h.upsertLead(phone, d.PushName, conversation, "interessado")
		if attendant != "" {
			_ = SendText(serverURL, instance, apikey, strings.TrimSuffix(attendant, "@s.whatsapp.net"),
				"🎓 Novo interesse de matrícula!\nCliente: "+d.PushName+" ("+phone+")")
		}
	} else {
		h.upsertLead(phone, d.PushName, conversation, "novo")
	}

	_ = SendText(serverURL, instance, apikey, remoteJid, reply)
	h.setStatus(remoteJid, "bot", d.PushName)
	c.JSON(http.StatusOK, gin.H{"replied": true})
}
