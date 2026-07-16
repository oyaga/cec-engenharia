package models

import (
	"time"

	"github.com/google/uuid"
)

// Lead — captação do site/chatbot.
type Lead struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name           string    `gorm:"not null" json:"name"`
	Phone          string    `gorm:"not null" json:"phone"`
	Email          *string   `json:"email,omitempty"`
	CourseInterest *string   `gorm:"column:course_interest" json:"course_interest,omitempty"`
	Message        *string   `json:"message,omitempty"`
	Interesse      *string   `json:"interesse,omitempty"`
	Origem         *string   `json:"origem,omitempty"`
	Status         string    `gorm:"not null;default:novo" json:"status"`
	Observacao     *string   `json:"observacao,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (Lead) TableName() string { return "leads" }

// Complaint — Ouvidoria.
type Complaint struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        *string   `json:"name,omitempty"`
	Phone       *string   `json:"phone,omitempty"`
	Description string    `gorm:"not null" json:"description"`
	Status      string    `gorm:"not null;default:pending" json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

func (Complaint) TableName() string { return "complaints" }

// Testimonial — depoimento.
type Testimonial struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name             string     `gorm:"not null" json:"name"`
	Course           string     `gorm:"not null" json:"course"`
	EvaluationDate   *time.Time `gorm:"column:evaluation_date" json:"evaluation_date,omitempty"`
	Content          *string    `json:"content,omitempty"`
	ImageURL         *string    `gorm:"column:image_url" json:"image_url,omitempty"`
	Status           string     `gorm:"not null;default:pending" json:"status"`
	Type             string     `gorm:"not null;default:text" json:"type"`
	Rating           int        `gorm:"not null;default:5" json:"rating"`
	AdminDescription *string    `gorm:"column:admin_description" json:"admin_description,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (Testimonial) TableName() string { return "testimonials" }

// Enrollment — pré-matrícula pelo site público.
type Enrollment struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name          string     `gorm:"not null" json:"name"`
	SocialName    *string    `gorm:"column:social_name" json:"social_name,omitempty"`
	Phone         string     `gorm:"not null" json:"phone"`
	Email         *string    `json:"email,omitempty"`
	CPF           *string    `json:"cpf,omitempty"`
	CourseName    string     `gorm:"column:course_name;not null" json:"course_name"`
	PaymentMethod *string    `gorm:"column:payment_method" json:"payment_method,omitempty"`
	TurmaID       *uuid.UUID `gorm:"type:uuid;column:turma_id" json:"turma_id,omitempty"`
	Status        string     `gorm:"not null;default:pending" json:"status"`
	ProcessedAt   *time.Time `gorm:"column:processed_at" json:"processed_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

func (Enrollment) TableName() string { return "enrollments" }
