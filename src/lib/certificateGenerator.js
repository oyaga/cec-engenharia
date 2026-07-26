import { jsPDF } from 'jspdf';
import { settingsApi } from '../services/financial';

/**
 * Função auxiliar para buscar o QR Code como Blob e converter em Base64 Data URI
 */
const fetchQRCodeAsBase64 = async (text) => {
    try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
        const response = await fetch(qrUrl);
        if (!response.ok) throw new Error("Erro na requisição da API de QR Code");
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Erro ao buscar QR Code da API externa (usando fallback de texto):", e);
        return null;
    }
};

/**
 * Gera um certificado em PDF para o aluno com base nas configurações e template do banco
 * @param {Object} data 
 * @param {string} data.studentName 
 * @param {string} data.studentCpf
 * @param {string} data.courseName
 * @param {number|string} data.hours
 * @param {string} data.date
 * @param {string} data.issuedId
 */
export const generateCertificate = async ({ studentName, studentCpf, courseName, hours, date, issuedId }) => {
    try {
        // 1. Configuração/assets do sistema (settings)
        let allSettings = [];
        try { allSettings = (await settingsApi.list()).settings || []; } catch { /* padrão */ }
        const settingsMap = {};
        allSettings.forEach(s => settingsMap[s.key] = s.value);

        let templateText = settingsMap['certificate_template_text'] || 'Certificamos que {{nome_aluno}}, portador do CPF {{cpf_aluno}}, concluiu o curso de {{nome_curso}} com carga horária de {{carga_horaria}}h.';

        // 2. Substituir variáveis
        templateText = templateText
            .replace(/\{\{nome_aluno\}\}/g, studentName)
            .replace(/\{\{cpf_aluno\}\}/g, studentCpf || 'Não informado')
            .replace(/\{\{nome_curso\}\}/g, courseName)
            .replace(/\{\{carga_horaria\}\}/g, hours);

        // 4. Iniciar PDF (Paisagem - A4)
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 5. Desenhar Background (Se houver)
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Bordas decorativas premium (Borda dupla de inspiração técnica)
        doc.setLineWidth(1.5);
        doc.setDrawColor(3, 105, 161); // sky-700
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

        doc.setLineWidth(0.5);
        doc.setDrawColor(14, 165, 233); // sky-500
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');

        // 6. Título do Certificado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(34);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('CERTIFICADO DE CONCLUSÃO', pageWidth / 2, 50, { align: 'center' });

        // Subtítulo elegante
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(12);
        doc.setTextColor(14, 165, 233);
        doc.text('CURSO CEC — CAPACITAÇÃO PROFISSIONAL & ENGENHARIA', pageWidth / 2, 58, { align: 'center' });

        // 7. Texto Principal
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor(51, 65, 85); // slate-700
        
        // Quebra automática de linha
        const lines = doc.splitTextToSize(templateText, pageWidth - 80);
        doc.text(lines, pageWidth / 2, 92, { align: 'center', lineHeightFactor: 1.5 });

        // 8. Assinatura e Detalhes de Emissão
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Emitido em: ${date}`, 40, pageHeight - 55);
        doc.text(`Carga Horária Teórica: ${hours} horas`, 40, pageHeight - 48);

        // Linha e bloco da assinatura
        doc.setLineWidth(0.5);
        doc.setDrawColor(203, 213, 225);
        doc.line(pageWidth - 110, pageHeight - 48, pageWidth - 40, pageHeight - 48);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('Diretoria C&C Engenharia', pageWidth - 75, pageHeight - 40, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Assinatura Digitalizada Autorizada', pageWidth - 75, pageHeight - 34, { align: 'center' });

        // 9. Código de Validação e QR Code (Prioridade 14)
        const validationCode = issuedId ? issuedId.substring(0, 8).toUpperCase() : 'TEST-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const certId = issuedId || 'uuid-teste-cec';
        const validationUrl = `https://cursocec.com.br/validar-certificado/${certId}`;

        // Código de Rastreabilidade em texto
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(3, 105, 161);
        doc.text(`CÓDIGO DE AUTENTICIDADE: ${validationCode}`, 40, pageHeight - 25);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Para validar a autenticidade deste certificado técnico, acesse:', 40, pageHeight - 20);
        doc.setFont('helvetica', 'bold');
        doc.text('cursocec.com.br/validar-certificado', 40, pageHeight - 16);

        // Buscar e desenhar o QR Code dinamicamente
        const qrCodeBase64 = await fetchQRCodeAsBase64(validationUrl);
        if (qrCodeBase64) {
            // Desenhar o QR Code no canto inferior esquerdo, ao lado do texto
            doc.addImage(qrCodeBase64, 'PNG', 15, pageHeight - 32, 22, 22);
            
            // Reajustar a posição dos textos para dar espaço ao QR Code à esquerda
            // Removemos os textos anteriores e os replotamos deslocados para o lado do QR Code
            doc.setFillColor(248, 250, 252);
            doc.rect(38, pageHeight - 33, 110, 22, 'F'); // Limpa espaço
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(3, 105, 161);
            doc.text(`CÓDIGO DE AUTENTICIDADE: ${validationCode}`, 42, pageHeight - 24);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Acesse o portal e digite o código ao lado, ou aponte a câmera', 42, pageHeight - 19);
            doc.text('do seu celular para o QR Code para validar este documento.', 42, pageHeight - 15);
        }

        // 10. Salvar
        doc.save(`Certificado_${courseName.replace(/\s+/g, '_')}_${studentName.replace(/\s+/g, '_')}.pdf`);

        return true;
    } catch (error) {
        console.error('Erro ao gerar certificado no generator:', error);
        throw error;
    }
};

