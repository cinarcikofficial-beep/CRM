import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies() // Next.js 15+ için await ekledik
    const { email, password } = await request.json()

    // 1. ADIM: Boş bir Next.js response nesnesi oluşturuyoruz
    const response = NextResponse.json({ success: true })

    // 2. ADIM: Çerez yazma yetkisi olan Supabase istemcisini kuruyoruz
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Giriş başarılı olursa çerezleri hem cookieStore'a hem de response'a basar
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options })
            })
          },
        },
      }
    )

    // 3. ADIM: Giriş işlemini tetikliyoruz
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // 🔐 EN KRİTİK NOKTA: Girişle birlikte oluşan yeni çerezleri response nesnesine de ekliyoruz
    // Böylece tarayıcı bu çerezleri hemen hafızasına kaydeder.
    return response

  } catch (err) {
    return NextResponse.json({ error: 'Sunucu hatası oluştu' }, { status: 500 })
  }
}