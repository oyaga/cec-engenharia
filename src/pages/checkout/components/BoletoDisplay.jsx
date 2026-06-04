import { ExternalLink, Clock } from 'lucide-react';

export default function BoletoDisplay({ url, onFinish }) {
  if (!url) return <div className="text-center py-8">Carregando Boleto...</div>;

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Boleto Gerado!</h3>
      <p className="text-gray-600 mb-8 max-w-md">
        Seu boleto bancário foi gerado com sucesso. Você pode visualizá-lo ou baixá-lo clicando no botão abaixo.
      </p>

      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark transition-colors mb-8"
      >
        <ExternalLink className="w-5 h-5 mr-2" />
        Visualizar Boleto PDF
      </a>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 max-w-md w-full text-left">
        <h4 className="flex items-center text-blue-800 font-semibold mb-2">
          <Clock className="w-5 h-5 mr-2" />
          Atenção ao Prazo
        </h4>
        <p className="text-sm text-blue-700">
          Pagamentos via boleto podem levar <strong>até 3 dias úteis</strong> para serem compensados pelo banco. 
          Seu acesso ao portal será liberado automaticamente assim que recebermos a confirmação.
        </p>
      </div>

      <button 
        onClick={onFinish}
        className="mt-8 text-gray-500 hover:text-gray-700 font-medium transition-colors"
      >
        Voltar para a página inicial
      </button>
    </div>
  );
}
