import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { coursesApi } from '../../services/academic';
import { publicCheckout } from '../../services/asaas';
import CheckoutForm from './components/CheckoutForm';
import { ShieldCheck, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CheckoutPage() {
  const { courseId } = useParams();
  const { userProfile } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const getCoursePrice = (method = paymentMethod) => {
    if (!course) return null;
    const priceByMethod = {
      pix: course.price_pix,
      credit_card: course.price_card,
      boleto: course.price_boleto,
    };
    const value = priceByMethod[method] ?? course.default_value;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  };

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { courses } = await coursesApi.listPublic();
        const data = (courses || []).find(c => c.id === courseId) || null;
        setCourse(data);
      } catch (err) {
        console.error('Erro ao buscar curso:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  const handleCheckoutSubmit = async (formData) => {
    setPaymentMethod(formData.paymentMethod);
    setProcessing(true);
    try {
      // Checkout server-side: a chave do Asaas nunca vai ao browser e o preço é
      // calculado no servidor. Redireciona para a fatura hospedada do Asaas.
      const result = await publicCheckout({
        name: formData.name,
        cpf: formData.cpf,
        email: formData.email,
        phone: formData.phone,
        course_id: course?.id || courseId,
        course_name: course?.title,
        payment_method: formData.paymentMethod,
      });

      if (result?.invoiceUrl) {
        window.location.href = result.invoiceUrl;
        return;
      }
      throw new Error('Não foi possível obter a URL de pagamento.');
    } catch (err) {
      console.error('Erro no checkout:', err);
      alert('Houve um erro ao processar seu pagamento: ' + (err.message || 'tente novamente.'));
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
                {getCoursePrice() !== null
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getCoursePrice())
                  : 'Consulte a equipe'}
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
              <CheckoutForm
                key={userProfile?.id || userProfile?.user_id || 'visitor'}
                onSubmit={handleCheckoutSubmit}
                processing={processing}
                initialData={{
                  name: userProfile?.full_name,
                  email: userProfile?.email,
                  cpf: userProfile?.cpf,
                  phone: userProfile?.phone,
                }}
                onPaymentMethodChange={setPaymentMethod}
              />
          </div>
        </div>
      </div>
    </div>
  );
}
