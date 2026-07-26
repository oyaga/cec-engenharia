package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// Class — turma.
type Class struct {
	ID                     uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name                   string     `gorm:"not null" json:"name"`
	CourseName             string     `gorm:"column:course_name;not null" json:"course_name"`
	StartDate              *time.Time `gorm:"column:start_date" json:"start_date,omitempty"`
	PredictedEndDate       *time.Time `gorm:"column:predicted_end_date" json:"predicted_end_date,omitempty"`
	ActualStartDate        *time.Time `gorm:"column:actual_start_date" json:"actual_start_date,omitempty"`
	ActualEndDate          *time.Time `gorm:"column:actual_end_date" json:"actual_end_date,omitempty"`
	Schedule               *string    `json:"schedule,omitempty"`
	Duration               *string    `json:"duration,omitempty"`
	LMSCourseID            *uuid.UUID `gorm:"type:uuid;column:lms_course_id" json:"lms_course_id,omitempty"`
	EvaluationPDFURL       *string    `gorm:"column:evaluation_pdf_url" json:"evaluation_pdf_url,omitempty"`
	PriceCash              float64    `gorm:"column:price_cash" json:"price_cash"`
	PriceCard10x           float64    `gorm:"column:price_card_10x" json:"price_card_10x"`
	PriceInstallments3x    float64    `gorm:"column:price_installments_3x" json:"price_installments_3x"`
	IsImmediateStart       bool       `gorm:"column:is_immediate_start" json:"is_immediate_start"`
	InstructorPaymentType  *string    `gorm:"column:instructor_payment_type" json:"instructor_payment_type,omitempty"`
	InstructorPaymentValue float64    `gorm:"column:instructor_payment_value" json:"instructor_payment_value"`
	Address                *string    `json:"address,omitempty"`
	HasInPerson            bool       `gorm:"column:has_in_person" json:"has_in_person"`
	InPersonSessions       int        `gorm:"column:in_person_sessions" json:"in_person_sessions"`
	CEP                    *string    `gorm:"column:cep" json:"cep,omitempty"`
	AddressNumber          *string    `gorm:"column:address_number" json:"address_number,omitempty"`
	AddressComplement      *string    `gorm:"column:address_complement" json:"address_complement,omitempty"`
	CardInstallments       int        `gorm:"column:card_installments;default:10" json:"card_installments"`
	BoletoInstallments     int        `gorm:"column:boleto_installments;default:1" json:"boleto_installments"`
	MaxCapacity            int        `gorm:"column:max_capacity;default:10" json:"max_capacity"`
	CourseValue            *float64   `gorm:"column:course_value" json:"course_value,omitempty"`
	Status                 *string    `json:"status,omitempty"`
	Notes                  *string    `json:"notes,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

func (Class) TableName() string { return "classes" }

// ClassInstructor — vínculo turma↔instrutor.
type ClassInstructor struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ClassID   uuid.UUID `gorm:"type:uuid;column:class_id;not null" json:"class_id"`
	UserID    uuid.UUID `gorm:"type:uuid;column:user_id;not null" json:"user_id"`
	Role      string    `gorm:"not null;default:titular" json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

func (ClassInstructor) TableName() string { return "class_instructors" }

// AttendanceRecord — presença.
type AttendanceRecord struct {
	ID                   uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ClassID              *uuid.UUID `gorm:"type:uuid;column:class_id" json:"class_id,omitempty"`
	StudentID            *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	ModuleID             *uuid.UUID `gorm:"type:uuid;column:module_id" json:"module_id,omitempty"`
	Date                 *time.Time `json:"date,omitempty"`
	Status               string     `gorm:"not null" json:"status"`
	ConfirmedByStudent   bool       `gorm:"column:confirmed_by_student" json:"confirmed_by_student"`
	StudentConfirmedAt   *time.Time `gorm:"column:student_confirmed_at" json:"student_confirmed_at,omitempty"`
	ProfessorConfirmedAt *time.Time `gorm:"column:professor_confirmed_at" json:"professor_confirmed_at,omitempty"`
	JustificationType    *string    `gorm:"column:justification_type" json:"justification_type,omitempty"`
	JustificationNote    *string    `gorm:"column:justification_note" json:"justification_note,omitempty"`
	ContentTaught        *string    `gorm:"column:content_taught" json:"content_taught,omitempty"`
	ClassNotes           *string    `gorm:"column:class_notes" json:"class_notes,omitempty"`
	RecordedBy           *uuid.UUID `gorm:"type:uuid;column:recorded_by" json:"recorded_by,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

func (AttendanceRecord) TableName() string { return "attendance_records" }

// AcademicRecord — situação/notas.
type AcademicRecord struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID        *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	Status           *string    `json:"status,omitempty"`
	TheoreticalGrade *float64   `gorm:"column:theoretical_grade" json:"theoretical_grade,omitempty"`
	PracticalGrade   *float64   `gorm:"column:practical_grade" json:"practical_grade,omitempty"`
	FinalStatus      *string    `gorm:"column:final_status" json:"final_status,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (AcademicRecord) TableName() string { return "academic_records" }

// StudentEvaluation — avaliação/notas (protegida por RBAC).
type StudentEvaluation struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID        *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	ClassID          *uuid.UUID `gorm:"type:uuid;column:class_id" json:"class_id,omitempty"`
	EvaluatorID      *uuid.UUID `gorm:"type:uuid;column:evaluator_id" json:"evaluator_id,omitempty"`
	TheoreticalGrade *float64   `gorm:"column:theoretical_grade" json:"theoretical_grade,omitempty"`
	PracticalGrade   *float64   `gorm:"column:practical_grade" json:"practical_grade,omitempty"`
	FinalStatus      *string    `gorm:"column:final_status" json:"final_status,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
	ExamType         *string    `gorm:"column:exam_type" json:"exam_type,omitempty"`
	Attempt          *int       `json:"attempt,omitempty"`
	Grade            *float64   `json:"grade,omitempty"`
	RetrainingHours  *int       `gorm:"column:retraining_hours" json:"retraining_hours,omitempty"`
	Date             *time.Time `json:"date,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (StudentEvaluation) TableName() string { return "student_evaluations" }

// InstructorQualification — habilitação PR-127.
type InstructorQualification struct {
	ID                uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID            uuid.UUID      `gorm:"type:uuid;column:user_id;not null" json:"user_id"`
	Method            string         `gorm:"not null" json:"method"`
	Status            string         `gorm:"not null;default:pendente" json:"status"`
	Details           datatypes.JSON `json:"details,omitempty"`
	ApprovedBy        *uuid.UUID     `gorm:"type:uuid;column:approved_by" json:"approved_by,omitempty"`
	QualificationType *string        `gorm:"column:qualification_type" json:"qualification_type,omitempty"`
	SNQCURL           *string        `gorm:"column:snqc_url" json:"snqc_url,omitempty"`
	ExperienceURL     *string        `gorm:"column:experience_url" json:"experience_url,omitempty"`
	TrainingURL       *string        `gorm:"column:training_url" json:"training_url,omitempty"`
	TrainingHours     *int           `gorm:"column:training_hours" json:"training_hours,omitempty"`
	TrainingDate      *time.Time     `gorm:"column:training_date" json:"training_date,omitempty"`
	DiplomaURL        *string        `gorm:"column:diploma_url" json:"diploma_url,omitempty"`
	RGURL             *string        `gorm:"column:rg_url" json:"rg_url,omitempty"`
	CPFDocURL         *string        `gorm:"column:cpf_doc_url" json:"cpf_doc_url,omitempty"`
	PhotoURL          *string        `gorm:"column:photo_url" json:"photo_url,omitempty"`
	ApprovedAt        *time.Time     `gorm:"column:approved_at" json:"approved_at,omitempty"`
	ValidUntil        *time.Time     `gorm:"column:valid_until" json:"valid_until,omitempty"`
	RejectionReason   *string        `gorm:"column:rejection_reason" json:"rejection_reason,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

func (InstructorQualification) TableName() string { return "instructor_qualifications" }

type InstructorCategory struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	InstructorID uuid.UUID `gorm:"type:uuid;column:instructor_id;not null" json:"instructor_id"`
	Category     string    `gorm:"not null" json:"category"`
	CreatedAt    time.Time `json:"created_at"`
}

func (InstructorCategory) TableName() string { return "instructor_categories" }

type InstructorCourse struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	InstructorID uuid.UUID `gorm:"type:uuid;column:instructor_id;not null" json:"instructor_id"`
	CourseID     uuid.UUID `gorm:"type:uuid;column:course_id;not null" json:"course_id"`
	CreatedAt    time.Time `json:"created_at"`
}

func (InstructorCourse) TableName() string { return "instructor_courses" }

// Staff — colaboradores internos (equipe não-aluno).
type Staff struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID            *uuid.UUID `gorm:"type:uuid;column:user_id" json:"user_id,omitempty"`
	Name              string     `gorm:"not null" json:"name"`
	CPF               *string    `gorm:"column:cpf" json:"cpf,omitempty"`
	Role              string     `gorm:"not null" json:"role"`
	Email             *string    `json:"email,omitempty"`
	Phone             *string    `json:"phone,omitempty"`
	AdmissionDate     *time.Time `gorm:"column:admission_date" json:"admission_date,omitempty"`
	Salary            *float64   `json:"salary,omitempty"`
	HasPlatformAccess bool       `gorm:"column:has_platform_access" json:"has_platform_access"`
	IsActive          bool       `gorm:"column:is_active;default:true" json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (Staff) TableName() string { return "staff" }
