package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// User é a identidade canônica (substitui auth.users + public.users do Supabase).
type User struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Email              string         `gorm:"not null" json:"email"`
	PasswordHash       string         `gorm:"not null" json:"-"` // nunca serializar
	FullName           string         `gorm:"not null" json:"full_name"`
	Role               string         `gorm:"type:user_role;not null;default:aluno" json:"role"`
	CPF                *string        `json:"cpf,omitempty"`
	Phone              *string        `json:"phone,omitempty"`
	Address            datatypes.JSON `json:"address,omitempty"`
	BirthDate          *time.Time     `json:"birth_date,omitempty"`
	AdmissionDate      *time.Time     `json:"admission_date,omitempty"`
	Bio                *string        `json:"bio,omitempty"`
	AvatarURL          *string        `json:"avatar_url,omitempty"`
	Permissions        datatypes.JSON `gorm:"default:'{}'" json:"permissions,omitempty"`
	IsActive           bool           `gorm:"not null;default:true" json:"is_active"`
	MustChangePassword bool           `gorm:"not null;default:false" json:"must_change_password"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

func (User) TableName() string { return "users" }

// Student é o perfil estendido do aluno (dados acadêmicos/matrícula).
type Student struct {
	ID                     uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID                 *uuid.UUID     `gorm:"type:uuid" json:"user_id,omitempty"`
	MatriculaNumero        int64          `gorm:"autoIncrement" json:"matricula_numero"`
	TurmaID                *uuid.UUID     `gorm:"type:uuid" json:"turma_id,omitempty"`
	FullName               string         `gorm:"not null" json:"full_name"`
	CPF                    string         `gorm:"not null;unique" json:"cpf"`
	RG                     *string        `json:"rg,omitempty"`
	BirthDate              *time.Time     `json:"birth_date,omitempty"`
	BirthPlace             *string        `json:"birth_place,omitempty"`
	MaritalStatus          *string        `json:"marital_status,omitempty"`
	Email                  *string        `json:"email,omitempty"`
	Phone                  *string        `json:"phone,omitempty"`
	EducationLevel         *string        `json:"education_level,omitempty"`
	ParentsNames           datatypes.JSON `json:"parents_names,omitempty"`
	Address                datatypes.JSON `json:"address,omitempty"`
	RequiresPasswordChange bool           `gorm:"not null;default:false" json:"requires_password_change"`
	// Campos de gestão de turma / prática / EAD (migration 003)
	Status               string     `gorm:"default:ativa" json:"status"`
	PracticalClassID     *uuid.UUID `gorm:"type:uuid;column:practical_class_id" json:"practical_class_id,omitempty"`
	PracticalClassStatus *string    `gorm:"column:practical_class_status" json:"practical_class_status,omitempty"`
	HasLMSAccess         bool       `gorm:"column:has_lms_access;default:false" json:"has_lms_access"`
	ManualSigned         bool       `gorm:"column:manual_signed;default:false" json:"manual_signed"`
	IsOnlineOnly         bool       `gorm:"column:is_online_only;default:false" json:"is_online_only"`
	BaseValue            *float64   `gorm:"column:base_value" json:"base_value,omitempty"`
	DiscountValue        *float64   `gorm:"column:discount_value" json:"discount_value,omitempty"`
	PaymentMethod        *string    `gorm:"column:payment_method" json:"payment_method,omitempty"`
	PaymentStatus        *string    `gorm:"column:payment_status" json:"payment_status,omitempty"`
	DocPhotoURL          *string    `gorm:"column:doc_photo_url" json:"doc_photo_url,omitempty"`
	DocIDURL             *string    `gorm:"column:doc_id_url" json:"doc_id_url,omitempty"`
	DocCPFURL            *string    `gorm:"column:doc_cpf_url" json:"doc_cpf_url,omitempty"`
	DocAddressURL        *string    `gorm:"column:doc_address_url" json:"doc_address_url,omitempty"`
	DocEducationURL      *string    `gorm:"column:doc_education_url" json:"doc_education_url,omitempty"`
	// Status de revisão por documento: "pending" | "approved" | "rejected"
	DocPhotoStatus     *string `gorm:"column:doc_photo_status;default:'pending'" json:"doc_photo_status,omitempty"`
	DocIDStatus        *string `gorm:"column:doc_id_status;default:'pending'" json:"doc_id_status,omitempty"`
	DocCPFStatus       *string `gorm:"column:doc_cpf_status;default:'pending'" json:"doc_cpf_status,omitempty"`
	DocAddressStatus   *string `gorm:"column:doc_address_status;default:'pending'" json:"doc_address_status,omitempty"`
	DocEducationStatus *string `gorm:"column:doc_education_status;default:'pending'" json:"doc_education_status,omitempty"`
	// Motivo de rejeição por documento (preenchido pela secretaria ao rejeitar)
	DocPhotoReject     *string `gorm:"column:doc_photo_reject" json:"doc_photo_reject,omitempty"`
	DocIDReject        *string `gorm:"column:doc_id_reject" json:"doc_id_reject,omitempty"`
	DocCPFReject       *string `gorm:"column:doc_cpf_reject" json:"doc_cpf_reject,omitempty"`
	DocAddressReject   *string `gorm:"column:doc_address_reject" json:"doc_address_reject,omitempty"`
	DocEducationReject *string `gorm:"column:doc_education_reject" json:"doc_education_reject,omitempty"`
	ProgressPercent    int     `gorm:"column:progress_percent" json:"progress_percent"`
	TermsAccepted      bool    `gorm:"column:terms_accepted" json:"terms_accepted"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

func (Student) TableName() string { return "students" }

// AuditLog registra ações sensíveis (financeiro, mudança de papel, etc.).
type AuditLog struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID     *uuid.UUID     `gorm:"type:uuid" json:"user_id,omitempty"`
	Action     string         `gorm:"not null" json:"action"`
	EntityType string         `gorm:"not null" json:"entity_type"`
	EntityID   *uuid.UUID     `gorm:"type:uuid" json:"entity_id,omitempty"`
	Details    datatypes.JSON `json:"details,omitempty"`
	IP         *string        `json:"ip,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

func (AuditLog) TableName() string { return "audit_logs" }
