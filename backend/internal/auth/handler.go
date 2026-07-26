package auth

import (
	"net/http"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/mailer"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Handler agrupa as rotas de autenticação.
type Handler struct {
	db        *gorm.DB
	tm        *TokenManager
	ml        *mailer.Mailer
	publicURL string // base do site, ex.: https://cursocec.com.br
}

func NewHandler(db *gorm.DB, tm *TokenManager, ml *mailer.Mailer, publicURL string) *Handler {
	return &Handler{db: db, tm: tm, ml: ml, publicURL: strings.TrimRight(publicURL, "/")}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Login: POST /api/v1/auth/login
func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "e-mail e senha são obrigatórios")
		return
	}

	var user models.User
	email := strings.ToLower(strings.TrimSpace(req.Email))
	// Comparação case-insensitive de e-mail (índice LOWER(email)).
	err := h.db.Where("LOWER(email) = ?", email).First(&user).Error
	if err != nil {
		// Mensagem genérica: não revela se o e-mail existe.
		httpx.Error(c, http.StatusUnauthorized, "e-mail ou senha incorretos")
		return
	}
	if !user.IsActive {
		httpx.Error(c, http.StatusForbidden, "conta inativa")
		return
	}
	if !CheckPassword(user.PasswordHash, req.Password) {
		httpx.Error(c, http.StatusUnauthorized, "e-mail ou senha incorretos")
		return
	}

	token, err := h.tm.Issue(user.ID, user.Role)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao emitir token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

// VerifyManager: POST /api/v1/auth/verify-manager (autenticada)
// Valida credenciais de um gestor (admin/coordenador) SEM emitir sessão —
// usado para autorizar ações sensíveis (ex.: cancelar matrícula).
func (h *Handler) VerifyManager(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "e-mail e senha são obrigatórios")
		return
	}
	var user models.User
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if err := h.db.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"valid": false})
		return
	}
	if !CheckPassword(user.PasswordHash, req.Password) {
		c.JSON(http.StatusOK, gin.H{"valid": false})
		return
	}
	if user.Role != "admin" && user.Role != "coordenador" {
		c.JSON(http.StatusOK, gin.H{"valid": false, "reason": "papel insuficiente"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"valid": true, "role": user.Role, "full_name": user.FullName})
}

// Me: GET /api/v1/auth/me (autenticada)
func (h *Handler) Me(c *gin.Context) {
	uid, _ := c.Get("userID")
	id, ok := uid.(uuid.UUID)
	if !ok {
		httpx.Error(c, http.StatusUnauthorized, "não autenticado")
		return
	}
	var user models.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

type setInitialPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// SetInitialPassword: POST /api/v1/auth/set-initial-password (autenticada)
// Fluxo de primeiro acesso: só permite quando must_change_password=true,
// portanto não exige a senha atual (o usuário acabou de logar com a temporária).
func (h *Handler) SetInitialPassword(c *gin.Context) {
	uid, _ := c.Get("userID")
	id, ok := uid.(uuid.UUID)
	if !ok {
		httpx.Error(c, http.StatusUnauthorized, "não autenticado")
		return
	}
	var req setInitialPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "senha nova deve ter ao menos 8 caracteres")
		return
	}
	var user models.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	if !user.MustChangePassword {
		httpx.Error(c, http.StatusForbidden, "troca inicial não aplicável; use change-password")
		return
	}
	hash, err := HashPassword(req.NewPassword)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao processar senha")
		return
	}
	if err := h.db.Model(&user).Updates(map[string]any{
		"password_hash":        hash,
		"must_change_password": false,
	}).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar senha")
		return
	}
	h.notifyPasswordChanged(&user)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword: POST /api/v1/auth/change-password (autenticada)
func (h *Handler) ChangePassword(c *gin.Context) {
	uid, _ := c.Get("userID")
	id, ok := uid.(uuid.UUID)
	if !ok {
		httpx.Error(c, http.StatusUnauthorized, "não autenticado")
		return
	}
	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.Error(c, http.StatusBadRequest, "senha nova deve ter ao menos 8 caracteres")
		return
	}
	var user models.User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "usuário não encontrado")
		return
	}
	if !CheckPassword(user.PasswordHash, req.CurrentPassword) {
		httpx.Error(c, http.StatusUnauthorized, "senha atual incorreta")
		return
	}
	hash, err := HashPassword(req.NewPassword)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao processar senha")
		return
	}
	if err := h.db.Model(&user).Updates(map[string]any{
		"password_hash":        hash,
		"must_change_password": false,
	}).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar senha")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
