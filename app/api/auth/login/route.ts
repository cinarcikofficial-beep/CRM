import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Giriş kapısında da @verytech.com.tr uzantı kontrolü
    if (!email || !email.trim().endsWith('@verytech.com.tr')) {
      return NextResponse.json(
        { error: 'Yetkisiz alan adı. Portala yalnızca @verytech.com.tr personeli erişebilir.' },
        { status: 403 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Sunucu hatası: Supabase anahtarları (.env.local) bulunamadı.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Kullanıcının şifresini kontrol et
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return NextResponse.json({ error: 'E-posta adresi veya şifre hatalı.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, session: data.session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}