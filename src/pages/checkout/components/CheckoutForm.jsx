import { useState } from 'react';
import { CreditCard, Smartphone, FileText, Loader } from 'lucide-react';

export default function CheckoutForm({ onSubmit, processing }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    paymentMethod: 'pix'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Seus Dados</h3>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
          <input
            type="text"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input
            type="email"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">CPF</label>
          <input
            type="text"
            required
            placeholder="000.000.000-00"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.cpf}
            onChange={(e) => setFormData({...formData, cpf: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Celular (WhatsApp)</label>
          <input
            type="text"
            required
            placeholder="(00) 00000-0000"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mt-8 mb-4 border-t pt-6">Forma de Pagamento</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* PIX */}
        <label className={`
          border rounded-lg p-4 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all
          ${formData.paymentMethod === 'pix' ? 'border-primary ring-2 ring-primary bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
        `}>
          <input 
            type="radio" 
            className="sr-only" 
            name="paymentMethod" 
            value="pix"
            checked={formData.paymentMethod === 'pix'}
            onChange={() => setFormData({...formData, paymentMethod: 'pix'})}
          />
          <Smartphone className={`w-8 h-8 ${formData.paymentMethod === 'pix' ? 'text-primary' : 'text-gray-400'}`} />
          <span className="font-medium text-gray-900">PIX</span>
          <span className="text-xs text-green-600 font-semibold">Aprovação Imediata</span>
        </label>

        {/* Cartão */}
        <label className={`
          border rounded-lg p-4 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all
          ${formData.paymentMethod === 'credit_card' ? 'border-primary ring-2 ring-primary bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
        `}>
          <input 
            type="radio" 
            className="sr-only" 
            name="paymentMethod" 
            value="credit_card"
            checked={formData.paymentMethod === 'credit_card'}
            onChange={() => setFormData({...formData, paymentMethod: 'credit_card'})}
          />
          <CreditCard className={`w-8 h-8 ${formData.paymentMethod === 'credit_card' ? 'text-primary' : 'text-gray-400'}`} />
          <span className="font-medium text-gray-900">Cartão de Crédito</span>
          <span className="text-xs text-gray-500">Até 12x</span>
        </label>

        {/* Boleto */}
        <label className={`
          border rounded-lg p-4 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all
          ${formData.paymentMethod === 'boleto' ? 'border-primary ring-2 ring-primary bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
        `}>
          <input 
            type="radio" 
            className="sr-only" 
            name="paymentMethod" 
            value="boleto"
            checked={formData.paymentMethod === 'boleto'}
            onChange={() => setFormData({...formData, paymentMethod: 'boleto'})}
          />
          <FileText className={`w-8 h-8 ${formData.paymentMethod === 'boleto' ? 'text-primary' : 'text-gray-400'}`} />
          <span className="font-medium text-gray-900">Boleto</span>
          <span className="text-xs text-gray-500">Até 3 dias úteis</span>
        </label>
      </div>

      <div className="pt-6">
        <button
          type="submit"
          disabled={processing}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70"
        >
          {processing ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Processando Pagamento...
            </>
          ) : (
            'Finalizar Compra Segura'
          )}
        </button>
      </div>
    </form>
  );
}
