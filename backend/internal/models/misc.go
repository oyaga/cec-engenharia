package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// Order — pedido/compra (checkout).
type Order struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID      *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	CourseID       *uuid.UUID `gorm:"type:uuid;column:course_id" json:"course_id,omitempty"`
	CustomerName   *string    `gorm:"column:customer_name" json:"customer_name,omitempty"`
	Amount         *float64   `json:"amount,omitempty"`
	Status         string     `gorm:"default:pendente" json:"status"`
	PaymentMethod  *string    `gorm:"column:payment_method" json:"payment_method,omitempty"`
	AsaasPaymentID *string    `gorm:"column:asaas_payment_id" json:"asaas_payment_id,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (Order) TableName() string { return "orders" }

// Message — mensagem interna (chat).
type Message struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SenderID   *uuid.UUID `gorm:"type:uuid;column:sender_id" json:"sender_id,omitempty"`
	ReceiverID *uuid.UUID `gorm:"type:uuid;column:receiver_id" json:"receiver_id,omitempty"`
	ClassID    *uuid.UUID `gorm:"type:uuid;column:class_id" json:"class_id,omitempty"`
	Content    string     `gorm:"not null" json:"content"`
	IsRead     bool       `gorm:"column:is_read" json:"is_read"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (Message) TableName() string { return "messages" }

// Announcement — comunicado geral (não LMS).
type Announcement struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Body        string         `gorm:"not null" json:"body"`
	TargetRoles datatypes.JSON `gorm:"column:target_roles" json:"target_roles,omitempty"`
	IsPinned    bool           `gorm:"column:is_pinned" json:"is_pinned"`
	ExpiresAt   *time.Time     `gorm:"column:expires_at" json:"expires_at,omitempty"`
	CreatedBy   *uuid.UUID     `gorm:"type:uuid;column:created_by" json:"created_by,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
}

func (Announcement) TableName() string { return "announcements" }

// SiteContent — bloco de conteúdo editável do site (CMS).
type SiteContent struct {
	Key       string         `gorm:"primaryKey" json:"key"`
	Value     datatypes.JSON `json:"value,omitempty"`
	UpdatedAt time.Time      `json:"updated_at"`
}

func (SiteContent) TableName() string { return "site_content" }
