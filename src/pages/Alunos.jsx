import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { studentsApi, classesApi, coursesApi } from '../services/academic'
import { financialApi, evaluationsApi, settingsApi, auditApi } from '../services/financial'
import { lmsApi } from '../services/lms'
import { usersApi } from '../services/users'
import { uploadFile, authApi } from '../lib/api'
import { generateDocument } from '../lib/pdfGenerator'
import { Search, Plus, Filter, Eye, Printer, FileText, FileBadge, Award, UploadCloud, Paperclip, Lock, Unlock, BookOpen, CheckSquare, Activity, Key, Clock, X, CreditCard, Smartphone, CheckCircle, AlertCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
    createOrFindCustomer,
    createPixPayment,
    getPixQrCode,
    createBoletoPayment,
    createCardPayment,
    getPaymentStatus,
    createFinancingPayment
} from '../services/asaas'

const formatCurrencyBRL = (value) => {
    if (value === null || value === undefined || value === '') return '';
    let num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const parseCurrencyBRL = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value.indexOf(',') === -1 && value.indexOf('.') !== -1) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) return parsed;
    }
    const cleanStr = value.replace(/[^\d,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
}

const maskCurrencyBRL = (value) => {
    if (!value) return '';
    if (typeof value === 'number') return formatCurrencyBRL(value);
    let onlyDigits = value.replace(/\D/g, '');
    if (!onlyDigits) return '';
    let num = parseFloat(onlyDigits) / 100;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Alunos() {
    const { userProfile } = useAuth()
    const isGerencial = ['admin', 'coordenador'].includes(userProfile?.role)
    const isAtendente = userProfile?.role === 'atendente'

    const [view, setView] = useState('list') // list | add | detail (student obj)
    const [searchTerm, setSearchTerm] = useState('')
    const [students, setStudents] = useState([])
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)

    // Form state
    const [formData, setFormData] = useState({
        full_name: '', cpf: '', rg: '', birth_date: '', birth_place: '', marital_status: 'Solteiro(a)',
        pai: '', mae: '', education_level: 'Ensino Médio Completo', email: '', phone: '',
        cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '', turma_id: '', practical_class_id: '',
        how_knew: 'WhatsApp', how_knew_other: '',
        base_value: '', discount_value: '', manual_signed: false,
        payment_method: 'À Vista (PIX/Dinheiro)',
        is_past_enrollment: false,
        status: 'ativa',
        payment_status: 'pendente',
        past_theoretical_grade: '',
        past_practical_grade: '',
        cancellation_reason: 'arrependimento_7_dias',
        refund_value: '',
        cancellation_note: '',
        cancellation_date: ''
    })

    const [showAuthModal, setShowAuthModal] = useState(false)
    const [authEmail, setAuthEmail] = useState('')
    const [authPassword, setAuthPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [selectedAction, setSelectedAction] = useState('Desbloquear Desconto')
    const [discountUnlocked, setDiscountUnlocked] = useState(false)
    const [isEditing, setIsEditing] = useState(null) // ID do aluno sendo editado
    const [showCredentialsModal, setShowCredentialsModal] = useState(false)
    const [credentials, setCredentials] = useState({ name: '', email: '', password: '', phone: '' })
    const asaasEnabled = true // Sprint B gancho

    // Checkout states
    const [checkoutValue, setCheckoutValue] = useState(0)
    const [checkoutStudent, setCheckoutStudent] = useState(null)
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [checkoutStep, setCheckoutStep] = useState('select_method') 
    const [checkoutPaymentInfo, setCheckoutPaymentInfo] = useState(null)
    const [cardForm, setCardForm] = useState({
        holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '',
        cpf: '', email: '', phone: '', postalCode: '', addressNumber: ''
    })
    const [boletoDueDate, setBoletoDueDate] = useState('')
    const [financingInstallments, setFinancingInstallments] = useState('6')
    const [pixQrCodeImage, setPixQrCodeImage] = useState('')
    const [pixCopiaCola, setPixCopiaCola] = useState('')
    const [pollingActive, setPollingActive] = useState(false)
    const [generatedCredentials, setGeneratedCredentials] = useState(null)
    const [checkoutError, setCheckoutError] = useState('')
    const [financingApproved, setFinancingApproved] = useState(false)
    const [authAttempts, setAuthAttempts] = useState(0)
    const [authBlockedUntil, setAuthBlockedUntil] = useState(null)

    useEffect(() => {
        if (financingApproved && showCheckoutModal && checkoutStep === 'select_method') {
            setCheckoutStep('financing_form');
        }
    }, [financingApproved, showCheckoutModal, checkoutStep]);

    const [signedUrls, setSignedUrls] = useState({})

    useEffect(() => {
        if (view && typeof view === 'object' && view.id) {
            const loadSignedUrls = async () => {
                const urls = {}
                const std = view.originalData || view
                
                const docsToSign = [
                    { key: 'photo', url: std.doc_photo_url },
                    { key: 'id', url: std.doc_id_url },
                    { key: 'cpf', url: std.doc_cpf_url },
                    { key: 'education', url: std.doc_education_url },
                    { key: 'address', url: std.doc_address_url }
                ]

                for (const doc of docsToSign) {
                    if (doc.url) {
                        // Storage do backend serve por URL direta.
                        urls[doc.key] = doc.url
                    }
                }

                if (std.doc_exams_url && Array.isArray(std.doc_exams_url)) {
                    const signedExams = []
                    for (const exam of std.doc_exams_url) {
                        if (exam.url) {
                            signedExams.push(exam)
                        } else {
                            signedExams.push(exam)
                        }
                    }
                    urls['exams'] = signedExams
                }

                setSignedUrls(urls)
            }
            loadSignedUrls()
        } else {
            setSignedUrls({})
        }
    }, [view])

    const handleStartCheckout = (student) => {
        const finalVal = (student.originalData?.base_value || 0) - (student.originalData?.discount_value || 0);
        setCheckoutValue(finalVal);
        setCheckoutStudent(student);
        setCheckoutStep('select_method');
        setCheckoutPaymentInfo(null);
        setCardForm({
            holderName: '',
            number: '',
            expiryMonth: '',
            expiryYear: '',
            ccv: '',
            cpf: student.originalData.cpf || '',
            email: student.originalData.email || '',
            phone: student.originalData.phone || '',
            postalCode: '',
            addressNumber: ''
        });
        setBoletoDueDate(new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0]); 
        setFinancingInstallments('6');
        setPixQrCodeImage('');
        setPixCopiaCola('');
        setPollingActive(false);
        setGeneratedCredentials(null);
        setCheckoutError('');
        setFinancingApproved(false);
        setShowCheckoutModal(true);
    };

    const getAsaasCustomer = async (student) => {
        const customer = await createOrFindCustomer({
            id: student.id,
            name: student.full_name,
            cpf: student.cpf,
            email: student.email,
            phone: student.phone
        });
        return customer.id;
    };

    const handlePixCheckout = async (student, finalValue) => {
        setCheckoutStep('processing');
        setCheckoutError('');
        try {
            const customerId = await getAsaasCustomer(student.originalData);
            const description = `Matrícula: ${student.class} - ${student.name}`;
            const payment = await createPixPayment(customerId, finalValue, description);
            const qrCode = await getPixQrCode(payment.id);
            
            setPixQrCodeImage(qrCode.encodedImage);
            setPixCopiaCola(qrCode.payload);
            setCheckoutPaymentInfo(payment);
            setCheckoutStep('pix_display');
            setPollingActive(true);
            
            startPixPolling(payment.id, student);
        } catch (err) {
            console.error("Erro no checkout PIX:", err);
            setCheckoutError(err.message || 'Erro ao processar PIX no Asaas.');
            setCheckoutStep('error');
        }
    };

    const startPixPolling = (paymentId, student) => {
        const interval = setInterval(async () => {
            if (!showCheckoutModal) {
                clearInterval(interval);
                return;
            }
            try {
                const statusObj = await getPaymentStatus(paymentId);
                if (statusObj.status === 'CONFIRMED' || statusObj.status === 'RECEIVED') {
                    clearInterval(interval);
                    handlePaymentSuccess(statusObj, student);
                }
            } catch (err) {
                console.error("Erro no polling de pagamento:", err);
            }
        }, 5000);
    };

    const handleCardCheckout = async (student, finalValue) => {
        setCheckoutStep('processing');
        setCheckoutError('');
        try {
            const customerId = await getAsaasCustomer(student.originalData);
            const description = `Matrícula: ${student.class} - ${student.name}`;
            const payment = await createCardPayment(customerId, finalValue, description, maxInstallmentsCard, {
                ...cardForm,
                email: cardForm.email || student.originalData.email,
                phone: cardForm.phone || student.originalData.phone,
                cpf: cardForm.cpf || student.originalData.cpf
            });
            handlePaymentSuccess(payment, student);
        } catch (err) {
            console.error("Erro no checkout Cartão:", err);
            setCheckoutError(err.message || 'Erro ao processar Cartão no Asaas.');
            setCheckoutStep('error');
        }
    };

    const handleBoletoCheckout = async (student, finalValue) => {
        setCheckoutStep('processing');
        setCheckoutError('');
        try {
            const customerId = await getAsaasCustomer(student.originalData);
            const description = `Matrícula: ${student.class} - ${student.name}`;
            const payment = await createBoletoPayment(customerId, finalValue, description, boletoDueDate);
            setCheckoutPaymentInfo(payment);
            setCheckoutStep('boleto_display');
        } catch (err) {
            console.error("Erro no checkout Boleto:", err);
            setCheckoutError(err.message || 'Erro ao emitir Boleto no Asaas.');
            setCheckoutStep('error');
        }
    };

    const handleFinancingSelect = () => {
        if (isGerencial) {
            setFinancingApproved(true);
            setCheckoutStep('financing_form');
        } else {
            setSelectedAction('Aprovar Financiamento');
            setShowAuthModal(true);
        }
    };

    const handleFinancingCheckout = async (student, finalValue) => {
        if (!financingApproved) {
            alert("Financiamento próprio requer autorização do coordenador.");
            return;
        }
        setCheckoutStep('processing');
        setCheckoutError('');
        try {
            const customerId = await getAsaasCustomer(student.originalData);
            const description = `Matrícula (Financiamento): ${student.class} - ${student.name}`;
            const payments = await createFinancingPayment(customerId, finalValue, parseInt(financingInstallments), description);
            handlePaymentSuccess(payments[0], student, true);
        } catch (err) {
            console.error("Erro no checkout Financiamento:", err);
            setCheckoutError(err.message || 'Erro ao processar Financiamento no Asaas.');
            setCheckoutStep('error');
        }
    };

    const handlePaymentSuccess = async (payment, student, isFinancing = false) => {
        try {
            const credentialsPassword = `CEC@${Math.floor(100000 + Math.random() * 900000)}`;

            // Cria o login do aluno (ignora se já existir).
            let userId = null;
            try {
                const { user } = await usersApi.create({
                    email: student.originalData.email,
                    password: credentialsPassword,
                    role: 'aluno',
                    full_name: student.name,
                    cpf: student.originalData.cpf || student.cpf,
                    phone: student.originalData.phone,
                });
                userId = user?.id;
            } catch (e) {
                console.warn('Login do aluno já existe ou falhou:', e.message);
            }

            await studentsApi.update(student.id, {
                ...(userId ? { user_id: userId } : {}),
                payment_status: 'pago',
            });

            await financialApi.createRecord({
                student_id: student.id,
                type: 'receita',
                category: 'matricula',
                amount: payment.value,
                payment_method: payment.billingType || (isFinancing ? 'FINANCIAMENTO' : 'BOLETO'),
                asaas_payment_id: payment.id,
                status: 'confirmado',
                description: `Matrícula presencial confirmada - ${student.class}`,
                date: new Date().toISOString()
            });

            setGeneratedCredentials({
                name: student.name,
                email: student.originalData.email,
                password: credentialsPassword,
                phone: student.originalData.phone
            });

            setCheckoutStep('success');
            setDiscountUnlocked(false);
            setFinancingApproved(false);
        } catch (err) {
            console.error("Erro ao salvar sucesso de pagamento:", err);
            setCheckoutError('Pagamento recebido no Asaas, mas falhou ao atualizar banco local.');
            setCheckoutStep('error');
        }
    };

    // Eval state
    const [evalData, setEvalData] = useState({ exam_type: 'TEORICA', attempt: 1, grade: '', retraining_hours: 0, date: new Date().toISOString().split('T')[0] })
    const [totalStudyTime, setTotalStudyTime] = useState(0)

    const handleEvalSubmit = async (student_id, class_id) => {
        if (!evalData.grade || !evalData.date) return alert("Preencha a nota e a data.")
        const payload = { ...evalData, student_id, class_id, grade: parseFloat(evalData.grade) }
        try {
            await evaluationsApi.create(payload)
            alert("Lançamento de Avaliação efetuado com sucesso!")
            setEvalData({ exam_type: 'TEORICA', attempt: 1, grade: '', retraining_hours: 0, date: new Date().toISOString().split('T')[0] })
            fetchStudents()
        } catch (err) {
            alert("Erro ao lançar nota: " + err.message)
        }
    }

    const handleFinancialAction = (action) => {
        setSelectedAction(action)
        if (isGerencial) {
            alert(`Ação "${action}" liberada diretamente para seu perfil de Gestor.`)
            if (action === 'Aplicar Desconto') {
                setDiscountUnlocked(true)
            }
        } else {
            setShowAuthModal(true)
        }
    }

    const handleUnlockDiscount = async (e) => {
        e.preventDefault()
        setAuthError('')

        // Verificar se está bloqueado temporariamente por excesso de tentativas
        if (authBlockedUntil && Date.now() < authBlockedUntil) {
            const timeLeft = Math.ceil((authBlockedUntil - Date.now()) / 1000)
            const minutes = Math.floor(timeLeft / 60)
            const seconds = timeLeft % 60
            setAuthError(`Muitas tentativas. Tente novamente em ${minutes}:${seconds < 10 ? '0' : ''}${seconds}.`)
            return
        }

        if (!authEmail || !authPassword) {
            setAuthError('Preencha e-mail e senha de autorização.')
            return
        }

        try {
            const result = await authApi.verifyManager(authEmail, authPassword)

            if (!result?.valid && !result?.role) {
                const nextAttempts = authAttempts + 1
                setAuthAttempts(nextAttempts)

                if (nextAttempts >= 3) {
                    const blockTime = Date.now() + 5 * 60 * 1000 // 5 minutos de bloqueio
                    setAuthBlockedUntil(blockTime)
                    setAuthAttempts(0)
                    setAuthError('Limite de 3 tentativas excedido. Acesso bloqueado por 5 minutos.')
                } else {
                    setAuthError(`E-mail ou senha do gestor incorretos. Tentativa ${nextAttempts} de 3.`)
                }
                return
            }

            const profile = { role: result.role, full_name: result.full_name }

            if (!result.valid || !['admin', 'coordenador'].includes(profile.role)) {
                const nextAttempts = authAttempts + 1
                setAuthAttempts(nextAttempts)
                if (nextAttempts >= 3) {
                    const blockTime = Date.now() + 5 * 60 * 1000
                    setAuthBlockedUntil(blockTime)
                    setAuthAttempts(0)
                    setAuthError('Limite de 3 tentativas excedido. Acesso bloqueado por 5 minutos.')
                } else {
                    setAuthError('O usuário autenticado não possui papel de Coordenador ou Administrador.')
                }
                return
            }

            // Sucesso! Limpar tentativas e bloqueios
            setAuthAttempts(0)
            setAuthBlockedUntil(null)

            // Liberado com expiração automática após 15 minutos (900.000 ms)
            if (selectedAction === 'Aprovar Financiamento') {
                setFinancingApproved(true)
                setTimeout(() => {
                    setFinancingApproved(false)
                    console.log('[Segurança] Permissão de financiamento expirada após 15 minutos.')
                }, 15 * 60 * 1000)
            } else {
                setDiscountUnlocked(true)
                setTimeout(() => {
                    setDiscountUnlocked(false)
                    console.log('[Segurança] Permissão de desconto expirada após 15 minutos.')
                }, 15 * 60 * 1000)
            }
            setShowAuthModal(false)
            setAuthPassword('')
            setAuthEmail('')

            // Log de auditoria
            try {
                await auditApi.record(
                    `AUTORIZACAO_GESTOR_${selectedAction.toUpperCase().replace(/\s/g, '_')}`,
                    'students',
                    null,
                    { requester: userProfile?.email || 'atendente', authorizer: authEmail, action: selectedAction, result: 'sucesso' }
                )
            } catch (logErr) {
                console.warn('[Segurança] Erro ao gravar log de auditoria:', logErr)
            }

            alert(`Autorização concedida por ${profile.full_name}! Ação "${selectedAction}" liberada com sucesso por 15 minutos.`);
        } catch (err) {
            console.error('Erro na autorização:', err)
            setAuthError('Erro interno ao validar credenciais. Tente novamente.')
        }
    }

    const fetchStudents = async () => {
        setLoading(true)
        try {
            const { classes: clsData } = await classesApi.list()
            if (clsData) setClasses(clsData)

            const { students: stdData } = await studentsApi.list()

            const formatted = (stdData || []).map(s => ({
                id: s.id,
                num: s.matricula_numero,
                name: s.full_name || 'Sem Nome',
                cpf: s.cpf || ' --- ',
                class: s.turma_name || 'Sem Turma',
                status: s.status || 'Ativo',
                photo: s.doc_photo_url,
                originalData: { ...s, classes: { name: s.turma_name, course_name: s.turma_course }, student_evaluations: [] }
            }))
            setStudents(formatted)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [])

    useEffect(() => {
        if (typeof view === 'object' && view.id) {
            fetchTotalStudyTime(view.id)
        }
    }, [view])

    const fetchTotalStudyTime = async (studentId) => {
        try {
            const { logs } = await lmsApi.timeLogs(studentId)
            const total = (logs || []).reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0)
            setTotalStudyTime(total)
        } catch { /* ignora */ }
    }

    const validateCPF = (cpf) => {
        cpf = cpf.replace(/[^\d]+/g, '')
        if (cpf === '' || cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false
        let add = 0
        for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i)
        let rev = 11 - (add % 11)
        if (rev === 10 || rev === 11) rev = 0
        if (rev !== parseInt(cpf.charAt(9))) return false
        add = 0
        for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i)
        rev = 11 - (add % 11)
        if (rev === 10 || rev === 11) rev = 0
        if (rev !== parseInt(cpf.charAt(10))) return false
        return true
    }

    const formatCPF = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const validateRG = (rg) => {
        if (!rg) return false
        const clean = rg.replace(/[^\w]/g, '')
        if (clean.length < 5) return false
        if (!!clean.match(/^(\w)\1+$/)) return false // Evita "00000", "aaaaa"
        return true
    }

    const handleCEPBlur = async () => {
        const cep = formData.cep.replace(/\D/g, '')
        if (cep.length !== 8) return
        
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const data = await res.json()
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    rua: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    estado: data.uf
                }))
            }
        } catch (error) {
            console.error('Error fetching CEP:', error)
        }
    }

    const filteredStudents = students.filter(s =>
        (s.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.cpf || '').includes(searchTerm)
    )

    const handleFormChange = async (e) => {
        let { name, value } = e.target
        
        if (name === 'cpf') value = formatCPF(value)
        if (name === 'cep') value = value.replace(/\D/g, '').slice(0, 8)
        if (name === 'base_value' || name === 'discount_value' || name === 'refund_value') {
            value = maskCurrencyBRL(value)
        }

        setFormData(prev => ({ ...prev, [name]: value }))

        if (name === 'turma_id' && value) {
            const data = classes.find(c => c.id === value) || null
            if (data) {
                setFormData(prev => ({ 
                    ...prev, 
                    base_value: data.course_value !== undefined && data.course_value !== null ? formatCurrencyBRL(data.course_value) : prev.base_value,
                    has_lms_access: !!data.lms_course_id 
                }))
            }
        }
    }

    const handleSaveError = (error) => {
        console.error('Erro ao salvar aluno:', error)
        if (error.message && (error.message.includes('students_cpf_key') || error.message.includes('duplicate key value violates unique constraint'))) {
            alert(`Erro: O CPF "${formData.cpf}" já está cadastrado para outro aluno no sistema!\n\nSe você deseja refazer este cadastro ou matricular este aluno novamente, por favor primeiro exclua o cadastro de teste antigo na listagem de alunos clicando no botão da lixeira vermelha.`);
        } else {
            alert('Erro ao salvar no Supabase: ' + (error.message || error));
        }
    }

    const handleSubmit = async () => {
        if (!formData.full_name || !formData.cpf) {
            alert('Por favor, preencha pelo menos Nome e CPF.')
            return
        }

        if (!validateCPF(formData.cpf)) {
            alert('CPF Inválido! Por favor, verifique os números digitados.')
            return
        }

        if (!formData.rg || !validateRG(formData.rg)) {
            alert('RG Inválido ou incompleto! Por favor, insira um documento válido.')
            return
        }

        if (!isEditing && (!formData.email || !formData.phone)) {
            alert('E-mail e Telefone/WhatsApp são obrigatórios para a criação do acesso do aluno!')
            return
        }

        const generatedPassword = 'CEC@' + Math.floor(100000 + Math.random() * 900000)

        const studentPayload = {
            full_name: formData.full_name,
            cpf: formData.cpf,
            rg: formData.rg,
            birth_date: formData.birth_date ? formData.birth_date : null,
            birth_place: formData.birth_place,
            marital_status: formData.marital_status,
            email: formData.email,
            phone: formData.phone,
            education_level: formData.education_level,
            turma_id: formData.turma_id ? formData.turma_id : null,
            practical_class_id: formData.practical_class_id ? formData.practical_class_id : null,
            practical_class_status: formData.practical_class_id ? 'confirmado' : null,
            how_knew: formData.how_knew,
            how_knew_other: formData.how_knew === 'Outro' ? formData.how_knew_other : null,
            parents_names: { pai: formData.pai, mae: formData.mae },
            address: { cep: formData.cep, rua: formData.rua, numero: formData.numero, bairro: formData.bairro, cidade: formData.cidade, estado: formData.estado },
            base_value: formData.base_value ? parseCurrencyBRL(formData.base_value) : 0,
            discount_value: formData.discount_value && discountUnlocked ? parseCurrencyBRL(formData.discount_value) : 0,
            manual_signed: formData.manual_signed,
            payment_method: formData.payment_method,
            has_lms_access: formData.has_lms_access,
            requires_password_change: !isEditing, // Travar troca de senha no primeiro login se for novo aluno
            status: formData.is_past_enrollment ? 'concluída' : formData.status,
            payment_status: formData.is_past_enrollment ? 'pago' : formData.payment_status,
            cancellation_date: formData.status === 'cancelada' ? (formData.cancellation_date || new Date().toISOString().split('T')[0]) : null,
            refund_value: formData.status === 'cancelada' && formData.refund_value !== '' ? parseCurrencyBRL(formData.refund_value) : 0,
            cancellation_reason: formData.status === 'cancelada' ? formData.cancellation_reason : null,
            cancellation_note: formData.status === 'cancelada' ? formData.cancellation_note : null
        }

        const insertGrades = async (studentId) => {
            if (formData.past_theoretical_grade) {
                await evaluationsApi.create({ student_id: studentId, class_id: formData.turma_id || null, exam_type: 'TEORICA', grade: parseFloat(formData.past_theoretical_grade), date: new Date().toISOString().split('T')[0] })
            }
            if (formData.past_practical_grade) {
                await evaluationsApi.create({ student_id: studentId, class_id: formData.turma_id || null, exam_type: 'PRATICA', grade: parseFloat(formData.past_practical_grade), date: new Date().toISOString().split('T')[0] })
            }
        }

        try {
            if (isEditing) {
                const { student: savedStudent } = await studentsApi.update(isEditing, studentPayload)
                await evaluationsApi.removeByStudent(savedStudent.id)
                await insertGrades(savedStudent.id)

                if (formData.status === 'cancelada' && parseCurrencyBRL(formData.refund_value) > 0) {
                    const { records: existingRefunds } = await financialApi.listRecords(savedStudent.id)
                    const hasRefund = (existingRefunds || []).some(r => r.type === 'despesa' && r.category === 'estorno')
                    if (!hasRefund) {
                        await financialApi.createRecord({
                            student_id: savedStudent.id, type: 'despesa', category: 'estorno',
                            amount: parseCurrencyBRL(formData.refund_value),
                            description: `Reembolso de cancelamento - Motivo: ${formData.cancellation_reason === 'arrependimento_7_dias' ? 'Arrependimento em até 7 dias' : 'Desistência após 7 dias'}`,
                            status: 'pago', date: new Date().toISOString()
                        })
                    }
                }
                alert('Dados atualizados com sucesso!')
                resetForm(); setView('list'); fetchStudents()
            } else {
                const { student: savedStudent } = await studentsApi.create(studentPayload)
                await insertGrades(savedStudent.id)

                if (formData.email) {
                    // Cria o login do aluno via API (não desloga o gestor atual).
                    try {
                        const { user } = await usersApi.create({
                            email: formData.email, password: generatedPassword, role: 'aluno',
                            full_name: formData.full_name, cpf: formData.cpf, phone: formData.phone,
                        })
                        if (user?.id) await studentsApi.update(savedStudent.id, { user_id: user.id })
                        setCredentials({ name: formData.full_name, email: formData.email, password: generatedPassword, phone: formData.phone })
                        setShowCredentialsModal(true)
                    } catch (err) {
                        alert("O aluno foi matriculado, mas houve um erro ao criar a conta de login: " + err.message)
                        resetForm(); setView('list'); fetchStudents()
                    }
                } else {
                    alert('Matrícula manual realizada! Conta de acesso não gerada pois nenhum e-mail foi fornecido.')
                    resetForm(); setView('list'); fetchStudents()
                }
            }
        } catch (err) {
            handleSaveError(err)
        }
    }

    const resetForm = () => {
        setFormData({
            full_name: '', cpf: '', rg: '', birth_date: '', birth_place: '', marital_status: 'Solteiro(a)',
            pai: '', mae: '', education_level: 'Ensino Médio Completo', email: '', phone: '',
            cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '', turma_id: '', practical_class_id: '',
            how_knew: 'WhatsApp', how_knew_other: '',
            base_value: '', discount_value: '', manual_signed: false,
            payment_method: 'À Vista (PIX/Dinheiro)',
            has_lms_access: false,
            is_past_enrollment: false,
            status: 'ativa',
            payment_status: 'pendente',
            past_theoretical_grade: '',
            past_practical_grade: '',
            cancellation_reason: 'arrependimento_7_dias',
            refund_value: '',
            cancellation_note: '',
            cancellation_date: ''
        })
        setIsEditing(null)
        setDiscountUnlocked(false)
    }

    const handleEdit = async (student) => {
        const s = student.originalData
        
        // Buscar notas de exames para carregar no form se for histórico
        const { evaluations: evals } = await evaluationsApi.list(s.id)
        const teoricaGrade = evals?.find(e => e.exam_type === 'TEORICA')?.grade || ''
        const praticaGrade = evals?.find(e => e.exam_type === 'PRATICA')?.grade || ''

        setFormData({
            full_name: s.full_name || '',
            cpf: s.cpf || '',
            rg: s.rg || '',
            birth_date: s.birth_date || '',
            birth_place: s.birth_place || '',
            marital_status: s.marital_status || 'Solteiro(a)',
            pai: s.parents_names?.pai || '',
            mae: s.parents_names?.mae || '',
            education_level: s.education_level || 'Ensino Médio Completo',
            email: s.email || '',
            phone: s.phone || '',
            cep: s.address?.cep || '',
            rua: s.address?.rua || '',
            numero: s.address?.numero || '',
            bairro: s.address?.bairro || '',
            cidade: s.address?.cidade || '',
            estado: s.address?.estado || '',
            turma_id: s.turma_id || '',
            practical_class_id: s.practical_class_id || '',
            how_knew: s.how_knew || 'WhatsApp',
            how_knew_other: s.how_knew_other || '',
            base_value: s.base_value !== null && s.base_value !== undefined ? formatCurrencyBRL(s.base_value) : '',
            discount_value: s.discount_value !== null && s.discount_value !== undefined ? formatCurrencyBRL(s.discount_value) : '',
            manual_signed: s.manual_signed || false,
            payment_method: s.payment_method || 'À Vista (PIX/Dinheiro)',
            is_past_enrollment: s.status === 'concluída',
            status: s.status || 'ativa',
            payment_status: s.payment_status || 'pendente',
            past_theoretical_grade: teoricaGrade,
            past_practical_grade: praticaGrade,
            cancellation_reason: s.cancellation_reason || 'arrependimento_7_dias',
            refund_value: s.refund_value !== null && s.refund_value !== undefined ? formatCurrencyBRL(s.refund_value) : '',
            cancellation_note: s.cancellation_note || '',
            cancellation_date: s.cancellation_date || ''
        })
        setIsEditing(s.id)
        setView('add')
    }

    const handleDeleteStudent = async (student) => {
        if (!window.confirm(`Tem certeza absoluta de que deseja EXCLUIR permanentemente o(a) aluno(a) "${student.name}" e todas as suas informações associadas (históricos, presenças, notas e movimentações)?\n\nEsta ação não poderá ser desfeita.`)) return;

        try {
            await studentsApi.remove(student.originalData.id);
            alert('Aluno excluído com sucesso!');
            fetchStudents();
        } catch (err) {
            console.error('Erro ao excluir aluno:', err);
            alert('Erro ao excluir aluno: ' + err.message);
        }
    }

    const handleDownloadManual = async () => {
        const { settings } = await settingsApi.list()
        const manualUrl = (settings || []).find(s => s.key === 'manual_aluno_url')?.value
        if (manualUrl) {
            fetch(manualUrl)
                .then(res => res.blob())
                .then(blob => {
                    const url = window.URL.createObjectURL(blob)
                    window.open(url, '_blank')
                })
        } else {
            alert('O Manual do Aluno ainda não foi configurado pelos gestores. Verifique no painel de "Modelos Oficiais".')
        }
    }

    const handleSignManual = async (studentId) => {
        const confirmSign = window.confirm("Confirmar que o aluno recebeu fisicamente/digitalmente e assinou o termo do Manual do Aluno?")
        if (confirmSign) {
            try {
                await studentsApi.update(studentId, { manual_signed: true })
                alert('Termo Assinado registrado com sucesso! (O certificado agora pode ser impresso no futuro).')
                fetchStudents()
                setView(prev => ({ ...prev, originalData: { ...prev.originalData, manual_signed: true } }))
            } catch (err) {
                alert('Erro ao registrar assinatura: ' + err.message)
            }
        }
    }

    const handleResetPassword = async (student) => {
        const confirmReset = window.confirm(`Deseja resetar a senha de ${student.name} para o CPF original? \n\nO aluno será obrigado a trocar a senha no próximo login.`)
        if (!confirmReset) return

        const cleanCPF = student.cpf.replace(/\D/g, '')
        const userId = student.originalData.user_id

        if (!userId) return alert('Este aluno ainda não possui uma conta vinculada.')

        try {
            await usersApi.resetPassword(userId, cleanCPF)
            alert('Senha resetada com sucesso para o CPF do aluno!')
            fetchStudents()
        } catch (err) {
            alert('Erro ao resetar senha: ' + err.message)
        }
    }

    const [studySessions, setStudySessions] = useState([])
    const fetchStudentTimeLogs = async (studentId) => {
        try {
            const { logs } = await lmsApi.timeLogs(studentId)
            if (logs) setStudySessions(logs)
        } catch { /* ignora */ }
    }
    const handleFileUpload = async (studentId, file, type) => {
        if (!file) return
        try {
            const { url: publicUrl } = await uploadFile(file, `student-docs/${studentId}`)

            let updatePayload = {}
            if (type === 'provas') {
                const currentExams = view.originalData?.doc_exams_url || []
                updatePayload = { doc_exams_url: [...currentExams, { name: file.name, url: publicUrl, date: new Date().toISOString() }] }
            } else {
                updatePayload = { [`doc_${type}_url`]: publicUrl }
            }

            await studentsApi.update(studentId, updatePayload)

            alert('Documento enviado com sucesso!')
            fetchStudents()
            // Atualizar view local se estiver em detalhes
            if (typeof view === 'object' && view.id === studentId) {
                const updatedData = { ...view.originalData, ...updatePayload }
                setView({ ...view, originalData: updatedData })
            }
        } catch (error) {
            console.error('Erro no upload:', error)
            alert('Falha ao enviar arquivo: ' + error.message)
        }
    }

    const handleDownloadCertificate = async (student) => {
        setLoading(true)
        try {
            const studentUserId = student.originalData?.user_id || student.id
            const { results: qzResults } = await lmsApi.results({ student_id: studentUserId })
            const eadAvg = qzResults?.length > 0
                ? qzResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / qzResults.length
                : 0

            const { evaluations: evals } = await evaluationsApi.list(student.id)
            const teorica = evals?.find(e => e.exam_type === 'TEORICA')?.grade || 0
            const pratica = evals?.find(e => e.exam_type === 'PRATICA')?.grade || 0

            const isApproved = eadAvg >= 70 && teorica >= 70 && pratica >= 70
            const type = isApproved ? 'conclusao' : 'participacao'

            // Modelos de certificado geridos via settings (tela Certificados).
            const config = { type }

            let text = config.template_text
                .replace('{{nome}}', student.name)
                .replace('{{cpf}}', student.cpf)
                .replace('{{curso}}', student.class)
                .replace('{{nota}}', isApproved ? ((eadAvg + teorica + pratica) / 3).toFixed(1) : '')
            
            generateDocument('custom_certificate', student, {
                content: text
            })

            alert(`Certificado de ${isApproved ? 'Conclusão' : 'Participação'} gerado com sucesso!`)
        } catch (error) {
            console.error('Erro ao gerar certificado:', error)
            alert('Falha ao gerar certificado.')
        } finally {
            setLoading(false)
        }
    }

    const renderList = () => (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>Gestão de Alunos</h2>
                    <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Visualize, edite e matricule novos estudantes no sistema.</p>
                </div>
                <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} onClick={() => { 
                    resetForm(); 
                    setIsEditing(null);
                    setView('add'); 
                }}>
                    <Plus size={24} /> Matricular Novo Aluno
                </button>
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                            <Search size={18} />
                        </div>
                        <input
                            type="text" className="form-control" placeholder="Buscar por nome ou CPF..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '1rem' }}>Foto</th>
                                <th style={{ padding: '1rem' }}>Matrícula</th>
                                <th style={{ padding: '1rem' }}>Nome Completo</th>
                                <th style={{ padding: '1rem' }}>CPF</th>
                                <th style={{ padding: '1rem' }}>Turma</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados da Nuvem...</td></tr>
                            ) : filteredStudents.map((s, idx) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid var(--border-color)' }}>
                                            {s.photo ? (
                                                <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                    <Search size={20} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>#{s.num}</td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                                        {s.name}
                                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                            {s.originalData.email || 'Sem e-mail'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{s.cpf}</td>
                                    <td style={{ padding: '1rem' }}>{s.class}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: (s.status === 'Ativo' || s.status === 'ativa') ? '#D1FAE5' : s.status === 'concluída' ? '#E0F2FE' : '#FEE2E2', color: (s.status === 'Ativo' || s.status === 'ativa') ? '#065F46' : s.status === 'concluída' ? '#0369A1' : '#991B1B' }}>
                                            {s.status === 'ativa' || s.status === 'Ativo' ? 'Ativo' : s.status === 'concluída' ? 'Concluída' : s.status === 'cancelada' ? 'Cancelado' : s.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Excluir Aluno" onClick={() => handleDeleteStudent(s)}><Trash2 size={16} color="#ef4444" /></button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Resetar Senha (CPF)" onClick={() => handleResetPassword(s)}><Key size={16} color="#ef4444" /></button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Auditoria de Horas (LMS)" onClick={() => { setView(s); fetchStudentTimeLogs(s.originalData.id); }}><Activity size={16} color="#0EA5E9" /></button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Certificado" onClick={() => handleDownloadCertificate(s)}><Award size={16} color="#eab308" /></button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Editar Dados" onClick={() => handleEdit(s)}><FileText size={16} /></button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Visualizar Perfil" onClick={() => setView(s)}><Eye size={16} /></button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Impressão Rápida" onClick={() => setView(s)}><Printer size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )

    const renderAddForm = () => (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <button className="btn btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => { resetForm(); setView('list'); }}>&larr; Voltar para listagem</button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? 'Editar Ficha do Aluno' : 'Nova Ficha de Matrícula'}</h2>
                </div>
                <button className="btn btn-primary" onClick={handleSubmit}>Salvar Matrícula</button>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>1. Dados Pessoais</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                    <div className="form-group"><label className="form-label">Nome Completo</label><input type="text" className="form-control" name="full_name" value={formData.full_name} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">CPF</label><input type="text" className="form-control" name="cpf" value={formData.cpf} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">Identidade (RG)</label><input type="text" className="form-control" name="rg" value={formData.rg} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">Data de Nascimento</label><input type="date" className="form-control" name="birth_date" value={formData.birth_date} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">Naturalidade</label><input type="text" className="form-control" name="birth_place" value={formData.birth_place} onChange={handleFormChange} /></div>
                    <div className="form-group">
                        <label className="form-label">Estado Civil</label>
                        <select className="form-control" name="marital_status" value={formData.marital_status} onChange={handleFormChange}>
                            <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option>
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Nome do Pai</label><input type="text" className="form-control" name="pai" value={formData.pai} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">Nome da Mãe</label><input type="text" className="form-control" name="mae" value={formData.mae} onChange={handleFormChange} /></div>
                    <div className="form-group">
                        <label className="form-label">Escolaridade</label>
                        <select className="form-control" name="education_level" value={formData.education_level} onChange={handleFormChange}>
                            <option>Ensino Médio Incompleto</option><option>Ensino Médio Completo</option><option>Ensino Superior</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>2. Contato e Endereço</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    <div className="form-group"><label className="form-label">E-mail</label><input type="email" className="form-control" name="email" value={formData.email} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">Telefone</label><input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleFormChange} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">CEP</label>
                        <input type="text" className="form-control" name="cep" value={formData.cep} onChange={handleFormChange} onBlur={handleCEPBlur} placeholder="00000000" />
                    </div>
                    <div className="form-group"><label className="form-label">Rua/Logradouro</label><input type="text" className="form-control" name="rua" value={formData.rua} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">Nº</label><input type="text" className="form-control" name="numero" value={formData.numero} onChange={handleFormChange} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                    <div className="form-group"><label className="form-label">Bairro</label><input type="text" className="form-control" name="bairro" value={formData.bairro} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">Cidade</label><input type="text" className="form-control" name="cidade" value={formData.cidade} onChange={handleFormChange} /></div>
                    <div className="form-group"><label className="form-label">UF</label><input type="text" className="form-control" name="estado" value={formData.estado} onChange={handleFormChange} maxLength="2" /></div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>3. Pesquisa e Marketing</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                    <div className="form-group">
                        <label className="form-label">Como conheceu o curso?</label>
                        <select className="form-control" name="how_knew" value={formData.how_knew} onChange={handleFormChange}>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Indicação">Indicação (Amigo / Ex-Aluno)</option>
                            <option value="Site">Site</option>
                            <option value="Presencial">Presencial (Balcão)</option>
                            <option value="Outro">Outro Canal/Forma</option>
                        </select>
                    </div>
                    {formData.how_knew === 'Outro' && (
                        <div className="form-group animate-fade-in">
                            <label className="form-label">Qual outro canal? (Especifique)</label>
                            <input type="text" className="form-control" name="how_knew_other" value={formData.how_knew_other} onChange={handleFormChange} placeholder="Ex: Panfleto, Outdoor, Rádio..." />
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>4. Dados Financeiros & Matrícula</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                    <div className="form-group">
                        <label className="form-label">Valor do Curso Bruto</label>
                        <input type="text" className="form-control" name="base_value" value={formData.base_value} onChange={handleFormChange} placeholder="R$ 0,00" />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Desconto Autorizado</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" className="form-control" name="discount_value" value={formData.discount_value} onChange={handleFormChange} disabled={!discountUnlocked} placeholder={!discountUnlocked ? "Bloqueado..." : "R$ 0,00"} />
                            {!discountUnlocked ? (
                                <button type="button" className="btn btn-secondary" onClick={() => handleFinancialAction('Aplicar Desconto')} title="Desbloquear Desconto" style={{ padding: '0.5rem 0.75rem' }}><Lock size={18} /></button>
                            ) : (
                                <button type="button" className="btn btn-secondary" disabled style={{ padding: '0.5rem 0.75rem', color: 'green', borderColor: 'green' }}><Unlock size={18} /></button>
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Forma de Pagamento</label>
                        <select className="form-control" name="payment_method" value={formData.payment_method} onChange={handleFormChange}>
                            <option>À Vista (PIX/Dinheiro)</option>
                            <option>Cartão de Crédito (até 10x)</option>
                            <option>Boleto Parcelado (3x)</option>
                            <option>Empresa Faturado</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="manual_signed" checked={formData.manual_signed} onChange={(e) => setFormData({ ...formData, manual_signed: e.target.checked })} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                            <label htmlFor="manual_signed" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>Aluno Assinou o Manual?</label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>5. Turma & Aula Prática</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Turma Teórica / EAD (Principal)</label>
                        <select className="form-control" name="turma_id" value={formData.turma_id} onChange={handleFormChange}>
                            <option value="">Selecione...</option>
                            {classes.filter(c => c.schedule !== 'Aula prática - Final de semana').map(c => <option key={c.id} value={c.id}>{c.name} - {c.course_name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Agendamento de Aula Prática (Fim de Semana)</label>
                        <select className="form-control" name="practical_class_id" value={formData.practical_class_id} onChange={handleFormChange}>
                            <option value="">Sem agendamento</option>
                            {classes.filter(c => c.schedule === 'Aula prática - Final de semana').map(c => <option key={c.id} value={c.id}>{c.name} - {c.course_name} ({c.start_date ? new Date(c.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'})</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>6. Configurações Históricas (Turmas Passadas)</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input 
                        type="checkbox" 
                        id="is_past_enrollment" 
                        checked={formData.is_past_enrollment} 
                        onChange={(e) => setFormData({ 
                            ...formData, 
                            is_past_enrollment: e.target.checked,
                            status: e.target.checked ? 'concluída' : 'ativa',
                            payment_status: e.target.checked ? 'pago' : 'pendente'
                        })} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                    />
                    <label htmlFor="is_past_enrollment" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
                        Matrícula Concluída / Turma Histórica?
                    </label>
                </div>

                {formData.is_past_enrollment ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginTop: '1rem' }} className="animate-fade-in">
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--danger)', fontWeight: 700 }}>Nota Teórica Final (0 a 10)</label>
                            <input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                max="10" 
                                className="form-control" 
                                name="past_theoretical_grade" 
                                value={formData.past_theoretical_grade} 
                                onChange={handleFormChange} 
                                placeholder="Ex: 8.5" 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--danger)', fontWeight: 700 }}>Nota Prática Final (0 a 10)</label>
                            <input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                max="10" 
                                className="form-control" 
                                name="past_practical_grade" 
                                value={formData.past_practical_grade} 
                                onChange={handleFormChange} 
                                placeholder="Ex: 9.0" 
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }} className="animate-fade-in">
                        <div className="form-group">
                            <label className="form-label">Status da Matrícula</label>
                            <select className="form-control" name="status" value={formData.status} onChange={handleFormChange}>
                                <option value="ativa">Ativo</option>
                                <option value="concluída">Concluída</option>
                                <option value="cancelada">Cancelado</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status de Pagamento</label>
                            <select className="form-control" name="payment_status" value={formData.payment_status} onChange={handleFormChange}>
                                <option value="pendente">Pendente</option>
                                <option value="pago">Pago</option>
                                <option value="atrasado">Atrasado</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>

                        {formData.status === 'cancelada' && (
                            <div className="card animate-slide-up" style={{ gridColumn: 'span 2', marginTop: '1rem', padding: '1.25rem', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <AlertTriangle size={16} /> Dados de Desistência e Reembolso
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ color: '#991b1b', fontWeight: '600' }}>Motivo do Cancelamento</label>
                                        <select 
                                            className="form-control" 
                                            name="cancellation_reason" 
                                            value={formData.cancellation_reason || 'arrependimento_7_dias'} 
                                            onChange={handleFormChange}
                                            style={{ borderColor: '#fca5a5' }}
                                        >
                                            <option value="arrependimento_7_dias">Direito de Arrependimento (Até 7 dias - Estorno 100%)</option>
                                            <option value="desistencia_apos_7_dias">Desistência após 7 dias (Estorno Parcial/Variável)</option>
                                            <option value="outro">Outro Motivo</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" style={{ color: '#991b1b', fontWeight: '600' }}>Valor Estornado/Reembolsado</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="refund_value" 
                                            value={formData.refund_value} 
                                            onChange={handleFormChange}
                                            placeholder="R$ 0,00"
                                            style={{ borderColor: '#fca5a5' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label" style={{ color: '#991b1b', fontWeight: '600' }}>Observações do Cancelamento</label>
                                        <textarea 
                                            className="form-control" 
                                            name="cancellation_note" 
                                            value={formData.cancellation_note || ''} 
                                            onChange={handleFormChange}
                                            placeholder="Detalhes sobre a devolução do dinheiro, conta bancária, protocolo, etc."
                                            rows="3"
                                            style={{ borderColor: '#fca5a5', width: '100%', borderRadius: '6px', padding: '0.5rem', backgroundColor: '#ffffff' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => { resetForm(); setView('list'); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSubmit}>Salvar Matrícula</button>
            </div>
        </div>
    )

    const renderDetail = (student) => {
        const courseName = student.originalData?.classes?.course_name || ''
        const requiresEval = courseName.includes('CD-CL') || courseName.includes('CD-TO') || courseName.includes('CD-CM')
        const evals = student.originalData?.student_evaluations || []

        const maxTeorica = Math.max(0, ...evals.filter(e => e.exam_type === 'TEORICA').map(e => e.grade))
        const maxPratica = Math.max(0, ...evals.filter(e => e.exam_type === 'PRATICA').map(e => e.grade))
        const attemptsTeorica = evals.filter(e => e.exam_type === 'TEORICA').length
        const attemptsPratica = evals.filter(e => e.exam_type === 'PRATICA').length

        const isApproved = maxTeorica >= 7 && maxPratica >= 7
        const isReprovado = (attemptsTeorica >= 3 && maxTeorica < 7) || (attemptsPratica >= 3 && maxPratica < 7)

        let statusBadge = { label: 'Em Andamento', bg: '#DBEAFE', color: '#1E40AF' }
        if (isApproved) statusBadge = { label: 'Aprovado (Certificado Liberado)', bg: '#D1FAE5', color: '#065F46' }
        else if (isReprovado) statusBadge = { label: 'Reprovado (Atestado)', bg: '#FEE2E2', color: '#991B1B' }

        return (
            <div className="animate-fade-in">
                <button className="btn btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => setView('list')}>&larr; Voltar para Listagem</button>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '2px solid var(--primary)' }}>
                                {student.originalData.doc_photo_url ? (
                                    <img src={signedUrls.photo || student.originalData.doc_photo_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                        <Search size={32} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{student.name}</h2>
                                <p className="text-muted">CPF: {student.cpf}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                                    <Clock size={16} /> Tempo de Estudo EAD: {Math.floor(totalStudyTime / 3600)}h {Math.floor((totalStudyTime % 3600) / 60)}min
                                </div>
                                {student.originalData.practical_class && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: '#b91c1c', fontWeight: 600, fontSize: '0.875rem' }}>
                                        <span>🗓️ Aula Prática:</span> <strong>{student.originalData.practical_class.name}</strong> - {student.originalData.practical_class.course_name} ({student.originalData.practical_class.start_date ? new Date(student.originalData.practical_class.start_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Flexível'})
                                        <span style={{
                                            marginLeft: '0.5rem',
                                            padding: '2px 8px',
                                            borderRadius: '999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            backgroundColor: student.originalData.practical_class_status === 'confirmado' ? '#dcfce7' : '#fef3c7',
                                            color: student.originalData.practical_class_status === 'confirmado' ? '#15803d' : '#92400e'
                                        }}>
                                            {student.originalData.practical_class_status === 'confirmado' ? 'Confirmado' : 'Aguardando Confirmação'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: '0.5rem 1rem', borderRadius: '999px', fontWeight: 600, backgroundColor: statusBadge.bg, color: statusBadge.color }}>{statusBadge.label}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                        {/* Situação Financeira do Aluno */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#FDF2F8', borderRadius: 'var(--radius-lg)', border: '1px solid #FBCFE8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', borderBottom: '1px solid #F9A8D4', paddingBottom: '0.5rem', color: '#BE185D', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={18} /> 💳 Situação Financeira
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="text-muted">Valor Bruto:</span>
                                        <span style={{ fontWeight: 600 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(student.originalData?.base_value || 0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="text-muted">Desconto:</span>
                                        <span style={{ fontWeight: 600, color: 'green' }}>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(student.originalData?.discount_value || 0)}</span>
                                    </div>
                                    <div style={{ height: '1px', backgroundColor: '#F9A8D4', margin: '0.25rem 0' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#BE185D' }}>Valor Líquido:</span>
                                        <span style={{ color: '#BE185D' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((student.originalData?.base_value || 0) - (student.originalData?.discount_value || 0))}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                        <span className="text-muted">Pagamento:</span>
                                        <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{student.originalData?.payment_method || 'À Vista'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ justifyContent: 'center', fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    onClick={() => handleFinancialAction('Aplicar Desconto')}
                                >
                                    {!isGerencial && !discountUnlocked ? <Lock size={12} /> : null} Aplicar Desconto
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ justifyContent: 'center', fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    onClick={() => handleFinancialAction('Renegociar Parcelamento')}
                                >
                                    {!isGerencial ? <Lock size={12} /> : null} Renegociar Parcelamento
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ justifyContent: 'center', fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    onClick={() => handleFinancialAction('Alterar Valor de Cobrança')}
                                >
                                    {!isGerencial ? <Lock size={12} /> : null} Alterar Valor
                                </button>
                                
                                <button
                                  disabled={!asaasEnabled}
                                  title={!asaasEnabled ? "Módulo de pagamentos em breve" : "Registrar pagamento do aluno no Asaas"}
                                  className="btn btn-primary"
                                  onClick={() => handleStartCheckout(student)}
                                  style={{ 
                                      width: '100%', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      gap: '0.5rem', 
                                      marginTop: '0.5rem', 
                                      padding: '0.5rem', 
                                      fontSize: '0.8rem',
                                      opacity: asaasEnabled ? 1 : 0.5,
                                      cursor: asaasEnabled ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  💳 Registrar Pagamento
                                </button>
                            </div>
                        </div>

                        {/* Central de Emissão de Documentos e PDFs */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>Emissão de Documentos</h3>
                            {!student.originalData.manual_signed && (
                                <div style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>⚠️ Manual Pendente</span>
                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleSignManual(student.id)}>Assinar</button>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }} onClick={handleDownloadManual}><BookOpen size={16} /> Manual</button>
                                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }} onClick={() => generateDocument('matricula', student)}><FileText size={16} /> Matrícula</button>
                                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }} onClick={() => generateDocument('recibo', student)}><Printer size={16} /> Recibo</button>
                                <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', fontSize: '0.8rem' }} onClick={() => generateDocument('contrato', student)}><FileText size={16} /> Contrato</button>
                                <button className="btn btn-primary" style={{ justifyContent: 'center', gridColumn: 'span 2', fontSize: '0.85rem', opacity: student.originalData.manual_signed ? 1 : 0.5 }} disabled={!student.originalData.manual_signed} onClick={() => {
                                    student.originalData.academic_records = [{ final_status: isReprovado ? 'REPROVADO' : 'APROVADO' }];
                                    generateDocument('certificado', student)
                                }}><Award size={16} /> Emitir Certificado RT</button>
                            </div>
                        </div>

                        {/* Documentos Digitais (Upload) */}
                        <div style={{ padding: '1.5rem', backgroundColor: '#F0F9FF', borderRadius: 'var(--radius-lg)', border: '1px solid #BAE6FD' }}>
                            <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', borderBottom: '1px solid #7DD3FC', paddingBottom: '0.5rem', color: '#0369A1' }}>Documentação Digital (Arquivos)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[
                                    { label: 'Foto 3x4', key: 'photo', icon: <Plus size={14} /> },
                                    { label: 'RG/Identidade', key: 'id', icon: <FileText size={14} /> },
                                    { label: 'CPF', key: 'cpf', icon: <Paperclip size={14} /> },
                                    { label: 'Escolaridade', key: 'education', icon: <Award size={14} /> },
                                    { label: 'Residência', key: 'address', icon: <Printer size={14} /> },
                                    { label: 'Anexar Prova PDF', key: 'provas', icon: <UploadCloud size={14} /> }
                                ].map(doc => (
                                    <div key={doc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #E0F2FE' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{doc.label}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {student.originalData[`doc_${doc.key}_url`] && doc.key !== 'provas' && (
                                                <a href={signedUrls[doc.key] || student.originalData[`doc_${doc.key}_url`]} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#0369A1', fontWeight: 600 }}>Ver</a>
                                            )}
                                            {doc.key === 'provas' && student.originalData.doc_exams_url?.length > 0 && (
                                                <span style={{ fontSize: '0.7rem', color: '#0369A1' }}>{student.originalData.doc_exams_url.length} anexos</span>
                                            )}
                                            <label style={{ cursor: 'pointer', color: 'var(--primary)', padding: '0.25rem', backgroundColor: '#EFF6FF', borderRadius: '4px' }}>
                                                {doc.icon}
                                                <input type="file" hidden accept=".pdf,image/*" onChange={(e) => handleFileUpload(student.id, e.target.files[0], doc.key)} />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {student.originalData.doc_exams_url?.length > 0 && (
                                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#0369A1' }}>
                                    <strong>Provas Anexadas:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {(signedUrls.exams || student.originalData.doc_exams_url).map((exam, idx) => (
                                            <a key={idx} href={exam.url} target="_blank" rel="noreferrer" style={{ padding: '0.2rem 0.5rem', backgroundColor: '#fff', border: '1px solid #BAE6FD', borderRadius: '4px' }}>Prova {idx+1}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {requiresEval && (
                        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', backgroundColor: 'var(--bg-color)' }}>
                            <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={20} /> Lançamento de Avaliações Técnicas</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Novo Lançamento</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Prova</label>
                                            <select className="form-control" style={{ padding: '0.5rem' }} value={evalData.exam_type} onChange={e => setEvalData({ ...evalData, exam_type: e.target.value })}>
                                                <option value="TEORICA">Teórica</option><option value="PRATICA">Prática</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Nota (0 - 10)</label>
                                                <input type="number" step="0.1" className="form-control" style={{ padding: '0.5rem' }} value={evalData.grade} onChange={e => setEvalData({ ...evalData, grade: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Nº Tentativa</label>
                                                <input type="number" min="1" max="3" className="form-control" style={{ padding: '0.5rem' }} value={evalData.attempt} onChange={e => setEvalData({ ...evalData, attempt: parseInt(e.target.value) })} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Retreinamento (Horas)</label>
                                                <input type="number" className="form-control" style={{ padding: '0.5rem' }} placeholder="Ex: 16" value={evalData.retraining_hours} onChange={e => setEvalData({ ...evalData, retraining_hours: parseInt(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Data</label>
                                                <input type="date" className="form-control" style={{ padding: '0.5rem' }} value={evalData.date} onChange={e => setEvalData({ ...evalData, date: e.target.value })} />
                                            </div>
                                        </div>
                                        <button className="btn btn-primary" onClick={() => handleEvalSubmit(student.id, student.originalData.turma_id)} style={{ padding: '0.5rem', marginTop: '0.5rem' }}>Salvar Nota</button>
                                    </div>
                                </div>
                                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Histórico de Lançamentos</h4>
                                    {evals.length === 0 ? <p className="text-muted" style={{ fontSize: '0.9rem' }}>Nenhuma avaliação lançada ainda.</p> : (
                                        <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Data</th>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Tipo</th>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Tent.</th>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Nota</th>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Retreino</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {evals.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
                                                    <tr key={e.id} style={{ borderBottom: '1px solid var(--bg-color)' }}>
                                                        <td style={{ padding: '0.5rem 0' }}>{new Date(e.date).toLocaleDateString()}</td>
                                                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: e.exam_type === 'TEORICA' ? '#1E40AF' : '#92400E' }}>{e.exam_type}</td>
                                                        <td style={{ padding: '0.5rem 0' }}>{e.attempt}ª</td>
                                                        <td style={{ padding: '0.5rem 0', fontWeight: 'bold', color: e.grade >= 7 ? '#059669' : '#DC2626' }}>{e.grade}</td>
                                                        <td style={{ padding: '0.5rem 0' }}>{e.retraining_hours > 0 ? `${e.retraining_hours}h` : '--'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: '#F8FAFC' }}>
                        <div>
                            <h4 style={{ margin: 0 }}>Deseja corrigir algum dado deste aluno?</h4>
                            <p className="text-muted" style={{ fontSize: '0.875rem', margin: '4px 0 0 0' }}>Altere CPF, Nome ou outras informações pessoais.</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => handleEdit(student)}>Editar Cadastro</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="alunos-container">
            {view === 'list' && renderList()}
            {view === 'add' && renderAddForm()}
            {typeof view === 'object' && renderDetail(view)}

            {showCheckoutModal && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
                    <div className="card animate-fade-in" style={{ width: '550px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>💳 Registrar Pagamento</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Aluno: <strong>{checkoutStudent?.name}</strong> ({checkoutStudent?.originalData.email})
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowCheckoutModal(false);
                                    setPollingActive(false);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {checkoutError && (
                            <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={16} />
                                <span>{checkoutError}</span>
                            </div>
                        )}

                        {checkoutStep === 'select_method' && (
                            <div>
                                <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontWeight: '600' }}>
                                    <span className="text-secondary">Valor a cobrar:</span>
                                    <span style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(checkoutValue)}
                                    </span>
                                </div>

                                <p style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Escolha a forma de pagamento:</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        onClick={() => handlePixCheckout(checkoutStudent, checkoutValue)}
                                        style={{ height: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}
                                    >
                                        <Smartphone size={20} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>⚡ PIX</span>
                                    </button>

                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        onClick={() => setCheckoutStep('card_form')}
                                        style={{ height: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E40AF' }}
                                    >
                                        <CreditCard size={20} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>💳 Cartão de Crédito</span>
                                    </button>

                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        onClick={() => setCheckoutStep('boleto_form')}
                                        style={{ height: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', backgroundColor: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}
                                    >
                                        <FileText size={20} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>📄 Boleto Bancário</span>
                                    </button>

                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        onClick={handleFinancingSelect}
                                        style={{ height: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', backgroundColor: '#FDF2F8', borderColor: '#FBCFE8', color: '#9D174D' }}
                                    >
                                        <Award size={20} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>🤝 Financiamento C&C</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {checkoutStep === 'processing' && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <Loader2 size={40} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
                                <h4 style={{ fontWeight: '600', color: 'var(--primary)' }}>Processando cobrança...</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    Isso pode levar alguns segundos, por favor aguarde.
                                </p>
                            </div>
                        )}

                        {checkoutStep === 'pix_display' && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                    <p style={{ fontSize: '0.9rem', color: '#065F46', fontWeight: '600' }}>
                                        PIX gerado! Peça para o aluno escanear o QR Code abaixo:
                                    </p>
                                    <p style={{ fontSize: '1.25rem', color: '#065F46', fontWeight: '800', marginTop: '0.25rem' }}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(checkoutValue)}
                                    </p>
                                </div>

                                {pixQrCodeImage ? (
                                    <div style={{ width: '220px', height: '220px', margin: '0 auto 1.5rem auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <img src={`data:image/png;base64,${pixQrCodeImage}`} alt="QR Code PIX" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                                    </div>
                                ) : (
                                    <div style={{ width: '220px', height: '220px', margin: '0 auto 1.5rem auto', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Loader2 className="animate-spin" />
                                    </div>
                                )}

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', textAlign: 'left', marginBottom: '0.25rem' }}>
                                        Código Copia e Cola:
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            type="text" 
                                            readOnly 
                                            className="form-control" 
                                            value={pixCopiaCola} 
                                            style={{ fontSize: '0.8rem', padding: '0.5rem' }} 
                                        />
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary" 
                                            onClick={() => {
                                                navigator.clipboard.writeText(pixCopiaCola);
                                                alert('PIX Copia e Cola copiado!');
                                            }}
                                            style={{ padding: '0.5rem' }}
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#D97706', fontSize: '0.9rem', fontWeight: '600' }}>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>⏳ Aguardando pagamento...</span>
                                </div>
                            </div>
                        )}

                        {checkoutStep === 'boleto_form' && (
                            <form onSubmit={(e) => { e.preventDefault(); handleBoletoCheckout(checkoutStudent, checkoutValue); }}>
                                <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: 'var(--primary)' }}>📄 Emitir Boleto Bancário</h4>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Data de Vencimento</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="form-control" 
                                        value={boletoDueDate} 
                                        onChange={(e) => setBoletoDueDate(e.target.value)} 
                                        min={new Date().toISOString().split('T')[0]} 
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setCheckoutStep('select_method')}>Voltar</button>
                                    <button type="submit" className="btn btn-primary">Gerar Boleto</button>
                                </div>
                            </form>
                        )}

                        {checkoutStep === 'boleto_display' && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'inline-flex', paddingInline: '2rem' }}>
                                    <FileText size={48} color="#D97706" style={{ margin: '0 auto' }} />
                                </div>
                                <h4 style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--primary)' }}>Boleto Gerado com Sucesso!</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                                    O boleto no valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(checkoutValue)}</strong> foi criado com vencimento em <strong>{boletoDueDate ? new Date(boletoDueDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</strong>.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <a 
                                        href={checkoutPaymentInfo?.bankSlipUrl || checkoutPaymentInfo?.invoiceUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="btn btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Printer size={16} /> Abrir PDF do Boleto
                                    </a>

                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => {
                                            const message = encodeURIComponent(`Olá ${checkoutStudent?.name}! Segue o link do boleto para pagamento da sua matrícula no curso da C&C Engenharia:\n\n🔗 Boleto: ${checkoutPaymentInfo?.bankSlipUrl || checkoutPaymentInfo?.invoiceUrl}`);
                                            const phone = checkoutStudent?.originalData.phone.replace(/\D/g, '');
                                            window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#25D366', color: '#fff', borderColor: '#25D366' }}
                                    >
                                        <Smartphone size={16} /> Enviar por WhatsApp
                                    </button>

                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => setCheckoutStep('select_method')}
                                    >
                                        Voltar
                                    </button>
                                </div>
                            </div>
                        )}

                        {checkoutStep === 'card_form' && (
                            <form onSubmit={(e) => { e.preventDefault(); handleCardCheckout(checkoutStudent, checkoutValue); }}>
                                <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: 'var(--primary)' }}>💳 Dados do Cartão de Crédito</h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Número do Cartão</label>
                                            <input 
                                                type="text" 
                                                required 
                                                placeholder="0000 0000 0000 0000" 
                                                className="form-control" 
                                                value={cardForm.number} 
                                                onChange={(e) => setCardForm({...cardForm, number: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Parcelas</label>
                                            <select 
                                                className="form-control" 
                                                value={maxInstallmentsCard}
                                                onChange={(e) => setMaxInstallmentsCard(e.target.value)}
                                            >
                                                {[...Array(10)].map((_, i) => (
                                                    <option key={i+1} value={i+1}>{i+1}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(checkoutValue / (i+1))}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nome Impresso no Cartão</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="Como no cartão" 
                                            className="form-control" 
                                            value={cardForm.holderName} 
                                            onChange={(e) => setCardForm({...cardForm, holderName: e.target.value})} 
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Validade Mês</label>
                                            <input 
                                                type="text" 
                                                required 
                                                maxLength="2" 
                                                placeholder="MM" 
                                                className="form-control" 
                                                value={cardForm.expiryMonth} 
                                                onChange={(e) => setCardForm({...cardForm, expiryMonth: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Validade Ano</label>
                                            <input 
                                                type="text" 
                                                required 
                                                maxLength="4" 
                                                placeholder="AAAA" 
                                                className="form-control" 
                                                value={cardForm.expiryYear} 
                                                onChange={(e) => setCardForm({...cardForm, expiryYear: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>CVV</label>
                                            <input 
                                                type="text" 
                                                required 
                                                maxLength="4" 
                                                placeholder="123" 
                                                className="form-control" 
                                                value={cardForm.ccv} 
                                                onChange={(e) => setCardForm({...cardForm, ccv: e.target.value})} 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                        <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Dados do Titular:</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>CPF do Titular</label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    placeholder="000.000.000-00" 
                                                    className="form-control" 
                                                    value={cardForm.cpf} 
                                                    onChange={(e) => setCardForm({...cardForm, cpf: e.target.value})} 
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>CEP do Titular</label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    placeholder="00000-000" 
                                                    className="form-control" 
                                                    value={cardForm.postalCode} 
                                                    onChange={(e) => setCardForm({...cardForm, postalCode: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Número do Endereço</label>
                                            <input 
                                                type="text" 
                                                required 
                                                placeholder="Ex: 123" 
                                                className="form-control" 
                                                value={cardForm.addressNumber} 
                                                onChange={(e) => setCardForm({...cardForm, addressNumber: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setCheckoutStep('select_method')}>Voltar</button>
                                    <button type="submit" className="btn btn-primary">Processar Pagamento</button>
                                </div>
                            </form>
                        )}

                        {checkoutStep === 'financing_form' && (
                            <form onSubmit={(e) => { e.preventDefault(); handleFinancingCheckout(checkoutStudent, checkoutValue); }}>
                                <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: '#9D174D', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    🤝 Financiamento Próprio C&C
                                </h4>
                                
                                <div style={{ backgroundColor: '#FDF2F8', border: '1px solid #FBCFE8', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#9D174D', fontWeight: '500' }}>
                                    ✅ Autorização concedida pelo coordenador.
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label" style={{ fontWeight: '600', fontSize: '0.85rem' }}>Número de Parcelas (Boletos Mensais)</label>
                                    <select 
                                        className="form-control" 
                                        value={financingInstallments} 
                                        onChange={(e) => setFinancingInstallments(e.target.value)}
                                    >
                                        {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                                            <option key={n} value={n}>{n}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(checkoutValue / n)}</option>
                                        ))}
                                    </select>
                                    <small className="text-secondary" style={{ display: 'block', marginTop: '0.4rem' }}>
                                        O primeiro boleto vencerá em 30 dias, e os subsequentes a cada 30 dias.
                                    </small>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setCheckoutStep('select_method')}>Voltar</button>
                                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#9D174D', borderColor: '#9D174D' }}>Gerar Carnê de Boletos</button>
                                </div>
                            </form>
                        )}

                        {checkoutStep === 'success' && (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#10B981' }}>
                                    <CheckCircle size={60} />
                                </div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                                    ✅ Pagamento Registrado!
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    As credenciais de acesso do aluno foram geradas com sucesso.
                                </p>

                                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#334155' }}>
                                    <p style={{ margin: '0 0 0.5rem 0' }}><strong>Link:</strong> cursocec.com.br/login</p>
                                    <p style={{ margin: '0 0 0.5rem 0' }}><strong>Login:</strong> {generatedCredentials?.email}</p>
                                    <p style={{ margin: 0 }}><strong>Senha provisória:</strong> {generatedCredentials?.password}</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <button 
                                        type="button"
                                        className="btn btn-primary" 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`Olá ${generatedCredentials?.name}! Seu acesso à plataforma C&C foi criado.\n\n🔗 Link: cursocec.com.br/login\n📧 Login: ${generatedCredentials?.email}\n🔑 Senha: ${generatedCredentials?.password}\n\nNo primeiro acesso você poderá alterar sua senha.`);
                                            alert('Credenciais copiadas para a área de transferência!');
                                        }}
                                    >
                                        Copiar Credenciais
                                    </button>

                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        style={{ backgroundColor: '#25D366', color: '#FFF', borderColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        onClick={() => {
                                            const cleanPhone = generatedCredentials?.phone.replace(/\D/g, '');
                                            const message = encodeURIComponent(`Olá ${generatedCredentials?.name}! Seu acesso à plataforma EAD C&C Engenharia foi liberado.\n\n🔗 Link: cursocec.com.br/login\n📧 Login: ${generatedCredentials?.email}\n🔑 Senha: ${generatedCredentials?.password}\n\nNo seu primeiro acesso, altere sua senha.`);
                                            window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
                                        }}
                                    >
                                        <Smartphone size={16} /> Enviar por WhatsApp
                                    </button>

                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        onClick={() => {
                                            setShowCheckoutModal(false);
                                            fetchStudents(); // recarregar alunos
                                        }}
                                        style={{ marginTop: '0.5rem' }}
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        )}

                        {checkoutStep === 'error' && (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#EF4444' }}>
                                    <AlertCircle size={60} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#991B1B', marginBottom: '0.5rem' }}>
                                    Erro ao Processar Pagamento
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    Infelizmente ocorreu um erro ao registrar a cobrança no Asaas.
                                </p>
                                
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setCheckoutStep('select_method')}>Tentar Novamente</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCheckoutModal(false)}>Fechar</button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            ), document.body)}

            {showAuthModal && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div className="card animate-fade-in" style={{ width: '420px', maxWidth: '95%' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}><Lock size={20} /> 🔐 Ação Requer Autorização</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: '1.4' }}>
                            Esta ação (<strong>{selectedAction}</strong>) precisa de aprovação de um Coordenador ou Gerente.
                        </p>
                        {authError && <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{authError}</div>}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>E-mail do Autorizador</label>
                                <input type="email" placeholder="gestor@cursocec.com.br" className="form-control" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={{ padding: '0.6rem' }} />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Senha do Autorizador</label>
                                <input type="password" placeholder="••••••••" className="form-control" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ padding: '0.6rem' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => { setShowAuthModal(false); setAuthEmail(''); setAuthPassword(''); setAuthError(''); }}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleUnlockDiscount}>Autorizar</button>
                        </div>
                    </div>
                </div>
            ), document.body)}

            {showCredentialsModal && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div className="card animate-fade-in" style={{ width: '450px', maxWidth: '90%', textAlign: 'center', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#10B981' }}>
                            <CheckCircle size={48} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                            ✅ Aluno cadastrado com sucesso!
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            A conta de acesso à plataforma C&C foi criada. Compartilhe as credenciais com o aluno:
                        </p>
                        
                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', textAlign: 'left', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: '#334155' }}>
                            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Link:</strong> cursocec.com.br/login</p>
                            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Login:</strong> {credentials.email}</p>
                            <p style={{ margin: 0 }}><strong>Senha provisória:</strong> {credentials.password}</p>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => {
                                    navigator.clipboard.writeText(`Olá ${credentials.name}! Seu acesso à plataforma C&C foi criado.\n\n🔗 Link: cursocec.com.br/login\n📧 Login: ${credentials.email}\n🔑 Senha: ${credentials.password}\n\nNo primeiro acesso você poderá alterar sua senha.`);
                                    alert('Credenciais copiadas para a área de transferência!');
                                }}
                            >
                                Copiar credenciais
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                style={{ backgroundColor: '#25D366', color: '#FFF', borderColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                onClick={() => {
                                    const cleanPhone = credentials.phone.replace(/\D/g, '');
                                    const message = encodeURIComponent(`Olá ${credentials.name}! Seu acesso à plataforma C&C foi criado.\n\n🔗 Link: cursocec.com.br/login\n📧 Login: ${credentials.email}\n🔑 Senha: ${credentials.password}\n\nNo primeiro acesso você poderá alterar sua senha.`);
                                    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
                                }}
                            >
                                Enviar por WhatsApp
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                    setShowCredentialsModal(false);
                                    resetForm();
                                    setView('list');
                                    fetchStudents();
                                }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}
            {/* MODAL DE AUDITORIA DE HORAS (LMS) */}
            {typeof view === 'object' && studySessions.length > 0 && createPortal((
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div className="card animate-fade-in" style={{ width: '600px', maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0369a1' }}>
                                    <Activity size={24} /> Auditoria de Presença Online
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Logs de estudo de: <strong>{view.name}</strong></p>
                            </div>
                            <button className="btn btn-secondary" onClick={() => { setView('list'); setStudySessions([]); }}>Fechar</button>
                        </div>
                        
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: 600 }}>Carga Horária Acumulada:</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0369a1' }}>
                                    {(studySessions.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 3600).toFixed(2)} horas
                                </span>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                                        <th style={{ padding: '0.75rem 0.5rem' }}>Data/Hora</th>
                                        <th style={{ padding: '0.75rem 0.5rem' }}>Duração (Auditada)</th>
                                        <th style={{ padding: '0.75rem 0.5rem' }}>Tipo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studySessions.map((log, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{Math.floor(log.duration_seconds / 60)} min {log.duration_seconds % 60}s</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#f1f5f9' }}>
                                                    Sessão Ativa (Heartbeat)
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>
                                <Printer size={18} /> Imprimir Relatório para Auditoria
                            </button>
                        </div>
                    </div>
                </div>
            ), document.body)}
        </div>
    )
}
