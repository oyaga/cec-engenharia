import { CheckCircle2, MessageCircle, PlayCircle, Send } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function ProfessorComments({
  comments,
  loading,
  status,
  onStatusChange,
  answeringId,
  answerText,
  onAnswerTextChange,
  onStartAnswer,
  onCancelAnswer,
  onSendAnswer,
}) {
  const [student, setStudent] = useState('todos')
  const [course, setCourse] = useState('todos')

  const students = useMemo(() => {
    const values = new Map()
    comments.forEach((comment) => {
      const name = comment.student?.full_name || 'Aluno'
      values.set(name, name)
    })
    return [...values.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [comments])

  const courses = useMemo(
    () => [...new Set(comments.map((comment) => comment.course_title || 'Curso EAD'))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [comments],
  )

  const filtered = comments.filter((comment) => {
    const isPending = !comment.answer_text
    const matchesStatus = status === 'all' || (status === 'pending' ? isPending : !isPending)
    const matchesStudent = student === 'todos' || (comment.student?.full_name || 'Aluno') === student
    const matchesCourse = course === 'todos' || (comment.course_title || 'Curso EAD') === course
    return matchesStatus && matchesStudent && matchesCourse
  })

  const pending = comments.filter((comment) => !comment.answer_text).length

  if (loading) return <div className="prof-comments-empty">Buscando comentários dos alunos...</div>

  return (
    <div className="prof-comments-layout">
      <aside className="prof-comments-filter">
        <p>Filtrar por aluno</p>
        <button className={student === 'todos' ? 'is-active' : ''} onClick={() => setStudent('todos')}>Todos os alunos</button>
        {students.map((name) => {
          const count = comments.filter((comment) => (comment.student?.full_name || 'Aluno') === name && !comment.answer_text).length
          return (
            <button key={name} className={student === name ? 'is-active' : ''} onClick={() => setStudent(name)}>
              <span>{name}</span>{count > 0 && <b>{count}</b>}
            </button>
          )
        })}
      </aside>

      <section className="prof-comments-main">
        <header className="prof-comments-toolbar">
          <div className="prof-comments-count"><MessageCircle size={17} /> {pending} comentário(s) aguardando resposta</div>
          <label>Curso:
            <select value={course} onChange={(event) => setCourse(event.target.value)}>
              <option value="todos">Todos os cursos</option>
              {courses.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </header>

        <div className="prof-comments-status">
          <button className={status === 'pending' ? 'is-active' : ''} onClick={() => onStatusChange('pending')}>Pendentes ({pending})</button>
          <button className={status === 'answered' ? 'is-active' : ''} onClick={() => onStatusChange('answered')}>Respondidos ({comments.length - pending})</button>
          <button className={status === 'all' ? 'is-active' : ''} onClick={() => onStatusChange('all')}>Todos</button>
        </div>

        {filtered.map((comment) => (
          <article key={comment.id} className="prof-comment-card">
            <div className="prof-comment-card__meta">
              <strong>{comment.student?.full_name || 'Aluno'}</strong>
              <span>{comment.course_title || 'Curso EAD'}</span>
              <span>{comment.module_title || 'Módulo'}</span>
              <span>🎬 {comment.lesson_title || comment.lesson?.title || 'Vídeo'}</span>
              <time>{new Date(comment.created_at).toLocaleDateString('pt-BR')}</time>
            </div>
            <p className="prof-comment-card__question">{comment.question_text}</p>

            {comment.answer_text && answeringId !== comment.id && (
              <div className="prof-comment-card__answer"><small><CheckCircle2 size={15} /> Sua resposta</small>{comment.answer_text}</div>
            )}

            {comment.video_url && <a className="prof-comment-video" href={comment.video_url} target="_blank" rel="noreferrer"><PlayCircle size={16} /> Abrir vídeo da aula</a>}

            {answeringId === comment.id ? (
              <div className="prof-comment-reply">
                <textarea rows="3" placeholder="Escreva sua resposta ao aluno..." value={answerText} onChange={(event) => onAnswerTextChange(event.target.value)} />
                <div><button onClick={onCancelAnswer}>Cancelar</button><button className="is-primary" disabled={!answerText.trim()} onClick={() => onSendAnswer(comment.id)}><Send size={16} /> Enviar resposta</button></div>
              </div>
            ) : (
              <button className="prof-comment-answer-button" onClick={() => onStartAnswer(comment)}>{comment.answer_text ? 'Editar resposta' : 'Responder comentário'}</button>
            )}
          </article>
        ))}

        {filtered.length === 0 && <div className="prof-comments-empty">Nenhum comentário encontrado para estes filtros.</div>}
      </section>
    </div>
  )
}
