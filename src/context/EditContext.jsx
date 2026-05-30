import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import initialContent from '../data/content.json';
import { useAuth } from '../contexts/AuthContext';

const EditContext = createContext();

export const useEdit = () => useContext(EditContext);

export const EditProvider = ({ children }) => {
  const { userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(() => {
    try {
      return sessionStorage.getItem('cec_editing') === 'true';
    } catch {
      return false;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(initialContent || {});

  // 1. Carregar Sessão e Dados Iniciais de forma sincronizada
  useEffect(() => {
    const initApp = async () => {
      try {
        // Carregamento inicial da sessão
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        // Buscar Conteúdo do Banco de Dados ANTES de liberar a tela
        await fetchSiteContent();
      } catch (err) {
        console.error("Erro na inicialização do app:", err);
      } finally {
        setLoading(false);
      }
    };

    initApp();

    // Monitorar Mudanças de Autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Deep merge: preserva defaults locais para chaves ausentes no banco
  const deepMerge = (base, override) => {
    if (Array.isArray(base) && Array.isArray(override)) {
      const merged = [...override];
      base.forEach(baseItem => {
        if (baseItem && typeof baseItem === 'object' && baseItem.slug) {
          const exists = override.some(overItem => overItem && overItem.slug === baseItem.slug);
          if (!exists) {
            merged.push(baseItem);
          }
        } else if (baseItem && typeof baseItem === 'object' && baseItem.id) {
          const exists = override.some(overItem => overItem && overItem.id === baseItem.id);
          if (!exists) {
            merged.push(baseItem);
          }
        }
      });
      return merged;
    }

    if (!override || typeof override !== 'object' || Array.isArray(override)) return override || base;
    const result = { ...base };
    for (const key of Object.keys(override)) {
      if (
        override[key] !== null &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key]) &&
        typeof base[key] === 'object' &&
        base[key] !== null &&
        !Array.isArray(base[key])
      ) {
        result[key] = deepMerge(base[key], override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  };

  const fetchSiteContent = async () => {
    try {
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('id', 'main-content')
        .single();

      if (error) {
        console.warn('Usando conteúdo local (tabela site_content não encontrada ou vazia).');
      } else if (data && data.data) {
        // Deep merge: mantém defaults locais para chaves que não existem no banco
        setContent(prev => deepMerge(prev, data.data));
      }
    } catch (err) {
      console.error('Erro ao buscar conteúdo:', err);
    }
  };

  const updateContent = (path, value) => {
    console.log(`[EditContext] Solicitando atualização de "${path}"...`);
    
    setContent(prevContent => {
      const newContent = JSON.parse(JSON.stringify(prevContent));
      const keys = path.split('.');
      let current = newContent;
      
      for (let i = 0; i < keys.length - 1; i++) {
        // Se for um índice numérico e o pai for array, mantém como array
        if (!current[keys[i]]) {
          current[keys[i]] = (i < keys.length - 1 && !isNaN(keys[i+1])) ? [] : {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      console.log(`[EditContext] "${path}" atualizado com sucesso no estado global.`);
      return newContent;
    });
  };

  const addItemToList = (path, newItem) => {
    const keys = path.split('.');
    const newContent = JSON.parse(JSON.stringify(content));
    let current = newContent;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    const list = Array.isArray(current[lastKey]) ? current[lastKey] : [];
    current[lastKey] = [...list, { ...newItem, id: Date.now() }];
    setContent(newContent);
  };

  const removeItemFromList = (path, index) => {
    const keys = path.split('.');
    const newContent = JSON.parse(JSON.stringify(content));
    let current = newContent;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) return; // Nada para remover se o caminho não existe
      current = current[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    const list = Array.isArray(current[lastKey]) ? current[lastKey] : [];
    current[lastKey] = list.filter((_, i) => i !== index);
    setContent(newContent);
  };

  const toggleEditing = () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const next = !isEditing;
    setIsEditing(next);
    sessionStorage.setItem('cec_editing', next ? 'true' : 'false');
  };

  const saveChanges = async () => {
    if (!user) {
      alert('Você precisa estar logado para salvar as alterações.');
      return;
    }
    try {
      const { error } = await supabase
        .from('site_content')
        .upsert({ id: 'main-content', data: content });
      if (error) throw error;
      setIsEditing(false);
      sessionStorage.setItem('cec_editing', 'false');
      alert('Site atualizado com sucesso no banco de dados!');
    } catch (err) {
      console.error('Erro ao salvar no banco:', err);
      localStorage.setItem('cec_content_backup', JSON.stringify(content));
      alert('Erro ao salvar no servidor. Uma cópia de emergência foi salva no seu navegador.');
    }
  };

  const discardChanges = () => {
    fetchSiteContent();
    setIsEditing(false);
    sessionStorage.setItem('cec_editing', 'false');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsEditing(false);
    sessionStorage.removeItem('cec_editing');
    window.location.href = '/';
  };

  // Função central para verificar permissões
  const hasPermission = (permissionKey) => {
    if (!user) return false;
    
    // Fallback de emergência para e-mails mestres/webdesigner
    const masterEmails = [
      'webdesigner@cec.com.br',
      'secretaria@cursocec.com.br',
      'piticalyn@cec.com.br'
    ];
    if (masterEmails.includes(user.email?.toLowerCase())) {
      return true;
    }

    // Admin Master sempre tem permissão via role
    if (userProfile?.role === 'admin') return true;
    
    // Verifica permissão específica no JSONB
    return userProfile?.permissions?.[permissionKey] === true;
  };

  // Verificação de Master User (Acesso a configurações do sistema)
  const isMaster = userProfile?.role === 'admin' || hasPermission('manage_team') || hasPermission('can_add_webdesigners');

  return (
    <EditContext.Provider value={{ 
      user,
      userProfile,
      isAdmin: !!user,
      isMaster,
      hasPermission,
      isEditing, 
      content, 
      updateContent, 
      addItemToList,
      removeItemFromList,
      saveChanges, 
      discardChanges,
      toggleEditing,
      logout,
      loading
    }}>
      {children}
    </EditContext.Provider>
  );
};
