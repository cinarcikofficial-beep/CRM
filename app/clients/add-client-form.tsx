'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface AddClientFormProps {
  onClientAdded?: () => void;
}

export default function AddClientForm({ onClientAdded }: AddClientFormProps) {
  const supabase = createClient();

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Potansiyel');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);

    try {
      // Veritabanına kesinlikle 'notes' alanı GÖNDERİLMİYOR. Sadece clients tablosunun alanları var.
      const { error } = await supabase
        .from('clients')
        .insert([{
          company_name: companyName,
          contact_person: contactPerson,
          email: email,
          phone: phone,
          status: status
        }]);

      if (error) throw error;

      // Alanları sıfırla
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setStatus('Potansiyel');

      if (onClientAdded) {
        onClientAdded();
      }
    } catch (error: any) {
      alert('Müşteri eklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-bold text-zinc-400">Yeni Müşteri Ekle</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Müşteri / Firma Adı</label>
          <input
            type="text"
            required
            placeholder="Firma adını girin"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Yetkili Kişi</label>
          <input
            type="text"
            placeholder="Yetkili ad soyad"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">E-posta</label>
          <input
            type="email"
            placeholder="ornek@firma.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Telefon</label>
          <input
            type="text"
            placeholder="Telefon numarası"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Durum</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="Potansiyel">Potansiyel</option>
            <option value="Aktif Müşteri">Aktif Müşteri</option>
            <option value="Pasif">Pasif</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Ekleniyor...' : 'Müşteri Ekle'}
        </button>
      </div>
    </form>
  );
}