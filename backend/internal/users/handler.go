// Package users implementa o CRUD de usuários (identidade) com RBAC.
package users

import (
	"encoding/json"
	"html"
	"net/http"
	"strings"
	"time"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/mailer"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Validade do link de primeiro acesso enviado no e-mail de boas-vindas.
const welcomeTokenTTL = 72 * time.Hour
const studentPasswordResetTTL = 12 * time.Hour

type Handler struct {
	db        *gorm.DB
	ml        *mailer.Mailer
	publicURL string
}

func NewHandler(db *gorm.DB, ml *mailer.Mailer, publicURL string) *Handler {
	return &Handler{db: db, ml: ml, publicURL: strings.TrimRight(publicURL, "/")}
}

// toJSON serializa um map de permissões para datatypes.JSON.
func toJSON(m map[string]any) datatypes.JSON {
	b, err := json.Marshal(m)
	if err != nil {
		return datatypes.JSON([]byte("{}"))
	}
	return datatypes.JSON(b)
}

var validRoles = map[string]bool{
	"admin": true, "coordenador": true, "atendente": true,
	"instrutor": true, "aluno": true, "webdesigner": true,
}

// papéis "elevados" que só um admin pode criar/alterar/excluir.
func isElevated(role string) bool { return role == "admin" || role == "coordenador" }

// List: GET /users?role=admin,webdesigner
func (h *Handler) List(c *gin.Context) {
	q := h.db.Model(&models.User{}).Order("created_at DESC")
	if roleParam := c.Query("role"); roleParam != "" {
		roles := strings.Split(roleParam, ",")
		q = q.Where("role IN ?", roles)
	}
	list := []models.User{}
	if err := q.Find(&list).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao listar usuários")
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": list})
}

// Get: GET /users/:id
func (h *Handler) Get(c *gin.Context) {
	var user models.User
	if err := h.db.First(&user, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

type createRequest struct {
	Email       string         `json:"email" binding:"required,email"`
	Password    string         `json:"password" binding:"required,min=6"`
	FullName    string         `json:"full_name"`
	Role        string         `json:"role" binding:"required"`
	Phone       *string        `json:"phone"`
	CPF         *string        `json:"cpf"`
	Permissions map[string]any `json:"permissions"`
}

// Create: POST /users
func (h *Handler) Create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos: e-mail válido e senha (mín. 6) são obrigatórios")
		return
	}
	if !validRoles[req.Role] {
		httpx.Error(c, http.StatusBadRequest, "papel inválido")
		return
	}
	// Só admin cria papéis elevados.
	if isElevated(req.Role) && middleware.Role(c) != "admin" {
		httpx.Error(c, http.StatusForbidden, "apenas admin pode criar admin/coordenador")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	var existing int64
	h.db.Model(&models.User{}).Where("LOWER(email) = ?", email).Count(&existing)
	if existing > 0 {
		httpx.Error(c, http.StatusConflict, "já existe um usuário com este e-mail")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao processar senha")
		return
	}
	fullName := req.FullName
	if fullName == "" {
		fullName = email
	}
	user := models.User{
		Email:              email,
		PasswordHash:       hash,
		FullName:           fullName,
		Role:               req.Role,
		Phone:              req.Phone,
		CPF:                req.CPF,
		IsActive:           true,
		MustChangePassword: true, // senha criada por gestor é temporária
	}
	if req.Permissions != nil {
		user.Permissions = toJSON(req.Permissions)
	}
	if err := h.db.Create(&user).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar usuário")
		return
	}
	h.sendWelcome(&user)
	c.JSON(http.StatusCreated, gin.H{"user": user})
}

// sendWelcome envia (async) o e-mail de boas-vindas com um link de primeiro
// acesso para o usuário definir a própria senha (reaproveita o token de reset).
func (h *Handler) sendWelcome(user *models.User) {
	if user == nil || user.Email == "" || !h.ml.Enabled() {
		return
	}
	token, err := auth.IssueResetToken(h.db, user.ID, welcomeTokenTTL)
	if err != nil {
		return
	}
	link := h.publicURL + "/redefinir-senha?token=" + token
	name := html.EscapeString(strings.TrimSpace(user.FullName))
	if name == "" {
		name = "bem-vindo(a)"
	}
	body := `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">` +
		`<h2 style="color:#0f172a;margin:0 0 16px">CEC Engenharia</h2>` +
		`<p>Olá, ` + name + `.</p>` +
		`<p>Sua conta de acesso ao portal da CEC Engenharia foi criada. Para começar, defina a sua senha clicando no botão abaixo (o link vale por 3 dias):</p>` +
		`<p style="text-align:center;margin:28px 0"><a href="` + link + `" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block">Definir minha senha</a></p>` +
		`<p style="font-size:13px;color:#6b7280">Seu login é o e-mail <b>` + html.EscapeString(user.Email) + `</b>.</p>` +
		`<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">` +
		`<p style="font-size:12px;color:#9ca3af">Este é um e-mail automático — não responda.</p></div>`
	h.ml.SendAsync([]string{user.Email}, "Bem-vindo à CEC Engenharia — defina sua senha", body)
}

type updateRequest struct {
	FullName    *string        `json:"full_name"`
	Role        *string        `json:"role"`
	Phone       *string        `json:"phone"`
	CPF         *string        `json:"cpf"`
	IsActive    *bool          `json:"is_active"`
	Permissions map[string]any `json:"permissions"`
}

// Update: PUT /users/:id
func (h *Handler) Update(c *gin.Context) {
	var user models.User
	if err := h.db.First(&user, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	var req updateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}

	updates := map[string]any{}
	if req.FullName != nil {
		updates["full_name"] = *req.FullName
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.CPF != nil {
		updates["cpf"] = *req.CPF
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Role != nil {
		if !validRoles[*req.Role] {
			httpx.Error(c, http.StatusBadRequest, "papel inválido")
			return
		}
		// Mudar de/para papel elevado exige admin.
		if (isElevated(*req.Role) || isElevated(user.Role)) && middleware.Role(c) != "admin" {
			httpx.Error(c, http.StatusForbidden, "apenas admin pode alterar papéis elevados")
			return
		}
		updates["role"] = *req.Role
	}
	if req.Permissions != nil {
		updates["permissions"] = toJSON(req.Permissions)
	}

	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar usuário")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// ResetPassword: POST /users/:id/reset-password — gestor define nova senha temporária.
func (h *Handler) ResetPassword(c *gin.Context) {
	var user models.User
	if err := h.db.First(&user, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	var body struct {
		Password string `json:"password" binding:"required,min=4"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "senha inválida")
		return
	}
	hash, err := auth.HashPassword(body.Password)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao processar senha")
		return
	}
	h.db.Model(&user).Updates(map[string]any{"password_hash": hash, "must_change_password": true})
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// SendPasswordReset: POST /users/:id/send-password-reset — envia ao usuário
// um link de uso único para ele próprio escolher a nova senha. A senha atual
// permanece válida até a conclusão do fluxo.
func (h *Handler) SendPasswordReset(c *gin.Context) {
	var user models.User
	if err := h.db.First(&user, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	if strings.TrimSpace(user.Email) == "" {
		httpx.Error(c, http.StatusUnprocessableEntity, "o aluno não possui e-mail cadastrado")
		return
	}
	if !user.IsActive {
		httpx.Error(c, http.StatusUnprocessableEntity, "a conta do aluno está inativa")
		return
	}
	if !h.ml.Enabled() {
		httpx.Error(c, http.StatusServiceUnavailable, "envio de e-mail não configurado")
		return
	}

	token, err := auth.IssueResetToken(h.db, user.ID, studentPasswordResetTTL)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao gerar link de redefinição")
		return
	}
	link := h.publicURL + "/redefinir-senha?token=" + token
	name := html.EscapeString(strings.TrimSpace(user.FullName))
	if name == "" {
		name = "aluno(a)"
	}
	body := `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">` +
		`<h2 style="color:#0f172a;margin:0 0 16px">CEC Engenharia</h2>` +
		`<p>Olá, ` + name + `.</p>` +
		`<p>A Secretaria solicitou a redefinição da senha do seu acesso ao Portal do Aluno. Clique no botão abaixo para criar uma nova senha.</p>` +
		`<p><strong>Este link é de uso único e expira em 12 horas.</strong></p>` +
		`<p style="text-align:center;margin:28px 0"><a href="` + link + `" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block">Criar nova senha</a></p>` +
		`<p style="font-size:13px;color:#6b7280">Se você não reconhece esta solicitação, ignore este e-mail e entre em contato com a Secretaria.</p>` +
		`<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">` +
		`<p style="font-size:12px;color:#9ca3af">Este é um e-mail automático — não responda.</p></div>`
	h.ml.SendAsync([]string{user.Email}, "Crie uma nova senha — Portal do Aluno CEC", body)

	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "Link enviado para o e-mail do aluno.", "expires_in_hours": 12})
}

// LinkStudentAccount recupera matrículas sem user_id: vincula uma conta aluno
// existente pelo e-mail ou cria uma nova identidade quando necessário.
func (h *Handler) LinkStudentAccount(c *gin.Context) {
	var student models.Student
	if err := h.db.First(&student, "id = ?", c.Param("studentId")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "aluno não encontrado")
		return
	}
	if student.UserID != nil {
		var linked models.User
		if h.db.First(&linked, "id = ?", *student.UserID).Error == nil {
			c.JSON(http.StatusOK, gin.H{"user": linked, "linked": true, "created": false})
			return
		}
	}
	if student.Email == nil || strings.TrimSpace(*student.Email) == "" {
		httpx.Error(c, http.StatusUnprocessableEntity, "cadastre o e-mail do aluno antes de vincular a conta")
		return
	}
	email := strings.ToLower(strings.TrimSpace(*student.Email))
	var user models.User
	created := false
	if err := h.db.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		hash, hashErr := auth.HashPassword(uuid.NewString() + uuid.NewString())
		if hashErr != nil {
			httpx.Error(c, http.StatusInternalServerError, "falha ao preparar a conta")
			return
		}
		user = models.User{Email: email, PasswordHash: hash, FullName: student.FullName, Role: "aluno", CPF: &student.CPF, Phone: student.Phone, IsActive: true, MustChangePassword: true}
		if err := h.db.Create(&user).Error; err != nil {
			httpx.Error(c, http.StatusConflict, "não foi possível criar a conta do aluno")
			return
		}
		created = true
	} else if user.Role != "aluno" {
		httpx.Error(c, http.StatusConflict, "o e-mail está vinculado a uma conta que não é de aluno")
		return
	}
	if err := h.db.Model(&student).Update("user_id", user.ID).Error; err != nil {
		if created {
			h.db.Delete(&user)
		}
		httpx.Error(c, http.StatusInternalServerError, "falha ao vincular a conta ao aluno")
		return
	}
	if created {
		h.sendWelcome(&user)
	}
	c.JSON(http.StatusOK, gin.H{"user": user, "linked": true, "created": created})
}

// Delete: DELETE /users/:id
func (h *Handler) Delete(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "id inválido")
		return
	}
	if targetID == middleware.UserID(c) {
		httpx.Error(c, http.StatusForbidden, "não é possível excluir a própria conta")
		return
	}
	var user models.User
	if err := h.db.First(&user, "id = ?", targetID).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	if isElevated(user.Role) && middleware.Role(c) != "admin" {
		httpx.Error(c, http.StatusForbidden, "apenas admin pode excluir admin/coordenador")
		return
	}
	if err := h.db.Delete(&user).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir usuário")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
