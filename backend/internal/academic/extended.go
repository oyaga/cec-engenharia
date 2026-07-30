package academic

import (
	"net/http"
	"strings"
	"time"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetInstructorAuthorizations lista categorias e cursos que o professor pode ministrar.
func (h *Handler) GetInstructorAuthorizations(c *gin.Context) {
	instructorID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "instrutor inválido")
		return
	}
	var categories []models.InstructorCategory
	var courses []models.LMSCourse
	h.db.Where("instructor_id = ?", instructorID).Order("category").Find(&categories)
	h.db.Table("lms_courses lc").
		Select("lc.*").
		Joins("JOIN instructor_courses ic ON ic.course_id = lc.id").
		Where("ic.instructor_id = ?", instructorID).
		Order("lc.title").Scan(&courses)
	c.JSON(http.StatusOK, gin.H{"categories": categories, "courses": courses})
}

// PutInstructorAuthorizations substitui de forma atômica as autorizações do professor.
func (h *Handler) PutInstructorAuthorizations(c *gin.Context) {
	instructorID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "instrutor inválido")
		return
	}
	var body struct {
		Categories []string    `json:"categories"`
		CourseIDs  []uuid.UUID `json:"course_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	var user models.User
	if err := h.db.First(&user, "id = ? AND role = ?", instructorID, "instrutor").Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "instrutor não encontrado")
		return
	}
	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("instructor_id = ?", instructorID).Delete(&models.InstructorCategory{}).Error; err != nil {
			return err
		}
		if err := tx.Where("instructor_id = ?", instructorID).Delete(&models.InstructorCourse{}).Error; err != nil {
			return err
		}
		seenCategories := map[string]bool{}
		for _, value := range body.Categories {
			category := strings.TrimSpace(value)
			if category == "" || seenCategories[category] {
				continue
			}
			seenCategories[category] = true
			if err := tx.Create(&models.InstructorCategory{InstructorID: instructorID, Category: category}).Error; err != nil {
				return err
			}
		}
		seenCourses := map[uuid.UUID]bool{}
		for _, courseID := range body.CourseIDs {
			if courseID == uuid.Nil || seenCourses[courseID] {
				continue
			}
			seenCourses[courseID] = true
			var count int64
			if err := tx.Model(&models.LMSCourse{}).Where("id = ?", courseID).Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				continue
			}
			if err := tx.Create(&models.InstructorCourse{InstructorID: instructorID, CourseID: courseID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao salvar autorizações")
		return
	}
	h.GetInstructorAuthorizations(c)
}

func (h *Handler) canManageClass(c *gin.Context, classID uuid.UUID) bool {
	role := middleware.Role(c)
	if role == "admin" || role == "coordenador" || role == "atendente" {
		return true
	}
	if role != "instrutor" {
		return false
	}
	var count int64
	h.db.Model(&models.ClassInstructor{}).Where("class_id = ? AND user_id = ?", classID, middleware.UserID(c)).Count(&count)
	return count > 0
}

func (h *Handler) loadModuleClass(moduleID, classID uuid.UUID) (models.LMSModule, models.Class, error) {
	var module models.LMSModule
	var class models.Class
	if err := h.db.First(&module, "id = ?", moduleID).Error; err != nil {
		return module, class, err
	}
	if err := h.db.First(&class, "id = ?", classID).Error; err != nil {
		return module, class, err
	}
	if !module.IsInPerson || module.CourseID == nil || class.LMSCourseID == nil || *module.CourseID != *class.LMSCourseID {
		return module, class, gorm.ErrRecordNotFound
	}
	return module, class, nil
}

// ModuleAttendance retorna a mesma chamada para Secretaria, professor e aluno.
func (h *Handler) ModuleAttendance(c *gin.Context) {
	classID, err1 := uuid.Parse(c.Param("id"))
	moduleID, err2 := uuid.Parse(c.Param("moduleId"))
	if err1 != nil || err2 != nil {
		httpx.Error(c, http.StatusBadRequest, "turma ou módulo inválido")
		return
	}
	module, _, err := h.loadModuleClass(moduleID, classID)
	if err != nil {
		httpx.Error(c, http.StatusNotFound, "módulo presencial não pertence à turma")
		return
	}

	type row struct {
		StudentID            uuid.UUID  `json:"student_id"`
		FullName             string     `json:"full_name"`
		RecordID             *uuid.UUID `json:"record_id,omitempty"`
		Status               *string    `json:"status,omitempty"`
		ConfirmedByStudent   bool       `json:"confirmed_by_student"`
		StudentConfirmedAt   *time.Time `json:"student_confirmed_at,omitempty"`
		ProfessorConfirmedAt *time.Time `json:"professor_confirmed_at,omitempty"`
		JustificationType    *string    `json:"justification_type,omitempty"`
		JustificationNote    *string    `json:"justification_note,omitempty"`
		ContentTaught        *string    `json:"content_taught,omitempty"`
		ClassNotes           *string    `json:"class_notes,omitempty"`
	}
	q := h.db.Table("students s").
		Select("s.id student_id, s.full_name, ar.id record_id, ar.status, ar.confirmed_by_student, ar.student_confirmed_at, ar.professor_confirmed_at, ar.justification_type, ar.justification_note, ar.content_taught, ar.class_notes").
		Joins("LEFT JOIN attendance_records ar ON ar.student_id = s.id AND ar.class_id = ? AND ar.module_id = ?", classID, moduleID).
		Where("s.turma_id = ? AND s.status <> ?", classID, "cancelada").Order("s.full_name")
	if middleware.Role(c) == "aluno" {
		q = q.Where("s.user_id = ?", middleware.UserID(c))
	} else if !h.canManageClass(c, classID) {
		httpx.Error(c, http.StatusForbidden, "sem acesso a esta turma")
		return
	}
	var rows []row
	q.Scan(&rows)
	c.JSON(http.StatusOK, gin.H{"module": module, "attendance": rows})
}

// ConfirmModuleAttendance permite ao aluno confirmar somente a própria participação.
func (h *Handler) ConfirmModuleAttendance(c *gin.Context) {
	if middleware.Role(c) != "aluno" {
		httpx.Error(c, http.StatusForbidden, "ação exclusiva do aluno")
		return
	}
	moduleID, err := uuid.Parse(c.Param("moduleId"))
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "módulo inválido")
		return
	}
	var student models.Student
	if err := h.db.First(&student, "user_id = ?", middleware.UserID(c)).Error; err != nil || student.TurmaID == nil {
		httpx.Error(c, http.StatusForbidden, "aluno sem turma")
		return
	}
	module, _, err := h.loadModuleClass(moduleID, *student.TurmaID)
	if err != nil {
		httpx.Error(c, http.StatusNotFound, "módulo presencial indisponível")
		return
	}
	now := time.Now()
	if module.AttendanceOpenAt != nil && now.Before(*module.AttendanceOpenAt) {
		httpx.Error(c, http.StatusConflict, "confirmação ainda não liberada")
		return
	}
	if module.AttendanceCloseAt != nil && now.After(*module.AttendanceCloseAt) {
		httpx.Error(c, http.StatusConflict, "prazo de confirmação encerrado")
		return
	}
	date := now
	if module.InPersonDate != nil {
		date = *module.InPersonDate
	}
	record := models.AttendanceRecord{ClassID: student.TurmaID, StudentID: &student.ID, ModuleID: &moduleID, Date: &date, Status: "presente", ConfirmedByStudent: true, StudentConfirmedAt: &now}
	err = h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "class_id"}, {Name: "student_id"}, {Name: "module_id"}, {Name: "date"}},
		DoUpdates: clause.Assignments(map[string]any{"confirmed_by_student": true, "student_confirmed_at": now, "updated_at": now}),
	}).Create(&record).Error
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao confirmar presença")
		return
	}
	c.JSON(http.StatusOK, gin.H{"attendance": record, "awaiting_professor_confirmation": true})
}

// SetModuleAttendance registra a decisão final do professor/Secretaria.
func (h *Handler) SetModuleAttendance(c *gin.Context) {
	classID, err1 := uuid.Parse(c.Param("id"))
	moduleID, err2 := uuid.Parse(c.Param("moduleId"))
	studentID, err3 := uuid.Parse(c.Param("studentId"))
	if err1 != nil || err2 != nil || err3 != nil {
		httpx.Error(c, http.StatusBadRequest, "identificadores inválidos")
		return
	}
	module, _, err := h.loadModuleClass(moduleID, classID)
	if err != nil {
		httpx.Error(c, http.StatusNotFound, "módulo presencial não pertence à turma")
		return
	}
	if !h.canManageClass(c, classID) {
		httpx.Error(c, http.StatusForbidden, "sem acesso a esta turma")
		return
	}
	var body struct {
		Status            string  `json:"status"`
		JustificationType *string `json:"justification_type"`
		JustificationNote *string `json:"justification_note"`
		ContentTaught     *string `json:"content_taught"`
		ClassNotes        *string `json:"class_notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	if body.Status != "presente" && body.Status != "ausente" && body.Status != "justificado" {
		httpx.Error(c, http.StatusBadRequest, "status inválido")
		return
	}
	var count int64
	h.db.Model(&models.Student{}).Where("id = ? AND turma_id = ?", studentID, classID).Count(&count)
	if count == 0 {
		httpx.Error(c, http.StatusNotFound, "aluno não pertence à turma")
		return
	}
	now := time.Now()
	date := now
	if module.InPersonDate != nil {
		date = *module.InPersonDate
	}
	record := models.AttendanceRecord{
		ClassID:              &classID,
		StudentID:            &studentID,
		ModuleID:             &moduleID,
		Date:                 &date,
		Status:               body.Status,
		JustificationType:    body.JustificationType,
		JustificationNote:    body.JustificationNote,
		ContentTaught:        body.ContentTaught,
		ClassNotes:           body.ClassNotes,
		ProfessorConfirmedAt: &now,
		RecordedBy:           func() *uuid.UUID { id := middleware.UserID(c); return &id }(),
	}
	err = h.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "class_id"}, {Name: "student_id"}, {Name: "module_id"}, {Name: "date"}},
		DoUpdates: clause.Assignments(map[string]any{
			"status":                 body.Status,
			"justification_type":     body.JustificationType,
			"justification_note":     body.JustificationNote,
			"content_taught":         body.ContentTaught,
			"class_notes":            body.ClassNotes,
			"professor_confirmed_at": now,
			"recorded_by":            middleware.UserID(c),
			"updated_at":             now,
		}),
	}).Create(&record).Error
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao salvar chamada")
		return
	}
	c.JSON(http.StatusOK, gin.H{"attendance": record})
}

