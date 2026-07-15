// src/lib/pdfGenerator.js
import jsPDF from 'jspdf'
import { settingsApi } from '../services/financial'

export const generateDocument = async (type, student, options = {}) => {
    const doc = new jsPDF()

    // Buscar Plano de Fundo (Papel Timbrado) correspondente + settings gerais
    const bgKey = `bg_doc_${type}`
    let bgImage = null
    const settingsMap = {}
    try {
        const { settings } = await settingsApi.list()
        ;(settings || []).forEach(s => { settingsMap[s.key] = s.value })
        bgImage = settingsMap[bgKey] || null
    } catch { /* sem timbre */ }

    // Global settings for ICC Docs
    doc.setFont('helvetica')

    if (type === 'contrato') {
        generateContractPDF(doc, student, bgImage)
    } else if (type === 'recibo') {
        generateReceiptPDF(doc, student, bgImage)
    } else if (type === 'inscrito') {
        generateDeclarationInscritoPDF(doc, student, bgImage)
    } else if (type === 'termino') {
        generateDeclarationTerminoPDF(doc, student, bgImage)
    } else if (type === 'matricula') {
        generateMatriculaPDF(doc, student, bgImage)
    } else if (type === 'certificado') {
        generateCertificatePDF(doc, student, bgImage)
    } else if (type === 'custom_certificate') {
        await generateCustomCertificatePDF(doc, student, options, settingsMap, bgImage)
    } else if (type === 'melhorias') {
        generateImprovementPDF(doc, student, bgImage)
    } else if (type === 'relatorio_turma') {
        generateClassReportPDF(doc, student)
    }

    // Se for relatório de turma, o nome tem outro formato
    if (type === 'relatorio_turma') {
        doc.save(`Relatorio_Turma_${student.name.replace(/\//g, '-')}.pdf`)
    } else {
        doc.save(`${type}_${student.name.replace(/\s+/g, '_')}.pdf`)
    }
}

// Busca uma imagem (mesma origem ou API externa) e converte em Data URI.
async function fetchImageAsDataURI(url) {
    try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        return await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
        })
    } catch (e) {
        console.warn(`Imagem indisponível (${url}):`, e.message)
        return null
    }
}

