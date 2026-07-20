package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type LMSModule struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CourseID          *uuid.UUID `gorm:"type:uuid;column:course_id" json:"course_id,omitempty"`
	Title             string     `gorm:"not null" json:"title"`
	OrderIndex        int        `gorm:"column:order_index" json:"order_index"`
	IsInPerson        bool       `gorm:"column:is_in_person" json:"is_in_person"`
	InPersonDate      *time.Time `gorm:"column:in_person_date" json:"in_person_date,omitempty"`
	StartTime         *string    `gorm:"column:start_time" json:"start_time,omitempty"`
	EndTime           *string    `gorm:"column:end_time" json:"end_time,omitempty"`
	CEP               *string    `gorm:"column:cep" json:"cep,omitempty"`
	Street            *string    `gorm:"column:street" json:"street,omitempty"`
	AddressNumber     *string    `gorm:"column:address_number" json:"address_number,omitempty"`
	AddressComplement *string    `gorm:"column:address_complement" json:"address_complement,omitempty"`
	Neighborhood      *string    `gorm:"column:neighborhood" json:"neighborhood,omitempty"`
	City              *string    `gorm:"column:city" json:"city,omitempty"`
	State             *string    `gorm:"column:state" json:"state,omitempty"`
	Latitude          *float64   `gorm:"column:latitude" json:"latitude,omitempty"`
	Longitude         *float64   `gorm:"column:longitude" json:"longitude,omitempty"`
	WhatsAppURL       *string    `gorm:"column:whatsapp_url" json:"whatsapp_url,omitempty"`
	AttendanceOpenAt  *time.Time `gorm:"column:attendance_open_at" json:"attendance_open_at,omitempty"`
	AttendanceCloseAt *time.Time `gorm:"column:attendance_close_at" json:"attendance_close_at,omitempty"`
}

func (LMSModule) TableName() string { return "lms_modules" }

type LMSLesson struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ModuleID        *uuid.UUID `gorm:"type:uuid;column:module_id" json:"module_id,omitempty"`
	Title           string     `gorm:"not null" json:"title"`
	VideoURL        *string    `gorm:"column:video_url" json:"video_url,omitempty"`
	ContentText     *string    `gorm:"column:content_text" json:"content_text,omitempty"`
	PdfURL          *string    `gorm:"column:pdf_url" json:"pdf_url,omitempty"`
	AllowDownload   bool       `gorm:"column:allow_download" json:"allow_download"`
	Type            *string    `json:"type,omitempty"`
	MinWatchTimeSec int        `gorm:"column:min_watch_time_sec" json:"min_watch_time_sec"`
	OrderIndex      int        `gorm:"column:order_index" json:"order_index"`
}

func (LMSLesson) TableName() string { return "lms_lessons" }

type LMSStudentProgress struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID      *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	LessonID       *uuid.UUID `gorm:"type:uuid;column:lesson_id" json:"lesson_id,omitempty"`
	WatchedSeconds int        `gorm:"column:watched_seconds" json:"watched_seconds"`
	IsCompleted    bool       `gorm:"column:is_completed" json:"is_completed"`
	LastAccessed   time.Time  `gorm:"column:last_accessed" json:"last_accessed"`
}

func (LMSStudentProgress) TableName() string { return "lms_student_progress" }

type LMSQuiz struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CourseID         *uuid.UUID `gorm:"type:uuid;column:course_id" json:"course_id,omitempty"`
	ModuleID         *uuid.UUID `gorm:"type:uuid;column:module_id" json:"module_id,omitempty"`
	Title            string     `gorm:"not null" json:"title"`
	PassingGrade     int        `gorm:"column:passing_grade" json:"passing_grade"`
	MaxAttempts      int        `gorm:"column:max_attempts" json:"max_attempts"`
	QuizType         *string    `gorm:"column:quiz_type" json:"quiz_type,omitempty"`
	TimeLimitMinutes int        `gorm:"column:time_limit_minutes" json:"time_limit_minutes"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (LMSQuiz) TableName() string { return "lms_quizzes" }

type LMSQuestion struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuizID             *uuid.UUID     `gorm:"type:uuid;column:quiz_id" json:"quiz_id,omitempty"`
	QuestionText       string         `gorm:"column:question_text;not null" json:"question_text"`
	ImageURL           *string        `gorm:"column:image_url" json:"image_url,omitempty"`
	Options            datatypes.JSON `gorm:"not null" json:"options"`
	CorrectOptionIndex int            `gorm:"column:correct_option_index" json:"correct_option_index"`
}

func (LMSQuestion) TableName() string { return "lms_questions" }

type LMSAnnouncement struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title     string     `gorm:"not null" json:"title"`
	Content   string     `gorm:"not null" json:"content"`
	Priority  string     `gorm:"not null;default:geral" json:"priority"`
	CourseID  *uuid.UUID `gorm:"type:uuid;column:course_id" json:"course_id,omitempty"`
	CreatedBy *uuid.UUID `gorm:"type:uuid;column:created_by" json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (LMSAnnouncement) TableName() string { return "lms_announcements" }

