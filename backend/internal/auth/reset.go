package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"html"
	"net/http"
	"strings"
	"time"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PasswordResetToken mapeia a tabela password_reset_tokens (migration 022).
type PasswordResetToken struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid"`
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}

// TableName força o nome da tabela (evita pluralização do GORM).
func (PasswordResetToken) TableName() string { return "password_reset_tokens" }

const resetTokenTTL = time.Hour

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

type forgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ForgotPassword: POST /api/v1/auth/forgot-password (pública)
// Sempre responde 200 genérico — não revela se o e-mail existe (anti-enumeração).
func (h *Handler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "informe um e-mail válido")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))

	generic := gin.H{"ok": true, "message": "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."}

	var user models.User
	if err := h.db.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		c.JSON(http.StatusOK, generic) // não existe: resposta genérica
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusOK, generic) // inativa: não envia, mas resposta idêntica
		return
	}

	// Gera token aleatório (32 bytes) e guarda apenas o hash.
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao gerar token")
		return
	}
	token := base64.RawURLEncoding.EncodeToString(raw)

	// Invalida tokens anteriores não usados do usuário.
	h.db.Where("user_id = ? AND used_at IS NULL", user.ID).Delete(&PasswordResetToken{})

	rec := PasswordResetToken{
		UserID:    user.ID,
		TokenHash: hashToken(token),
		ExpiresAt: time.Now().Add(resetTokenTTL),
	}
	if err := h.db.Create(&rec).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar solicitação")
		return
	}

	link := h.publicURL + "/redefinir-senha?token=" + token
	h.ml.SendAsync([]string{user.Email},
		"Redefinição de senha — CEC Engenharia",
		resetEmailHTML(user.FullName, link))

	c.JSON(http.StatusOK, generic)
}

type resetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// ResetPassword: POST /api/v1/auth/reset-password (pública)
// Consome um token válido e define a nova senha.
func (h *Handler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "token e senha (mín. 8 caracteres) são obrigatórios")
		return
	}

	var rec PasswordResetToken
	err := h.db.Where("token_hash = ? AND used_at IS NULL AND expires_at > ?",
		hashToken(strings.TrimSpace(req.Token)), time.Now()).First(&rec).Error
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "link inválido ou expirado — solicite um novo")
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", rec.UserID).Error; err != nil {
		httpx.Error(c, http.StatusBadRequest, "usuário não encontrado")
		return
	}

	hash, err := HashPassword(req.NewPassword)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao processar senha")
		return
	}

	// Atualiza senha e marca o token como usado (uso único).
	if err := h.db.Model(&user).Updates(map[string]any{
		"password_hash":        hash,
		"must_change_password": false,
	}).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar senha")
		return
	}
	now := time.Now()
	h.db.Model(&rec).Update("used_at", now)

	h.notifyPasswordChanged(&user)
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "Senha redefinida com sucesso."})
}

// notifyPasswordChanged envia (async) o e-mail de confirmação de troca de senha.
func (h *Handler) notifyPasswordChanged(user *models.User) {
	if user == nil || user.Email == "" {
		return
	}
	h.ml.SendAsync([]string{user.Email},
		"Sua senha foi alterada — CEC Engenharia",
		passwordChangedHTML(user.FullName))
}

// ─── Templates de e-mail (HTML simples, inline) ──────────────────────

func emailShell(inner string) string {
	return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">` +
		`<h2 style="color:#0f172a;margin:0 0 16px">CEC Engenharia</h2>` + inner +
		`<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">` +
		`<p style="font-size:12px;color:#9ca3af">Este é um e-mail automático — não responda.</p></div>`
}

func resetEmailHTML(name, link string) string {
	safe := html.EscapeString(strings.TrimSpace(name))
	if safe == "" {
		safe = "usuário"
	}
	return emailShell(
		`<p>Olá, ` + safe + `.</p>` +
			`<p>Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.</p>` +
			`<p style="text-align:center;margin:28px 0">` +
			`<a href="` + link + `" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block">Redefinir senha</a></p>` +
			`<p style="font-size:13px;color:#6b7280">Se você não solicitou isso, ignore este e-mail — sua senha continua a mesma.</p>`)
}

func passwordChangedHTML(name string) string {
	safe := html.EscapeString(strings.TrimSpace(name))
	if safe == "" {
		safe = "usuário"
	}
	return emailShell(
		`<p>Olá, ` + safe + `.</p>` +
			`<p>Confirmamos que a senha da sua conta foi alterada com sucesso.</p>` +
			`<p style="font-size:13px;color:#6b7280">Se não foi você, entre em contato com a secretaria imediatamente.</p>`)
}