async function generateCustomCertificatePDF(doc, student, options, settingsMap = {}, bgImage) {
    const { content = '', uuid } = options
    // O jsPDF nasce com uma página A4 retrato: cria a paisagem e apaga a 1ª
    // (antes o PDF saía com uma página em branco na frente).
    doc.addPage('a4', 'landscape')
    doc.deletePage(1)

    const W = doc.internal.pageSize.getWidth()   // 297
    const H = doc.internal.pageSize.getHeight()  // 210
    const CX = W / 2

    // Paleta do design aprovado (certificado-exemplo.svg): pergaminho + navy + dourado
    const CREAM = [250, 246, 233]
    const NAVY = [27, 42, 74]
    const GOLD = [190, 152, 74]
    const SLATE = [73, 84, 100]
    const GRAY = [135, 142, 155]

    // ── Fundo pergaminho e moldura dupla navy ──
    if (bgImage) {
        doc.addImage(bgImage, 'JPEG', 0, 0, W, H)
    } else {
        doc.setFillColor(...CREAM)
        doc.rect(0, 0, W, H, 'F')
    }
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.4)
    doc.rect(13, 13, W - 26, H - 26, 'S')
    doc.setLineWidth(1.4)
    doc.rect(17, 17, W - 34, H - 34, 'S')
    // Cantoneiras douradas sobrepostas à moldura
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(1)
    const t = 9
    ;[[13, 13, 1, 1], [W - 13, 13, -1, 1], [13, H - 13, 1, -1], [W - 13, H - 13, -1, -1]].forEach(([x, y, sx, sy]) => {
        doc.line(x, y, x + t * sx, y)
        doc.line(x, y, x, y + t * sy)
    })

    // ── Título serifado espaçado ──
    doc.setFont('times', 'bold')
    doc.setFontSize(40)
    doc.setTextColor(...NAVY)
    doc.text('CERTIFICADO', CX, 58, { align: 'center', charSpace: 3.2 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...GOLD)
    doc.text('C&C ENGENHARIA E CAPACITAÇÃO PROFISSIONAL', CX, 68, { align: 'center', charSpace: 1.4 })

    // ── Nome do aluno ──
    doc.setFont('times', 'italic')
    doc.setFontSize(13)
    doc.setTextColor(...SLATE)
    doc.text('Conferido a', CX, 83, { align: 'center' })
    doc.setFont('times', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(...NAVY)
    doc.text(String(student.name || '').toUpperCase(), CX, 95, { align: 'center', charSpace: 1.2 })
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.4)
    doc.line(CX - 62, 100, CX + 62, 100)

    // ── Corpo (template, com fallback de variáveis não substituídas) ──
    const body = String(content)
        .replace(/\{\{(nome_aluno|nome)\}\}/g, student.name || '')
        .replace(/\{\{(cpf_aluno|cpf)\}\}/g, student.cpf || '')
        .replace(/\{\{(nome_curso|curso)\}\}/g, student.class || '')
        .replace(/\{\{carga_horaria\}\}/g, options.hours || '')
        .replace(/\{\{nota\}\}/g, options.grade || '')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(...SLATE)
    const lines = doc.splitTextToSize(body, 200)
    doc.text(lines, CX, 111, { align: 'center', lineHeightFactor: 1.65 })

    // ── Selo dourado central ──
    const sealY = 157
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.circle(CX, sealY, 10.5, 'S')
    doc.setLineWidth(0.25)
    doc.circle(CX, sealY, 8.6, 'S')
    doc.setFont('times', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...GOLD)
    doc.text('C&C', CX, sealY - 0.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.text('CERTIFICADO', CX, sealY + 3.5, { align: 'center', charSpace: 0.5 })
    doc.setFontSize(9.5)
    doc.setTextColor(...SLATE)
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, CX, 177, { align: 'center' })

    // ── Assinatura autorizada (direita; imagem opcional via settings) ──
    const sigImage = settingsMap['certificate_signature_image'] || null
    const sigName = settingsMap['certificate_signature_name'] || 'Diretoria e Coordenação C&C'
    const sigRole = settingsMap['certificate_signature_role'] || 'Assinatura autorizada'
    const sigX = W - 57
    if (sigImage) {
        try {
            const props = doc.getImageProperties(sigImage)
            const sh = 15
            const sw = Math.min((props.width / props.height) * sh, 55)
            doc.addImage(sigImage, props.fileType || 'PNG', sigX - sw / 2, 143, sw, sh)
        } catch { /* segue só com o nome estilizado */ }
    } else {
        doc.setFont('times', 'bolditalic')
        doc.setFontSize(19)
        doc.setTextColor(...NAVY)
        doc.text('C&C Diretoria', sigX, 156, { align: 'center' })
    }
    doc.setDrawColor(...SLATE)
    doc.setLineWidth(0.35)
    doc.line(sigX - 34, 160, sigX + 34, 160)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...NAVY)
    doc.text(sigName, sigX, 165.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(sigRole, sigX, 170, { align: 'center' })

    // ── QR Code + código de autenticidade (esquerda) ──
    if (uuid) {
        const origin = (typeof window !== 'undefined' && window.location?.origin) || 'https://cursocec.com.br'
        const validationUrl = `${origin}/validar-certificado/${uuid}`
        const qr = await fetchImageAsDataURI(
            `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(validationUrl)}`
        )
        if (qr) doc.addImage(qr, 'PNG', 27, 146, 22, 22)
        const tx = qr ? 53 : 27
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...NAVY)
        doc.text('CÓDIGO DE AUTENTICIDADE:', tx, 152)
        doc.text(uuid.substring(0, 8).toUpperCase(), tx, 156)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...GRAY)
        doc.text('Valide apontando a câmera para o QR Code', tx, 161)
        doc.text(`ou em ${origin.replace(/^https?:\/\//, '')}/validar-certificado`, tx, 165)
    }
}

