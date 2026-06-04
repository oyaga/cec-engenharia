import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { asaas } from '../../services/asaas';
import { n8n } from '../../services/n8n';
import CheckoutForm from './components/CheckoutForm';
import PixDisplay from './components/PixDisplay';
import BoletoDisplay from './components/BoletoDisplay';
import { CheckCircle, ShieldCheck, Loader } from 'lucide-react';

export default function CheckoutPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [step, setStep] = useState('form'); // 'form', 'pix', 'boleto', 'success'
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_course_info')
        .select('*')
        .eq('id', courseId)
        .single();
        
      if (error) throw error;
      setCourse(data);
    } catch (err) {
      console.error('Erro ao buscar curso:', err);
      // Fallback pra buscar direto na tabela caso a view falhe
      const { data } = await supabase.from('lms_courses').select('*').eq('id', courseId).single();
      setCourse(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutSubmit = async (formData) => {
    setProcessing(true);
    try {
      // 1. Criar/Buscar Cliente no Asaas
      const customerRes = await asaas.createCustomer({
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email,
        phone: formData.phone
      });
      
      const customerId = customerRes.id;

      // 2. Criar Pagamento no Asaas
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // Vence em 3 dias

      const paymentRes = await asaas.createPayment({
        customer: customerId,
        billingType: formData.paymentMethod.toUpperCase(),
        value: course.price,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Matrícula - ${course.title}`
      });

      // 3. Obter PIX se aplicável
      let pixData = null;
      if (formData.paymentMethod === 'pix') {
        pixData = await asaas.getPixQrCode(paymentRes.id);
      }

      // 4. Salvar Pedido no Supabase
      const { error: orderError } = await supabase.from('orders').insert({
        student_id: formData.studentId, // Em um fluxo real, pega da sessão logada ou cadastra aluno
        course_id: course.id,
        amount: course.price,
        payment_method: formData.paymentMethod,
        status: 'pending',
        asaas_payment_id: paymentRes.id,
        asaas_customer_id: customerId,
        pix_qr_code: pixData?.encodedImage,
        pix_copy_paste: pixData?.payload,
        boleto_url: paymentRes.bankSlipUrl,
        due_date: paymentRes.dueDate
      });

      if (orderError) throw orderError;

      // 5. Notificar via N8N
      await n8n.triggerWebhook('/webhook/nova-matricula', {
        student: formData.name,
        course: course.title,
        value: course.price,
        method: formData.paymentMethod
      });

      // 6. Atualizar UI
      setPaymentData({
        ...paymentRes,
        pixData
      });

      if (formData.paymentMethod === 'pix') setStep('pix');
      else if (formData.paymentMethod === 'boleto') setStep('boleto');
      else setStep('success'); // Cartão já cobrado via token (simplificado)

    } catch (err) {
      console.error('Erro no checkout:', err);
      alert('Houve um erro ao processar seu pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!course) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Curso não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900">Finalizar Matrícula</h1>
          <p className="mt-2 text-lg text-gray-600">Você está a um passo de iniciar sua jornada.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row">
          
          {/* Resumo do Pedido (Lado Esquerdo) */}
          <div className="md:w-1/3 bg-primary text-white p-8">
            <h2 className="text-xl font-bold mb-6">Resumo do Pedido</h2>
            
            <div className="mb-6">
              <span className="block text-primary-100 text-sm">Curso</span>
              <span className="block text-lg font-semibold">{course.title}</span>
            </div>

            <div className="mb-6">
              <span className="block text-primary-100 text-sm">Modalidade</span>
              <span className="block capitalize">{course.modality}</span>
            </div>

            <div className="mb-6">
              <span className="block text-primary-100 text-sm">Total a Pagar</span>
              <span className="block text-3xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.price)}
              </span>
            </div>

            <div className="mt-auto pt-8 border-t border-primary-400">
              <div className="flex items-center text-sm">
                <ShieldCheck className="w-5 h-5 mr-2 text-green-400" />
                Ambiente 100% Seguro
              </div>
            </div>
          </div>

          {/* Formulário / Pagamento (Lado Direito) */}
          <div className="md:w-2/3 p-8">
            {step === 'form' && (
              <CheckoutForm onSubmit={handleCheckoutSubmit} processing={processing} />
            )}
            
            {step === 'pix' && (
              <PixDisplay pixData={paymentData.pixData} value={course.price} onFinish={() => navigate('/login')} />
            )}

            {step === 'boleto' && (
              <BoletoDisplay url={paymentData.bankSlipUrl} onFinish={() => navigate('/login')} />
            )}

            {step === 'success' && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Confirmado!</h3>
                <p className="text-gray-600 mb-6">Sua matrícula foi realizada com sucesso.</p>
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors font-semibold"
                >
                  Acessar Portal do Aluno
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
