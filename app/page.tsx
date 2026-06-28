// app/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Oturum durumuna göre yönlendirmeyi doğrudan rotalara bağlayalım
  if (user) {
    redirect('/clients');
  }

  redirect('/register');
}