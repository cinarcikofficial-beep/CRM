import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Supabase oturumunu kapatır ve çerezleri temizler
    await supabase.auth.signOut();

    return response;
  } catch (error: any) {
    console.error('Çıkış hatası:', error.message);
    return NextResponse.json({ error: 'Çıkış yapılırken bir sorun oluştu.' }, { status: 500 });
  }
}