package models

import (
	"time"

	"github.com/google/uuid"
)

// LMSCourse — curso do catálogo (com preços).
type LMSCourse struct {
	ID                     uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title                  string    `gorm:"not null" json:"title"`
	Code                   *string   `json:"code,omitempty"`
	Description            *string   `json:"description,omitempty"`
	ThumbnailURL           *string   `gorm:"column:thumbnail_url" json:"thumbnail_url,omitempty"`
	IsPublished            bool      `gorm:"column:is_published;default:false" json:"is_published"`
	PricePix               *float64  `gorm:"column:price_pix" json:"price_pix,omitempty"`
	PriceCard              *float64  `gorm:"column:price_card" json:"price_card,omitempty"`
	PriceBoleto            *float64  `gorm:"column:price_boleto" json:"price_boleto,omitempty"`
	PriceFinancing         *float64  `gorm:"column:price_financing" json:"price_financing,omitempty"`
	DefaultValue           *float64  `gorm:"column:default_value" json:"default_value,omitempty"`
	MaxInstallments        *int      `gorm:"column:max_installments" json:"max_installments,omitempty"`
	FinancingInstallments  *int      `gorm:"column:financing_installments" json:"financing_installments,omitempty"`
	MinTheoreticalHours    *int      `gorm:"column:min_theoretical_hours" json:"min_theoretical_hours,omitempty"`
	AsaasPaymentLink       *string   `gorm:"column:asaas_payment_link" json:"asaas_payment_link,omitempty"`
	InstructorPaymentType  *string   `gorm:"column:instructor_payment_type" json:"instructor_payment_type,omitempty"`
	InstructorPaymentValue float64   `gorm:"column:instructor_payment_value" json:"instructor_payment_value"`
	// Extras da tela Cursos (migration 008)
	PracticalHours         *float64 `gorm:"column:practical_hours" json:"practical_hours,omitempty"`
	MinAttendance          *float64 `gorm:"column:min_attendance" json:"min_attendance,omitempty"`
	MinGrade               *float64 `gorm:"column:min_grade" json:"min_grade,omitempty"`
	MaxInstructors         *int     `gorm:"column:max_instructors" json:"max_instructors,omitempty"`
	Status                 *string  `json:"status,omitempty"`
	PriceNotes             *string  `gorm:"column:price_notes" json:"price_notes,omitempty"`
	AsaasProductID         *string  `gorm:"column:asaas_product_id" json:"asaas_product_id,omitempty"`
	RetrainTeoricoDays     *int     `gorm:"column:retrain_teorico_days" json:"retrain_teorico_days,omitempty"`
	RetrainTeoricoPriceDay *float64 `gorm:"column:retrain_teorico_price_day" json:"retrain_teorico_price_day,omitempty"`
	RetrainPraticoDays     *int     `gorm:"column:retrain_pratico_days" json:"retrain_pratico_days,omitempty"`
	RetrainPraticoPriceDay *float64 `gorm:"column:retrain_pratico_price_day" json:"retrain_pratico_price_day,omitempty"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

func (LMSCourse) TableName() string { return "lms_courses" }
