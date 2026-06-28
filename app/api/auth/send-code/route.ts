import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-posta alanı zorunludur.' }, { status: 400 });
    }

    // Çevre değişkenlerini çekiyoruz
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const gmailUser = process.env.GMAIL_USER; // Senin Gmail adresin (Örn: barlas...@gmail.com)
    const gmailAppPass = process.env.GMAIL_APP_PASSWORD; // Google'dan aldığımız 16 haneli Uygulama Şifresi

    // Yapılandırma kontrolü
    if (!supabaseUrl || !supabaseServiceKey || !gmailUser || !gmailAppPass) {
      console.error("❌ EKSİK YAPILANDIRMA HATASI:");
      console.error("Supabase URL:", supabaseUrl ? "Mevcut" : "Eksik!");
      console.error("Supabase Key:", supabaseServiceKey ? "Mevcut" : "Eksik!");
      console.error("Gmail Adresi:", gmailUser ? "Mevcut" : "Eksik!");
      console.error("Gmail Şifresi:", gmailAppPass ? "Mevcut" : "Eksik!");
      
      return NextResponse.json({ 
        error: 'Sunucu yapılandırma hatası: Gmail veya Supabase anahtarları .env.local dosyasından okunamadı.' 
      }, { status: 500 });
    }

    // Supabase Admin istemcisini kur
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 6 haneli rastgele onay kodu üret
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. ADIM: Kodu veritabanına (verification_codes) yaz veya güncelle
    const { error: dbError } = await supabaseAdmin
      .from('verification_codes')
      .upsert({
        email: email.trim().toLowerCase(),
        code: generatedCode,
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (dbError) {
      console.error("Veritabanına kod yazılırken hata oluştu:", dbError.message);
      throw dbError;
    }

    // 2. ADIM: Gmail SMTP Taşıyıcısını (Transporter) Yapılandır
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPass, // Gmail normal şifren değil, 16 karakterli boşluksuz uygulama şifresi
      },
    });

    // E-posta İçeriği ve Tasarımı
    const mailOptions = {
      from: `"Verytech CRM Portal" <${gmailUser}>`,
      to: email.trim().toLowerCase(),
      subject: 'CRM Giriş / Kayıt Onay Kodunuz',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; rounded-key: 12px; background-color: #ffffff;">
          <h2 style="color: #18181b; text-align: center; font-size: 22px; margin-bottom: 24px; font-weight: 800;">Verytech CRM Portal</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Merhaba,</p>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Sisteme güvenli erişim sağlamak veya kayıt işleminizi tamamlamak için kullanabileceğiniz tek kullanımlık onay kodunuz aşağıdadır:</p>
          
          <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #4f46e5;">${generatedCode}</span>
          </div>
          
          <p style="color: #71717a; font-size: 12px; line-height: 1.5; text-align: center; margin-top: 32px;">
            Bu kod 3 dakika boyunca geçerlidir. İstekte bulunan siz değilseniz bu e-postayı dikkate almayınız.
          </p>
        </div>
      `,
    };

    
    // 3. ADIM: Gmail ile Maili Gönder
try {
  const info = await transporter.sendMail(mailOptions);
  console.log('📧 Nodemailer Başarı Çıktısı:', info.messageId);
} catch (smtpError: any) {
  console.error('❌ SMTP MAİL GÖNDERİM HATASI:', smtpError.message);
}

    console.log(`📬 [BAŞARILI] Onay kodu ${email} adresine Gmail üzerinden gönderildi: ${generatedCode}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send-code endpointinde veya mail gönderiminde hata:", error.message);
    return NextResponse.json({ error: `E-posta gönderilemedi: ${error.message}` }, { status: 500 });
  }
}