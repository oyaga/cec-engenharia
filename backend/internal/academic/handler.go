// Package academic implementa o domínio de turmas (classes), vínculo de
// instrutores e habilitação PR-127.
package academic

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

// instrInfo é o instrutor vinculado no formato que o frontend espera.
type instrInfo struct {
	ID   uuid.UUID `json:"id"`
	Role string    `json:"role"`
	User struct {
		ID       uuid.UUID `json:"id"`
		FullName string    `json:"full_name"`
	} `json:"user"`
}

type classItem struct {
	models.Class
	StudentsCount      int64       `json:"students_count"`
	PracticalConfirmed int64       `json:"practical_confirmed"`
	PracticalPending   int64       `json:"practical_pending"`
	Instructors        []instrInfo `json:"instructors"`
}

// ListClasses: GET /classes — turmas com contagens e instrutores agregados.
func (h *Handler) ListClasses(c *gin.Context) {
	var classes []models.Class
	if err := h.db.Order("created_at DESC").Find(&classes).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao listar turmas")
		return
	}

	// Contagem de alunos por turma.
	type cnt struct {
		TurmaID uuid.UUID
		N       int64
	}
	studentCounts := map[uuid.UUID]int64{}
	{
		var rows []cnt
		h.db.Model(&models.Student{}).
			Select("turma_id, COUNT(*) as n").
			Where("turma_id IS NOT NULL").Group("turma_id").Scan(&rows)
		for _, r := range rows {
			studentCounts[r.TurmaID] = r.N
		}
	}

	// Práticas confirmadas/pendentes por practical_class_id.
	type pcnt struct {
		PracticalClassID uuid.UUID
		Status           string
		N                int64
	}
	confirmed := map[uuid.UUID]int64{}
	pending := map[uuid.UUID]int64{}
	{
		var rows []pcnt
		h.db.Model(&models.Student{}).
			Select("practical_class_id, practical_class_status as status, COUNT(*) as n").
			Where("practical_class_id IS NOT NULL").
			Group("practical_class_id, practical_class_status").Scan(&rows)
		for _, r := range rows {
			if r.Status == "confirmado" {
				confirmed[r.PracticalClassID] = r.N
			} else if r.Status == "pendente" {
				pending[r.PracticalClassID] = r.N
			}
		}
	}

	// Instrutores por turma.
	instructorsByClass := map[uuid.UUID][]instrInfo{}
	{
		type row struct {
			ID       uuid.UUID
			ClassID  uuid.UUID
			Role     string
			UserID   uuid.UUID
			FullName string
		}
		var rows []row
		h.db.Table("class_instructors ci").
			Select("ci.id, ci.class_id, ci.role, u.id as user_id, u.full_name").
			Joins("JOIN users u ON u.id = ci.user_id").
			Order("ci.role").Scan(&rows)
		for _, r := range rows {
			info := instrInfo{ID: r.ID, Role: r.Role}
			info.User.ID = r.UserID
			info.User.FullName = r.FullName
			instructorsByClass[r.ClassID] = append(instructorsByClass[r.ClassID], info)
		}
	}

	items := make([]classItem, 0, len(classes))
	for _, cl := range classes {
		items = append(items, classItem{
			Class:              cl,
			StudentsCount:      studentCounts[cl.ID],
			PracticalConfirmed: confirmed[cl.ID],
			PracticalPending:   pending[cl.ID],
			Instructors:        instructorsByClass[cl.ID],
		})
	}
	c.JSON(http.StatusOK, gin.H{"classes": items})
}

// CreateClass: POST /classes
func (h *Handler) CreateClass(c *gin.Context) {
	var cl models.Class
	if err := c.ShouldBindJSON(&cl); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	cl.ID = uuid.Nil
	if cl.Name == "" || cl.CourseName == "" {
		httpx.Error(c, http.StatusBadRequest, "nome e curso são obrigatórios")
		return
	}
	if err := h.db.Create(&cl).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar turma")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"class": cl})
}

// UpdateClass: PUT /classes/:id — atualização parcial (whitelist de colunas).
func (h *Handler) UpdateClass(c *gin.Context) {
	var cl models.Class
	if err := h.db.First(&cl, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "turma não encontrada")
		return
	}
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	allowed := map[string]bool{
		"name": true, "course_name": true, "start_date": true, "predicted_end_date": true,
		"actual_start_date": true, "actual_end_date": true, "schedule": true, "duration": true,
		"lms_course_id": true, "evaluation_pdf_url": true, "price_cash": true, "price_card_10x": true,
		"price_installments_3x": true, "is_immediate_start": true, "instructor_payment_type": true,
		"instructor_payment_value": true, "address": true, "max_capacity": true,
		"course_value": true, "status": true, "notes": true,
	}
	updates := map[string]any{}
	for k, v := range body {
		if allowed[k] {
			updates[k] = v
		}
	}
	if err := h.db.Model(&cl).Updates(updates).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar turma")
		return
	}
	c.JSON(http.StatusOK, gin.H{"class": cl})
}

