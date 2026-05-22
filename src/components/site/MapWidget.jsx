import { useState } from 'react';
import { MapPin, Navigation, ExternalLink, X } from 'lucide-react';
import { useEdit } from '../../context/EditContext';
import EditableText from './EditableText';

/**
 * MapWidget — mini mapa clicável com embed Google Maps.
 * Clique no mapa → abre Google Maps / Waze para navegar até a CEC.
 */
const MapWidget = () => {
  const { content, isEditing } = useEdit();
  const address = content?.contact_page?.address || 'Av. Brasil, Rio de Janeiro, RJ';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const wazeUrl  = `https://waze.com/ul?q=${encodeURIComponent(address)}`;

  const [showModal, setShowModal] = useState(false);

  // Embed do Google Maps (sem chave de API, usa a modalidade /maps/embed)
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=15`;

  return (
    <>
      <div className="map-widget-wrapper">
        {/* Mini mapa clicável */}
        <div className="map-preview" onClick={() => setShowModal(true)} title="Clique para ver no mapa">
          <iframe
            title="Localização CEC"
            src={embedSrc}
            className="map-iframe"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          {/* Overlay com botão de ação */}
          <div className="map-overlay">
            <div className="map-pill">
              <MapPin size={16} />
              <span>Ver localização</span>
              <ExternalLink size={14} />
            </div>
          </div>
        </div>

        {/* Endereço editável */}
        <div className="map-address">
          <MapPin size={16} className="pin-icon" />
          {isEditing ? (
            <EditableText
              path="contact_page.address"
              initialValue={address}
              tagName="span"
            />
          ) : (
            <span>{address}</span>
          )}
        </div>
      </div>

      {/* Modal com mapa maior e botões de navegação */}
      {showModal && (
        <div className="map-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="map-modal" onClick={e => e.stopPropagation()}>
            <div className="map-modal-header">
              <div className="map-modal-title">
                <MapPin size={20} />
                <div>
                  <h3>Nossa Localização</h3>
                  <p>{address}</p>
                </div>
              </div>
              <button className="map-close-btn" onClick={() => setShowModal(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="map-modal-embed">
              <iframe
                title="Mapa CEC"
                src={embedSrc}
                className="map-iframe-modal"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="map-modal-actions">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-maps google">
                <Navigation size={18} />
                Google Maps
              </a>
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="btn-maps waze">
                <Navigation size={18} />
                Waze
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .map-widget-wrapper { width: 100%; }

        /* Mini mapa */
        .map-preview {
          position: relative;
          width: 100%;
          height: 180px;
          border-radius: 1rem;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid var(--border);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .map-preview:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }
        .map-iframe {
          width: 100%; height: 100%; border: none; pointer-events: none;
          display: block;
        }
        .map-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: flex-end; justify-content: center;
          padding-bottom: 1rem;
          background: linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%);
        }
        .map-pill {
          background: white; color: var(--primary);
          padding: 0.4rem 1rem; border-radius: 20px;
          display: flex; align-items: center; gap: 0.5rem;
          font-weight: 700; font-size: 0.8rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        /* Endereço */
        .map-address {
          display: flex; align-items: center; gap: 0.5rem;
          margin-top: 0.75rem; color: var(--text-muted); font-size: 0.85rem;
          font-weight: 500;
        }
        .pin-icon { color: var(--primary); flex-shrink: 0; }

        /* Modal */
        .map-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
          z-index: 20000; display: flex;
          align-items: center; justify-content: center; padding: 1rem;
        }
        .map-modal {
          background: white; border-radius: 1.5rem;
          width: 100%; max-width: 600px;
          overflow: hidden;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
          animation: mapSlide 0.3s ease-out;
        }
        @keyframes mapSlide {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .map-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .map-modal-title { display: flex; align-items: center; gap: 0.75rem; color: var(--primary); }
        .map-modal-title h3 { margin: 0; font-size: 1rem; color: var(--primary-dark); }
        .map-modal-title p  { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
        .map-close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); }
        .map-modal-embed { width: 100%; height: 320px; }
        .map-iframe-modal { width: 100%; height: 100%; border: none; display: block; }
        .map-modal-actions {
          display: flex; gap: 1rem; padding: 1.25rem 1.5rem;
          border-top: 1px solid var(--border);
        }
        .btn-maps {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; padding: 0.75rem;
          border-radius: 10px; font-weight: 700; font-size: 0.9rem;
          text-decoration: none; transition: all 0.2s;
        }
        .btn-maps.google { background: var(--primary); color: white; }
        .btn-maps.waze   { background: #05c8f7; color: #1a1a2e; }
        .btn-maps:hover  { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }

        @media (max-width: 480px) {
          .map-modal-actions { flex-direction: column; }
          .map-modal-embed { height: 240px; }
        }
      `}</style>
    </>
  );
};

export default MapWidget;