type LMSQuestionBank struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	QuestionText       *string        `gorm:"column:question_text" json:"question_text,omitempty"`
	ImageURL           *string        `gorm:"column:image_url" json:"image_url,omitempty"`
	Options            datatypes.JSON `gorm:"not null" json:"options"`
	CorrectOptionIndex int            `gorm:"column:correct_option_index" json:"correct_option_index"`
	Category           *string        `json:"category,omitempty"`
	Difficulty         *string        `json:"difficulty,omitempty"`
	OriginalQuizID     *uuid.UUID     `gorm:"type:uuid;column:original_quiz_id" json:"original_quiz_id,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
}

func (LMSQuestionBank) TableName() string { return "lms_question_bank" }

// LMSLessonQuestion — dúvida do aluno sobre uma aula (Central de Dúvidas).
type LMSLessonQuestion struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	LessonID     *uuid.UUID `gorm:"type:uuid;column:lesson_id" json:"lesson_id,omitempty"`
	StudentID    *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	QuestionText string     `gorm:"column:question_text;not null" json:"question_text"`
	AnswerText   *string    `gorm:"column:answer_text" json:"answer_text,omitempty"`
	AnsweredBy   *uuid.UUID `gorm:"type:uuid;column:answered_by" json:"answered_by,omitempty"`
	AnsweredAt   *time.Time `gorm:"column:answered_at" json:"answered_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (LMSLessonQuestion) TableName() string { return "lms_lesson_questions" }

type TaskSubmission struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID   *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	LessonID    *uuid.UUID `gorm:"type:uuid;column:lesson_id" json:"lesson_id,omitempty"`
	FileURL     *string    `gorm:"column:file_url" json:"file_url,omitempty"`
	Status      string     `gorm:"default:enviado" json:"status"`
	Feedback    *string    `json:"feedback,omitempty"`
	Grade       *float64   `json:"grade,omitempty"`
	SubmittedAt time.Time  `gorm:"column:submitted_at" json:"submitted_at"`
}

func (TaskSubmission) TableName() string { return "task_submissions" }

type LMSTimeLog struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID       *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	CourseID        *uuid.UUID `gorm:"type:uuid;column:course_id" json:"course_id,omitempty"`
	QuizID          *uuid.UUID `gorm:"type:uuid;column:quiz_id" json:"quiz_id,omitempty"`
	LessonID        *uuid.UUID `gorm:"type:uuid;column:lesson_id" json:"lesson_id,omitempty"`
	DurationSeconds int        `gorm:"column:duration_seconds" json:"duration_seconds"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (LMSTimeLog) TableName() string { return "lms_time_logs" }

type LMSQuizResult struct {
	ID            uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID     *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	QuizID        *uuid.UUID `gorm:"type:uuid;column:quiz_id" json:"quiz_id,omitempty"`
	Score         int        `gorm:"not null" json:"score"`
	AttemptsCount int        `gorm:"column:attempts_count" json:"attempts_count"`
	IsApproved    bool       `gorm:"column:is_approved" json:"is_approved"`
	CompletedAt   time.Time  `gorm:"column:completed_at" json:"completed_at"`
}

func (LMSQuizResult) TableName() string { return "lms_quiz_results" }

type LMSForumTopic struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	LessonID  *uuid.UUID `gorm:"type:uuid;column:lesson_id" json:"lesson_id,omitempty"`
	StudentID *uuid.UUID `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	Title     string     `gorm:"not null" json:"title"`
	Content   string     `gorm:"not null" json:"content"`
	CreatedAt time.Time  `json:"created_at"`
}

func (LMSForumTopic) TableName() string { return "lms_forum_topics" }

type LMSForumReply struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TopicID   *uuid.UUID `gorm:"type:uuid;column:topic_id" json:"topic_id,omitempty"`
	AuthorID  *uuid.UUID `gorm:"type:uuid;column:author_id" json:"author_id,omitempty"`
	Content   string     `gorm:"not null" json:"content"`
	CreatedAt time.Time  `json:"created_at"`
}

func (LMSForumReply) TableName() string { return "lms_forum_replies" }

type LMSIssuedCertificate struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	StudentID *uuid.UUID     `gorm:"type:uuid;column:student_id" json:"student_id,omitempty"`
	CourseID  *uuid.UUID     `gorm:"type:uuid;column:course_id" json:"course_id,omitempty"`
	Code      string         `gorm:"unique;not null" json:"code"`
	IssuedAt  time.Time      `gorm:"column:issued_at;autoCreateTime" json:"issued_at"`
	Metadata  datatypes.JSON `json:"metadata,omitempty"`
}

func (LMSIssuedCertificate) TableName() string { return "lms_issued_certificates" }
