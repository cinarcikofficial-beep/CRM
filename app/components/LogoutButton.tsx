'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(false);
    
    // Emin olmak için kullanıcıya soralım
    const confirmLogout = confirm('Çıkış yapmak istediğinize emin misiniz?');
    if (!confirmLogout) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      
      if (res.ok) {
        // Oturumu sıfırlayıp yönlendirme yapıyoruz
        router.push('/register');
        router.refresh();
      } else {
        alert('Çıkış işlemi başarısız oldu.');
      }
    } catch (err) {
      console.error(err);
      alert('Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 bg-zinc-900/80 backdrop-blur border border-zinc-850 hover:border-red-900/40 text-zinc-400 hover:text-red-400 text-xs font-bold rounded-xl transition-all shadow-xl hover:shadow-red-950/10 disabled:opacity-50"
    >
      <span>{loading ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}</span>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={2} 
        stroke="currentColor" 
        className="w-3.5 h-3.5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
      </svg>
    </button>
  );
}