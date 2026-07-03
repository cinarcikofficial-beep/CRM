'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  const [showForgotFields, setShowForgotFields] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); 
  const [registerStep, setRegisterStep] = useState(1);

  const resetFormState = () => {
    setError('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setForgotStep(1);
    setRegisterStep(1);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim().endsWith('@verytech.com.tr')) {
      setError('Sadece @verytech.com.tr uzantılı kurumsal hesaplar giriş yapabilir.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Giriş yapılamadı.');

      setSuccessMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
      setTimeout(() => { router.push('/clients'); router.refresh(); }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GÜNCELLENEN AŞAMALI KAYIT FONKSİYONU
  // ==========================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim().endsWith('@verytech.com.tr')) {
      setError('Sadece @verytech.com.tr uzantılı kurumsal e-postalar kayıt olabilir.');
      return;
    }

    setLoading(true);
    try {
      if (registerStep === 1) {
        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request', email: email.trim(), origin: 'register' }),
        });
        const data = await res.json();

        if (!res.ok) {
          // 💡 EĞER HESAP VARSA DOĞRUDAN ŞİFRE SIFIRLAMAYA YÖNLENDİR
          if (data.code === 'USER_EXISTS') {
            setError(data.error);
            setTimeout(() => {
              setShowForgotFields(true); // Şifremi unuttum alanını aç
              setForgotStep(1);         // 1. adıma getir
              setError('Bu e-posta zaten kayıtlı olduğu için şifre sıfırlama ekranına yönlendirildiniz. Buradan kod isteyebilirsiniz.');
            }, 1500);
            return;
          }
          throw new Error(data.error);
        }

        setSuccessMessage('Kayıt onay kodu e-postanıza gönderildi!');
        setRegisterStep(2);
      } 
      else if (registerStep === 2) {
        if (password !== confirmPassword) throw new Error('Şifreler birbiriyle uyuşmuyor.');
        if (!code.trim()) throw new Error('Lütfen doğrulama kodunu girin.');

        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            email: email.trim(),
            code: code.trim(),
            password: password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setSuccessMessage('Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.');
        setTimeout(() => { setActiveTab('login'); resetFormState(); }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GÜNCELLENEN ŞİFRE SIFIRLAMA FONKSİYONU
  // ==========================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim().endsWith('@verytech.com.tr')) {
      setError('Sadece @verytech.com.tr uzantılı hesaplar işlem yapabilir.');
      return;
    }

    setLoading(true);
    try {
      if (forgotStep === 1) {
        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request', email: email.trim(), origin: 'forgot' }),
        });
        const data = await res.json();

        if (!res.ok) {
          // 💡 EĞER KULLANICI YOKSA KAYIT OLMA SEKMESİNE GERİ FIRLAT
          if (data.code === 'USER_NOT_FOUND') {
            setError(data.error);
            setTimeout(() => {
              setShowForgotFields(false);
              setActiveTab('register');
              setRegisterStep(1);
              setError('Hesabınız bulunamadı. Lütfen önce buradan kayıt kodu isteyin.');
            }, 1500);
            return;
          }
          throw new Error(data.error);
        }

        setSuccessMessage('Doğrulama kodu e-postanıza gönderildi!');
        setForgotStep(2);
      } 
      else if (forgotStep === 2) {
        if (password !== confirmPassword) throw new Error('Şifreler birbiriyle uyuşmuyor.');
        if (!code.trim()) throw new Error('Lütfen doğrulama kodunu girin.');

        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm',
            email: email.trim(),
            code: code.trim(),
            password: password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setSuccessMessage('Şifreniz başarıyla yenilendi! Giriş yapabilirsiniz.');
        setTimeout(() => { setShowForgotFields(false); setActiveTab('login'); resetFormState(); }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 shadow-2xl">
        
        {/* ŞİRKET LOGOSU VE BAŞLIK */}
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center">
            <img 
              src="/verytech_beyaz.png" 
              alt="Verytech Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-black tracking-tight text-zinc-200">CRM Yönetim Paneli</h1>
            <p className="text-xs text-zinc-500 font-medium">Lütfen devam etmek için kimliğinizi doğrulayın.</p>
          </div>
        </div>

        {/* BİLDİRİM MESAJLARI */}
        {error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs font-semibold">
            ✅ {successMessage}
          </div>
        )}

        {!showForgotFields ? (
          <>
            {/* TAB MENÜ */}
            <div className="grid grid-cols-2 bg-zinc-900 p-1 rounded-xl border border-zinc-850">
              <button
                onClick={() => { setActiveTab('login'); resetFormState(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'login' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Giriş Yap
              </button>
              <button
                onClick={() => { setActiveTab('register'); resetFormState(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'register' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Kayıt Ol
              </button>
            </div>

            {/* GİRİŞ YAPMA FORMU */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">E-posta Adresi</label>
                  <input
                    type="email"
                    required
                    placeholder="ad.soyad@verytech.com.tr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">Şifre</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>
            )}

            {/* KAYIT OLMA FORMU */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">Kurumsal E-posta</label>
                  <input
                    type="email"
                    required
                    disabled={registerStep === 2}
                    placeholder="ad.soyad@verytech.com.tr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 placeholder-zinc-600"
                  />
                </div>

                {registerStep === 2 && (
                  <div className="space-y-4 pt-2 border-t border-zinc-900">
                    <div className="space-y-1">
                      <label className="text-xs text-indigo-400 font-bold">E-Posta Doğrulama Kodu (6 Haneli)</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-indigo-900 text-white text-sm focus:outline-none text-center tracking-widest font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 font-medium">Şifre (Min. 6 Karakter)</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Şifrenizi belirleyin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 font-medium">Şifre Tekrar</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Şifrenizi doğrulayın"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading 
                    ? 'İşlem yapılıyor...' 
                    : registerStep === 1 
                      ? 'Doğrulama Kodu Gönder' 
                      : 'Kayıt Ol'}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setShowForgotFields(true); resetFormState(); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold underline cursor-pointer"
              >
                Şifremi Unuttum
              </button>
            </div>
          </>
        ) : (
          /* ŞİFREMİ UNUTTUM KUTUSU */
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="border-b border-zinc-900 pb-2">
              <h2 className="text-sm font-black text-indigo-400">Şifre Yenileme Sistemi</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">Kurumsal e-postanızı girip doğrulama kodu isteyin.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">Kurumsal E-posta</label>
              <input
                type="email"
                required
                disabled={forgotStep === 2}
                placeholder="ad.soyad@verytech.com.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            {forgotStep === 2 && (
              <div className="space-y-4 pt-2 border-t border-zinc-900">
                <div className="space-y-1">
                  <label className="text-xs text-indigo-400 font-bold">E-Posta Doğrulama Kodu (6 Haneli)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-indigo-900 text-white text-sm focus:outline-none text-center tracking-widest font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">Yeni Şifre</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Yeni şifrenizi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Yeni şifreyi doğrulayın"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowForgotFields(false); resetFormState(); }}
                className="w-1/3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs font-semibold py-2.5 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
              >
                Geri Dön
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading 
                  ? 'İşlem yapılıyor...' 
                  : forgotStep === 1 
                    ? 'Doğrulama Kodu Gönder' 
                    : 'Şifreyi Güncelle'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}