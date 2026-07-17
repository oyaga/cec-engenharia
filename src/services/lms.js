// Serviço do LMS (estrutura, aulas, progresso, quizzes, fórum, certificados).
import { request } from '../lib/api';

export const lmsApi = {
  // Estrutura / conteúdo
  structure: (courseId) => request(`/courses/${courseId}/structure`),
  createModule: (payload) => request('/lms/modules', { method: 'POST', body: payload }),
  updateModule: (id, payload) => request(`/lms/modules/${id}`, { method: 'PUT', body: payload }),
  removeModule: (id) => request(`/lms/modules/${id}`, { method: 'DELETE' }),
  createLesson: (payload) => request('/lms/lessons', { method: 'POST', body: payload }),
  updateLesson: (id, payload) => request(`/lms/lessons/${id}`, { method: 'PUT', body: payload }),
  removeLesson: (id) => request(`/lms/lessons/${id}`, { method: 'DELETE' }),

  // Player de aula (aluno)
  lessonDetail: (lessonId) => request(`/lms/lessons/${lessonId}`),
  courseLessons: (courseId) => request(`/lms/courses/${courseId}/lessons`),
  courseQuizzesStudent: (courseId) => request(`/lms/courses/${courseId}/quizzes`),
  taskSubmission: (lessonId) => request(`/lms/task-submissions?lesson_id=${lessonId}`),
  submitTask: (lesson_id, file_url) => request('/lms/task-submissions', { method: 'POST', body: { lesson_id, file_url } }),
  logTime: (payload) => request('/lms/time-logs', { method: 'POST', body: payload }),
  timeLogs: (student_id) => request(`/lms/time-logs${student_id ? `?student_id=${student_id}` : ''}`),

  // Progresso
  progress: (student_id) => request(`/lms/progress${student_id ? `?student_id=${student_id}` : ''}`),
  saveProgress: (payload) => request('/lms/progress', { method: 'POST', body: payload }),

  // Matrículas EAD (aluno vê seus cursos; staff matricula/desmatricula)
  myCourses: () => request('/lms/my-courses'),
  enroll: (user_id, course_id) => request('/lms/enrollments', { method: 'POST', body: { user_id, course_id } }),
  unenroll: (user_id, course_id) => request(`/lms/enrollments?user_id=${user_id}&course_id=${course_id}`, { method: 'DELETE' }),

  // Quizzes
  courseQuizzes: (courseId) => request(`/courses/${courseId}/quizzes`),
  quiz: (id) => request(`/lms/quizzes/${id}`),
  createQuiz: (payload) => request('/lms/quizzes', { method: 'POST', body: payload }),
  updateQuiz: (id, payload) => request(`/lms/quizzes/${id}`, { method: 'PUT', body: payload }),
  removeQuiz: (id) => request(`/lms/quizzes/${id}`, { method: 'DELETE' }),
  createQuestion: (payload) => request('/lms/questions', { method: 'POST', body: payload }),
  updateQuestion: (id, payload) => request(`/lms/questions/${id}`, { method: 'PUT', body: payload }),
  removeQuestion: (id) => request(`/lms/questions/${id}`, { method: 'DELETE' }),
  submitResult: (payload) => request('/lms/quiz-results', { method: 'POST', body: payload }),
  results: (params = {}) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return request(`/lms/quiz-results${qs ? `?${qs}` : ''}`);
  },

  // Fórum
  allForumTopics: () => request('/lms/forum-topics'),
  lessonForum: (lessonId) => request(`/lms/lessons/${lessonId}/forum`),
  topicReplies: (topicId) => request(`/lms/forum/topics/${topicId}/replies`),
  createTopic: (payload) => request('/lms/forum/topics', { method: 'POST', body: payload }),
  createReply: (payload) => request('/lms/forum/replies', { method: 'POST', body: payload }),

  // Avisos
  announcements: (course_id) => request(`/lms/announcements${course_id ? `?course_id=${course_id}` : ''}`),
  createAnnouncement: (payload) => request('/lms/announcements', { method: 'POST', body: payload }),
  updateAnnouncement: (id, payload) => request(`/lms/announcements/${id}`, { method: 'PUT', body: payload }),
  removeAnnouncement: (id) => request(`/lms/announcements/${id}`, { method: 'DELETE' }),

  // Banco de questões
  questionBank: (category) => request(`/lms/question-bank${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  addToBank: (payload) => request('/lms/question-bank', { method: 'POST', body: payload }),
  removeFromBank: (id) => request(`/lms/question-bank/${id}`, { method: 'DELETE' }),

  // Dúvidas dos alunos (Central de Dúvidas)
  doubts: () => request('/lms/doubts'),
  lessonDoubts: (lessonId) => request(`/lms/lessons/${lessonId}/doubts`),
  createDoubt: (payload) => request('/lms/doubts', { method: 'POST', body: payload }),
  answerDoubt: (id, answer_text) => request(`/lms/doubts/${id}`, { method: 'PUT', body: { answer_text } }),

  // Certificados
  certificates: (opts = {}) => {
    if (opts.all) return request('/lms/certificates?all=true');
    return request(`/lms/certificates${opts.student_id ? `?student_id=${opts.student_id}` : ''}`);
  },
  issueCertificate: (payload) => request('/lms/certificates', { method: 'POST', body: payload }),
  claimCertificate: (course_id) => request('/lms/certificates/claim', { method: 'POST', body: { course_id } }),
  validateCertificate: (code) => request(`/public/validate-certificate/${code}`, { auth: false }),
};
