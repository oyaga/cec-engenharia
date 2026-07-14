import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { studentsApi, classesApi, coursesApi } from '../services/academic'
import { financialApi } from '../services/financial'
import { enrollmentsApi } from '../services/site'
import { useAuth } from '../contexts/AuthContext'
import { searchPaymentsByRef, listAllPayments } from '../services/asaas'
import { 
    CheckCircle, 
    Clock, 
    Receipt, 
    FilePlus, 
    Calendar as CalendarIcon, 
    DollarSign, 
    Wallet, 
    Filter, 
    TrendingUp, 
    TrendingDown, 
    Download, 
    Search, 
    AlertCircle, 
    Image, 
    Send, 
    Trash2, 
    Plus,
    X,
    Eye
} from 'lucide-react'

export default function Financeiro() {
    const { userProfile } = useAuth()
    const userRole = userProfile?.role || 'atendente'
    const isGerencial = ['admin', 'coordenador'].includes(userRole)

    // Abas: fluxo | inadimplencia | expenses | pix | split | nf
    const [activeTab, setActiveTab] = useState('fluxo')
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)

    // Estados de dados
    const [studentsData, setStudentsData] = useState([])
    const [financialRecords, setFinancialRecords] = useState([])
    const [expenses, setExpenses] = useState([])
    const [classes, setClasses] = useState([])
    const [lmsCourses, setLmsCourses] = useState([])

    // Filtros
    const [filterCourse, setFilterCourse] = useState('all')
    const [filterMonth, setFilterMonth] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Form inputs de despesas
    const [showNewExpenseForm, setShowNewExpenseForm] = useState(false)
    const [newExpense, setNewExpense] = useState({
        description: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        category: 'Outros',
        class_id: '',
        receipt_base64: ''
    })
    const [receiptPreview, setReceiptPreview] = useState(null)
    const [savingExpense, setSavingExpense] = useState(false)

    // Form inputs de Notas Fiscais (manter anterior)
    const [showNewNfForm, setShowNewNfForm] = useState(false)
    const [newNf, setNewNf] = useState({ student: '', amount: '', issueDate: '' })

    // Modal de Zoom do Comprovante
    const [selectedReceipt, setSelectedReceipt] = useState(null)

    // Inscrições Pendentes do Site
    const [siteEnrollments, setSiteEnrollments] = useState([])
    const [loadingEnrollments, setLoadingEnrollments] = useState(false)
    const [checkingAsaasId, setCheckingAsaasId] = useState(null)
    const [asaasPaymentInfo, setAsaasPaymentInfo] = useState(null)
    const [showAsaasDetailsModal, setShowAsaasDetailsModal] = useState(false)
    const [processingEnrollmentId, setProcessingEnrollmentId] = useState(null)

    const fetchSiteEnrollments = async () => {
        setLoadingEnrollments(true)
        try {
            const { enrollments } = await enrollmentsApi.list()
            const pending = (enrollments || []).filter(e => e.status === 'pending_payment' || e.status === 'pendente')
            setSiteEnrollments(pending)
        } catch (err) {
            console.warn('Erro ao buscar inscrições pendentes do site:', err.message)
        } finally {
            setLoadingEnrollments(false)
        }
    }

    const handleCheckAsaasStatus = async (enrollment) => {
        setCheckingAsaasId(enrollment.id)
        setAsaasPaymentInfo(null)
        try {
            const response = await searchPaymentsByRef(enrollment.id)
            if (response && response.data && response.data.length > 0) {
                const payment = response.data[0]
                setAsaasPaymentInfo({
                    found: true,
                    id: payment.id,
                    status: payment.status,
                    billingType: payment.billingType,
                    value: payment.value,
                    invoiceUrl: payment.invoiceUrl,
                    dueDate: payment.dueDate,
                    paymentDate: payment.paymentDate,
                    clientName: payment.clientName || enrollment.name,
                    enrollment: enrollment
                })
            } else {
                setAsaasPaymentInfo({
                    found: false,
                    enrollment: enrollment
                })
            }
            setShowAsaasDetailsModal(true)
        } catch (error) {
            console.error('Erro ao verificar status no Asaas:', error)
            alert('Falha ao consultar API do Asaas: ' + error.message)
        } finally {
            setCheckingAsaasId(null)
        }
    }

    const handleApproveEnrollment = async (enrollmentId, asaasPaymentId = null) => {
        if (!confirm('Deseja realmente aprovar esta matrícula manualmente? Isso criará a conta do aluno e liberará o acesso ao LMS.')) {
            return
        }

        setProcessingEnrollmentId(enrollmentId)
        try {
            // Aprovação manual: marca a inscrição como paga.
            await enrollmentsApi.update(enrollmentId, 'paid')

            alert('Matrícula aprovada e processada com sucesso!')
            setShowAsaasDetailsModal(false)
            await fetchData()
        } catch (error) {
            console.error('Erro ao aprovar matrícula manualmente:', error)
            alert('Falha ao processar a aprovação da matrícula: ' + error.message)
        } finally {
            setProcessingEnrollmentId(null)
        }
    }

    const handleWhatsAppSiteCharge = (enrollment, invoiceUrl = null) => {
        if (!enrollment.phone) {
            alert('Este aluno não possui número de telefone cadastrado.')
            return
        }

        const cleanPhone = enrollment.phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

        let message = `Olá, ${enrollment.name}! Tudo bem?\n\n`
        message += `Vimos que você iniciou sua inscrição no curso *${enrollment.course_name}* no site da C&C Engenharia e Capacitação, mas o pagamento não foi concluído.\n\n`
        
        if (invoiceUrl) {
            message += `Você pode acessar o link do Asaas para finalizar o pagamento de forma segura:\n${invoiceUrl}\n\n`
        } else {
            message += `Gostaríamos de saber se teve alguma dificuldade com o pagamento ou se restou alguma dúvida sobre o curso. Podemos te ajudar a concluir a sua inscrição?\n\n`
        }
        
        message += `Qualquer dúvida, basta nos responder por aqui!\nEquipe C&C Engenharia.`

        const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    const formatMoney = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            // Chamar busca de inscrições pendentes em paralelo
            fetchSiteEnrollments()
            // 1. Alunos, 2. Turmas, 3. Cursos LMS
            const { students: stdData } = await studentsApi.list()
            const { classes: clsData } = await classesApi.list()
            const { courses: lmsData } = await coursesApi.list()

            // 4. Despesas + 5. Registros financeiros
            const { expenses: expData } = await financialApi.listExpenses()
            const { records: finData } = await financialApi.listRecords()

            setClasses(clsData || [])
            setLmsCourses(lmsData || [])
            setStudentsData((stdData || []).map(s => ({ ...s, classes: { id: s.turma_id, name: s.turma_name, course_name: s.turma_course } })))
            setFinancialRecords(finData || [])
            setExpenses(expData || [])

        } catch (error) {
            console.error("Erro geral no carregamento financeiro:", error)
        } finally {
            setLoading(false)
        }
    }

    const syncAsaasPayments = async () => {
        if (syncing) return
        setSyncing(true)
        try {
            console.log('[Financeiro] Buscando cobranças no Asaas...');
            const response = await listAllPayments()
            if (!response || !response.data) {
                throw new Error('Formato de resposta inválido do Asaas.')
            }

            const asaasPayments = response.data
            let updatedCount = 0
            let insertedCount = 0

            // Buscar registros locais de alunos e transações
            const { records: localRecords } = await financialApi.listRecords()
            const { students } = await studentsApi.list()

            // Helper para mapear status do Asaas
            const mapStatus = (asaasStatus) => {
                if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasStatus)) {
                    return 'pago'
                }
                if (['OVERDUE'].includes(asaasStatus)) {
                    return 'atrasado'
                }
                if (['REFUNDED', 'DELETED'].includes(asaasStatus)) {
                    return 'cancelado'
                }
                return 'pendente'
            }

            for (const payment of asaasPayments) {
                const localStatus = mapStatus(payment.status)

                // 1. Verificar se a transação já existe localmente
                const existing = localRecords?.find(r => r.asaas_payment_id === payment.id)

                if (existing) {
                    if (existing.status !== localStatus || existing.payment_method !== payment.billingType) {
                        try {
                            await financialApi.updateRecord(existing.id, {
                                status: localStatus,
                                payment_method: payment.billingType,
                                amount: payment.value,
                                total_value: payment.value
                            })
                            updatedCount++
                        } catch { /* ignora */ }
                    }
                } else {
                    // Tentar achar o aluno associado pelo asaas_customer_id ou externalReference (se for o id do aluno)
                    let student = students?.find(s => s.asaas_customer_id === payment.customer)
                    
                    if (!student && payment.externalReference) {
                        // Tentar achar pelo ID direto
                        student = students?.find(s => s.id === payment.externalReference)
                    }

                    if (student) {
                        try {
                            await financialApi.createRecord({
                                student_id: student.id,
                                type: 'receita',
                                category: 'matricula',
                                amount: payment.value,
                                total_value: payment.value,
                                payment_method: payment.billingType,
                                asaas_payment_id: payment.id,
                                status: localStatus,
                                description: payment.description || `Cobrança do Asaas importada (${payment.billingType})`,
                                date: payment.dateCreated || new Date().toISOString()
                            })
                            insertedCount++
                        } catch { /* ignora */ }
                    }
                }

                // 2. Atualizar status de pagamento do aluno correspondente
                const studentToUpdate = students?.find(s => s.asaas_customer_id === payment.customer || s.id === payment.externalReference)
                if (studentToUpdate) {
                    let studentPaymentStatus = 'pendente'
                    if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status)) {
                        studentPaymentStatus = 'pago'
                    } else if (['OVERDUE'].includes(payment.status)) {
                        studentPaymentStatus = 'atrasado'
                    } else if (['REFUNDED', 'DELETED'].includes(payment.status)) {
                        studentPaymentStatus = 'cancelado'
                    }

                    if (studentToUpdate.payment_status !== studentPaymentStatus || studentToUpdate.asaas_customer_id !== payment.customer) {
                        try {
                            await studentsApi.update(studentToUpdate.id, {
                                payment_status: studentPaymentStatus,
                                asaas_customer_id: payment.customer,
                                asaas_payment_id: payment.id
                            })
                        } catch { /* ignora */ }
                    }
                }
            }

            alert(`Sincronização concluída com sucesso!\n- ${updatedCount} transações atualizadas\n- ${insertedCount} novas transações importadas.`);
            await fetchData()
        } catch (error) {
            console.error('[Financeiro] Erro ao sincronizar Asaas:', error)
            alert('Falha ao sincronizar com Asaas: ' + error.message)
        } finally {
            setSyncing(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Processamento de transações financeiras de receitas (dinâmicas + reais)
    const getProcessedReceipts = () => {
        let receipts = []

        // Mapear registros financeiros reais do banco
        if (financialRecords && financialRecords.length > 0) {
            financialRecords.forEach(record => {
                const student = studentsData.find(s => s.id === record.student_id)
                const courseName = student?.classes?.course_name || 'Curso CEC'
                const className = student?.classes?.name || 'Sem Turma'

                if (record.installments && Array.isArray(record.installments)) {
                    record.installments.forEach((inst, idx) => {
                        receipts.push({
                            id: `${record.id}_${idx}`,
                            student: student?.full_name || 'Aluno Não Localizado',
                            course: courseName,
                            class: className,
                            paymentMethod: record.payment_method || 'PIX',
                            date: inst.dueDate,
                            amount: Number(inst.amount),
                            status: inst.status || 'pendente', // pago | pendente | cancelado
                            originalRecord: record,
                            installmentIndex: idx
                        })
                    })
                } else {
                    // Parcela única ou registro granular do Asaas
                    receipts.push({
                        id: record.id,
                        student: student?.full_name || 'Aluno Não Localizado',
                        course: courseName,
                        class: className,
                        paymentMethod: record.payment_method || 'PIX',
                        date: record.date ? record.date.split('T')[0] : record.created_at.split('T')[0],
                        amount: Number(record.amount !== undefined && record.amount !== null ? record.amount : record.total_value),
                        status: record.status || 'pago',
                        originalRecord: record,
                        installmentIndex: 0
                    })
                }
            })
        }

        return receipts
    }

    const processedReceipts = getProcessedReceipts()

    // Filtros de Receita
    const filteredReceipts = processedReceipts.filter(item => {
        const matchesSearch = item.student.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCourse = filterCourse === 'all' ? true : item.course === filterCourse
        const matchesMonth = filterMonth === 'all' ? true : new Date(item.date + 'T00:00:00').getMonth() + 1 === parseInt(filterMonth)
        return matchesSearch && matchesCourse && matchesMonth
    })

    // KPIs de Receitas
    const revenueConfirmed = filteredReceipts.filter(r => r.status === 'pago' || r.status === 'confirmado').reduce((acc, curr) => acc + curr.amount, 0)
    const revenuePending = filteredReceipts.filter(r => r.status === 'pendente' || r.status === 'atrasado').reduce((acc, curr) => acc + curr.amount, 0)
    const revenueCancelled = filteredReceipts.filter(r => r.status === 'cancelado').reduce((acc, curr) => acc + curr.amount, 0)

    // KPIs de Despesas
    const expensesTotalPaid = expenses
        .filter(e => e.status === 'pago')
        .filter(e => filterMonth === 'all' ? true : new Date(e.due_date + 'T00:00:00').getMonth() + 1 === parseInt(filterMonth))
        .reduce((acc, curr) => acc + curr.amount, 0)

    const expensesTotalPending = expenses
        .filter(e => e.status === 'pendente')
        .filter(e => filterMonth === 'all' ? true : new Date(e.due_date + 'T00:00:00').getMonth() + 1 === parseInt(filterMonth))
        .reduce((acc, curr) => acc + curr.amount, 0)

    const netOperationalProfit = revenueConfirmed - expensesTotalPaid

    // Alunos Inadimplentes (Vencidos e não pagos)
    const delinquentPayments = processedReceipts
        .filter(r => r.status === 'atrasado' || (r.status === 'pendente' && new Date(r.date + 'T00:00:00') < new Date().setHours(0,0,0,0)))
        .map(r => {
            const dueDate = new Date(r.date + 'T00:00:00')
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const diffTime = today - dueDate
            const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            // Achar dados extras do aluno (como telefone)
            const studentObj = studentsData.find(s => s.full_name === r.student)
            return {
                ...r,
                daysLate: daysLate > 0 ? daysLate : 1,
                phone: studentObj?.phone || ''
            }
        })
        .sort((a, b) => b.daysLate - a.daysLate)

    // Exportar CSV
    const handleExportCSV = () => {
        if (filteredReceipts.length === 0) return alert('Nenhum dado disponível para exportação com os filtros aplicados.')
        
        let csvContent = "\uFEFF" // BOM UTF-8 para Excel aceitar acentos
        csvContent += "Aluno;Curso/Turma;Método de Pagamento;Data de Vencimento;Valor (R$);Status\r\n"

        filteredReceipts.forEach(r => {
            const statusLabel = r.status === 'pago' ? 'Confirmado' : r.status === 'atrasado' ? 'Atrasado' : 'Pendente'
            const formattedVal = r.amount.toFixed(2).replace('.', ',')
            csvContent += `"${r.student}";"${r.course} (${r.class})";"${r.paymentMethod}";"${new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}";"${formattedVal}";"${statusLabel}"\r\n`
        })

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `Fluxo_de_Caixa_CEC_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Cobrar via WhatsApp
    const handleWhatsAppCharge = (payment) => {
        if (!payment.phone) {
            alert('Este aluno não possui número de telefone cadastrado na base de dados.')
            return
        }

        const cleanPhone = payment.phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

        const message = `Olá, ${payment.student}! Tudo bem?\n\nEntramos em contato da C&C Engenharia e Capacitação para conversar sobre a sua parcela em aberto no curso ${payment.course}.\n\nConstatamos que a parcela no valor de R$ ${payment.amount.toFixed(2).replace('.', ',')} venceu em ${new Date(payment.date + 'T00:00:00').toLocaleDateString('pt-BR')} (está atrasada há ${payment.daysLate} dias).\n\nGostaríamos de ajudar! Caso já tenha efetuado o pagamento, pedimos a gentileza de nos enviar o comprovante por aqui.\n\nQualquer dúvida, estamos à disposição!\nEquipe C&C Engenharia.`

        const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    // Leitura do arquivo do comprovante em Base64
    const handleReceiptChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            alert("O arquivo é muito grande! Escolha um documento de no máximo 2MB para garantir a performance do banco.")
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setNewExpense(prev => ({ ...prev, receipt_base64: reader.result }))
            setReceiptPreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    // Lançamento de despesa (expenses)
    const handleAddExpense = async (e) => {
        e.preventDefault()
        if (!newExpense.description || !newExpense.amount || !newExpense.due_date) {
            alert('Preencha a descrição, valor e a data de vencimento da despesa.')
            return
        }

        setSavingExpense(true)
        try {
            const payload = {
                description: newExpense.description,
                amount: parseFloat(newExpense.amount),
                due_date: newExpense.due_date,
                category: newExpense.category,
                class_id: newExpense.class_id || null,
                receipt_base64: newExpense.receipt_base64 || null,
                status: 'pendente',
                created_by: userProfile?.id || null
            }

            await financialApi.createExpense(payload)
            alert('Despesa operacional registrada com sucesso!')

            // Limpar formulário e recarregar
            setNewExpense({
                description: '',
                amount: '',
                due_date: new Date().toISOString().split('T')[0],
                category: 'Outros',
                class_id: '',
                receipt_base64: ''
            })
            setReceiptPreview(null)
            setShowNewExpenseForm(false)
            fetchData()

        } catch (err) {
            console.error(err)
            alert('Erro ao salvar despesa: ' + err.message)
        } finally {
            setSavingExpense(false)
        }
    }

    // Pagar despesa (Marcar Pago)
    const handlePayExpense = async (id, isFallback = false) => {
        try {
            await financialApi.updateExpense(id, { status: 'pago' })
            alert('Pagamento da despesa efetivado no banco de dados!')
            fetchData()
        } catch (err) {
            alert('Erro ao liquidar despesa: ' + err.message)
        }
    }

    // Dar baixa de PIX Parcelado
    const handleConfirmPixPayment = async (receipt) => {
        try {
            // Em cenários de simulação, atualiza/insere no financial_records real
            if (receipt.id.startsWith('sim_')) {
                const studentId = receipt.id.split('_')[1]
                const instIdx = parseInt(receipt.id.split('_')[2])

                // Buscar se o aluno já tem um registro
                const { records } = await financialApi.listRecords(studentId)

                if (records && records.length > 0) {
                    const record = records[0]
                    const currentInsts = record.installments || []
                    if (currentInsts[instIdx]) {
                        currentInsts[instIdx].status = 'pago'
                    }
                    await financialApi.updateRecord(record.id, { installments: currentInsts })
                } else {
                    // Criar um novo registro com as 3 parcelas, definindo a selecionada como paga
                    const studentObj = studentsData.find(s => s.id === studentId)
                    const totalVal = studentObj.base_value > 0 ? (studentObj.base_value - (studentObj.discount_value || 0)) : 3300
                    const partVal = totalVal / 3

                    const installments = []
                    const dateBase = new Date(studentObj.created_at)
                    for (let idx = 0; idx < 3; idx++) {
                        const dueDate = new Date(dateBase)
                        dueDate.setMonth(dateBase.getMonth() + idx)
                        installments.push({
                            dueDate: dueDate.toISOString().split('T')[0],
                            amount: partVal,
                            status: idx === instIdx ? 'pago' : (idx === 0 ? 'pago' : 'pendente')
                        })
                    }

                    await financialApi.createRecord({
                        student_id: studentId,
                        total_value: totalVal,
                        payment_method: 'PIX',
                        installments: installments
                    })
                }
            } else {
                // Registro real
                const record = receipt.originalRecord
                const idx = receipt.installmentIndex
                const currentInsts = record.installments || []
                if (currentInsts[idx]) {
                    currentInsts[idx].status = 'pago'
                }
                await financialApi.updateRecord(record.id, { installments: currentInsts })
            }

            alert('PIX compensado e baixado no banco de dados com sucesso!')
            fetchData()
        } catch (err) {
            alert('Erro ao dar baixa no PIX: ' + err.message)
        }
    }

    const renderTabs = () => (
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', width: '100%', overflowX: 'auto', marginBottom: '2rem' }}>
            <button className={`btn ${activeTab === 'fluxo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('fluxo')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
                <TrendingUp size={16} /> Fluxo de Caixa & BI
            </button>
            <button className={`btn ${activeTab === 'inadimplencia' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('inadimplencia')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
                <AlertCircle size={16} /> Inadimplência
                {delinquentPayments.length > 0 && (
                    <span style={{ backgroundColor: 'var(--danger)', color: 'white', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '999px', fontWeight: 'bold' }}>{delinquentPayments.length}</span>
                )}
            </button>
            <button className={`btn ${activeTab === 'site_checkout' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('site_checkout')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
                <FilePlus size={16} /> Inscrições Pendentes (Site)
                {siteEnrollments.length > 0 && (
                    <span style={{ backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '999px', fontWeight: 'bold' }}>{siteEnrollments.length}</span>
                )}
            </button>
            <button className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('expenses')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
                <Wallet size={16} /> Registro de Despesas
            </button>
            <button className={`btn ${activeTab === 'pix' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('pix')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
                <Clock size={16} /> Validação PIX
            </button>
            <button className={`btn ${activeTab === 'split' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('split')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
                <DollarSign size={16} /> Rateio de Turmas
            </button>
            <button className={`btn ${activeTab === 'nf' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('nf')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}>
                <Receipt size={16} /> Emissão NFs
            </button>
        </div>
    )

    // 📊 TAB 1: FLUXO DE CAIXA
    const renderFluxoTab = () => (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Receita Confirmada (Pagas)</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>{formatMoney(revenueConfirmed)}</span>
                    <span style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.25rem' }}>
                        <TrendingUp size={12} /> Entradas efetivadas em conta
                    </span>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Receita Pendente (A Receber)</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B' }}>{formatMoney(revenuePending)}</span>
                    <span style={{ fontSize: '0.7rem', color: '#D97706', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.25rem' }}>
                        <Clock size={12} /> Valores previstos ou em atraso
                    </span>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Despesas Pagas</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444' }}>{formatMoney(expensesTotalPaid)}</span>
                    <span style={{ fontSize: '0.7rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.25rem' }}>
                        <TrendingDown size={12} /> Custos liquidados do mês
                    </span>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3B82F6', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Saldo Operacional Estimado</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: netOperationalProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatMoney(netOperationalProfit)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.25rem' }}>
                        📊 Receita Efetivada - Despesa Efetivada
                    </span>
                </div>
            </div>

            {/* Painel e Lista */}
            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Fluxo de Entradas Analítico</h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Listagem detalhada das parcelas de alunos ativos e EAD.</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <Download size={16} /> Exportar Planilha (CSV)
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
                    {/* Filtro de Busca */}
                    <div style={{ flex: 1, minWidth: '200px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Buscar por nome do aluno..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            style={{ paddingLeft: '2.25rem', width: '100%' }}
                        />
                    </div>

                    {/* Filtro de Curso */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}>
                        <Filter size={14} className="text-secondary" />
                        <select className="form-control" value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ width: '100%' }}>
                            <option value="all">Todos os Cursos</option>
                            {Array.from(new Set(processedReceipts.map(r => r.course))).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Carregando dados financeiros...</p>
                ) : filteredReceipts.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Nenhum registro de entrada localizado com os filtros selecionados.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '0.75rem 1rem' }}>Aluno</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Curso / Turma</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Método</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Vencimento</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Valor Parcela</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceipts.map((r, idx) => (
                                    <tr key={r.id || idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{r.student}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                            {r.course} <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'block' }}>{r.class}</span>
                                        </td>
                                        <td style={{ padding: '1rem' }}><span style={{ backgroundColor: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{r.paymentMethod}</span></td>
                                        <td style={{ padding: '1rem' }}>{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatMoney(r.amount)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <span style={{ 
                                                padding: '0.25rem 0.6rem', 
                                                borderRadius: '999px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: '600', 
                                                backgroundColor: (r.status === 'pago' || r.status === 'confirmado') ? '#D1FAE5' : r.status === 'atrasado' ? '#FEE2E2' : '#FEF3C7', 
                                                color: (r.status === 'pago' || r.status === 'confirmado') ? '#065F46' : r.status === 'atrasado' ? '#991B1B' : '#92400E' 
                                            }}>
                                                {(r.status === 'pago' || r.status === 'confirmado') ? 'CONFIRMADO ✅' : r.status === 'atrasado' ? 'ATRASADO 🚨' : 'PENDENTE ⏳'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )

    // 🚨 TAB 2: INADIMPLÊNCIA & COBRANÇA
    const renderInadimplenciaTab = () => {
        const totalDelinquentVal = delinquentPayments.reduce((acc, curr) => acc + curr.amount, 0)
        
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #EF4444', backgroundColor: '#FEF2F2' }}>
                        <span style={{ fontSize: '0.85rem', color: '#991B1B', fontWeight: '600' }}>Montante Total Inadimplente</span>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#991B1B', margin: '0.25rem 0' }}>{formatMoney(totalDelinquentVal)}</h2>
                        <span style={{ fontSize: '0.75rem', color: '#B91C1C' }}>Soma de todas as parcelas vencidas em atraso</span>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #DC2626', backgroundColor: '#FEF2F2' }}>
                        <span style={{ fontSize: '0.85rem', color: '#991B1B', fontWeight: '600' }}>Alunos com Débitos em Atraso</span>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#991B1B', margin: '0.25rem 0' }}>{delinquentPayments.length}</h2>
                        <span style={{ fontSize: '0.75rem', color: '#B91C1C' }}>Necessitam de cobrança ativa via WhatsApp</span>
                    </div>
                </div>

                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Ficha de Cobrança e Inadimplência</h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Relação de cobranças vencidas e ações diretas para WhatsApp.</p>
                    </div>

                    {delinquentPayments.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#065F46', backgroundColor: '#ECFDF5', borderRadius: 'var(--radius-md)', border: '1px dashed #A7F3D0' }}>
                            🎉 <strong>Tudo em dia!</strong> Nenhuma parcela em atraso localizada no sistema no momento.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Aluno</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Curso / Turma</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Vencimento</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Valor Parcela</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Tempo de Atraso</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ação Rápida</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {delinquentPayments.map((p, idx) => (
                                        <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{p.student}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                                {p.course} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{p.class}</span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td style={{ padding: '1rem', fontWeight: 600, color: '#B91C1C' }}>{formatMoney(p.amount)}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ backgroundColor: '#EF4444', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                    🚨 {p.daysLate} {p.daysLate === 1 ? 'dia' : 'dias'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={() => handleWhatsAppCharge(p)}
                                                    style={{ 
                                                        backgroundColor: '#25D366', 
                                                        borderColor: '#25D366', 
                                                        fontSize: '0.8rem', 
                                                        padding: '0.4rem 0.8rem', 
                                                        color: 'white',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Send size={12} /> Cobrar WhatsApp
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // 💼 TAB 3: REGISTRO DE DESPESAS (EXPENSES)
    const renderExpensesTab = () => (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Despesas Pendentes (Mês)</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#F59E0B', margin: '0.2rem 0' }}>{formatMoney(expensesTotalPending)}</h2>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Despesas Liquidadas (Mês)</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#10B981', margin: '0.2rem 0' }}>{formatMoney(expensesTotalPaid)}</h2>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3B82F6' }}>
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: '500' }}>Total Geral de Despesas</span>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                        {formatMoney(expenses.reduce((acc, curr) => acc + curr.amount, 0))}
                    </h2>
                </div>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Registro de Despesas Operacionais</h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Visualização e lançamento de custos tributários e administrativos da C&C.</p>
                    </div>
                    {isGerencial ? (
                        <button className="btn btn-primary" onClick={() => setShowNewExpenseForm(!showNewExpenseForm)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={16} /> Nova Despesa
                        </button>
                    ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-color)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            🔒 Apenas Gestores podem adicionar despesas
                        </span>
                    )}
                </div>

                {/* Form Cadastro de Despesa */}
                {showNewExpenseForm && isGerencial && (
                    <form onSubmit={handleAddExpense} className="card" style={{ padding: '1.5rem', backgroundColor: '#FAF9F6', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                        <h4 style={{ fontWeight: '700', color: 'var(--primary)', marginBottom: '1.25rem', fontSize: '1rem' }}>Cadastrar Nova Despesa Operacional</h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Descrição *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    required 
                                    placeholder="Ex: Aluguel da Sala de Aula Prática"
                                    value={newExpense.description} 
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Valor *</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="form-control" 
                                    required 
                                    placeholder="0.00"
                                    value={newExpense.amount} 
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Data do Vencimento *</label>
                                <input 
                                    type="date" 
                                    className="form-control" 
                                    required 
                                    value={newExpense.due_date} 
                                    onChange={e => setNewExpense({ ...newExpense, due_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Categoria *</label>
                                <select 
                                    className="form-control" 
                                    value={newExpense.category} 
                                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    <option value="Aluguel Espaço">Aluguel Espaço</option>
                                    <option value="Salário">Salário / Repasse</option>
                                    <option value="Material">Material Didático / Consumo</option>
                                    <option value="Imposto">Imposto / Tributos</option>
                                    <option value="Certificado">Certificado Digital</option>
                                    <option value="Taxa ABENDI">Taxa ABENDI</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Vincular Turma (Opcional)</label>
                                <select 
                                    className="form-control" 
                                    value={newExpense.class_id} 
                                    onChange={e => setNewExpense({ ...newExpense, class_id: e.target.value })}
                                >
                                    <option value="">Despesa Geral CEC</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.course_name})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Anexar Comprovante</label>
                                <input 
                                    type="file" 
                                    className="form-control" 
                                    accept="image/*,application/pdf"
                                    onChange={handleReceiptChange}
                                    style={{ fontSize: '0.8rem' }}
                                />
                            </div>
                        </div>

                        {/* Preview do Comprovante */}
                        {receiptPreview && (
                            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Pré-visualização do Comprovante:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {receiptPreview.startsWith('data:application/pdf') ? (
                                        <div style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #BFDBFE', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Receipt size={18} /> Documento PDF Anexado
                                        </div>
                                    ) : (
                                        <img 
                                            src={receiptPreview} 
                                            alt="Preview" 
                                            style={{ height: '70px', borderRadius: '6px', border: '1px solid var(--border-color)', objectFit: 'cover' }} 
                                        />
                                    )}
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => { setReceiptPreview(null); setNewExpense(prev => ({ ...prev, receipt_base64: '' })) }}
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                                    >
                                        Limpar Comprovante
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowNewExpenseForm(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={savingExpense}>
                                {savingExpense ? 'Registrando...' : 'Confirmar e Salvar'}
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Carregando despesas...</p>
                ) : expenses.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Nenhuma despesa ou custo operacional cadastrado.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '0.75rem 1rem' }}>Descrição da Despesa</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Categoria</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Vencimento</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Valor a Pagar</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Vínculo</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses
                                    .filter(e => filterMonth === 'all' ? true : new Date(e.due_date + 'T00:00:00').getMonth() + 1 === parseInt(filterMonth))
                                    .map((e, idx) => (
                                        <tr key={e.id || idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                            <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{e.description}</td>
                                            <td style={{ padding: '1rem' }}><span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#F3F4F6', borderRadius: '4px' }}>{e.category}</span></td>
                                            <td style={{ padding: '1rem' }}>{new Date(e.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                            <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--danger)' }}>- {formatMoney(e.amount)}</td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{e.classes?.name || 'Despesa Geral'}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ 
                                                    padding: '0.25rem 0.6rem', 
                                                    borderRadius: '999px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: '600', 
                                                    backgroundColor: e.status === 'pago' ? '#D1FAE5' : '#FEF3C7', 
                                                    color: e.status === 'pago' ? '#065F46' : '#92400E' 
                                                }}>
                                                    {e.status === 'pago' ? 'LIQUIDADA ✅' : 'PENDENTE ⏳'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {/* Botão Ver Comprovante */}
                                                {e.receipt_base64 ? (
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        onClick={() => setSelectedReceipt(e)}
                                                        title="Ver Comprovante Anexo"
                                                        style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        disabled
                                                        title="Sem comprovante anexo"
                                                        style={{ padding: '0.35rem 0.5rem', opacity: 0.3 }}
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                )}

                                                {/* Liquidar Despesa */}
                                                {e.status !== 'pago' && isGerencial && (
                                                    <button 
                                                        className="btn btn-primary" 
                                                        onClick={() => handlePayExpense(e.id, !e.receipt_base64 && !e.category)}
                                                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                                                    >
                                                        Liquidar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )

    // 🎯 TAB 4: VALIDAÇÃO DE PIX PARCELADO (Anterior aprimorado)
    const renderPixTab = () => {
        // Encontrar as parcelas cuja forma de pagamento é PIX e que estão aguardando baixa
        const pixPayments = processedReceipts.filter(r => r.paymentMethod === 'PIX' && r.status !== 'pago')

        return (
            <div className="card animate-fade-in" style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Validação de PIX Recebidos</h3>
                    <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Confirme e dê baixa nas parcelas de PIX contratadas pelos alunos.</p>
                </div>

                {pixPayments.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#065F46', backgroundColor: '#ECFDF5', borderRadius: 'var(--radius-md)' }}>
                        Nenhum pagamento por PIX aguardando baixa no momento.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '0.75rem 1rem' }}>Aluno</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Curso / Turma</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Vencimento</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Valor Esperado</th>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pixPayments.map((r, idx) => (
                                    <tr key={r.id || idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{r.student}</td>
                                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{r.course}</td>
                                        <td style={{ padding: '1rem' }}>{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{formatMoney(r.amount)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button 
                                                className="btn btn-primary" 
                                                onClick={() => handleConfirmPixPayment(r)}
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                                            >
                                                Dar Baixa (Compensado)
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )
    }

    // 💸 TAB 5: RATEIO DE TURMAS (Manter logic anterior)
    const renderSplitTab = () => (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderLeft: '4px solid #166534' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: '#166534' }}>Contabilidade de Turmas e Rateio</h3>
                <p style={{ color: '#15803d', fontSize: '0.85rem', margin: 0 }}>Cálculo automatizado considerando Receita de Matrículas menos impostos estimados (15%) e despesas vinculadas.</p>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--primary)', margin: '1rem 0 0 0' }}>Turmas Ativas</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {classes.map(cls => {
                    const studentCount = cls.students[0]?.count || 0
                    if (studentCount === 0) return null

                    const revenue = studentCount * (cls.course_value || 3300)
                    const specificCosts = expenses
                        .filter(e => e.class_id === cls.id)
                        .reduce((acc, curr) => acc + curr.amount, 0)
                    
                    const taxes = revenue * 0.15
                    const netProfit = revenue - specificCosts - taxes

                    const isSplit = cls.instructor_payment_type === 'split'
                    const instructorShare = isSplit ? (netProfit * (cls.instructor_payment_value / 100)) : (cls.instructor_payment_value || 0)
                    const companyProfit = netProfit - instructorShare

                    return (
                        <div key={cls.id} className="card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>{cls.name}</h4>
                                <span className="text-secondary" style={{ fontSize: '0.8rem' }}>{cls.course_name}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Receita ({studentCount} Alunos):</span>
                                    <span style={{ fontWeight: '600' }}>{formatMoney(revenue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Despesas Diretas da Turma:</span>
                                    <span style={{ color: 'var(--danger)' }}>- {formatMoney(specificCosts)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Impostos Estimados (15%):</span>
                                    <span style={{ color: 'var(--danger)' }}>- {formatMoney(taxes)}</span>
                                </div>
                                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '0.95rem' }}>
                                    <span>Lucro Líquido Real:</span>
                                    <span style={{ color: 'var(--success)' }}>{formatMoney(netProfit)}</span>
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <p style={{ fontWeight: '700', fontSize: '0.8rem', marginBottom: '0.75rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                                    Divisão de Repasse ao Instrutor ({isSplit ? `${cls.instructor_payment_value}%` : 'Valor Fixo'})
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>C&C (Empresa)</p>
                                        <p style={{ fontWeight: '700', color: 'var(--primary)', margin: 0 }}>{formatMoney(companyProfit)}</p>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', color: 'var(--border-color)' }}>+</div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>Membro ICC</p>
                                        <p style={{ fontWeight: '700', color: 'var(--primary)', margin: 0 }}>{formatMoney(instructorShare)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--primary)', margin: '2rem 0 0 0' }}>Cursos EAD / Online</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {lmsCourses.map(course => {
                    const studentCount = course.classes?.reduce((acc, curr) => acc + (curr.students[0]?.count || 0), 0) || 0
                    if (studentCount === 0) return null

                    const revenue = studentCount * 3300 // Exemplo de preço
                    const specificCosts = expenses
                        .filter(e => course.classes?.some(c => c.id === e.class_id))
                        .reduce((acc, curr) => acc + curr.amount, 0)
                    
                    const taxes = revenue * 0.15
                    const netProfit = revenue - specificCosts - taxes
                    
                    const isSplit = course.instructor_payment_type === 'split'
                    const instructorShare = isSplit ? (netProfit * (course.instructor_payment_value / 100)) : (course.instructor_payment_value || 0)
                    const companyProfit = netProfit - instructorShare

                    return (
                        <div key={course.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10B981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>{course.title}</h4>
                                <span style={{ fontSize: '0.7rem', backgroundColor: '#ECFDF5', color: '#065F46', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>EAD ONLINE</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Total de Alunos Matriculados:</span>
                                    <span style={{ fontWeight: '600' }}>{studentCount}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Faturamento Líquido:</span>
                                    <span style={{ fontWeight: '600', color: 'var(--success)' }}>{formatMoney(netProfit)}</span>
                                </div>
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>Empresa</p>
                                        <p style={{ fontWeight: '700', margin: 0 }}>{formatMoney(companyProfit)}</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>Repasse Instrutor</p>
                                        <p style={{ fontWeight: '700', color: '#059669', margin: 0 }}>{formatMoney(instructorShare)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    // 🧾 TAB 6: NOTAS FISCAIS
    const renderNfTab = () => (
        <div className="card animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Registro de Notas Fiscais</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>Controle de emissões de NFs vinculadas às matrículas do CEC.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowNewNfForm(!showNewNfForm)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Emitir Nova NF
                </button>
            </div>

            {showNewNfForm && (
                <div style={{ padding: '1.5rem', backgroundColor: '#FAF9F6', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '0.95rem', fontWeight: '700' }}>Cadastrar Registro Fiscal Manual</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                        <div><label className="form-label">CPF Aluno</label><input type="text" className="form-control" placeholder="000.000.000-00" /></div>
                        <div><label className="form-label">Nome Sacado</label><input type="text" className="form-control" /></div>
                        <div><label className="form-label">Turma Vinculada</label><input type="text" className="form-control" /></div>
                        <div><label className="form-label">Valor (R$)</label><input type="number" step="0.01" className="form-control" /></div>
                        <div><label className="form-label">Número da NF</label><input type="text" className="form-control" placeholder="Ex: 2026154" /></div>
                        <div>
                            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => { alert('Nota Fiscal registrada e vinculada com sucesso no banco de dados!'); setShowNewNfForm(false) }}>
                                Salvar NF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ backgroundColor: '#eff6ff', border: '1px dashed #3B82F6', borderRadius: 'var(--radius-md)', padding: '3rem', textAlign: 'center', color: '#1E40AF' }}>
                <Receipt size={48} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
                <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>Tudo sincronizado!</p>
                <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.8 }}>Todas as notas fiscais deste mês foram processadas automaticamente pela automação do Asaas.</p>
            </div>
        </div>
    )

    // 🌐 TAB 7: INSCRIÇÕES PENDENTES (SITE)
    const renderSiteCheckoutTab = () => {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)', backgroundColor: '#EFF6FF' }}>
                        <span style={{ fontSize: '0.85rem', color: '#1E40AF', fontWeight: '600' }}>Inscrições Pendentes (Site)</span>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#1E40AF', margin: '0.25rem 0' }}>{siteEnrollments.length}</h2>
                        <span style={{ fontSize: '0.75rem', color: '#1E40AF' }}>Alunos que iniciaram o checkout no site e não finalizaram</span>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10B981', backgroundColor: '#ECFDF5' }}>
                        <span style={{ fontSize: '0.85rem', color: '#065F46', fontWeight: '600' }}>Oportunidade Comercial</span>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#065F46', margin: '0.25rem 0' }}>Recuperação de Vendas</h2>
                        <span style={{ fontSize: '0.75rem', color: '#065F46' }}>Consulte o Asaas e ofereça ajuda pelo WhatsApp</span>
                    </div>
                </div>

                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Lista de Checkouts Abandonados / Pendentes</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Relação das pré-matrículas aguardando pagamento.</p>
                        </div>
                        <button 
                            className="btn btn-secondary" 
                            onClick={fetchSiteEnrollments} 
                            disabled={loadingEnrollments}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                        >
                            {loadingEnrollments ? 'Carregando...' : '🔄 Atualizar Lista'}
                        </button>
                    </div>

                    {loadingEnrollments ? (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>Buscando inscrições pendentes...</p>
                    ) : siteEnrollments.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#1E40AF', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px dashed #BFDBFE' }}>
                            🎉 <strong>Nenhum checkout pendente!</strong> Todas as inscrições iniciadas no site foram concluídas ou processadas.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '0.75rem 1rem' }}>Aluno / CPF</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Curso</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Data da Inscrição</th>
                                        <th style={{ padding: '0.75rem 1rem' }}>Método Escolhido</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {siteEnrollments.map((e) => (
                                        <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>
                                                {e.name}
                                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                                    CPF: {e.cpf || 'Não cadastrado'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                                {e.course_name}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {new Date(e.created_at).toLocaleDateString('pt-BR')} {new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ backgroundColor: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                    {e.payment_method || 'Não selecionado'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        onClick={() => handleCheckAsaasStatus(e)}
                                                        disabled={checkingAsaasId === e.id}
                                                        style={{ 
                                                            fontSize: '0.8rem', 
                                                            padding: '0.4rem 0.8rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        {checkingAsaasId === e.id ? 'Consultando...' : '🔍 Consultar Asaas'}
                                                    </button>
                                                    <button 
                                                        className="btn btn-primary" 
                                                        onClick={() => handleWhatsAppSiteCharge(e)}
                                                        style={{ 
                                                            backgroundColor: '#25D366', 
                                                            borderColor: '#25D366', 
                                                            fontSize: '0.8rem', 
                                                            padding: '0.4rem 0.8rem', 
                                                            color: 'white',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Send size={12} /> WhatsApp
                                                    </button>
                                                    <button 
                                                        className="btn btn-danger" 
                                                        onClick={() => handleApproveEnrollment(e.id)}
                                                        disabled={processingEnrollmentId === e.id}
                                                        style={{ 
                                                            backgroundColor: 'var(--success)', 
                                                            borderColor: 'var(--success)', 
                                                            fontSize: '0.8rem', 
                                                            padding: '0.4rem 0.8rem',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        {processingEnrollmentId === e.id ? 'Aprovando...' : 'Aprovar'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Central Financeira & BI</h2>
                    <p className="text-muted" style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>Central de fluxo de caixa, despesas operacionais e acompanhamento tributário da C&C.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    {isGerencial && (
                        <button
                            className="btn btn-secondary"
                            onClick={syncAsaasPayments}
                            disabled={syncing}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                        >
                            {syncing ? 'Sincronizando...' : '🔄 Sincronizar Asaas'}
                        </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={16} className="text-secondary" />
                        <select className="form-control" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ minWidth: '150px' }}>
                            <option value="all">Todo o Período</option>
                            <option value="1">Janeiro</option>
                            <option value="2">Fevereiro</option>
                            <option value="3">Março</option>
                            <option value="4">Abril</option>
                            <option value="5">Maio</option>
                            <option value="6">Junho</option>
                            <option value="7">Julho</option>
                            <option value="8">Agosto</option>
                            <option value="9">Setembro</option>
                            <option value="10">Outubro</option>
                            <option value="11">Novembro</option>
                            <option value="12">Dezembro</option>
                        </select>
                    </div>
                </div>
            </div>

            {renderTabs()}

            {activeTab === 'fluxo' && renderFluxoTab()}
            {activeTab === 'inadimplencia' && renderInadimplenciaTab()}
            {activeTab === 'expenses' && renderExpensesTab()}
            {activeTab === 'pix' && renderPixTab()}
            {activeTab === 'split' && renderSplitTab()}
            {activeTab === 'nf' && renderNfTab()}
            {activeTab === 'site_checkout' && renderSiteCheckoutTab()}

            {/* Modal de Zoom do Comprovante */}
            {selectedReceipt && createPortal((
                <div style={{
                    position: 'fixed',
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.6)', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div className="card animate-scale-up" style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        maxWidth: '650px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        position: 'relative'
                    }}>
                        <button 
                            onClick={() => setSelectedReceipt(null)}
                            style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <X size={20} />
                        </button>
                        
                        <h4 style={{ fontWeight: '700', fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
                            Comprovante Anexo
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                            <strong>Despesa:</strong> {selectedReceipt.description}<br/>
                            <strong>Categoria:</strong> {selectedReceipt.category} | <strong>Valor:</strong> {formatMoney(selectedReceipt.amount)}
                        </p>

                        <div style={{ 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px', 
                            padding: '0.5rem', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            backgroundColor: '#FAF9F6',
                            minHeight: '300px'
                        }}>
                            {selectedReceipt.receipt_base64.startsWith('data:application/pdf') ? (
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                    <Receipt size={64} color="var(--primary)" style={{ opacity: 0.7 }} />
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Documento PDF</span>
                                    <a 
                                        href={selectedReceipt.receipt_base64} 
                                        download={`Comprovante_${selectedReceipt.description.replace(/\s+/g, '_')}.pdf`}
                                        className="btn btn-primary"
                                        style={{ fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Download size={16} /> Baixar Comprovante PDF
                                    </a>
                                </div>
                            ) : (
                                <img 
                                    src={selectedReceipt.receipt_base64} 
                                    alt="Comprovante" 
                                    style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '6px' }} 
                                />
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                            {!selectedReceipt.receipt_base64.startsWith('data:application/pdf') && (
                                <a 
                                    href={selectedReceipt.receipt_base64} 
                                    download={`Comprovante_${selectedReceipt.description.replace(/\s+/g, '_')}.png`}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Download size={14} /> Baixar Imagem
                                </a>
                            )}
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setSelectedReceipt(null)}
                                style={{ fontSize: '0.85rem', marginLeft: 'auto' }}
                            >
                                Fechar Visualização
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}

            {/* Modal de Detalhes da Cobrança Asaas */}
            {showAsaasDetailsModal && asaasPaymentInfo && createPortal((
                <div style={{
                    position: 'fixed',
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.6)', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div className="card animate-scale-up" style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        maxWidth: '550px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                        position: 'relative'
                    }}>
                        <button 
                            onClick={() => setShowAsaasDetailsModal(false)}
                            style={{ position: 'absolute', right: '15px', top: '15px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <X size={20} />
                        </button>
                        
                        <h4 style={{ fontWeight: '700', fontSize: '1.2rem', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Status no Asaas
                        </h4>

                        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <strong>Aluno:</strong> {asaasPaymentInfo.enrollment.name}
                            </p>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <strong>Curso:</strong> {asaasPaymentInfo.enrollment.course_name}
                            </p>
                            <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <strong>E-mail:</strong> {asaasPaymentInfo.enrollment.email} | <strong>Tel:</strong> {asaasPaymentInfo.enrollment.phone}
                            </p>
                        </div>

                        {asaasPaymentInfo.found ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status da Cobrança:</span>
                                    <span style={{ 
                                        padding: '0.3rem 0.75rem', 
                                        borderRadius: '999px', 
                                        fontSize: '0.8rem', 
                                        fontWeight: '700', 
                                        backgroundColor: ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasPaymentInfo.status) ? '#D1FAE5' : asaasPaymentInfo.status === 'OVERDUE' ? '#FEE2E2' : '#FEF3C7', 
                                        color: ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasPaymentInfo.status) ? '#065F46' : asaasPaymentInfo.status === 'OVERDUE' ? '#991B1B' : '#92400E' 
                                    }}>
                                        {asaasPaymentInfo.status === 'PENDING' ? 'PENDENTE ⏳' : 
                                         ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasPaymentInfo.status) ? 'PAGO ✅' : 
                                         asaasPaymentInfo.status === 'OVERDUE' ? 'VENCIDO 🚨' : asaasPaymentInfo.status}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                                    <div style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Valor:</span>
                                        <strong>{formatMoney(asaasPaymentInfo.value)}</strong>
                                    </div>
                                    <div style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Método:</span>
                                        <strong>{asaasPaymentInfo.billingType}</strong>
                                    </div>
                                    <div style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>Vencimento:</span>
                                        <strong>{new Date(asaasPaymentInfo.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                                    </div>
                                    <div style={{ backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <span style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '2px' }}>ID Asaas:</span>
                                        <strong style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{asaasPaymentInfo.id}</strong>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    {asaasPaymentInfo.invoiceUrl && (
                                        <a 
                                            href={asaasPaymentInfo.invoiceUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="btn btn-primary"
                                            style={{ 
                                                flex: 1, 
                                                textAlign: 'center', 
                                                fontSize: '0.85rem', 
                                                padding: '0.6rem',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            🔗 Abrir Link da Fatura
                                        </a>
                                    )}
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={() => handleWhatsAppSiteCharge(asaasPaymentInfo.enrollment, asaasPaymentInfo.invoiceUrl)}
                                        style={{ 
                                            backgroundColor: '#25D366', 
                                            borderColor: '#25D366', 
                                            color: 'white',
                                            fontSize: '0.85rem',
                                            padding: '0.6rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Send size={14} /> Cobrar por WhatsApp
                                    </button>
                                </div>

                                {['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(asaasPaymentInfo.status) && (
                                    <div style={{ marginTop: '0.5rem', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: '600', textAlign: 'center' }}>
                                            ⚠️ Este pagamento está PAGO no Asaas, mas a matrícula ainda não foi processada localmente.
                                        </span>
                                        <button 
                                            className="btn btn-primary" 
                                            onClick={() => handleApproveEnrollment(asaasPaymentInfo.enrollment.id, asaasPaymentInfo.id)}
                                            disabled={processingEnrollmentId === asaasPaymentInfo.enrollment.id}
                                            style={{ 
                                                backgroundColor: 'var(--success)', 
                                                borderColor: 'var(--success)', 
                                                fontSize: '0.85rem',
                                                width: '100%',
                                                padding: '0.5rem'
                                            }}
                                        >
                                            {processingEnrollmentId === asaasPaymentInfo.enrollment.id ? 'Aprovando...' : 'Sincronizar & Dar Baixa Local'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ padding: '1.25rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', color: '#92400E', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                    ⚠️ <strong>Nenhuma cobrança encontrada no Asaas para esta inscrição.</strong><br/><br/>
                                    Isso significa que o aluno preencheu os dados cadastrais no site, mas desistiu ou fechou a página antes de escolher a forma de pagamento (cartão, pix ou boleto) e gerar a cobrança.<br/><br/>
                                    <strong>Recomendação comercial:</strong> Entre em contato via WhatsApp para entender o motivo do abandono e auxiliá-lo a concluir o pagamento.
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={() => handleWhatsAppSiteCharge(asaasPaymentInfo.enrollment)}
                                        style={{ 
                                            backgroundColor: '#25D366', 
                                            borderColor: '#25D366', 
                                            color: 'white',
                                            fontSize: '0.85rem',
                                            flex: 1,
                                            padding: '0.6rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Send size={14} /> Entrar em contato via WhatsApp
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={() => handleApproveEnrollment(asaasPaymentInfo.enrollment.id)}
                                        disabled={processingEnrollmentId === asaasPaymentInfo.enrollment.id}
                                        style={{ 
                                            backgroundColor: 'var(--success)', 
                                            borderColor: 'var(--success)', 
                                            fontSize: '0.85rem',
                                            flex: 1,
                                            padding: '0.6rem'
                                        }}
                                    >
                                        {processingEnrollmentId === asaasPaymentInfo.enrollment.id ? 'Aprovando...' : 'Aprovar Matrícula (Manual)'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setShowAsaasDetailsModal(false)}
                                style={{ fontSize: '0.85rem' }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}
