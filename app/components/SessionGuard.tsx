'use client';

import { useEffect } from 'react';

export default function SessionGuard() {
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/auth/logout', new Blob([], { type: 'application/json' }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return null;
}