// DeleteClass: DELETE /classes/:id — bloqueia se houver aluno ativo.
func (h *Handler) DeleteClass(c *gin.Context) {
	id := c.Param("id")
	var active int64
	h.db.Model(&models.Student{}).Where("turma_id = ? AND status <> ?", id, "cancelada").Count(&active)
	if active > 0 {
		httpx.Error(c, http.StatusConflict, "há alunos ativos matriculados nesta turma")
		return
	}
	// Desvincula alunos cancelados e apaga a turma.
	h.db.Model(&models.Student{}).Where("turma_id = ?", id).Update("turma_id", nil)
	if err := h.db.Delete(&models.Class{}, "id = ?", id).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir turma")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ─────────── Presença (attendance_records) ───────────

// ListAttendance: GET /attendance?student_id=&class_id=
func (h *Handler) ListAttendance(c *gin.Context) {
	q := h.db.Model(&models.AttendanceRecord{}).Order("created_at DESC")
	if sid := c.Query("student_id"); sid != "" {
		q = q.Where("student_id = ?", sid)
	}
	if cid := c.Query("class_id"); cid != "" {
		q = q.Where("class_id = ?", cid)
	}
	list := []models.AttendanceRecord{}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"attendance": list})
}

// CreateAttendance: POST /attendance
func (h *Handler) CreateAttendance(c *gin.Context) {
	var a models.AttendanceRecord
	if err := c.ShouldBindJSON(&a); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	a.ID = uuid.Nil
	if a.Status == "" {
		a.Status = "presente"
	}
	if err := h.db.Create(&a).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar presença")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"attendance": a})
}

// UpdateAttendance: PUT /attendance/:id
func (h *Handler) UpdateAttendance(c *gin.Context) {
	var a models.AttendanceRecord
	if err := h.db.First(&a, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "registro não encontrado")
		return
	}
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	delete(body, "id")
	h.db.Model(&a).Updates(body)
	c.JSON(http.StatusOK, gin.H{"attendance": a})
}

// ─────────── Instrutores da turma ───────────

// ListClassInstructors: GET /classes/:id/instructors
func (h *Handler) ListClassInstructors(c *gin.Context) {
	type row struct {
		ID       uuid.UUID
		Role     string
		UserID   uuid.UUID
		FullName string
	}
	var rows []row
	h.db.Table("class_instructors ci").
		Select("ci.id, ci.role, u.id as user_id, u.full_name").
		Joins("JOIN users u ON u.id = ci.user_id").
		Where("ci.class_id = ?", c.Param("id")).Order("ci.role").Scan(&rows)

	out := make([]instrInfo, 0, len(rows))
	for _, r := range rows {
		info := instrInfo{ID: r.ID, Role: r.Role}
		info.User.ID = r.UserID
		info.User.FullName = r.FullName
		out = append(out, info)
	}
	c.JSON(http.StatusOK, gin.H{"instructors": out})
}

