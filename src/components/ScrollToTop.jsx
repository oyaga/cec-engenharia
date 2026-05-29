import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Pequeno atraso para garantir que a renderização da página concluiu
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
