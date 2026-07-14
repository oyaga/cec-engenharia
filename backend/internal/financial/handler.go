// Package financial implementa lançamentos, custos, despesas, notas e o PIN
// financeiro (validado por hash server-side — corrige C4).
package financial

import (
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// ───────── financial_records ─────────

func (h *Handler) ListRecords(c *gin.Context) {
	list := []models.FinancialRecord{}
	q := h.db.Order("created_at DESC")
	if sid := c.Query("student_id"); sid != "" {
		q = q.Where("student_id = ?", sid)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"records": list})
}

func (h *Handler) CreateRecord(c *gin.Context) {
	var r models.FinancialRecord
	if err := c.ShouldBindJSON(&r); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	r.ID = [16]byte{}
	if err := h.db.Create(&r).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao lançar")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"record": r})
}

func (h *Handler) UpdateRecord(c *gin.Context) {
	var r models.FinancialRecord
	if err := h.db.First(&r, "id = ?", c.Param("id")).Error; err != nil {
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
	h.db.Model(&r).Updates(body)
	c.JSON(http.StatusOK, gin.H{"record": r})
}

func (h *Handler) DeleteRecord(c *gin.Context) {
	h.db.Delete(&models.FinancialRecord{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────── financial_costs ─────────

func (h *Handler) ListCosts(c *gin.Context) {
	list := []models.FinancialCost{}
	q := h.db.Order("created_at DESC")
	if cid := c.Query("class_id"); cid != "" {
		q = q.Where("class_id = ?", cid)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"costs": list})
}

func (h *Handler) CreateCost(c *gin.Context) {
	var r models.FinancialCost
	if err := c.ShouldBindJSON(&r); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	r.ID = [16]byte{}
	if err := h.db.Create(&r).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar custo")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"cost": r})
}

func (h *Handler) UpdateCost(c *gin.Context) {
	var r models.FinancialCost
	if err := h.db.First(&r, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body map[string]any
	c.ShouldBindJSON(&body)
	delete(body, "id")
	h.db.Model(&r).Updates(body)
	c.JSON(http.StatusOK, gin.H{"cost": r})
}

func (h *Handler) DeleteCost(c *gin.Context) {
	h.db.Delete(&models.FinancialCost{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────── expenses ─────────

func (h *Handler) ListExpenses(c *gin.Context) {
	list := []models.Expense{}
	h.db.Order("due_date DESC").Find(&list)
	c.JSON(http.StatusOK, gin.H{"expenses": list})
}

func (h *Handler) CreateExpense(c *gin.Context) {
	var r models.Expense
	if err := c.ShouldBindJSON(&r); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	r.ID = [16]byte{}
	if uid := middleware.UserID(c); uid.String() != "00000000-0000-0000-0000-000000000000" {
		u := uid
		r.CreatedBy = &u
	}
	if err := h.db.Create(&r).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar despesa")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"expense": r})
}

func (h *Handler) UpdateExpense(c *gin.Context) {
	var r models.Expense
	if err := h.db.First(&r, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrado")
		return
	}
	var body map[string]any
	c.ShouldBindJSON(&body)
	delete(body, "id")
	h.db.Model(&r).Updates(body)
	c.JSON(http.StatusOK, gin.H{"expense": r})
}

func (h *Handler) DeleteExpense(c *gin.Context) {
	h.db.Delete(&models.Expense{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────── invoices_tracking ─────────

func (h *Handler) ListInvoices(c *gin.Context) {
	list := []models.InvoiceTracking{}
	q := h.db.Order("created_at DESC")
	if sid := c.Query("student_id"); sid != "" {
		q = q.Where("student_id = ?", sid)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"invoices": list})
}

func (h *Handler) CreateInvoice(c *gin.Context) {
	var r models.InvoiceTracking
	if err := c.ShouldBindJSON(&r); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	r.ID = [16]byte{}
	if err := h.db.Create(&r).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar NF")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"invoice": r})
}

// ───────── financial_pins (C4) ─────────

// SetPin: POST /financial/pin (admin) — define/atualiza o PIN (guarda hash).
func (h *Handler) SetPin(c *gin.Context) {
	var body struct {
		Pin string `json:"pin" binding:"required,min=4"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "PIN deve ter ao menos 4 dígitos")
		return
	}
	hash, err := auth.HashPassword(body.Pin)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao processar PIN")
		return
	}
	// Um único PIN admin: remove anteriores e cria o novo.
	h.db.Where("role = ?", "admin").Delete(&models.FinancialPin{})
	uid := middleware.UserID(c)
	h.db.Create(&models.FinancialPin{PinHash: hash, Role: "admin", CreatedBy: &uid})
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// VerifyPin: POST /financial/pin/verify — valida server-side (nunca expõe o PIN).
func (h *Handler) VerifyPin(c *gin.Context) {
	var body struct {
		Pin string `json:"pin" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "PIN é obrigatório")
		return
	}
	var pins []models.FinancialPin
	h.db.Where("role = ?", "admin").Find(&pins)
	for _, p := range pins {
		if auth.CheckPassword(p.PinHash, body.Pin) {
			c.JSON(http.StatusOK, gin.H{"valid": true})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"valid": false, "configured": len(pins) > 0})
}