// AddClassInstructor: POST /classes/:id/instructors
func (h *Handler) AddClassInstructor(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "id inválido")
		return
	}
	var body struct {
		UserID uuid.UUID `json:"user_id" binding:"required"`
		Role   string    `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "instrutor é obrigatório")
		return
	}
	if body.Role == "" {
		body.Role = "titular"
	}
	link := models.ClassInstructor{ClassID: classID, UserID: body.UserID, Role: body.Role}
	if err := h.db.Create(&link).Error; err != nil {
		httpx.Error(c, http.StatusConflict, "instrutor já vinculado ou inválido")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"instructor": link})
}

// RemoveClassInstructor: DELETE /classes/:id/instructors/:linkId
func (h *Handler) RemoveClassInstructor(c *gin.Context) {
	if err := h.db.Delete(&models.ClassInstructor{}, "id = ?", c.Param("linkId")).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao remover instrutor")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// AvailableInstructors: GET /classes/available-instructors?method=CD-CL
// Retorna instrutores ativos, marcando quem tem habilitação PR-127 ativa no método.
func (h *Handler) AvailableInstructors(c *gin.Context) {
	method := c.Query("method")

	var instructors []models.User
	h.db.Where("role = ? AND is_active = ?", "instrutor", true).Order("full_name").Find(&instructors)

	qualified := map[uuid.UUID]bool{}
	if method != "" {
		var quals []models.InstructorQualification
		h.db.Where("method = ? AND status = ?", method, "ativo").Find(&quals)
		for _, q := range quals {
			qualified[q.UserID] = true
		}
	}

	type item struct {
		ID        uuid.UUID `json:"id"`
		FullName  string    `json:"full_name"`
		Qualified bool      `json:"qualified"`
	}
	out := make([]item, 0, len(instructors))
	for _, u := range instructors {
		out = append(out, item{ID: u.ID, FullName: u.FullName, Qualified: qualified[u.ID]})
	}
	c.JSON(http.StatusOK, gin.H{"instructors": out, "method": method})
}

// ─────────── Qualificações PR-127 (instructor_qualifications) ───────────

// ListQualifications: GET /instructor-qualifications?user_id=&method=&status=
func (h *Handler) ListQualifications(c *gin.Context) {
	type row struct {
		models.InstructorQualification
		FullName string  `json:"-"`
		Email    *string `json:"-"`
		CPF      *string `json:"-"`
		Phone    *string `json:"-"`
	}
	q := h.db.Table("instructor_qualifications iq").
		Select("iq.*, u.full_name, u.email, u.cpf, u.phone").
		Joins("LEFT JOIN users u ON u.id = iq.user_id").Order("iq.created_at DESC")
	if v := c.Query("user_id"); v != "" {
		q = q.Where("iq.user_id = ?", v)
	}
	if v := c.Query("method"); v != "" {
		q = q.Where("iq.method = ?", v)
	}
	if v := c.Query("status"); v != "" {
		q = q.Where("iq.status = ?", v)
	}
	var rows []row
	q.Scan(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		b, _ := json.Marshal(r.InstructorQualification)
		item := gin.H{}
		_ = json.Unmarshal(b, &item)
		item["users"] = gin.H{"full_name": r.FullName, "email": r.Email, "cpf": r.CPF, "phone": r.Phone}
		out = append(out, item)
	}
	c.JSON(http.StatusOK, gin.H{"qualifications": out})
}

// CreateQualification: POST /instructor-qualifications
func (h *Handler) CreateQualification(c *gin.Context) {
	var q models.InstructorQualification
	if err := c.ShouldBindJSON(&q); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	q.ID = uuid.Nil
	if err := h.db.Create(&q).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar qualificação")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"qualification": q})
}

// UpdateQualification: PUT /instructor-qualifications/:id (aprovar/rejeitar)
func (h *Handler) UpdateQualification(c *gin.Context) {
	var q models.InstructorQualification
	if err := h.db.First(&q, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "não encontrada")
		return
	}
	var body map[string]any
	c.ShouldBindJSON(&body)
	delete(body, "id")
	delete(body, "users")
	h.db.Model(&q).Updates(body)
	c.JSON(http.StatusOK, gin.H{"qualification": q})
}

// DeleteQualification: DELETE /instructor-qualifications/:id
func (h *Handler) DeleteQualification(c *gin.Context) {
	h.db.Delete(&models.InstructorQualification{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ─────────── Avaliações (student_evaluations — A1, protegido por RBAC) ───────────

// ListEvaluations: GET /evaluations?student_id=
func (h *Handler) ListEvaluations(c *gin.Context) {
	list := []models.StudentEvaluation{}
	q := h.db.Order("created_at DESC")
	if sid := c.Query("student_id"); sid != "" {
		q = q.Where("student_id = ?", sid)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"evaluations": list})
}

// CreateEvaluation: POST /evaluations
func (h *Handler) CreateEvaluation(c *gin.Context) {
	var e models.StudentEvaluation
	if err := c.ShouldBindJSON(&e); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	e.ID = uuid.Nil
	if err := h.db.Create(&e).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao salvar avaliação")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"evaluation": e})
}

// DeleteEvaluations: DELETE /evaluations?student_id=  (limpa antes de reinserir)
func (h *Handler) DeleteEvaluations(c *gin.Context) {
	sid := c.Query("student_id")
	if sid == "" {
		httpx.Error(c, http.StatusBadRequest, "student_id é obrigatório")
		return
	}
	h.db.Where("student_id = ?", sid).Delete(&models.StudentEvaluation{})
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
