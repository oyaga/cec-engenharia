// Package misc reúne domínios transversais: pedidos, mensagens, comunicados
// gerais, conteúdo do site e a view upcoming_classes.
package misc

import (
	"encoding/json"
	"net/http"
	"strings"

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
	if classID := c.Query("class_id"); classID != "" {
		cid, err := uuid.Parse(classID)
		if err != nil || !h.canAccessChatClass(uid, middleware.Role(c), cid) {
			httpx.Error(c, http.StatusForbidden, "você não participa desta turma")
			return
		}
		q = h.db.Where("class_id = ?", cid).Order("created_at ASC")
	}
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
	uid := middleware.UserID(c)
	role := middleware.Role(c)
	m.Content = strings.TrimSpace(m.Content)
	if m.Content == "" || len([]rune(m.Content)) > 4000 {
		httpx.Error(c, http.StatusBadRequest, "a mensagem deve ter entre 1 e 4000 caracteres")
		return
	}
	m.ID = uuid.Nil
	m.SenderID = &uid
	m.IsRead = false

	if m.ClassID != nil {
		m.ReceiverID = nil
		if !h.canAccessChatClass(uid, role, *m.ClassID) {
			httpx.Error(c, http.StatusForbidden, "você não participa desta turma")
			return
		}
	} else {
		if m.ReceiverID == nil || *m.ReceiverID == uid || !h.canSendDirect(uid, role, *m.ReceiverID) {
			httpx.Error(c, http.StatusForbidden, "conversa não permitida para este perfil")
			return
		}
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
			if m.ClassID != nil {
				ids = append(ids, h.chatClassUserIDs(*m.ClassID)...)
			} else if m.ReceiverID != nil {
				ids = append(ids, *m.ReceiverID)
			}
			h.hub.SendToUsers(payload, ids...)
		}
	}

	c.JSON(http.StatusCreated, gin.H{"message": m})
}
func (h *Handler) MarkMessageRead(c *gin.Context) {
	uid := middleware.UserID(c)
	h.db.Model(&models.Message{}).Where("id = ? AND receiver_id = ?", c.Param("id"), uid).Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) canAccessChatClass(uid uuid.UUID, role string, classID uuid.UUID) bool {
	var count int64
	switch role {
	case "admin", "coordenador", "atendente", "administrativo":
		h.db.Table("classes").Where("id = ?", classID).Count(&count)
	case "instrutor":
		h.db.Table("class_instructors").Where("class_id = ? AND user_id = ?", classID, uid).Count(&count)
	case "aluno":
		h.db.Table("students").Where("turma_id = ? AND user_id = ?", classID, uid).Count(&count)
	}
	return count > 0
}

func (h *Handler) canSendDirect(uid uuid.UUID, senderRole string, receiverID uuid.UUID) bool {
	var receiver struct{ Role string }
	if err := h.db.Table("users").Select("role").Where("id = ? AND is_active = true", receiverID).Scan(&receiver).Error; err != nil || receiver.Role == "" {
		return false
	}
	staff := map[string]bool{"admin": true, "coordenador": true, "atendente": true, "administrativo": true}
	if staff[senderRole] {
		return true
	}
	if senderRole == "instrutor" {
		if staff[receiver.Role] {
			return true
		}
		if receiver.Role != "aluno" {
			return false
		}
		var count int64
		h.db.Table("students s").
			Joins("JOIN class_instructors ci ON ci.class_id = s.turma_id").
			Where("s.user_id = ? AND ci.user_id = ?", receiverID, uid).Count(&count)
		return count > 0
	}
	if senderRole == "aluno" {
		return receiver.Role != "aluno" || h.sameStudentClass(uid, receiverID)
	}
	return false
}

func (h *Handler) sameStudentClass(first, second uuid.UUID) bool {
	var count int64
	h.db.Table("students a").
		Joins("JOIN students b ON b.turma_id = a.turma_id").
		Where("a.user_id = ? AND b.user_id = ?", first, second).Count(&count)
	return count > 0
}

func (h *Handler) chatClassUserIDs(classID uuid.UUID) []uuid.UUID {
	ids := []uuid.UUID{}
	h.db.Table("students").Where("turma_id = ? AND user_id IS NOT NULL", classID).Pluck("user_id", &ids)
	instructorIDs := []uuid.UUID{}
	h.db.Table("class_instructors").Where("class_id = ?", classID).Pluck("user_id", &instructorIDs)
	ids = append(ids, instructorIDs...)
	staffIDs := []uuid.UUID{}
	h.db.Table("users").Where("role IN ? AND is_active = true", []string{"admin", "coordenador", "atendente", "administrativo"}).Pluck("id", &staffIDs)
	return append(ids, staffIDs...)
}

// ───────────── Comunicados gerais ─────────────

func (h *Handler) ListAnnouncements(c *gin.Context) {
	list := []models.Announcement{}
	if err := h.db.Where("expires_at IS NULL OR expires_at > NOW()").Order("is_pinned DESC, created_at DESC").Find(&list).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar comunicados")
		return
	}

	role := middleware.Role(c)
	if role != "admin" && role != "coordenador" {
		filtered := make([]models.Announcement, 0, len(list))
		for _, announcement := range list {
			var roles []string
			if err := json.Unmarshal(announcement.TargetRoles, &roles); err != nil {
				continue
			}
			for _, targetRole := range roles {
				if targetRole == role {
					filtered = append(filtered, announcement)
					break
				}
			}
		}
		list = filtered
	}

	type authorSummary struct {
		ID       uuid.UUID `json:"id"`
		FullName string    `json:"full_name"`
		Role     string    `json:"role"`
	}
	type announcementWithAuthor struct {
		models.Announcement
		Author *authorSummary `json:"author,omitempty"`
	}
	authorIDs := make([]uuid.UUID, 0, len(list))
	for _, announcement := range list {
		if announcement.CreatedBy != nil {
			authorIDs = append(authorIDs, *announcement.CreatedBy)
		}
	}
	authorsByID := map[uuid.UUID]authorSummary{}
	if len(authorIDs) > 0 {
		users := []models.User{}
		if err := h.db.Where("id IN ?", authorIDs).Find(&users).Error; err != nil {
			httpx.Error(c, http.StatusInternalServerError, "falha ao carregar autores dos comunicados")
			return
		}
		for _, user := range users {
			authorsByID[user.ID] = authorSummary{ID: user.ID, FullName: user.FullName, Role: user.Role}
		}
	}
	response := make([]announcementWithAuthor, 0, len(list))
	for _, announcement := range list {
		item := announcementWithAuthor{Announcement: announcement}
		if announcement.CreatedBy != nil {
			if author, ok := authorsByID[*announcement.CreatedBy]; ok {
				authorCopy := author
				item.Author = &authorCopy
			}
		}
		response = append(response, item)
	}
	c.JSON(http.StatusOK, gin.H{"announcements": response})
}
func (h *Handler) CreateAnnouncement(c *gin.Context) {
	var a models.Announcement
	if err := c.ShouldBindJSON(&a); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	a.ID = uuid.Nil
	creatorID := middleware.UserID(c)
	a.CreatedBy = &creatorID
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
