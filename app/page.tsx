// app/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();

  // Aktif oturum var mı kontrol et
  const { data: { user } } = await supabase.auth.getUser();

  // Eğer giriş yapmadıysa direkt kayıt sayfasına (Verytech onay paneline) yönlendir
  if (!user) {
    redirect('/register');
  }

  // Eğer giriş yaptıysa ana müşteri yönetim paneline yönlendir
  redirect('/clients');
}