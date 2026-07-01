'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const AuthContext = createContext<{ user: any; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // 1. DUVAR: Supabase Oturumunu Sadece 1 Kere (Mount Anında) Bağlıyoruz
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Oturum alınırken hata:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Kullanıcı giriş/çıkış yaptığında hafızayı günceller (Asla yönlendirme yapmaz, sadece veriyi tutar)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Boş array: Sayfa değişse de bu dinleyici asla bozulup baştan kurulmaz!

  // 2. DUVAR: Yönlendirme Yönetimi (Sadece Hafıza Stabil Olduğunda Çalışır)
  useEffect(() => {
    // Supabase henüz yükleniyorsa hiçbir şey yapma, bekle
    if (loading) return; 

    if (!user && pathname !== '/register') {
      // Giriş yoksa ve /register dışında bir yerdeyse kilitler
      router.replace('/register');
    } else if (user && pathname === '/register') {
      // Giriş varsa ve hala giriş ekranındaysa içeri fırlatır
      router.replace('/clients');
    }
  }, [user, loading, pathname, router]);

  // Giriş ekranı dışındaki sayfalarda yükleniyor barajı kuruyoruz
  if (loading && pathname !== '/register') {
    return (
      <div className="min-h-screen bg-black text-zinc-500 font-mono text-xs flex items-center justify-center">
        Sistem hafızası doğrulanıyor...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);