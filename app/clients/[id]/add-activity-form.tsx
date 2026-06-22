'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AddActivityForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const supabase = createClient();
  
  const [type, setType] = useState('Arama');
  const [notes, setNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return alert('Lütfen görüşme notu yazın.');

    setLoading(true);

    const { error } = await supabase.from('activities').insert([
      {
        client_id: clientId,
        type,
        notes: notes.trim(),
        next_followup_date: nextFollowupDate || null,
        activity_date: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert('Not eklenirken bir hata oluşti: ' + error.message);
    } else {
      setNotes('');
      setNextFollowupDate('');
      router.refresh(); // Zaman tünelini anlık güncellemesi için sayfayı tazeler
    }
    setLoading(false);
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 p-6 text-white">
      <h2 className="text-md font-black text-white mb-5 border-b border-zinc-800 pb-3">
        Yeni Aktivite / Görüşme Notu Ekle
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* İşlem Tipi */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-1.5">İşlem Tipi</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="Arama" className="bg-zinc-900">📞 Telefon Araması</option>
            <option value="E-posta" className="bg-zinc-900">📧 E-posta Gönderimi</option>
            <option value="Toplantı" className="bg-zinc-900">🤝 Yüz Yüze / Online Toplantı</option>
            <option value="Teklif İletildi" className="bg-zinc-900">📄 Teklif İletildi</option>
          </select>
        </div>

        {/* Görüşme Notları */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-1.5">Görüşme Notları *</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Müşteriyle ne konuşuldu? Detayları buraya yazın..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        {/* Bir Sonraki Takip Tarihi */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 mb-1.5">
            Bir Sonraki Takip Tarihi <span className="text-zinc-500 font-normal">(Opsiyonel)</span>
          </label>
          <input
            type="date"
            value={nextFollowupDate}
            onChange={(e) => setNextFollowupDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-bold text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none [color-scheme:dark]"
          />
        </div>

        {/* Gönder Butonu */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-3 px-4 rounded-lg shadow-md transition disabled:opacity-50"
        >
          {loading ? 'Zaman Tüneline İşleniyor...' : 'Notu Zaman Tüneline İşle'}
        </button>
      </form>
    </div>
  );
}