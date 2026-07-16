// Seed do curso EAD a partir de uma pasta de conteúdo (apostilas + videoaulas
// + questionários), criando curso → módulos → aulas → quizzes via API.
//
// Uso:
//   node scripts/seed-curso.mjs --content "C:\caminho\cec curso" --quizzes "C:\caminho\quizzes-txt" \
//        [--base http://localhost:8090] [--email admin@cec.local] [--password admin123] [--title "..."]
//
// Os questionários devem estar em .txt (um por módulo, nome = nome da pasta do
// módulo), extraídos dos .odt. Para extrair (PowerShell):
//   $zip=[IO.Compression.ZipFile]::OpenRead($odt); ... content.xml → strip tags
// (ver documentação no repositório). Formato esperado: questões "N – texto"
// com alternativas "a) ..."–"e) ..." e seção GABARITO ao final ("N - letra").

import fs from 'node:fs';
import path from 'node:path';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};

const BASE = (arg('base', 'http://localhost:8090')).replace(/\/$/, '');
const EMAIL = arg('email', 'admin@cec.local');
const PASSWORD = arg('password', 'admin123');
const CONTENT_DIR = arg('content');
const QUIZ_DIR = arg('quizzes');
const COURSE_TITLE = arg('title', 'Controle Dimensional – Mecânica (CD-CM)');

if (!CONTENT_DIR || !QUIZ_DIR) {
  console.error('uso: --content <pasta do curso> --quizzes <pasta dos .txt>');
  process.exit(1);
}

// Ordem pedagógica: pasta de origem → título do módulo.
const MODULES = [
  ['DESENHO TECNICO', 'Desenho Técnico'],
  ['INSTRUMENTOS DE MECANICA', 'Instrumentos de Mecânica'],
  ['TOLERANCIA', 'Tolerância Dimensional e Ajuste'],
  ['TOLERANCIA GEOMETRICA', 'Tolerância Geométrica'],
  ['TEXTURA', 'Textura Superficial'],
  ['DUREZA', 'Dureza'],
  ['ENGRENAGENS', 'Engrenagens'],
  ['MAQUINAS ROTATIVAAS', 'Máquinas Rotativas'],
  ['VALVULAS', 'Válvulas Industriais'],
  ['RECEBIMENTO', 'Recebimento e Armazenamento de Materiais'],
];

let TOKEN = '';

