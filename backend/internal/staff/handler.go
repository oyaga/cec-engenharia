// Package staff — equipe interna (colaboradores não-alunos).
package staff

import (
	"encoding/json"
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// List: GET /staff — inclui as permissões do usuário vinculado.
func (h *Handler) List(c *gin.Context) {
	type row struct {
		models.Staff
		Permissions json.RawMessage `json:"-"`
	}
	var rows []row
	h.db.Table("staff s").
		Select("s.*, u.permissions").
		Joins("LEFT JOIN users u ON u.id = s.user_id").
		Order("s.name").Scan(&rows)

	out := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		item := gin.H{
			"id": r.ID, "user_id": r.UserID, "name": r.Name, "cpf": r.CPF, "role": r.Role,
			"email": r.Email, "phone": r.Phone, "admission_date": r.AdmissionDate, "salary": r.Salary,
			"has_platform_access": r.HasPlatformAccess, "is_active": r.IsActive,
		}
		if len(r.Permissions) > 0 {
			var p any
			_ = json.Unmarshal(r.Permissions, &p)
			item["users"] = gin.H{"permissions": p}
		}
		out = append(out, item)
	}
	c.JSON(http.StatusOK, gin.H{"staff": out})
}

func (h *Handler) Create(c *gin.Context) {
	var s models.Staff
	if err := c.ShouldBindJSON(&s); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	s.ID = uuid.Nil
	if s.Name == "" {
		httpx.Error(c, http.StatusBadRequest, "nome é obrigatório")
		return
	}
	if err := h.db.Create(&s).Error; err != nil {
		httpx.Error(c, http.StatusConflict, "falha ao criar colaborador: CPF, e-mail ou usuário já vinculado")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"staff": s})
}

func (h *Handler) Update(c *gin.Context) {
	var s models.Staff
	if err := h.db.First(&s, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body map[string]any
	c.ShouldBindJSON(&body)
	delete(body, "id")
	delete(body, "users")
	h.db.Model(&s).Updates(body)
	c.JSON(http.StatusOK, gin.H{"staff": s})
}

func (h *Handler) Delete(c *gin.Context) {
	h.db.Delete(&models.Staff{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
