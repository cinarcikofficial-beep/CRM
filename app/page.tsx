// app/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'; // Server client kullandığından emin ol

export default async function HomePage() {
  const supabase = await createClient();

  // Aktif kullanıcı oturumunu kontrol et
  const { data: { user } } = await supabase.auth.getUser();

  // Giriş yapmamışsa login sayfasına, yapmışsa panel sayfasına yönlendir
  if (!user) {
    redirect('/login');
  } else {
    redirect('/clients');
  }
}