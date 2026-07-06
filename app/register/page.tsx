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
          if (data.code === 'USER_EXISTS') {
            setError(data.error);
            setTimeout(() => {
              setShowForgotFields(true);
              setForgotStep(1);
              setError('Bu e-posta zaten kayıtlı olduğu için şifre sıfırlama ekranına yönlendirildiniz.');
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
    // image_f8bf08.png görselindeki orijinal derin lacivert/gece mavisi arka plan tonu ayarlandı
    <div className="min-h-screen bg-[#0b111e] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Orijinal arka plan rengiyle uyumlu, formu öne çıkaran hafif derinlik gölgesi */}
      <div className="w-full max-w-md bg-[#162238]/60 backdrop-blur-md border border-[#233554]/60 rounded-2xl p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative z-10 transition-all duration-300">
        
        {/* LOGO ALANI - verytech_beyaz.png olarak güncellendi */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center">
            <img 
              src="/verytech_beyaz.png" 
              alt="Verytech Logo" 
              className="h-14 w-auto object-contain transition-transform duration-300 hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold tracking-wide text-zinc-100">CRM Yönetim Paneli</h1>
            <p className="text-xs text-zinc-400">Devam etmek için giriş yapın veya kayıt olun.</p>
          </div>
        </div>

        {/* BİLDİRİMLER */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <span>✅</span> {successMessage}
          </div>
        )}

        {!showForgotFields ? (
          <>
            {/* SEKME MENÜSÜ */}
            <div className="grid grid-cols-2 bg-[#0b111e]/80 p-1 rounded-xl border border-[#233554]/40">
              <button
                onClick={() => { setActiveTab('login'); resetFormState(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeTab === 'login' 
                    ? 'bg-[#1e2e4a] text-white shadow-md border border-[#2d446b]/50' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Giriş Yap
              </button>
              <button
                onClick={() => { setActiveTab('register'); resetFormState(); }}
                className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeTab === 'register' 
                    ? 'bg-[#1e2e4a] text-white shadow-md border border-[#2d446b]/50' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Kayıt Ol
              </button>
            </div>

            {/* GİRİŞ YAPMA FORMU */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium tracking-wide">E-posta Adresi</label>
                  <input
                    type="email"
                    required
                    placeholder="ad.soyad@verytech.com.tr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 focus:shadow-[0_0_12px_rgba(79,70,229,0.2)] transition-all placeholder-zinc-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium tracking-wide">Şifre</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 focus:shadow-[0_0_12px_rgba(79,70,229,0.2)] transition-all placeholder-zinc-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>
            )}

            {/* KAYIT OLMA FORMU */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium tracking-wide">Kurumsal E-posta</label>
                  <input
                    type="email"
                    required
                    disabled={registerStep === 2}
                    placeholder="ad.soyad@verytech.com.tr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 focus:shadow-[0_0_12px_rgba(79,70,229,0.2)] transition-all disabled:opacity-50 placeholder-zinc-500"
                  />
                </div>

                {registerStep === 2 && (
                  <div className="space-y-4 pt-3 border-t border-[#233554]/40">
                    <div className="space-y-1.5">
                      <label className="text-xs text-indigo-400 font-bold tracking-wide">Doğrulama Kodu</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e] border border-indigo-500/50 text-white text-sm focus:outline-none text-center tracking-[0.2em] font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium tracking-wide">Şifre (Min. 6 Karakter)</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Şifrenizi belirleyin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium tracking-wide">Şifre Tekrar</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Şifrenizi doğrulayın"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading 
                    ? 'İşlem yapılıyor...' 
                    : registerStep === 1 
                      ? 'Doğrulama Kodu Gönder' 
                      : 'Hesabı Oluştur'}
                </button>
              </form>
            )}

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setShowForgotFields(true); resetFormState(); }}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-200 underline underline-offset-4 cursor-pointer"
              >
                Şifremi Unuttum
              </button>
            </div>
          </>
        ) : (
          /* ŞİFREMİ UNUTTUM FORMU */
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="border-b border-[#233554]/40 pb-2">
              <h2 className="text-sm font-bold text-indigo-400">Şifre Yenileme</h2>
              <p className="text-[11px] text-zinc-400">Kurumsal e-postanıza doğrulama kodu gönderilecektir.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium tracking-wide">Kurumsal E-posta</label>
              <input
                type="email"
                required
                disabled={forgotStep === 2}
                placeholder="ad.soyad@verytech.com.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all disabled:opacity-50"
              />
            </div>

            {forgotStep === 2 && (
              <div className="space-y-4 pt-3 border-t border-[#233554]/40">
                <div className="space-y-1.5">
                  <label className="text-xs text-indigo-400 font-bold tracking-wide">Doğrulama Kodu</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e] border border-indigo-500/50 text-white text-sm focus:outline-none text-center tracking-[0.2em] font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium tracking-wide">Yeni Şifre</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Yeni şifrenizi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium tracking-wide">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Yeni şifreyi doğrulayın"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowForgotFields(false); resetFormState(); }}
                className="w-1/3 bg-[#0b111e] hover:bg-[#162238] text-zinc-400 hover:text-zinc-200 text-xs font-bold py-2.5 rounded-xl border border-[#233554]/60 transition-all cursor-pointer"
              >
                Geri Dön
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading 
                  ? 'İşlem yapılıyor...' 
                  : forgotStep === 1 
                    ? 'Kod Gönder' 
                    : 'Şifreyi Güncelle'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}