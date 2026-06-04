import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Menu, X, Camera, Facebook, Linkedin, Plus, Trash2, GraduationCap } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import EditableText from './EditableText';
import EditableSlot from './EditableSlot';
import EditableImage from './EditableImage';

const Navbar = () => {
  const { content, isEditing, updateContent } = useEdit();
  const navbar = content.navbar || {};
  const navbarLinks = navbar.links || [];
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const addLink = () => {
    const newLinks = [...navbarLinks, 'Nova Página'];
    updateContent('navbar.links', newLinks);
  };

  const removeLink = (index) => {
    const newLinks = navbarLinks.filter((_, i) => i !== index);
    updateContent('navbar.links', newLinks);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="glass sticky-nav">
        <div className="container nav-content">
          <div className="logo-container-liquid">
            <EditableImage 
              path="navbar.logo_img" 
              initialValue={navbar.logo_img} 
              className="logo-img-main"
              alt="CEC Logo"
            />
          </div>
          
          <ul className="nav-links">
            {navbarLinks.map((link, index) => {
              const linkStr = link || '';
              const isSpecial = linkStr.toLowerCase().includes('curso') || linkStr.toLowerCase() === 'home';
              const defaultHref = linkStr.toLowerCase().includes('curso') ? '/#cursos' : (linkStr === 'Home' ? '/' : `/${linkStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`);
              const href = content.navbar?.link_urls?.[index] || defaultHref;
              
              return (
                <li key={index} style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Link 
                      to={href}
                      onClick={(e) => { 
                        if (isEditing) {
                          e.preventDefault();
                          return;
                        }
                        // Se for a Home ou a mesma página atual
                        if (href === '/' || href === '#') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        // Se for um link de âncora na mesma página
                        else if (href.startsWith('/#') || href.startsWith('#')) {
                          const targetId = href.split('#')[1];
                          const el = document.getElementById(targetId);
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: 'smooth' });
                            // Atualiza a URL sem recarregar
                            window.history.pushState(null, '', href);
                          }
                        }
                        // Se for exatamente o mesmo caminho da página atual
                        else if (href === window.location.pathname) {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      onDoubleClick={() => { 
                        if (isEditing) {
                          window.location.href = href;
                        }
                      }}
                    >
                      <EditableText path={`navbar.links.${index}`} initialValue={link} />
                    </Link>
                    {isEditing && (
                      <button onClick={() => removeLink(index)} title="Remover este link"
                        style={{ marginLeft:'4px', background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:'18px', height:'18px', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                      >×</button>
                    )}
                  </div>
                  {isEditing && (
                    <input
                      type="text"
                      defaultValue={href}
                      placeholder="URL da página"
                      onBlur={e => {
                        const newUrls = [...(content.navbar?.link_urls || [])];
                        newUrls[index] = e.target.value;
                        updateContent('navbar.link_urls', newUrls);
                      }}
                      style={{ 
                        position: 'absolute', 
                        top: '115%', 
                        left: '50%', 
                        transform: 'translateX(-50%)', 
                        fontSize:'0.6rem', 
                        padding:'2px 4px', 
                        borderRadius:'4px', 
                        border:'1px solid #10b981', 
                        width:'80px', 
                        textAlign:'center', 
                        background:'#0f172a', 
                        color:'#10b981', 
                        zIndex: 100 
                      }}
                    />
                  )}
                </li>
              );
            })}

            {isEditing && (
              <li>
                <button
                  onClick={addLink}
                  title="Adicionar nova página"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 12px', borderRadius: '20px',
                    background: '#10b981', color: 'white', border: 'none',
                    fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer'
                  }}
                >+ Página</button>
              </li>
            )}
          </ul>

          <div className="nav-actions">
            {/* Redes Sociais */}
            <div className="social-links-nav">
              {Object.entries(navbar.social || {}).map(([platform, url]) => {
                const icons = { 
                  instagram: <Camera size={18}/>, 
                  facebook: <Facebook size={18}/>, 
                  linkedin: <Linkedin size={18}/>,
                  tiktok: (
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="16" width="16" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                      <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"></path>
                    </svg>
                  )
                };
                const icon = icons[platform] || <span style={{fontSize:'11px',fontWeight:'700'}}>{platform[0].toUpperCase()}</span>;
                return (
                  <div key={platform} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="social-btn" title={platform}>
                      {icon}
                    </a>
                    {isEditing && (
                      <input
                        type="text"
                        defaultValue={url}
                        onBlur={e => updateContent(`navbar.social.${platform}`, e.target.value)}
                        placeholder={`URL ${platform}`}
                        style={{
                          fontSize:'0.6rem', padding:'2px 4px', borderRadius:'4px',
                          border:'1px solid #10b981', width:'80px', textAlign:'center',
                          background:'#0f172a', color:'#10b981'
                        }}
                      />
                    )}
                    {isEditing && (
                      <button
                        onClick={() => {
                          const s = {...navbar.social}; delete s[platform];
                          updateContent('navbar.social', s);
                        }}
                        style={{ position:'absolute', top:'-6px', right:'-6px', background:'#ef4444', color:'white', border:'none', borderRadius:'50%', width:'14px', height:'14px', fontSize:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                      >×</button>
                    )}
                  </div>
                );
              })}
              {isEditing && (
                <button
                  onClick={() => {
                    const nome = prompt('Nome da rede (ex: youtube, tiktok, twitter):');
                    if (nome) updateContent(`navbar.social.${nome.toLowerCase()}`, 'https://');
                  }}
                  className="social-btn"
                  title="Adicionar rede social"
                  style={{ background: '#10b98133', color: '#10b981', border: '1px dashed #10b981' }}
                ><Plus size={14}/></button>
              )}
            </div>

            <Link to="/login" className="btn-login" title="Área do Aluno">
              <User size={18} />
              <span>Acesso Aluno</span>
            </Link>

            <Link to="/login" className="btn-login instructor-variant" title="Área do Instrutor">
              <GraduationCap size={18} />
              <span>Acesso Instrutor</span>
            </Link>
            <Link 
              to="/#cursos" 
              className="btn-site-primary btn-nav-cta"
              onClick={() => {
                if (window.location.pathname === '/') {
                  const el = document.getElementById('cursos');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <EditableText 
                path="navbar.actions.cta" 
                initialValue={navbar.actions?.cta} 
              />
            </Link>
            <button className="mobile-menu-btn" onClick={toggleMenu}>
              <Menu size={28} />
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <div className={`drawer-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>
        <div className={`drawer ${isMenuOpen ? 'open' : ''}`}>
          <div className="drawer-header">
            <div className="drawer-logo">
               <span style={{ color: 'var(--primary)', fontWeight: '800' }}>CEC</span> Engenharia
            </div>
            <button className="close-btn" onClick={toggleMenu}>
              <X size={28} />
            </button>
          </div>
          
          <ul className="drawer-links">
            {navbarLinks.map((link, index) => {
              const linkStr = link || '';
              const linkUrl = content.navbar?.link_urls?.[index];
              const safeLinkLower = linkStr.toLowerCase();
              const normalizedHref = linkStr === 'Home' ? '/' : `/${linkStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`;

              return (
                <li key={index}>
                  {safeLinkLower === 'cursos' ? (
                    <a 
                      href="/#cursos" 
                      onClick={(e) => {
                        toggleMenu();
                        const el = document.getElementById('cursos');
                        if (el) {
                          e.preventDefault();
                          el.scrollIntoView({ behavior: 'smooth' });
                          window.history.pushState(null, '', '/#cursos');
                        }
                      }}
                    >
                      {linkStr}
                    </a>
                  ) : (
                    <Link 
                      to={linkUrl || normalizedHref} 
                      onClick={toggleMenu}
                    >
                      {linkStr}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="drawer-portals-mobile">
            <Link to="/login" onClick={toggleMenu}>Portal do Aluno</Link>
            <Link to="/login" onClick={toggleMenu}>Portal do Instrutor</Link>
          </div>

          <div className="drawer-footer">
            <Link to="/login" className="drawer-btn-login" onClick={toggleMenu}>
              <User size={20} />
              Acesso Aluno
            </Link>
            <Link to="/login" className="drawer-btn-login instructor-variant" onClick={toggleMenu}>
              <GraduationCap size={20} />
              Acesso Instrutor
            </Link>
            <Link to="/#cursos" className="btn-site-primary drawer-cta" onClick={toggleMenu}>
              {navbar.actions?.cta || 'Matricular-se'}
            </Link>
          </div>
        </div>

      <style>{`
        .social-links-nav {
          display: flex;
          gap: 0.75rem;
          margin-right: 1rem;
          padding-right: 1.5rem;
          border-right: 1px solid rgba(0, 0, 0, 0.1);
          margin-left: 0.5rem;
        }
        .social-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(0, 75, 73, 0.05);
          color: var(--primary);
          transition: all 0.3s ease;
        }
        .social-btn:hover {
          background: var(--primary);
          color: white;
          transform: translateY(-2px);
        }
        .top-bar {
          background-color: var(--primary-dark);
          color: white;
          font-size: 0.8rem;
          padding: 0.5rem 0;
        }
        .top-bar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .top-address {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .top-address:hover {
          color: white;
          text-decoration: underline;
        }
        .top-portals {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .portal-link {
          color: white;
          font-weight: 600;
        }
        .portal-link:hover {
          color: var(--accent);
        }
        .separator {
          color: rgba(255, 255, 255, 0.3);
        }
        .btn-nav-cta {
          padding: 0.6rem 1.25rem;
          font-size: 0.85rem;
        }
        .sticky-nav {
          position: sticky;
          top: 0;
          z-index: 1000;
          height: 90px;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }
        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          gap: 2rem;
        }
        
        .logo-container-liquid {
          position: relative;
          padding: 8px;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(15px) saturate(160%);
          -webkit-backdrop-filter: blur(15px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1),
                    inset 0 0 10px rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 200px;
          height: 85px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .logo-container-liquid .editable-image-container,
        .logo-container-liquid .img-wrapper-fluid {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible !important;
        }

        .logo-container-liquid img {
          max-width: 100%;
          max-height: 100%;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }
        
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .nav-links a {
          font-weight: 500;
          color: var(--text-main);
          font-size: 0.95rem;
          white-space: nowrap !important;
          transition: color 0.2s ease;
        }
        .nav-links a:hover {
          color: var(--primary);
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .btn-login {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--primary);
        }
        .btn-login.instructor-variant {
          color: var(--accent);
        }
        .btn-login.instructor-variant:hover {
          color: var(--accent-hover);
        }
        .mobile-menu-btn {
          display: none;
          color: var(--primary);
          background: none;
          border: none;
          padding: 5px;
          cursor: pointer;
        }

        /* Drawer Styles */
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 1999;
        }
        .drawer-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        .drawer {
          position: fixed;
          top: 0;
          right: -300px;
          width: 300px;
          height: 100%;
          background: white;
          z-index: 2000;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          transition: all 0.4s cubic-bezier(0.82, 0.085, 0.395, 0.895);
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
        }
        .drawer.open {
          right: 0;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1.5rem;
        }
        .drawer-logo {
          font-size: 1.2rem;
          font-weight: 700;
        }
        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
        }

        .drawer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .drawer-links a {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .drawer-portals-mobile {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
        }
        .drawer-portals-mobile a {
          color: var(--primary);
          font-weight: 700;
          font-size: 1.1rem;
        }

        .drawer-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-top: 2rem;
          border-top: 1px solid #f1f5f9;
        }
        .drawer-btn-login {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          border-radius: 12px;
          background: #f8fafc;
          color: var(--primary);
          font-weight: 700;
        }
        .drawer-btn-login.instructor-variant {
          background: #f0fdfa;
          color: var(--accent);
        }
        .drawer-cta {
          padding: 1rem;
          text-align: center;
          border-radius: 12px;
        }

        @media (min-width: 969px) and (max-width: 1280px) {
          .nav-links {
            gap: 1.25rem;
          }
          .nav-links a {
            font-size: 0.9rem;
          }
          .nav-actions {
            gap: 0.75rem;
          }
          .social-links-nav {
            gap: 0.5rem;
            margin-right: 0.5rem;
            padding-right: 0.75rem;
            margin-left: 0;
          }
          .btn-login span {
            display: none;
          }
          .btn-login {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(0, 75, 73, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: all 0.3s ease;
          }
          .btn-login:hover {
            background: var(--primary);
            color: white !important;
            transform: translateY(-2px);
          }
          .btn-login.instructor-variant {
            background: rgba(20, 184, 166, 0.08);
          }
          .btn-login.instructor-variant:hover {
            background: var(--accent);
            color: white !important;
          }
        }

        @media (max-width: 968px) {
          .nav-links, .social-links-nav, .btn-login, .btn-nav-cta, .top-bar {
            display: none;
          }
          .mobile-menu-btn {
            display: block;
          }
          .logo-container-liquid {
            width: 130px;
            height: 55px;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
