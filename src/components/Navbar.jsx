import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Menu, X, Camera, Share2 } from 'lucide-react';
import { useEdit } from '../context/EditContext';
import EditableText from './EditableText';
import EditableSlot from './EditableSlot';

const Navbar = () => {
  const { content } = useEdit();
  const { navbar } = content;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="glass sticky-nav">
      <div className="container nav-content">
        <div className="logo-container-liquid">
          <EditableSlot 
            path="navbar.logo_img" 
            initialValue={navbar.logo_img} 
            className="logo-img-main"
            tagName="h1"
            style={{ 
              fontSize: '1.5rem', 
              fontWeight: '800', 
              color: 'var(--primary)',
              margin: '0',
              textAlign: 'center',
              width: '100%'
            }}
          />
        </div>
        
        <ul className="nav-links">
          {navbar.links.map((link, index) => (
            <li key={index}>
              <Link to={link === 'Home' ? '/' : `/${link.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`}>
                <EditableText 
                  path={`navbar.links.${index}`} 
                  initialValue={link} 
                />
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          {/* Redes Sociais Dinâmicas */}
          <div className="social-links-nav">
            <a href={navbar.social?.instagram} target="_blank" rel="noopener noreferrer" className="social-btn" title="Instagram">
              <Camera size={18} />
            </a>
            <a href={navbar.social?.linkedin} target="_blank" rel="noopener noreferrer" className="social-btn" title="LinkedIn">
              <Share2 size={18} />
            </a>
          </div>

          <Link to="/login" className="btn-login">
            <User size={18} />
            <EditableText 
              path="navbar.actions.login" 
              initialValue={navbar.actions.login} 
            />
          </Link>
          <Link to="/matricula" className="btn-primary btn-nav-cta">
            <EditableText 
              path="navbar.actions.cta" 
              initialValue={navbar.actions.cta} 
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
          {navbar.links.map((link, index) => (
            <li key={index}>
              <Link to={link === 'Home' ? '/' : `/${link.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`} onClick={toggleMenu}>
                {link}
              </Link>
            </li>
          ))}
        </ul>

        <div className="drawer-footer">
          <Link to="/login" className="drawer-btn-login" onClick={toggleMenu}>
            <User size={20} />
            {navbar.actions.login}
          </Link>
          <Link to="/matricula" className="btn-primary drawer-cta" onClick={toggleMenu}>
            {navbar.actions.cta}
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
          width: 160px;
          height: 65px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .nav-links {
          display: flex;
          gap: 2rem;
        }
        .nav-links a {
          font-weight: 500;
          color: var(--text-main);
          font-size: 0.95rem;
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
        .drawer-cta {
          padding: 1rem;
          text-align: center;
          border-radius: 12px;
        }

        @media (max-width: 968px) {
          .nav-links, .social-links-nav, .btn-login, .btn-nav-cta {
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
