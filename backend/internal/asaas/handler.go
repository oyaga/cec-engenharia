package asaas

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/mailer"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TestConnection: POST /payments/test-connection (staff)
// Testa uma chave Asaas digitada pelo admin — server-side, sem expor a chave
// no browser e sem depender do proxy do Vite (que só existe em dev).
func (h *Handler) TestConnection(c *gin.Context) {
	var body struct {
		APIKey      string `json:"api_key" binding:"required"`
		Environment string `json:"environment"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "api_key é obrigatória")
		return
	}
	baseURL := "https://sandbox.asaas.com/api/v3"
	if strings.EqualFold(body.Environment, "production") {
		baseURL = "https://api.asaas.com/api/v3"
	}
	req, _ := http.NewRequest("GET", baseURL+"/myAccount", nil)
	req.Header.Set("access_token", strings.TrimSpace(body.APIKey))
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"connected": false, "message": "Erro de rede ao conectar ao Asaas."})
		return
	}
	defer resp.Body.Close()
	var data map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&data)
	if resp.StatusCode == http.StatusOK {
		c.JSON(http.StatusOK, gin.H{"connected": true, "name": data["name"], "cpfCnpj": data["cpfCnpj"]})
		return
	}
	msg := "Chave inválida ou sem permissão."
	if errs, ok := data["errors"].([]any); ok && len(errs) > 0 {
		if e0, ok := errs[0].(map[string]any); ok {
			if d, ok := e0["description"].(string); ok {
				msg = d
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{"connected": false, "message": msg})
}

type Handler struct {
	db        *gorm.DB
	cfg       *config.Config
	client    *Client
	ml        *mailer.Mailer
	publicURL string
}

func NewHandler(db *gorm.DB, cfg *config.Config, ml *mailer.Mailer) *Handler {
	return &Handler{db: db, cfg: cfg, client: NewClient(db, cfg), ml: ml, publicURL: cfg.PublicURL}
}

var billingByMethod = map[string]string{
	"pix": "PIX", "credit_card": "CREDIT_CARD", "boleto": "BOLETO",
}

type checkoutRequest struct {
	Name          string     `json:"name" binding:"required"`
	CPF           string     `json:"cpf" binding:"required"`
	Email         string     `json:"email"`
	Phone         string     `json:"phone"`
	CourseID      *uuid.UUID `json:"course_id"`
	CourseName    string     `json:"course_name"`
	PaymentMethod string     `json:"payment_method"`
	EnrollmentID  *uuid.UUID `json:"enrollment_id"`
}

// resolvePrice pega o preço OFICIAL do curso no banco (nunca confia no cliente).
func (h *Handler) resolvePrice(req checkoutRequest) (float64, *models.LMSCourse) {
	var course models.LMSCourse
	q := h.db
	if req.CourseID != nil {
		q = q.Where("id = ?", *req.CourseID)
	} else {
		q = q.Where("title = ?", req.CourseName)
	}
	if err := q.First(&course).Error; err != nil {
		return 0, nil
	}
	pick := func(p *float64) float64 {
		if p != nil {
			return *p
		}
		return 0
	}
	var val float64
	switch req.PaymentMethod {
	case "pix":
		val = pick(course.PricePix)
	case "credit_card":
		val = pick(course.PriceCard)
	case "boleto":
		val = pick(course.PriceBoleto)
	}
	if val == 0 {
		val = pick(course.DefaultValue)
	}
	// A Secretaria define os valores comerciais na turma. Quando o catálogo do
	// curso não tem preço, usa a próxima turma vinculada ao curso para manter o
	// checkout igual ao valor exibido no site.
	if val == 0 {
		var class models.Class
		classQuery := h.db.Where("lms_course_id = ?", course.ID)
		if err := classQuery.Where("start_date >= CURRENT_DATE").Order("start_date ASC").First(&class).Error; err != nil {
			_ = h.db.Where("lms_course_id = ?", course.ID).Order("created_at DESC").First(&class).Error
		}
		switch req.PaymentMethod {
		case "pix":
			val = class.PriceCash
		case "credit_card":
			val = class.PriceCard10x
		case "boleto":
			val = class.PriceInstallments3x
		}
	}
	return val, &course
}

// Checkout: POST /payments/checkout (sem auth — vem do site).
// Substitui a Edge Function asaas-checkout. Preço calculado no servidor.
func (h *Handler) Checkout(c *gin.Context) {
	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "pix"
	}
	billing, ok := billingByMethod[req.PaymentMethod]
	if !ok {
		httpx.Error(c, http.StatusBadRequest, "forma de pagamento inválida")
		return
	}
	price, course := h.resolvePrice(req)
	if course == nil || price <= 0 {
		httpx.Error(c, http.StatusBadRequest, "preço do curso não configurado — consultar equipe")
		return
	}

	cpf := strings.ReplaceAll(strings.ReplaceAll(req.CPF, ".", ""), "-", "")
	extRef := ""
	if req.EnrollmentID != nil {
		extRef = req.EnrollmentID.String()
	}

	cust, err := h.client.CreateOrFindCustomer(req.Name, cpf, req.Email, req.Phone, extRef)
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	custID, _ := cust["id"].(string)

	payment, err := h.client.CreatePayment(map[string]any{
		"customer":          custID,
		"billingType":       billing,
		"value":             price,
		"dueDate":           time.Now().Format("2006-01-02"),
		"description":       "Matrícula: " + course.Title,
		"externalReference": extRef,
	})
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"invoiceUrl": payment["invoiceUrl"],
		"id":         payment["id"],
		"status":     payment["status"],
		"value":      price,
	})
}

// ─── Proxies granulares (staff) — a chave nunca vai ao browser ───

type customerRequest struct {
	Name  string `json:"name"`
	CPF   string `json:"cpf"`
	Email string `json:"email"`
	Phone string `json:"phone"`
	ID    string `json:"id"`
}

// Customer: POST /payments/customer — cria/reaproveita cliente no Asaas.
func (h *Handler) Customer(c *gin.Context) {
	var req customerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	cpf := strings.NewReplacer(".", "", "-", "", "/", "").Replace(req.CPF)
	cust, err := h.client.CreateOrFindCustomer(req.Name, cpf, req.Email, req.Phone, req.ID)
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, cust)
}

// CreateCharge: POST /payments/create — cria cobrança (payload já no formato Asaas).
func (h *Handler) CreateCharge(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	res, err := h.client.CreatePayment(payload)
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, res)
}

// PixQrCode: GET /payments/:id/pix-qrcode
func (h *Handler) PixQrCode(c *gin.Context) {
	res, err := h.client.GetPixQrCode(c.Param("id"))
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, res)
}

// PaymentLink: POST /payments/link
func (h *Handler) PaymentLink(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	res, err := h.client.CreatePaymentLink(payload)
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, res)
}

// Search: GET /payments?ref=|customer=|all=true — busca cobranças no Asaas.
func (h *Handler) Search(c *gin.Context) {
	var res map[string]any
	var err error
	switch {
	case c.Query("ref") != "":
		res, err = h.client.ListPaymentsByRef(c.Query("ref"))
	case c.Query("customer") != "":
		res, err = h.client.ListByCustomer(c.Query("customer"))
	case c.Query("all") == "true":
		res, err = h.client.ListAll(100)
	default:
		httpx.Error(c, http.StatusBadRequest, "informe ref, customer ou all")
		return
	}
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, res)
}

// Status: GET /payments/:id/status (auth) — proxy de consulta.
func (h *Handler) Status(c *gin.Context) {
	p, err := h.client.GetPayment(c.Param("id"))
	if err != nil {
		httpx.Error(c, http.StatusBadGateway, "Asaas: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"payment": p})
}

// webhookToken resolve o token esperado: system_settings tem prioridade
// (configurável pela tela ConfigAsaas), com fallback para a variável de ambiente.
func (h *Handler) webhookToken() string {
	var s models.SystemSetting
	if h.db.Where("key = ?", "asaas_webhook_token").First(&s).Error == nil && s.Value != nil && *s.Value != "" {
		return *s.Value
	}
	return h.cfg.AsaasWebhookToken
}

// Webhook: POST /webhooks/asaas — valida token e processa pagamento.
func (h *Handler) Webhook(c *gin.Context) {
	// Verificação de autenticidade: header asaas-access-token == token configurado.
	expected := h.webhookToken()
	if expected != "" {
		if c.GetHeader("asaas-access-token") != expected {
			httpx.Error(c, http.StatusUnauthorized, "webhook não autorizado")
			return
		}
	}
	var body struct {
		Event   string `json:"event"`
		Payment struct {
			ID                string  `json:"id"`
			ExternalReference string  `json:"externalReference"`
			Value             float64 `json:"value"`
			BillingType       string  `json:"billingType"`
			Status            string  `json:"status"`
		} `json:"payment"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "payload inválido")
		return
	}

	paidEvents := map[string]bool{"PAYMENT_RECEIVED": true, "PAYMENT_CONFIRMED": true}
	if paidEvents[body.Event] && body.Payment.ExternalReference != "" {
		// Marca a matrícula como paga.
		h.db.Model(&models.Enrollment{}).
			Where("id = ?", body.Payment.ExternalReference).
			Update("status", "paid")

		// Log de onboarding (idempotente por asaas_payment_id).
		var count int64
		h.db.Model(&models.OnboardingLog{}).Where("asaas_payment_id = ?", body.Payment.ID).Count(&count)
		if count == 0 {
			h.db.Exec(`INSERT INTO onboarding_logs (asaas_payment_id, payment_value, payment_method) VALUES (?, ?, ?)`,
				body.Payment.ID, body.Payment.Value, body.Payment.BillingType)
		}

		// Ativação automática: cria o aluno, vincula à turma e libera o EAD.
		var enr models.Enrollment
		if h.db.First(&enr, "id = ?", body.Payment.ExternalReference).Error == nil {
			h.activateStudent(&enr)
		}
	}
	c.JSON(http.StatusOK, gin.H{"received": true})
}
