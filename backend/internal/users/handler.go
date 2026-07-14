// Package users implementa o CRUD de usuários (identidade) com RBAC.
package users

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

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
	c.JSON(http.StatusCreated, gin.H{"user": user})
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
