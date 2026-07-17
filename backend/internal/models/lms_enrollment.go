package models

import (
	"time"

	"github.com/google/uuid"
)

// LMSEnrollment — matrícula de um aluno (usuário) em um curso EAD.
// Permite que o mesmo aluno tenha vários cursos simultâneos.
type LMSEnrollment struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;column:user_id;not null" json:"user_id"`
	CourseID  uuid.UUID `gorm:"type:uuid;column:course_id;not null" json:"course_id"`
	CreatedAt time.Time `json:"created_at"`
}

func (LMSEnrollment) TableName() string { return "lms_enrollments" }
