package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// SystemSetting — configuração chave/valor (inclui segredos como asaas_api_key).
type SystemSetting struct {
	Key       string    `gorm:"primaryKey" json:"key"`
	Value     *string   `json:"value,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SystemSetting) TableName() string { return "system_settings" }

// FinancialRecord — lançamento financeiro (receita/despesa).
type FinancialRecord struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID      *uuid.UUID     `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	CourseID       *uuid.UUID     `gorm:"type:uuid;column:course_id" json:"course_id,omitempty"`
	TotalValue     *float64       `gorm:"column:total_value" json:"total_value,omitempty"`
	Amount         *float64       `json:"amount,omitempty"`
	PaymentMethod  *string        `gorm:"column:payment_method" json:"payment_method,omitempty"`
	Installments   datatypes.JSON `json:"installments,omitempty"`
	Type           string         `gorm:"default:receita" json:"type"`
	Category       *string        `json:"category,omitempty"`
	Status         string         `gorm:"default:pendente" json:"status"`
	Description    *string        `json:"description,omitempty"`
	AsaasPaymentID *string        `gorm:"column:asaas_payment_id" json:"asaas_payment_id,omitempty"`
	Date           *time.Time     `json:"date,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
}

func (FinancialRecord) TableName() string { return "financial_records" }

// FinancialCost — custo/rateio da turma.
type FinancialCost struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ClassID      *uuid.UUID `gorm:"type:uuid;column:class_id" json:"class_id,omitempty"`
	Description  string     `gorm:"not null" json:"description"`
	Type         string     `gorm:"not null" json:"type"`
	Value        float64    `gorm:"not null" json:"value"`
	Amount       float64    `gorm:"not null" json:"amount"`
	Status       string     `gorm:"default:pendente" json:"status"`
	DateIncurred *time.Time `gorm:"column:date_incurred" json:"date_incurred,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (FinancialCost) TableName() string { return "financial_costs" }

// Expense — despesa.
type Expense struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Description string     `gorm:"not null" json:"description"`
	Amount      float64    `gorm:"not null" json:"amount"`
	DueDate     time.Time  `gorm:"column:due_date;not null" json:"due_date"`
	Category    string     `gorm:"not null" json:"category"`
	Status      string     `gorm:"default:pendente" json:"status"`
	ReceiptURL  *string    `gorm:"column:receipt_url" json:"receipt_url,omitempty"`
	ClassID     *uuid.UUID `gorm:"type:uuid;column:class_id" json:"class_id,omitempty"`
	CreatedBy   *uuid.UUID `gorm:"type:uuid;column:created_by" json:"created_by,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (Expense) TableName() string { return "expenses" }

// InvoiceTracking — nota fiscal.
type InvoiceTracking struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID         *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	FinancialRecordID *uuid.UUID `gorm:"type:uuid;column:financial_record_id" json:"financial_record_id,omitempty"`
	NFNumber          *string    `gorm:"column:nf_number" json:"nf_number,omitempty"`
	Amount            float64    `gorm:"not null" json:"amount"`
	IssueDate         *time.Time `gorm:"column:issue_date" json:"issue_date,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}

func (InvoiceTracking) TableName() string { return "invoices_tracking" }

// OnboardingLog — log pós-pagamento (webhook Asaas).
type OnboardingLog struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID       *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	AsaasPaymentID  *string    `gorm:"column:asaas_payment_id" json:"asaas_payment_id,omitempty"`
	AsaasCustomerID *string    `gorm:"column:asaas_customer_id" json:"asaas_customer_id,omitempty"`
	PaymentValue    *float64   `gorm:"column:payment_value" json:"payment_value,omitempty"`
	PaymentMethod   *string    `gorm:"column:payment_method" json:"payment_method,omitempty"`
	EmailSent       bool       `gorm:"column:email_sent" json:"email_sent"`
	WhatsAppSent    bool       `gorm:"column:whatsapp_sent" json:"whatsapp_sent"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (OnboardingLog) TableName() string { return "onboarding_logs" }

// FinancialPin — PIN de proteção do módulo financeiro (guarda HASH).
type FinancialPin struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	PinHash   string     `gorm:"column:pin_hash;not null" json:"-"`
	Role      string     `gorm:"not null;default:admin" json:"role"`
	CreatedBy *uuid.UUID `gorm:"type:uuid;column:created_by" json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (FinancialPin) TableName() string { return "financial_pins" }
