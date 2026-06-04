import { supabase } from '../lib/supabase';

/**
 * Faz o upload de um arquivo para o bucket "site_assets" do Supabase.
 * @param {File} file O arquivo a ser enviado.
 * @param {string} path O caminho dentro do bucket (ex: 'logo.png', 'banners/home.jpg').
 * @returns {Promise<string|null>} A URL pública do arquivo ou null em caso de erro.
 */
export const uploadSiteAsset = async (file, path) => {
  try {
    const { data, error } = await supabase.storage
      .from('site_assets')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true // Sobrescreve se já existir
      });

    if (error) {
      console.error('Erro ao fazer upload do asset:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('site_assets')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Erro na função uploadSiteAsset:', err);
    return null;
  }
};
