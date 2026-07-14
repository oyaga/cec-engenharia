// Package site implementa o domínio público: leads, complaints (Ouvidoria),
// testimonials (depoimentos) e enrollments (pré-matrícula).
package site

import (
	"net/http"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// ─────────────────────────── LEADS ───────────────────────────

type leadInput struct {
	Name           string  `json:"name" binding:"required"`
	Phone          string  `json:"phone" binding:"required"`
	Email          *string `json:"email"`
	CourseInterest *string `json:"course_interest"`
	Message        *string `json:"message"`
	Interesse      *string `json:"interesse"`
	Origem         *string `json:"origem"`
}

// CreateLeadPublic: POST /public/leads — captação (sem auth). Upsert por telefone.
func (h *Handler) CreateLeadPublic(c *gin.Context) {
	var in leadInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.Error(c, http.StatusBadRequest, "nome e telefone são obrigatórios")
		return
	}
	phone := strings.TrimSpace(in.Phone)

	var lead models.Lead
	err := h.db.Where("phone = ?", phone).First(&lead).Error
	if err == nil {
		// Já existe: atualiza os campos informados (upsert por telefone).
		updates := map[string]any{"name": in.Name}
		if in.Email != nil {
			updates["email"] = in.Email
		}
		if in.CourseInterest != nil {
			updates["course_interest"] = in.CourseInterest
		}
		if in.Message != nil {
			updates["message"] = in.Message
		}
		if in.Interesse != nil {
			updates["interesse"] = in.Interesse
		}
		h.db.Model(&lead).Updates(updates)
		c.JSON(http.StatusOK, gin.H{"ok": true, "id": lead.ID})
		return
	}

	origem := "site"
	if in.Origem != nil && *in.Origem != "" {
		origem = *in.Origem
	}
	lead = models.Lead{
		Name: in.Name, Phone: phone, Email: in.Email,
		CourseInterest: in.CourseInterest, Message: in.Message,
		Interesse: in.Interesse, Origem: &origem, Status: "novo",
	}
	if err := h.db.Create(&lead).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar contato")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": lead.ID})
}

// ListLeads: GET /leads?status=&course_interest=  (auth)
func (h *Handler) ListLeads(c *gin.Context) {
	q := h.db.Model(&models.Lead{}).Order("created_at DESC")
	if s := c.Query("status"); s != "" && s != "todos" {
		q = q.Where("status = ?", s)
	}
	if ci := c.Query("course_interest"); ci != "" && ci != "todos" {
		q = q.Where("course_interest = ?", ci)
	}
	list := []models.Lead{}
	if err := q.Find(&list).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao listar leads")
		return
	}
	c.JSON(http.StatusOK, gin.H{"leads": list})
}

type leadUpdate struct {
	Status     *string `json:"status"`
	Observacao *string `json:"observacao"`
	Name       *string `json:"name"`
}

// UpdateLead: PUT /leads/:id (auth)
func (h *Handler) UpdateLead(c *gin.Context) {
	var lead models.Lead
	if err := h.db.First(&lead, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "lead não encontrado")
		return
	}
	var in leadUpdate
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	updates := map[string]any{}
	if in.Status != nil {
		updates["status"] = *in.Status
	}
	if in.Observacao != nil {
		updates["observacao"] = *in.Observacao
	}
	if in.Name != nil {
		updates["name"] = *in.Name
	}
	if err := h.db.Model(&lead).Updates(updates).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar lead")
		return
	}
	c.JSON(http.StatusOK, gin.H{"lead": lead})
}

// DeleteLead: DELETE /leads/:id (auth)
func (h *Handler) DeleteLead(c *gin.Context) {
	if err := h.db.Delete(&models.Lead{}, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir lead")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ─────────────────────────── COMPLAINTS (Ouvidoria) ───────────────────────────

type complaintInput struct {
	Name        *string `json:"name"`
	Phone       *string `json:"phone"`
	Description string  `json:"description" binding:"required"`
}

// CreateComplaintPublic: POST /public/complaints (sem auth)
func (h *Handler) CreateComplaintPublic(c *gin.Context) {
	var in complaintInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.Error(c, http.StatusBadRequest, "descrição é obrigatória")
		return
	}
	comp := models.Complaint{Name: in.Name, Phone: in.Phone, Description: in.Description, Status: "pending"}
	if err := h.db.Create(&comp).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar manifestação")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": comp.ID})
}

