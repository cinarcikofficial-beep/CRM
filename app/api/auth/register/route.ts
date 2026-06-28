import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. Ön yüzden gelen verileri alıyoruz
    const body = await request.json();
    const { email, password, fullName, code } = body;

    // 2. Eksik veri kontrolü
    if (!email || !password || !fullName || !code) {
      return NextResponse.json(
        { error: 'Tüm alanlar zorunludur. Lütfen bilgilerin eksiksiz geldiğinden emin olun.' },
        { status: 400 }
      );
    }

    // 3. Supabase Admin İstemcisini Oluşturma (Güvenlik kurallarını (RLS) aşmak için)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası: Supabase anahtarları sistemde bulunamadı.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const normalizedEmail = email.trim().toLowerCase();

    // 4. Doğrulama Kodunu Veritabanından (verification_codes) Kontrol Etme
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .select('code')
      .eq('email', normalizedEmail)
      .single();

    // Kod eşleşmezse veya bulunamazsa doğrudan hatayı döndür
    if (codeError || !codeData || codeData.code !== code.trim()) {
      return NextResponse.json(
        { error: 'Doğrulama kodu yanlış veya süresi dolmuş.' },
        { status: 400 }
      );
    }

    // 5. Kod doğruysa Supabase Auth'a Kullanıcıyı Kaydetme
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true // E-posta zaten doğrulandığı için onaylı işaretliyoruz
    });

    if (authError) {
      return NextResponse.json(
        { error: `Kayıt işlemi başarısız oldu: ${authError.message}` },
        { status: 400 }
      );
    }

    // 6. Kullanıcıyı public 'users' tablosuna detaylarıyla ekleme
    if (authData?.user) {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            id: authData.user.id,
            full_name: fullName.trim(),
            email: normalizedEmail,
            role: 'sales' // Sisteme girenlerin varsayılan rolü
          }
        ]);
        
      if (insertError) {
        console.error("Kullanıcı users tablosuna eklenirken hata oluştu:", insertError);
        // Auth kaydı başarılı olduğu için işlemi kesmiyoruz, ancak konsola logluyoruz.
      }
    }

    // 7. Başarıyla kullanılan doğrulama kodunu temizleme
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('email', normalizedEmail);

    // 8. Her şey başarılı
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Kayıt API Hatası:", error);
    return NextResponse.json(
      { error: 'Sunucu tarafında beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}