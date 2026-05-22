import React, { useState } from 'react';
import { X, Save, FileText, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useEdit } from '../../context/EditContext';

const LegalDocumentsModal = ({ isOpen, onClose }) => {
  const { content, updateContent } = useEdit();
  const [activeTab, setActiveTab] = useState('manual'); // manual | terms
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeTab}_${Date.now()}.${fileExt}`;
      const filePath = `legal-docs/${fileName}`;

      // 1. Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      // 3. Atualizar o link no conteúdo do site
      const contentPath = activeTab === 'manual' ? 'manual_do_aluno.pdf_url' : 'termos_de_uso.pdf_url';
      updateContent(contentPath, publicUrl);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading PDF:', err);
      alert('Erro ao carregar PDF. Verifique se o bucket "public" existe no seu Supabase Storage.');
    } finally {
      setIsUploading(false);
    }
  };

  const currentText = activeTab === 'manual' 
    ? (content.manual_do_aluno?.content || '') 
    : (content.termos_de_uso?.content || '');

  const handleTextChange = (e) => {
    const path = activeTab === 'manual' ? 'manual_do_aluno.content' : 'termos_de_uso.content';
    updateContent(path, e.target.value);
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="text-primary" />
            <div>
              <h2 className="text-xl font-bold">Gestão de Documentos Legais</h2>
              <p className="text-xs text-slate-400">Edite o texto para validação de leitura ou carregue o PDF oficial.</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'manual' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Manual do Aluno
          </button>
          <button 
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'terms' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Termos de Uso
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Upload Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Upload size={18} /> Versão em PDF
              </h3>
              <p className="text-xs text-slate-500">Este arquivo será disponibilizado para download pelo aluno.</p>
            </div>
            <div className="flex items-center gap-3">
              {uploadSuccess && <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> PDF Atualizado!</span>}
              <label className={`cursor-pointer px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white hover:bg-primary-dark'}`}>
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {isUploading ? 'Carregando...' : 'Carregar Novo PDF'}
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            </div>
          </div>

          {/* Text Editor Section */}
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} /> Conteúdo para Leitura (Texto)
            </h3>
            <p className="text-xs text-slate-500 mb-2">Cole o texto aqui. O aluno precisará rolar este conteúdo até o final para habilitar a matrícula.</p>
            <textarea 
              className="flex-1 w-full p-4 border rounded-xl font-mono text-sm min-h-[300px] focus:ring-2 focus:ring-primary/20 outline-none"
              value={currentText}
              onChange={handleTextChange}
              placeholder="Cole o conteúdo do documento aqui..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            Fechar Janela
          </button>
          <button onClick={onClose} className="px-8 py-2 bg-primary text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2">
            <Save size={18} /> Confirmar Edições
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentsModal;
