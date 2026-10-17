import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import defaultLogo from '../assets/logo.png';

export function useSystemLogo() {
  const [logoUrl, setLogoUrl] = useState(() => {
    try {
      return localStorage.getItem('archivio_public_system_logo') || defaultLogo;
    } catch (_) {
      return defaultLogo;
    }
  });
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'institution_info'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.logoUrl && typeof data.logoUrl === 'string' && data.logoUrl.trim().length > 0) {
          setLogoUrl(data.logoUrl);
          setIsCustom(true);
          try {
            localStorage.setItem('archivio_public_system_logo', data.logoUrl);
          } catch (_) {}
          return;
        }
      }
      setLogoUrl(defaultLogo);
      setIsCustom(false);
      try {
        localStorage.removeItem('archivio_public_system_logo');
      } catch (_) {}
    }, (err) => {
      console.warn('Public system logo listener notice:', err.message);
    });

    return () => unsub();
  }, []);

  return { logoUrl, isCustom, defaultLogo };
}

export default useSystemLogo;