// ListComplaints: GET /complaints (auth)
func (h *Handler) ListComplaints(c *gin.Context) {
	list := []models.Complaint{}
	q := h.db.Model(&models.Complaint{}).Order("created_at DESC")
	if s := c.Query("status"); s != "" && s != "todos" {
		q = q.Where("status = ?", s)
	}
	if err := q.Find(&list).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao listar")
		return
	}
	c.JSON(http.StatusOK, gin.H{"complaints": list})
}

// UpdateComplaint: PUT /complaints/:id (auth)
func (h *Handler) UpdateComplaint(c *gin.Context) {
	var comp models.Complaint
	if err := h.db.First(&comp, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "status é obrigatório")
		return
	}
	h.db.Model(&comp).Update("status", body.Status)
	c.JSON(http.StatusOK, gin.H{"complaint": comp})
}

// DeleteComplaint: DELETE /complaints/:id (auth)
func (h *Handler) DeleteComplaint(c *gin.Context) {
	if err := h.db.Delete(&models.Complaint{}, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ─────────────────────────── TESTIMONIALS ───────────────────────────

// ListTestimonialsPublic: GET /public/testimonials — só aprovados.
func (h *Handler) ListTestimonialsPublic(c *gin.Context) {
	list := []models.Testimonial{}
	h.db.Where("status = ?", "approved").Order("created_at DESC").Find(&list)
	c.JSON(http.StatusOK, gin.H{"testimonials": list})
}

// CreateTestimonialPublic: POST /public/testimonials — entra como pending.
func (h *Handler) CreateTestimonialPublic(c *gin.Context) {
	var in models.Testimonial
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	in.ID = [16]byte{}
	in.Status = "pending" // envio público sempre entra pendente
	if in.Rating == 0 {
		in.Rating = 5
	}
	if in.Type == "" {
		in.Type = "text"
	}
	if err := h.db.Create(&in).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao enviar depoimento")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": in.ID})
}

// ListTestimonialsAdmin: GET /testimonials (auth) — todos.
func (h *Handler) ListTestimonialsAdmin(c *gin.Context) {
	list := []models.Testimonial{}
	q := h.db.Model(&models.Testimonial{}).Order("created_at DESC")
	if s := c.Query("status"); s != "" && s != "todos" {
		q = q.Where("status = ?", s)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"testimonials": list})
}

// CreateTestimonialAdmin: POST /testimonials (auth) — admin pode já aprovar.
func (h *Handler) CreateTestimonialAdmin(c *gin.Context) {
	var in models.Testimonial
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	in.ID = [16]byte{}
	if in.Status == "" {
		in.Status = "approved"
	}
	if in.Rating == 0 {
		in.Rating = 5
	}
	if in.Type == "" {
		in.Type = "text"
	}
	if err := h.db.Create(&in).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar depoimento")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"testimonial": in})
}

// UpdateTestimonial: PUT /testimonials/:id (auth)
func (h *Handler) UpdateTestimonial(c *gin.Context) {
	var t models.Testimonial
	if err := h.db.First(&t, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	delete(body, "id")
	delete(body, "created_at")
	if err := h.db.Model(&t).Updates(body).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar")
		return
	}
	c.JSON(http.StatusOK, gin.H{"testimonial": t})
}

// DeleteTestimonial: DELETE /testimonials/:id (auth)
func (h *Handler) DeleteTestimonial(c *gin.Context) {
	if err := h.db.Delete(&models.Testimonial{}, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ─────────────────────────── ENROLLMENTS ───────────────────────────

// CreateEnrollmentPublic: POST /public/enrollments (sem auth)
func (h *Handler) CreateEnrollmentPublic(c *gin.Context) {
	var in models.Enrollment
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	in.ID = [16]byte{}
	if in.Status == "" {
		in.Status = "pending"
	}
	if err := h.db.Create(&in).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar pré-matrícula")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"ok": true, "id": in.ID})
}

// ListEnrollments: GET /enrollments (auth)
func (h *Handler) ListEnrollments(c *gin.Context) {
	list := []models.Enrollment{}
	h.db.Order("created_at DESC").Find(&list)
	c.JSON(http.StatusOK, gin.H{"enrollments": list})
}

// UpdateEnrollment: PUT /enrollments/:id (auth)
func (h *Handler) UpdateEnrollment(c *gin.Context) {
	var e models.Enrollment
	if err := h.db.First(&e, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	c.ShouldBindJSON(&body)
	if body.Status != "" {
		h.db.Model(&e).Update("status", body.Status)
	}
	c.JSON(http.StatusOK, gin.H{"enrollment": e})
}

// DeleteEnrollment: DELETE /enrollments/:id (auth)
func (h *Handler) DeleteEnrollment(c *gin.Context) {
	if err := h.db.Delete(&models.Enrollment{}, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
