// Package audit registra e lista ações sensíveis (audit_logs).
package audit

import (
	"encoding/json"
	"net/http"

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

// List: GET /audit (admin) — logs recentes.
func (h *Handler) List(c *gin.Context) {
	list := []models.AuditLog{}
	h.db.Order("created_at DESC").Limit(500).Find(&list)
	c.JSON(http.StatusOK, gin.H{"logs": list})
}

// Record: POST /audit (autenticada) — registra uma ação.
func (h *Handler) Record(c *gin.Context) {
	var body struct {
		Action     string         `json:"action" binding:"required"`
		EntityType string         `json:"entity_type" binding:"required"`
		EntityID   *uuid.UUID     `json:"entity_id"`
		Details    map[string]any `json:"details"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "action e entity_type são obrigatórios")
		return
	}
	uid := middleware.UserID(c)
	log := models.AuditLog{
		UserID:     &uid,
		Action:     body.Action,
		EntityType: body.EntityType,
		EntityID:   body.EntityID,
	}
	if body.Details != nil {
		if b, err := json.Marshal(body.Details); err == nil {
			log.Details = datatypes.JSON(b)
		}
	}
	if ip := c.ClientIP(); ip != "" {
		log.IP = &ip
	}
	h.db.Create(&log)
	c.JSON(http.StatusCreated, gin.H{"ok": true})
}
