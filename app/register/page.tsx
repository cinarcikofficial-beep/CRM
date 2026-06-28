'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: E-posta girme, 2: Kod ve Şifre belirleme
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
const [fullName, setFullName] = useState(''); // Bunu mutlaka ekle
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
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Giriş yapılamadı.');
      } else {
        router.push('/clients');
        router.refresh();
      }
    } catch (err) {
      setLoading(false);
      setError('Sunucu ile iletişim kurulurken bir hata oluştu.');
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim().endsWith('@verytech.com.tr')) {
      setError('Sadece @verytech.com.tr uzantılı kurumsal çalışanlar kayıt olabilir.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Kod gönderilemedi.');
      } else {
        setStep(2);
        setSuccessMessage('Doğrulama kodu e-posta adresinize gönderildi.');
      }
    } catch (err) {
      setLoading(false);
      setError('Bağlantı hatası oluştu, lütfen ağınızı kontrol edin.');
    }
  };

  // Kayıt ol butonuna tıklandığında çalışan fonksiyonunun en başı:

  const handleRegisterComplete = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  // Şifre eşleşme kontrolü
  if (password.trim() !== confirmPassword.trim()) {
    setError("Girdiğiniz şifreler birbirine uymuyor.");
    setLoading(false);
    return;
  }

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        fullName: fullName || "Kullanıcı", // İsim boşsa "Kullanıcı" yollar
        password: password.trim(),
        code: code.trim()
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kayıt sırasında bir hata oluştu.");
      setLoading(false);
      return;
    }

    // Başarılı ise yönlendir
    router.push("/clients");
  } catch (err) {
    setError("Sunucuya ulaşılamadı, lütfen ağınızı kontrol edin.");
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 rounded-2xl shadow-2xl space-y-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-black text-white tracking-tight">Verytech CRM Portal</h1>
          <p className="text-xs text-zinc-500 mt-1">Merkezi Şirket Personel Yönetim Paneli</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg text-center font-medium">
            ✅ {successMessage}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-lg border border-zinc-800/60">
            <button
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
              className={`py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'login' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              🔒 Giriş Yap
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
              className={`py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'register' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              ✨ Kayıt Ol
            </button>
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">E-posta</label>
              <input
                type="email"
                required
                placeholder="ad.soyad@verytech.com.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600 font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">Şifre</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-md"
            >
              {loading ? 'Oturum Açılıyor...' : 'Sisteme Giriş Yap'}
            </button>
          </form>
        ) : (
          step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">Kurumsal E-posta Adresi</label>
                <input
                  type="email"
                  required
                  placeholder="isim@verytech.com.tr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Domain Doğrulanıyor...' : 'Onay Kodu Gönder'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterComplete} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">Doğrulama Kodu</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">Şifreniz</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="En az 6 karakter giriniz"
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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setSuccessMessage(''); }}
                  className="w-1/3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs font-semibold py-2.5 rounded-lg border border-zinc-800 transition-colors"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}