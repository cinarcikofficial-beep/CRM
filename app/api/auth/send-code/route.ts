import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { action, email, code, password, origin } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-posta alanı zorunludur.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPass = process.env.GMAIL_APP_PASSWORD;

    if (!supabaseUrl || !supabaseServiceKey || !gmailUser || !gmailAppPass) {
      return NextResponse.json({ error: 'Sunucu yapılandırma hatası.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const formattedEmail = email.trim().toLowerCase();

    // ==========================================
    // ADIM 1: KOD GÖNDERME İSTEĞİ (KONTROLLER EKLENDİ)
    // ==========================================
    if (action === 'request') {
      if (!formattedEmail.endsWith('@verytech.com.tr')) {
        return NextResponse.json({ error: 'Sadece @verytech.com.tr uzantılı hesaplar işlem yapabilir.' }, { status: 400 });
      }

      // Sistemde bu kullanıcı var mı diye kontrol et
      const { data: usersData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) return NextResponse.json({ error: 'Kullanıcı kontrolü yapılamadı.' }, { status: 500 });

      const isUserExists = usersData.users.some(u => u.email?.toLowerCase() === formattedEmail);

      // ⚠️ KRİTİK KONTROL: Kayıt olmaya çalışıyor ama hesap zaten varsa
      if (origin === 'register' && isUserExists) {
        return NextResponse.json({ 
          error: 'Bu e-posta adresi zaten kayıtlı. Şifrenizi unuttuysanız sıfırlayabilirsiniz.',
          code: 'USER_EXISTS' // Frontend'in yakalaması için özel kod
        }, { status: 400 });
      }

      // ⚠️ KRİTİK KONTROL: Şifre sıfırlamaya çalışıyor ama hesap yoksa
      if (origin === 'forgot' && !isUserExists) {
        return NextResponse.json({ 
          error: 'Bu e-posta adresine ait bir kullanıcı bulunamadı. Lütfen önce kayıt olun.',
          code: 'USER_NOT_FOUND'
        }, { status: 400 });
      }

      // Kontroller geçildiyse 6 haneli kod üret
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { error: dbError } = await supabaseAdmin
        .from('verification_codes')
        .upsert({
          email: formattedEmail,
          code: generatedCode,
          created_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (dbError) return NextResponse.json({ error: 'Doğrulama kodu oluşturulamadı.' }, { status: 500 });

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailAppPass },
      });

      const mailOptions = {
        from: `"Verytech CRM Portal" <${gmailUser}>`,
        to: formattedEmail,
        subject: 'CRM Portal Doğrulama Kodunuz',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #18181b; text-align: center; font-size: 22px; margin-bottom: 24px; font-weight: 800;">Verytech CRM</h2>
            <p style="color: #4b5563; font-size: 14px;">Merhaba,</p>
            <p style="color: #4b5563; font-size: 14px;">Güvenli doğrulama işleminiz için tek kullanımlık kodunuz:</p>
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #4f46e5;">${generatedCode}</span>
            </div>
            <p style="color: #71717a; font-size: 12px; text-align: center;">Bu kod 3 dakika boyunca geçerlidir.</p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true, message: 'Doğrulama kodu gönderildi.' });
      } catch (smtpError: any) {
        return NextResponse.json({ error: `E-posta gönderimi başarısız: ${smtpError.message}` }, { status: 500 });
      }
    }

    const checkVerificationCode = async () => {
      const { data: dbRow } = await supabaseAdmin
        .from('verification_codes')
        .select('*')
        .eq('email', formattedEmail)
        .single();

      if (!dbRow || dbRow.code !== code.trim()) {
        throw new Error('Girdiğiniz doğrulama kodu hatalıdır.');
      }

      const codeAge = Date.now() - new Date(dbRow.created_at).getTime();
      if (codeAge > 3 * 60 * 1000) {
        throw new Error('Doğrulama kodunun süresi dolmuş (3 dakika).');
      }
    };

    // ==========================================
    // ADIM 2: KODU ONAYLAMA VE YENİ KAYIT YAPMA (action === 'register')
    // ==========================================
    if (action === 'register') {
      if (!code || !password) return NextResponse.json({ error: 'Kod ve şifre zorunludur.' }, { status: 400 });

      try {
        await checkVerificationCode();
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: formattedEmail,
        password: password,
        email_confirm: true 
      });

      if (signUpError) {
        return NextResponse.json({ error: `Kayıt oluşturulamadı: ${signUpError.message}` }, { status: 400 });
      }

      await supabaseAdmin.from('verification_codes').delete().eq('email', formattedEmail);
      return NextResponse.json({ success: true, message: 'Kayıt başarıyla oluşturuldu!' });
    }

    // ==========================================
    // ADIM 3: KODU ONAYLAMA VE ŞİFRE YENİLEME (action === 'confirm')
    // ==========================================
    if (action === 'confirm') {
      if (!code || !password) return NextResponse.json({ error: 'Kod ve şifre zorunludur.' }, { status: 400 });

      try {
        await checkVerificationCode();
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      const { data: usersData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) return NextResponse.json({ error: 'Kullanıcı sorgulanamadı.' }, { status: 500 });

      const targetUser = usersData.users.find(u => u.email?.toLowerCase() === formattedEmail);
      if (!targetUser) return NextResponse.json({ error: 'Kullanıcı hesabı bulunamadı.' }, { status: 404 });

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password: password });
      if (updateError) return NextResponse.json({ error: 'Şifre güncellenemedi.' }, { status: 500 });

      await supabaseAdmin.from('verification_codes').delete().eq('email', formattedEmail);
      return NextResponse.json({ success: true, message: 'Şifreniz güncellendi!' });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: `Sistem hatası: ${error.message}` }, { status: 500 });
  }
}