function generateContractPDF(doc, student) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATO DE TREINAMENTO E CAPACITAÇÃO PROFISSIONAL', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const text = `
CONTRATADA: C&C ENGENHARIA E CAPACITAÇÃO.
CNPJ: 00.000.000/0000-00
Endereço: Rua Treze, nº 2, Caminho do Zepelin – Santa Cruz – Rio de Janeiro – RJ
Email: ensino@cecengenhariaecapacitacao

CONTRATANTE (ALUNO):
Nome: ${student.name}
CPF: ${student.cpf}
Turma Matriculada: ${student.class}

CLÁUSULA PRIMEIRA – DAS OBRIGAÇÕES
A CONTRATADA estabelece que o treinamento a ser ministrado está de acordo com as informações contidas no material informativo fornecido na contratação e que o material didático será entregue até a data do início das aulas.

CLÁUSULA SEGUNDA – DO PAGAMENTO E RATEIO
O ALUNO compromete-se a pagar o valor combinado na ficha de matrícula.
A modalidade PIX PARCELADO está sujeita à verificação de compensação mensal realizada pela coordenação do curso.
`

    const lines = doc.splitTextToSize(text, 180)
    doc.text(lines, 15, 35)

    // Page 2 Simulator (4 pages required by user)
    doc.addPage()
    doc.text('Página 2 - Cláusulas Adicionais do Regulamento Interno...', 15, 20)
    doc.addPage()
    doc.text('Página 3 - Regras de Retreinamento e Notas Mínimas de Aprovação...', 15, 20)
    doc.addPage()
    doc.text('Página 4 - Das Assinaturas e Foro Deliberativo...', 15, 20)

    doc.text('_________________________________', 105, 180, { align: 'center' })
    doc.text('Assinatura do Aluno Contratante', 105, 190, { align: 'center' })
}

function generateReceiptPDF(doc, student) {
    doc.setFontSize(18)
    doc.text('RECIBO DE PAGAMENTO', 105, 30, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`Recebemos de ${student.name} o valor referente à parcela do curso.`, 15, 60)
    doc.text(`CPF: ${student.cpf}`, 15, 70)
    doc.text(`Assinatura da Coordenação: ___________________________`, 15, 120)
    doc.text(`Rio de Janeiro, ${new Date().toLocaleDateString('pt-BR')}`, 15, 140)
}

function generateDeclarationInscritoPDF(doc, student) {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('DECLARAÇÃO DE INSCRITO', 105, 40, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const text = `Declaramos para os devidos fins que o(a) aluno(a) ${student.name}, portador(a) do CPF nº ${student.cpf}, encontra-se regularmente inscrito(a) no curso correspondente à turma ${student.class}.`
    const lines = doc.splitTextToSize(text, 170)
    doc.text(lines, 20, 70)
    doc.text(`Rio de Janeiro, ${new Date().toLocaleDateString('pt-BR')}`, 20, 140)
    doc.text('_________________________________', 105, 200, { align: 'center' })
    doc.text('Coordenação do Curso', 105, 210, { align: 'center' })
}

function generateDeclarationTerminoPDF(doc, student) {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('DECLARAÇÃO DE TÉRMINO DE CURSO', 105, 40, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const text = `Declaramos para os devidos fins que o(a) aluno(a) ${student.name}, portador(a) do CPF nº ${student.cpf}, concluiu toda a carga horária estabelecida para o curso correspondente à turma ${student.class}.`
    const lines = doc.splitTextToSize(text, 170)
    doc.text(lines, 20, 70)
    doc.text(`Rio de Janeiro, ${new Date().toLocaleDateString('pt-BR')}`, 20, 140)
    doc.text('_________________________________', 105, 200, { align: 'center' })
    doc.text('C&C Engenharia e Capacitação', 105, 210, { align: 'center' })
}

function generateMatriculaPDF(doc, student) {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('FICHA DE MATRÍCULA INTERNA', 105, 30, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const text = `
DADOS DO ALUNO:
Nome Completo: ${student.name}
CPF: ${student.cpf}
RG: ${student.originalData?.rg || 'Não informado'}
Naturalidade: ${student.originalData?.birth_place || 'Não informado'}
Estado Civil: ${student.originalData?.marital_status || 'Não informado'}
Escolaridade: ${student.originalData?.education_level || 'Não informado'}

