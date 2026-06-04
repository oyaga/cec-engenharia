import { useState } from 'react';
import { Copy, Check, QrCode } from 'lucide-react';

export default function PixDisplay({ pixData, value, onFinish }) {
  const [copied, setCopied] = useState(false);

  if (!pixData) return <div className="text-center py-8">Carregando PIX...</div>;

  const handleCopy = () => {
    navigator.clipboard.writeText(pixData.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Pague com PIX</h3>
      <p className="text-gray-600 mb-8">Abra o app do seu banco e escaneie o QR Code abaixo</p>

      <div className="bg-white p-4 rounded-xl border-2 border-primary shadow-sm mb-6">
        <img 
          src={`data:image/png;base64,${pixData.encodedImage}`} 
          alt="QR Code PIX" 
          className="w-48 h-48"
        />
      </div>

      <div className="w-full max-w-sm">
        <p className="text-sm text-gray-500 mb-2 font-medium">Ou copie o código PIX copia e cola:</p>
        <div className="flex">
          <input 
            type="text" 
            readOnly 
            value={pixData.payload}
            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 bg-gray-50 text-gray-500 text-sm focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-white hover:bg-gray-50 focus:outline-none text-primary font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 mr-1 text-green-500" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="mt-10 p-4 bg-yellow-50 rounded-lg w-full max-w-sm">
        <p className="text-sm text-yellow-800 flex items-center justify-center">
          <QrCode className="w-4 h-4 mr-2" />
          O acesso é liberado instantaneamente após o pagamento.
        </p>
      </div>

      <button 
        onClick={onFinish}
        className="mt-8 text-primary hover:text-primary-dark font-medium underline"
      >
        Já realizei o pagamento
      </button>
    </div>
  );
}
