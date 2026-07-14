import { uploadFile } from '../lib/api';

/**
 * Faz upload de um asset do site para o storage do backend.
 * @param {File} file O arquivo a ser enviado.
 * @param {string} path Sufixo/pasta lógica (ex: 'logo', 'banners').
 * @returns {Promise<string|null>} A URL pública do arquivo ou null em caso de erro.
 */
export const uploadSiteAsset = async (file, path) => {
  try {
    const { url } = await uploadFile(file, `site-assets/${path || ''}`.replace(/\/$/, ''));
    return url;
  } catch (err) {
    console.error('Erro na função uploadSiteAsset:', err);
    return null;
  }
};
