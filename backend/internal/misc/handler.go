// Package misc reúne domínios transversais: pedidos, mensagens, comunicados
// gerais, conteúdo do site e a view upcoming_classes.
package misc

import (
	"encoding/json"
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/chat"
	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Handler struct {
	db  *gorm.DB
	hub *chat.Hub // chat interno em tempo real (pode ser nil)
}

func NewHandler(db *gorm.DB, hub *chat.Hub) *Handler { return &Handler{db: db, hub: hub} }

// ───────────── Orders ─────────────

func (h *Handler) ListOrders(c *gin.Context) {
	list := []models.Order{}
	q := h.db.Order("created_at DESC")
	if sid := c.Query("student_id"); sid != "" {
		q = q.Where("student_id = ?", sid)
	}
	if s := c.Query("status"); s != "" {
		q = q.Where("status = ?", s)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"orders": list})
}
func (h *Handler) CreateOrder(c *gin.Context) {
	var o models.Order
	if err := c.ShouldBindJSON(&o); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	o.ID = uuid.Nil
	if err := h.db.Create(&o).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar pedido")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"order": o})
}
func (h *Handler) UpdateOrder(c *gin.Context) {
	var o models.Order
	if err := h.db.First(&o, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body map[string]any
	c.ShouldBindJSON(&body)
	delete(body, "id")
	h.db.Model(&o).Updates(body)
	c.JSON(http.StatusOK, gin.H{"order": o})
}

// ───────────── Messages ─────────────

func (h *Handler) ListMessages(c *gin.Context) {
	uid := middleware.UserID(c)
	list := []models.Message{}
	q := h.db.Where("sender_id = ? OR receiver_id = ?", uid, uid).Order("created_at DESC")
	if other := c.Query("with"); other != "" {
		q = h.db.Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			uid, other, other, uid).Order("created_at ASC")
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"messages": list})
}
func (h *Handler) CreateMessage(c *gin.Context) {
	var m models.Message
	if err := c.ShouldBindJSON(&m); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	m.ID = uuid.Nil
	if m.SenderID == nil {
		uid := middleware.UserID(c)
		m.SenderID = &uid
	}
	if err := h.db.Create(&m).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao enviar mensagem")
		return
	}

	// Push em tempo real para remetente e destinatário (WebSocket).
	if h.hub != nil {
		if payload, err := json.Marshal(gin.H{"type": "message", "message": m}); err == nil {
			ids := []uuid.UUID{}
			if m.SenderID != nil {
				ids = append(ids, *m.SenderID)
			}
			if m.ReceiverID != nil {
				ids = append(ids, *m.ReceiverID)
			}
			h.hub.SendToUsers(payload, ids...)
		}
	}

	c.JSON(http.StatusCreated, gin.H{"message": m})
}
func (h *Handler) MarkMessageRead(c *gin.Context) {
	h.db.Model(&models.Message{}).Where("id = ?", c.Param("id")).Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────────── Comunicados gerais ─────────────

func (h *Handler) ListAnnouncements(c *gin.Context) {
	list := []models.Announcement{}
	h.db.Where("expires_at IS NULL OR expires_at > NOW()").Order("is_pinned DESC, created_at DESC").Find(&list)
	c.JSON(http.StatusOK, gin.H{"announcements": list})
}
func (h *Handler) CreateAnnouncement(c *gin.Context) {
	var a models.Announcement
	if err := c.ShouldBindJSON(&a); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	a.ID = uuid.Nil
	if err := h.db.Create(&a).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar comunicado")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"announcement": a})
}
func (h *Handler) UpdateAnnouncement(c *gin.Context) {
	var a models.Announcement
	if err := h.db.First(&a, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body map[string]any
	c.ShouldBindJSON(&body)
	delete(body, "id")
	delete(body, "author")
	h.db.Model(&a).Updates(body)
	c.JSON(http.StatusOK, gin.H{"announcement": a})
}
func (h *Handler) DeleteAnnouncement(c *gin.Context) {
	h.db.Delete(&models.Announcement{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────────── Site content (CMS) ─────────────

func (h *Handler) GetSiteContent(c *gin.Context) {
	var rows []models.SiteContent
	h.db.Find(&rows)
	out := gin.H{}
	for _, r := range rows {
		out[r.Key] = r.Value
	}
	c.JSON(http.StatusOK, gin.H{"content": out})
}
func (h *Handler) SaveSiteContent(c *gin.Context) {
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	for k, v := range body {
		raw, _ := json.Marshal(v)
		h.db.Exec(`INSERT INTO site_content (key, value, updated_at) VALUES (?, ?::jsonb, NOW())
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, k, string(raw))
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────────── upcoming_classes (view) ─────────────

func (h *Handler) UpcomingClasses(c *gin.Context) {
	rows := []map[string]any{}
	q := h.db.Table("upcoming_classes")
	if id := c.Query("id"); id != "" {
		q = q.Where("id = ?", id)
	}
	q.Find(&rows)
	c.JSON(http.StatusOK, gin.H{"classes": rows})
}

// PublicUpcomingClasses: GET /public/upcoming-classes — próximas turmas (landing).
func (h *Handler) PublicUpcomingClasses(c *gin.Context) {
	rows := []map[string]any{}
	h.db.Table("classes").
		Select("course_name, start_date").
		Where("start_date >= CURRENT_DATE").
		Order("start_date ASC").Find(&rows)
	c.JSON(http.StatusOK, gin.H{"classes": rows})
}