// ClassProgress consolida prazo, tempo, conclusão, prova e presença por módulo.
func (h *Handler) ClassProgress(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "turma inválida")
		return
	}
	if !h.canManageClass(c, classID) {
		httpx.Error(c, http.StatusForbidden, "sem acesso a esta turma")
		return
	}
	var class models.Class
	if err := h.db.First(&class, "id = ?", classID).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "turma não encontrada")
		return
	}
	if class.LMSCourseID == nil {
		c.JSON(http.StatusOK, gin.H{"class": class, "students": []any{}})
		return
	}
	var modules []models.LMSModule
	h.db.Where("course_id = ?", class.LMSCourseID).Order("order_index").Find(&modules)
	var students []models.Student
	h.db.Where("turma_id = ? AND status <> ?", classID, "cancelada").Order("full_name").Find(&students)
	daysRemaining := (*int)(nil)
	if class.PredictedEndDate != nil {
		days := int(time.Until(*class.PredictedEndDate).Hours() / 24)
		if days < 0 {
			days = 0
		}
		daysRemaining = &days
	}
	type moduleProgress struct {
		ModuleID         uuid.UUID  `json:"module_id"`
		Title            string     `json:"title"`
		IsInPerson       bool       `json:"is_in_person"`
		LessonsTotal     int64      `json:"lessons_total"`
		LessonsCompleted int64      `json:"lessons_completed"`
		WatchedSeconds   int64      `json:"watched_seconds"`
		StartedAt        *time.Time `json:"started_at,omitempty"`
		CompletedAt      *time.Time `json:"completed_at,omitempty"`
		Score            *int       `json:"score,omitempty"`
		Attempts         int        `json:"attempts"`
		Approved         *bool      `json:"approved,omitempty"`
		AttendanceStatus *string    `json:"attendance_status,omitempty"`
	}
	type studentProgress struct {
		StudentID uuid.UUID        `json:"student_id"`
		UserID    *uuid.UUID       `json:"user_id,omitempty"`
		FullName  string           `json:"full_name"`
		Modules   []moduleProgress `json:"modules"`
	}
	out := make([]studentProgress, 0, len(students))
	for _, student := range students {
		item := studentProgress{StudentID: student.ID, UserID: student.UserID, FullName: student.FullName, Modules: []moduleProgress{}}
		for _, module := range modules {
			mp := moduleProgress{ModuleID: module.ID, Title: module.Title, IsInPerson: module.IsInPerson}
			h.db.Table("lms_lessons").Where("module_id = ?", module.ID).Count(&mp.LessonsTotal)
			if student.UserID != nil {
				h.db.Table("lms_student_progress p").Joins("JOIN lms_lessons l ON l.id = p.lesson_id").Where("p.student_id = ? AND l.module_id = ? AND p.is_completed = true", student.UserID, module.ID).Count(&mp.LessonsCompleted)
				type timing struct {
					Total       int64
					StartedAt   *time.Time
					CompletedAt *time.Time
				}
				var timingRow timing
				h.db.Table("lms_student_progress p").Select("COALESCE(SUM(p.watched_seconds),0) total, MIN(p.last_accessed) started_at, CASE WHEN COUNT(*) FILTER (WHERE p.is_completed) = COUNT(*) AND COUNT(*) > 0 THEN MAX(p.last_accessed) END completed_at").Joins("JOIN lms_lessons l ON l.id = p.lesson_id").Where("p.student_id = ? AND l.module_id = ?", student.UserID, module.ID).Scan(&timingRow)
				mp.WatchedSeconds, mp.StartedAt, mp.CompletedAt = timingRow.Total, timingRow.StartedAt, timingRow.CompletedAt
				type result struct {
					Score         int
					AttemptsCount int
					IsApproved    bool
				}
				var quizResult result
				if tx := h.db.Table("lms_quiz_results qr").Select("qr.score, qr.attempts_count, qr.is_approved").Joins("JOIN lms_quizzes q ON q.id = qr.quiz_id").Where("qr.student_id = ? AND q.module_id = ?", student.UserID, module.ID).Order("qr.completed_at DESC").Limit(1).Scan(&quizResult); tx.RowsAffected > 0 {
					mp.Score, mp.Attempts, mp.Approved = &quizResult.Score, quizResult.AttemptsCount, &quizResult.IsApproved
				}
			}
			if module.IsInPerson {
				var attendance models.AttendanceRecord
				if tx := h.db.Where("class_id = ? AND student_id = ? AND module_id = ?", classID, student.ID, module.ID).Order("created_at DESC").First(&attendance); tx.Error == nil {
					mp.AttendanceStatus = &attendance.Status
				}
			}
			item.Modules = append(item.Modules, mp)
		}
		out = append(out, item)
	}
	c.JSON(http.StatusOK, gin.H{"class": class, "days_remaining": daysRemaining, "students": out})
}
