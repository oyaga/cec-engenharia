import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Camera, Facebook, Linkedin, MapPin, Plus, Trash2 } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import { supabase } from '../../lib/supabase';
import EditableText from './EditableText';
import MapWidget from './MapWidget';

const Footer = () => {
  const { content, isEditing, updateContent } = useEdit();
  const { footer, navbar } = content;

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterPhone, setNewsletterPhone] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState(null); // 'sending', 'success', 'error'
  const [validationError, setValidationError] = useState('');

  const handleEmailChange = (val) => {
    setNewsletterEmail(val);
    if (val.trim() || newsletterPhone.trim()) setValidationError('');
  };

  const handlePhoneChange = (val) => {
    setNewsletterPhone(val);
    if (val.trim() || newsletterEmail.trim()) setValidationError('');
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim() && !newsletterPhone.trim()) {
      setValidationError('Por favor, preencha o e-mail ou o WhatsApp.');
      return;
    }
    setValidationError('');
    setNewsletterStatus('sending');
    try {
      const emailValue = newsletterEmail.trim() ? newsletterEmail.trim() : null;
      const phoneValue = newsletterPhone.trim() ? newsletterPhone.trim() : null;

      const { error } = await supabase
        .from('leads')
        .upsert([{
          name: 'Assinante Newsletter',
          phone: phoneValue,
          email: emailValue,
          course_interest: 'Newsletter',
          message: `E-mail inscrito na newsletter: ${emailValue || 'Não informado'} | WhatsApp: ${phoneValue || 'Não informado'}`,
          status: 'novo'
        }], { onConflict: 'phone' });
      if (error) throw error;
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setNewsletterPhone('');
      setTimeout(() => setNewsletterStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setNewsletterStatus('error');
      setTimeout(() => setNewsletterStatus(null), 3000);
    }
  };

  const links_rapidos = footer.links_rapidos || [];
  const links_institucional = footer.links_institucional || [];

  const handleAddLink = (key) => {
    const current = footer[key] || [];
    updateContent(`footer.${key}`, [...current, { label: 'Novo Link', url: '/' }]);
  };

  const handleRemoveLink = (key, index) => {
    const current = [...(footer[key] || [])];
    current.splice(index, 1);
    updateContent(`footer.${key}`, current);
  };

  const handleLinkChange = (key, index, field, value) => {
    const current = [...(footer[key] || [])];
    current[index] = { ...current[index], [field]: value };
    updateContent(`footer.${key}`, current);
  };

  return (
    <footer className="footer bg-soft" id="contato">
      <div className="container footer-content">

        {/* Marca */}
        <div className="footer-brand">
          <div className="logo-footer">
            <span className="logo-text">
              <EditableText path="navbar.logo" initialValue={navbar.logo} />
            </span>
            <span className="logo-subtext">
              <EditableText path="navbar.sublogo" initialValue={navbar.sublogo} />
            </span>
          </div>
          <div className="brand-desc">
            <EditableText path="footer.brand_desc" initialValue={footer.brand_desc} tagName="p" />
          </div>
          <div className="social-links">
            {isEditing ? (
              <div className="social-edit">
                <input value={navbar.social?.instagram || ''} onChange={e => updateContent('navbar.social.instagram', e.target.value)} placeholder="URL Instagram" />
                <input value={navbar.social?.facebook || ''} onChange={e => updateContent('navbar.social.facebook', e.target.value)} placeholder="URL Facebook" />
                <input value={navbar.social?.linkedin || ''} onChange={e => updateContent('navbar.social.linkedin', e.target.value)} placeholder="URL LinkedIn" />
                <input value={navbar.social?.tiktok || ''} onChange={e => updateContent('navbar.social.tiktok', e.target.value)} placeholder="URL TikTok" />
              </div>
            ) : (
              <>
                {navbar.social?.instagram && <a href={navbar.social.instagram} target="_blank" rel="noopener noreferrer" title="Instagram"><Camera size={20} /></a>}
                {navbar.social?.facebook && <a href={navbar.social.facebook} target="_blank" rel="noopener noreferrer" title="Facebook"><Facebook size={20} /></a>}
                {navbar.social?.linkedin && <a href={navbar.social.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn"><Linkedin size={20} /></a>}
                {navbar.social?.tiktok && (
                  <a href={navbar.social.tiktok} target="_blank" rel="noopener noreferrer" title="TikTok">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="18" width="18" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                      <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"></path>
                    </svg>
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Links Rápidos */}
        <div className="footer-links">
          <div className="footer-col-header">
            <h4>Links Rápidos</h4>
            {isEditing && (
              <button className="btn-add-link" onClick={() => handleAddLink('links_rapidos')} title="Adicionar link">
                <Plus size={14} />
              </button>
            )}
          </div>
          <ul>
            {(footer.links_rapidos || []).map((item, index) => (
              <li key={index} className={isEditing ? 'editable-link-item' : ''}>
                {isEditing ? (
                  <div className="link-editor">
                    <input
                      className="link-input-label"
                      value={item.label}
                      onChange={e => handleLinkChange('links_rapidos', index, 'label', e.target.value)}
                      placeholder="Nome"
                    />
                    <input
                      className="link-input-url"
                      value={item.url}
                      onChange={e => handleLinkChange('links_rapidos', index, 'url', e.target.value)}
                      placeholder="URL"
                    />
                    <button className="btn-remove-link" onClick={() => handleRemoveLink('links_rapidos', index)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <Link 
                    to={item.url}
                    onClick={(e) => {
                      if (item.url === '/' || item.url === '#') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else if (item.url.startsWith('/#') || item.url.startsWith('#')) {
                        const targetId = item.url.split('#')[1];
                        const el = document.getElementById(targetId);
                        if (el) {
                          e.preventDefault();
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      } else if (item.url === window.location.pathname) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {isEditing && (
            <button 
              className="btn-add-link-premium" 
              onClick={() => handleAddLink('links_rapidos')}
            >
              <Plus size={14} />
              <span>Adicionar Link Rápido</span>
            </button>
          )}
        </div>
        {/* Institucional */}
        <div className="footer-legal">
          <div className="footer-col-header">
            <h4>Institucional</h4>
            {isEditing && (
              <button className="btn-add-link" onClick={() => handleAddLink('links_institucional')} title="Adicionar link">
                <Plus size={14} />
              </button>
            )}
          </div>
          <ul>
            {links_institucional.map((item, index) => (
              <li key={index} className={isEditing ? 'editable-link-item' : ''}>
                {isEditing ? (
                  <div className="link-editor">
                    <input
                      className="link-input-label"
                      value={item.label}
                      onChange={e => handleLinkChange('links_institucional', index, 'label', e.target.value)}
                      placeholder="Nome"
                    />
                    <input
                      className="link-input-url"
                      value={item.url}
                      onChange={e => handleLinkChange('links_institucional', index, 'url', e.target.value)}
                      placeholder="URL (/pagina)"
                    />
                    <button className="btn-remove-link" onClick={() => handleRemoveLink('links_institucional', index)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <Link 
                    to={item.url}
                    onClick={(e) => {
                      if (item.url === '/' || item.url === '#') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else if (item.url.startsWith('/#') || item.url.startsWith('#')) {
                        const targetId = item.url.split('#')[1];
                        const el = document.getElementById(targetId);
                        if (el) {
                          e.preventDefault();
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      } else if (item.url === window.location.pathname) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {isEditing && (
            <button 
              className="btn-add-link-premium" 
              onClick={() => handleAddLink('links_institucional')}
            >
              <Plus size={14} />
              <span>Adicionar Link Institucional</span>
            </button>
          )}
        </div>

        {/* Newsletter + Mapa */}
        <div className="footer-newsletter">
          <h4>
            <EditableText path="footer.newsletter.title" initialValue={footer.newsletter?.title} />
          </h4>
          <div className="newsletter-desc">
            <EditableText path="footer.newsletter.text" initialValue={footer.newsletter?.text} tagName="p" />
          </div>
          <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
            <div className="newsletter-fields" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <input 
                type="email" 
                value={newsletterEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="E-mail (ou preencha o WhatsApp)" 
                disabled={newsletterStatus === 'sending'}
                style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
              />
              <input 
                type="tel" 
                value={newsletterPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="WhatsApp (ou preencha o e-mail)" 
                disabled={newsletterStatus === 'sending'}
                style={{ padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
              />
              <button 
                type="submit" 
                className="btn-send" 
                disabled={newsletterStatus === 'sending'} 
                style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.65rem 1.25rem', height: '44px', width: '100%', marginTop: '0.25rem', boxSizing: 'border-box' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{newsletterStatus === 'sending' ? 'Enviando...' : 'Inscrever-se na Newsletter'}</span>
                <Mail size={16} />
              </button>
            </div>
            {validationError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'left', margin: '0.5rem 0 0 0' }}>⚠️ {validationError}</p>}
            {newsletterStatus === 'success' && <p style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'left', margin: '0.5rem 0 0 0' }}>✅ Inscrito com sucesso!</p>}
            {newsletterStatus === 'error' && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'left', margin: '0.5rem 0 0 0' }}>❌ Erro ao inscrever. Tente novamente.</p>}
          </form>

          {/* Mini Mapa */}
          <div className="map-section">
            <MapWidget />
          </div>
        </div>
      </div>

      {/* Rodapé inferior */}
      <div className="footer-bottom">
        <div className="container bottom-content">
          <EditableText path="footer.copyright" initialValue={footer.copyright} tagName="p" />
          <div className="bottom-info">
            <div className="info-item">
              <MapPin size={14} />
              <EditableText path="footer.address" initialValue={footer.address || 'Rio de Janeiro, RJ'} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .footer { padding-top: 5rem; border-top: 1px solid var(--border); }
        .footer-content {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1.5fr;
          gap: 3rem;
          margin-bottom: 4rem;
        }
        .logo-footer { display: flex; flex-direction: column; margin-bottom: 1rem; }
        .logo-text { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
        .logo-subtext { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
        .social-links { display: flex; gap: 1rem; margin-top: 1rem; }
        .social-links a {
          color: var(--primary); background: white; width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; border: 1px solid var(--border); transition: all 0.2s;
        }
        .social-links a:hover { background: var(--primary); color: white; }
        .social-edit { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
        .social-edit input { padding: 0.4rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.8rem; }

        .footer-col-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
        .footer-col-header h4 { margin: 0; font-size: 1rem; }
        .btn-add-link {
          background: var(--primary); color: white; border: none;
          width: 22px; height: 22px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }

        .footer ul { list-style: none; padding: 0; margin: 0; }
        .footer ul li { margin-bottom: 0.6rem; }
        .footer ul li a { color: var(--text-muted); font-size: 0.9rem; transition: color 0.2s; }
        .footer ul li a:hover { color: var(--primary); }

        .admin-links li a { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; transition: color 0.2s; }
        .admin-links li a:hover { color: var(--primary); }
        .admin-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; display: inline-block; }

        /* Editable link items */
        .editable-link-item { margin-bottom: 0.75rem; }
        .link-editor {
          display: flex; gap: 0.4rem; align-items: center;
          background: #f8fafc; border-radius: 8px; padding: 0.4rem;
          border: 1px solid #e2e8f0;
        }
        .link-input-label { flex: 1; min-width: 0; border: none; background: transparent; font-size: 0.8rem; outline: none; }
        .link-input-url { flex: 1.5; min-width: 0; border: none; background: transparent; font-size: 0.75rem; color: var(--text-muted); outline: none; }
        .btn-remove-link {
          background: #fef2f2; border: none; color: #ef4444;
          width: 22px; height: 22px; border-radius: 4px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .btn-add-link-premium {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0, 75, 73, 0.08) !important;
          color: var(--primary) !important;
          border: 1px dashed var(--primary) !important;
          padding: 0.5rem 0.75rem !important;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 0.75rem;
          width: 100%;
          justify-content: center;
        }
        .btn-add-link-premium:hover {
          background: var(--primary) !important;
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 75, 73, 0.15);
        }

        .newsletter-input { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .newsletter-input input { flex: 1; padding: 0.65rem 0.9rem; border-radius: 10px; border: 1px solid var(--border); outline: none; font-size: 0.9rem; }
        .btn-send { background: var(--primary); color: white; width: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; flex-shrink: 0; }
        .map-section { margin-top: 1.5rem; }

        .footer-bottom { padding: 1.5rem 0; border-top: 1px solid var(--border); background: white; }
        .bottom-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; color: var(--text-muted); font-size: 0.82rem; }
        .bottom-info { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .info-item { display: flex; align-items: center; gap: 0.4rem; }

        @media (max-width: 1024px) {
          .footer-content { grid-template-columns: 1fr 1fr; gap: 2.5rem; }
        }
        @media (max-width: 600px) {
          .footer-content { grid-template-columns: 1fr; gap: 2rem; }
          .bottom-content { flex-direction: column; text-align: center; }
          .bottom-info { justify-content: center; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