async function api(method, route, body) {
  const res = await fetch(`${BASE}/api/v1${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${route} → HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function upload(filePath, folder) {
  const fd = new FormData();
  fd.append('file', await fs.openAsBlob(filePath), path.basename(filePath));
  fd.append('folder', folder);
  const { url } = await api('POST', '/upload', fd);
  return url;
}

// ── Parser do questionário (texto extraído do ODT) ──
function parseQuiz(txt) {
  const gi = txt.search(/GABARITO/i);
  if (gi < 0) return null;
  const body = txt.slice(0, gi);
  const key = {};
  for (const m of txt.slice(gi).matchAll(/(\d+)\s*[-–]\s*([a-e])/gi)) {
    key[Number(m[1])] = m[2].toLowerCase().charCodeAt(0) - 97; // a→0 … e→4
  }

  const questions = [];
  // Divide o corpo em blocos que começam com "N – " no início de linha.
  const blocks = body.split(/(?=^\s*\d+\s*[–-]\s+)/m).filter(b => /^\s*\d+\s*[–-]/.test(b));
  for (const block of blocks) {
    const head = block.match(/^\s*(\d+)\s*[–-]\s*/);
    if (!head) continue;
    const num = Number(head[1]);
    const rest = block.slice(head[0].length);
    // Alternativas: "a) ..." no início de linha (podem ocupar várias linhas).
    const parts = rest.split(/(?=^\s*[a-e]\)\s*)/m);
    const qText = parts[0].replace(/\s+/g, ' ').trim();
    const options = parts.slice(1).map(p =>
      p.replace(/^\s*[a-e]\)\s*/, '').replace(/\s+/g, ' ').trim()
    ).filter(Boolean);
    if (!qText || options.length < 2 || key[num] === undefined || key[num] >= options.length) {
      console.warn(`  ! questão ${num} ignorada (texto/opções/gabarito inconsistentes)`);
      continue;
    }
    questions.push({ num, question_text: qText, options, correct_option_index: key[num] });
  }
  return questions;
}

const findFile = (dir, pattern) =>
  fs.readdirSync(dir).find(f => pattern.test(f))
    ? path.join(dir, fs.readdirSync(dir).find(f => pattern.test(f)))
    : null;

(async () => {
  // 1. Login
  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.ok) throw new Error(`login falhou: HTTP ${login.status}`);
  TOKEN = (await login.json()).token;
  console.log(`✓ login em ${BASE}`);

  // 2. Curso (aborta se já existir com o mesmo título — evita duplicar)
  const { courses } = await api('GET', '/courses');
  if ((courses || []).some(c => c.title === COURSE_TITLE)) {
    console.error(`✗ curso "${COURSE_TITLE}" já existe — abortando para não duplicar.`);
    process.exit(2);
  }
  const { course } = await api('POST', '/courses', {
    title: COURSE_TITLE,
    description: 'Formação completa em Controle Dimensional aplicado à mecânica industrial: metrologia, tolerâncias, ensaios e elementos de máquinas.',
    is_published: false,
    min_theoretical_hours: 60,
  });
  console.log(`✓ curso criado: ${course.title} (${course.id})`);

  let totLessons = 0, totQuizzes = 0, totQuestions = 0;

  // 3. Módulos
  for (let i = 0; i < MODULES.length; i++) {
    const [folder, title] = MODULES[i];
    const dir = path.join(CONTENT_DIR, folder);
    if (!fs.existsSync(dir)) { console.warn(`! pasta ausente: ${folder} — pulando`); continue; }
    console.log(`\n[${i + 1}/${MODULES.length}] ${title}`);

    const { module } = await api('POST', '/lms/modules', {
      course_id: course.id, title, order_index: i,
    });

    // Uploads (vídeo pode levar um tempo — são dezenas de MB)
    const videoPath = findFile(dir, /\.mp4$/i);
    const pdfPath = findFile(dir, /\.pdf$/i);
    let videoURL = null, pdfURL = null;
    if (videoPath) {
      process.stdout.write(`  ↑ vídeo (${(fs.statSync(videoPath).size / 1048576).toFixed(0)} MB)... `);
      videoURL = await upload(videoPath, 'lms-videos');
      console.log('ok');
    }
    if (pdfPath) {
      process.stdout.write('  ↑ apostila... ');
      pdfURL = await upload(pdfPath, 'lms-docs');
      console.log('ok');
    }

    await api('POST', '/lms/lessons', {
      module_id: module.id,
      title: `Videoaula — ${title}`,
      video_url: videoURL,
      pdf_url: pdfURL,
      allow_download: true,
      type: 'video',
      min_watch_time_sec: 0,
      order_index: 0,
    });
    totLessons++;
    console.log('  ✓ aula criada');

    // Quiz do módulo (se houver questionário)
    const quizTxt = path.join(QUIZ_DIR, `${folder}.txt`);
    if (fs.existsSync(quizTxt)) {
      const questions = parseQuiz(fs.readFileSync(quizTxt, 'utf8'));
      if (questions?.length) {
        const { quiz } = await api('POST', '/lms/quizzes', {
          course_id: course.id, module_id: module.id,
          title: `Questionário — ${title}`,
          passing_grade: 70, max_attempts: 3, quiz_type: 'exercise',
        });
        for (const q of questions) {
          await api('POST', '/lms/questions', {
            quiz_id: quiz.id,
            question_text: q.question_text,
            options: q.options,
            correct_option_index: q.correct_option_index,
          });
        }
        totQuizzes++;
        totQuestions += questions.length;
        console.log(`  ✓ quiz com ${questions.length} questões`);
      }
    } else {
      console.log('  – sem questionário');
    }
  }

  console.log(`\n═══ SEED CONCLUÍDO ═══`);
  console.log(`curso: ${COURSE_TITLE}`);
  console.log(`módulos: ${MODULES.length} · aulas: ${totLessons} · quizzes: ${totQuizzes} · questões: ${totQuestions}`);
})().catch(e => { console.error('\n✗ ERRO:', e.message); process.exit(1); });
