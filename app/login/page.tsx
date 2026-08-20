'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotFields, setShowForgotFields] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [code, setCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

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
              router.push('/register');
              setError('Hesabınız bulunamadı. Lütfen önce kayıt olun.');
            }, 1500);
            return;
          }
          throw new Error(data.error);
        }

        setSuccessMessage('Doğrulama kodu e-postanıza gönderildi!');
        setForgotStep(2);
      } else if (forgotStep === 2) {
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
        setTimeout(() => { setShowForgotFields(false); setForgotStep(1); setPassword(''); setCode(''); setConfirmPassword(''); }, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-[#1e293b] border border-[#334155] rounded-2xl p-10 shadow-[0_10px_25px_rgba(0,0,0,0.3)] text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/verytech_beyaz.png"
            alt="Verytech"
            className="h-20 w-auto object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1 tracking-wide">Verytech</h1>
        <p className="text-sm font-semibold text-slate-300 mb-4">CRM</p>
        <p className="text-sm text-slate-400 mb-6">Hesabınıza giriş yapın</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            {successMessage}
          </div>
        )}

        {!showForgotFields ? (
          <form onSubmit={handleLogin} className="text-left space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">E-Posta Adresi</label>
              <input
                type="email"
                required
                autoComplete="off"
                placeholder="ornek@verytech.com.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Şifre</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setShowForgotFields(true); setError(''); setSuccessMessage(''); }}
                className="text-amber-400 hover:text-amber-300 text-xs font-semibold no-underline cursor-pointer"
              >
                Şifremi Unuttum?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold no-underline cursor-pointer"
              >
                ✨ Yalnızca Verytech Çalışanı! Kayıt Olun
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="text-left space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">E-Posta Adresi</label>
              <input
                type="email"
                required
                disabled={forgotStep === 2}
                placeholder="ornek@verytech.com.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all disabled:opacity-50"
              />
            </div>
            {forgotStep === 2 && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-cyan-400 mb-1.5">Doğrulama Kodu</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-cyan-500/50 text-white text-sm text-center tracking-[0.2em] font-mono font-bold focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Yeni Şifre</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
                  />
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowForgotFields(false); setForgotStep(1); setError(''); setSuccessMessage(''); setPassword(''); setCode(''); setConfirmPassword(''); }}
                className="w-1/3 bg-[#0f172a] hover:bg-[#1e293b] text-slate-400 hover:text-white text-xs font-bold py-2.5 rounded-lg border border-[#475569] transition-all cursor-pointer"
              >
                Geri Dön
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'İşlem yapılıyor...' : forgotStep === 1 ? 'Kod Gönder' : 'Şifreyi Güncelle'}
              </button>
            </div>
          </form>
        )}
      </div>
      <footer className="mt-8 text-center text-xs text-slate-500">
        ©2026 - Designed By Kerim KAPLAN
      </footer>
    </div>
  );
}
