import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 1. ADIM: Next.js iç mekanizmalarını, API'leri ve statik dosyaları hemen serbest bırak
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    request.headers.has('next-action') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 2. ADIM: Ana Supabase cevap nesnesini oluştur
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // 3. ADIM: Supabase istemcisini çerez yönetimiyle başlat
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set({ name, value, ...options })
            )
          },
        },
      }
    )

    // 4. ADIM: Kullanıcı oturumunu sunucuda doğrula
    const { data: { user } } = await supabase.auth.getUser()
    
    // 🖥️ VS CODE TERMİNALİNDE GÖRECEĞİN LOG (Canlı takip için)
    console.log(`[CRM AKTİF KONTROL] Sayfa: ${pathname} | Durum: ${user ? 'GİRİŞ YAPMIŞ (' + user.email + ')' : 'GİRİŞ YOK'}`)

    const isRegisterPage = pathname === '/register'

    // DURUM 1: Kullanıcı giriş yapmadıysa ve korumalı alandaysa -> Giriş ekranına zorla
    if (!user && !isRegisterPage) {
      console.log(`[CRM ENGEL] 🚫 Yetkisiz Giriş! ${pathname} -> /register sayfasına yönlendiriliyor...`)
      const url = request.nextUrl.clone()
      url.pathname = '/register'
      
      const redirectResponse = NextResponse.redirect(url)
      // 🔐 KRİTİK NOKTA: Çerezleri yönlendirme isteğine kopyalıyoruz ki havada kaybolmasın!
      supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value, c))
      return redirectResponse
    }

    // DURUM 2: Kullanıcı zaten giriş yaptıysa ve hala giriş sayfasındaysa -> İçeri fırlat
    if (user && isRegisterPage) {
      console.log(`[CRM GEÇİŞ] ✅ Zaten giriş yapılmış! /register -> /clients alanına aktarılıyor...`)
      const url = request.nextUrl.clone()
      url.pathname = '/clients'
      
      const redirectResponse = NextResponse.redirect(url)
      // 🔐 KRİTİK NOKTA: Çerezleri buraya da kopyalıyoruz
      supabaseResponse.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value, c))
      return redirectResponse
    }

  } catch (error) {
    console.error("[CRM MIDDLEWARE HATASI]:", error)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Asset ve resimler hariç tüm sayfaları tarar
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}