CONTATO:
Telefone: ${student.originalData?.phone || 'Não informado'}
E-mail: ${student.originalData?.email || 'Não informado'}

DADOS DA TURMA E PACOTE:
Turma Selecionada: ${student.class}
Valor Base do Curso: R$ ${student.originalData?.base_value || '0.00'}
Desconto Aplicado: R$ ${student.originalData?.discount_value || '0.00'}
Manual do Aluno Entregue e Assinado: ${student.originalData?.manual_signed ? 'SIM' : 'NÃO'}
`
    const lines = doc.splitTextToSize(text, 170)
    doc.text(lines, 20, 50)
    doc.text('_________________________________', 105, 230, { align: 'center' })
    doc.text('Assinatura do Aluno', 105, 240, { align: 'center' })
}

function generateCertificatePDF(doc, student) {
    // A4 Landscape for Certificate (297 x 210 mm)
    doc.addPage("a4", "landscape")
    doc.setPage(2) // Jump to landscape page

    // Background Color or Border
    doc.setFillColor(250, 252, 255) // Ice background
    doc.rect(0, 0, 297, 210, 'F')
    doc.setDrawColor(30, 64, 175) // Primary Blue Border
    doc.setLineWidth(3)
    doc.rect(10, 10, 277, 190)

    // Try to load logo image to compose the document
    try {
        const logoUrl = '/assets/logo.png' // URL or Base64 (Assuming URL works on Vite built serve)
        // Adjust these coordinates to fit nicely at the top center
        doc.addImage(logoUrl, 'PNG', 118, 15, 60, 25)
    } catch (e) {
        console.warn("Logo não foi carregada no PDF. Imprimindo sem Logo.")
    }

    // Atestado x Certificado (Grade Rules)
    const isReprovado = student.originalData?.academic_records?.length > 0 && student.originalData.academic_records[0].final_status === 'REPROVADO'
    const title = isReprovado ? 'ATESTADO DE PARTICIPAÇÃO' : 'CERTIFICADO DE EXCELÊNCIA TÉCNICA'
    const verb = isReprovado ? 'participou do' : 'concluiu com excelente aproveitamento o'

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 148, 50, { align: 'center' })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'normal')
    doc.text('Certificamos que o(a) aluno(a)', 148, 80, { align: 'center' })

    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text(`${student.name}`, 148, 100, { align: 'center' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(`${verb} treinamento correspondente à ${student.class}.`, 148, 120, { align: 'center' })

    // Assinaturas e Carimbos
    doc.setFontSize(12)
    doc.text('_________________________________', 148, 170, { align: 'center' })
    doc.text('Diretoria e Coordenação C&C', 148, 178, { align: 'center' })
    if (!isReprovado) {
        doc.text('Assinatura Digital de Responsabilidade Técnica (RT)', 148, 186, { align: 'center' })
    }
}

function generateImprovementPDF(doc, student) {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('RELATÓRIO DE DESEMPENHO E PONTOS DE MELHORIA', 105, 30, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')

    const introText = `Aluno(a): ${student.name}\nCPF: ${student.cpf}\nTurma: ${student.class}\nData de Emissão: ${new Date().toLocaleDateString('pt-BR')}`
    doc.text(introText, 20, 50)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Observações e Apontamentos do Fichário do Instrutor:', 20, 80)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')

    const obsText = student.originalData?.improvements || 'Nenhum ponto de melhoria técnica ou observação de conduta foi registrado pelo instrutor no diário de classe durante o treinamento.'

    const lines = doc.splitTextToSize(obsText, 170)
    doc.text(lines, 20, 95)

    doc.text('_________________________________', 105, 230, { align: 'center' })
    doc.text('Assinatura do Instrutor / Especialista', 105, 240, { align: 'center' })
}

function generateClassReportPDF(doc, classData) {
    const { name, course, startDate, predictedEndDate, students, includeGrades } = classData

    doc.addPage("a4", "landscape")
    doc.setPage(2) // Start logic on the new transverse page

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`RELATÓRIO CONSOLIDADO DE ALUNOS - ${includeGrades ? 'COM NOTAS' : 'SEMANAL / PRESENÇAS'}`, 148, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Turma: ${name} | Curso: ${course} | Início Previsto: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : '-'} | Término Previsto: ${predictedEndDate ? new Date(predictedEndDate).toLocaleDateString('pt-BR') : '-'}`, 15, 30)

    doc.setLineWidth(0.5)
    doc.line(15, 35, 280, 35) // Divider

    // Tabela Header
    let yPos = 45
    doc.setFont('helvetica', 'bold')
    doc.text('NOME DO ALUNO', 15, yPos)
    doc.text('CPF', 100, yPos)
    if (includeGrades) {
        doc.text('MÉDIA FINAL', 150, yPos)
    }
    doc.text('FALTAS', 190, yPos)
    doc.text('STATUS MANUAL', 230, yPos)

    doc.line(15, yPos + 2, 280, yPos + 2)
    doc.setFont('helvetica', 'normal')
    yPos += 10

    if (!students || students.length === 0) {
        doc.setFontStyle('italic')
        doc.text('Nenhum aluno registrado/vinculado a esta turma.', 15, yPos)
        return
    }

    // Tabela Body
    students.forEach(st => {
        // Verifica se chegamos no limite da página
        if (yPos > 190) {
            doc.addPage("a4", "landscape")
            yPos = 20

            doc.setFont('helvetica', 'bold')
            doc.text('NOME DO ALUNO', 15, yPos)
            doc.text('CPF', 100, yPos)
            if (includeGrades) {
                doc.text('MÉDIA FINAL', 150, yPos)
            }
            doc.text('FALTAS', 190, yPos)
            doc.text('STATUS MANUAL', 230, yPos)
            doc.line(15, yPos + 2, 280, yPos + 2)
            doc.setFont('helvetica', 'normal')

            yPos += 10
        }

        let nameText = st.full_name || 'Desconhecido'
        if (st.status === 'cancelada') {
            nameText += ' (Cancelado)'
        }
        doc.text(nameText, 15, yPos)
        doc.text(st.cpf || 'Não Informado', 100, yPos)

        if (includeGrades) {
            let finalGrade = 'Pendente'
            if (st.academic_records && st.academic_records.length > 0) {
                const rec = st.academic_records[0]
                if (rec.theoretical_grade !== null && rec.theoretical_grade !== undefined && rec.practical_grade !== null && rec.practical_grade !== undefined) {
                    finalGrade = ((Number(rec.theoretical_grade) + Number(rec.practical_grade)) / 2).toFixed(1)
                } else if (rec.theoretical_grade !== null && rec.theoretical_grade !== undefined) {
                    finalGrade = Number(rec.theoretical_grade).toFixed(1)
                } else if (rec.practical_grade !== null && rec.practical_grade !== undefined) {
                    finalGrade = Number(rec.practical_grade).toFixed(1)
                }
            }
            doc.text(finalGrade.toString(), 150, yPos)
        }

        // Soma Faltas (Mock caso nã otenham presenças ainda)
        const faltas = st.attendance_records ? st.attendance_records.filter(a => a.status === 'ausente' || a.status === 'falta').length : 0
        doc.text(faltas.toString(), 190, yPos)

        // Status Manual
        doc.text(st.status === 'cancelada' ? 'Cancelado' : (st.manual_signed ? 'Entregue' : 'Pendente'), 230, yPos)

        yPos += 10
        doc.setDrawColor(200)
        doc.line(15, yPos - 6, 280, yPos - 6)
        doc.setDrawColor(0)
    })

    doc.text('_________________________________', 148, yPos + 20, { align: 'center' })
    doc.text('Diretoria C&C', 148, yPos + 28, { align: 'center' })
}
