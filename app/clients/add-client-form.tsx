'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AddClientForm() {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return alert('Lütfen Firma Adını girin.');

    setLoading(true);

    const { error } = await supabase.from('clients').insert([
      {
        company_name: companyName.trim(),
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        status: 'Potansiyel', // Yeni eklenen firma varsayılan olarak Potansiyel başlar
      },
    ]);

    if (error) {
      alert('Müşteri eklenirken bir hata oluştu: ' + error.message);
    } else {
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      router.refresh(); // Alttaki listenin anlık güncellenmesi için sayfayı tazeler
    }
    setLoading(false);
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 p-6 text-white mb-6">
      <div className="border-b border-zinc-800 pb-3 mb-5">
        <h2 className="text-xl font-black text-white">Yeni Potansiyel Müşteri Ekle</h2>
        <p className="text-xs font-bold text-zinc-400 mt-0.5">Sisteme yeni firma kaydı tanımlayın.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Firma Adı */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">
              Firma Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Korozo Ambalaj Sanayi"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Yetkili Kişi */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">Yetkili Kişi</label>
            <input
              type="text"
              placeholder="Örn: Adem Serhat Sezen"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* E-posta Adresi */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">E-posta Adresi</label>
            <input
              type="email"
              placeholder="example@firma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Telefon Numarası */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">Telefon Numarası</label>
            <input
              type="text"
              placeholder="Örn: 0216 525 10 11"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Gönder Butonu */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-3 px-4 rounded-lg shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            💾 {loading ? 'Müşteri Kaydediliyor...' : 'Müşteriyi Sisteme Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}