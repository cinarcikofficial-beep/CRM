'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

// 1. Aktivite Tip Tanımı
interface Activity {
  id: string;
  client_id: string;
  type: string;
  notes: string | null;
  next_followup_date: string | null;
  created_at: string;
}

// 2. Form Bileşeninin Propları - Hata buradaki tanımda clientId olmamasından kaynaklanıyordu!
interface AddClientFormProps {
  clientId: string; 
  onActivityAdded: (newActivity: Activity) => void;
}

// Yeni Aktivite Ekleme Form Bileşeni
function AddActivityForm({ clientId, onActivityAdded }: AddClientFormProps) {
  const supabase = createClient();
  const [type, setType] = useState('E-posta');
  const [notes, setNotes] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            client_id: clientId,
            type,
            notes: notes.trim() || null,
            next_followup_date: nextFollowup || null,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        onActivityAdded(data[0]);
        setNotes('');
        setNextFollowup('');
      }
    } catch (error: any) {
      alert('Aktivite eklenirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 shadow-xl">
      <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4">Yeni Aktivite & Görüşme Notu Ekle</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 font-bold uppercase">Yöntem (type)</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="E-posta">📩 E-posta</option>
              <option value="Telefon">📞 Telefon</option>
              <option value="Toplantı">🤝 Toplantı</option>
              <option value="SMS / WP">💬 SMS / WP</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-500 font-bold uppercase">Hatırlatma (next_followup_date)</label>
            <input
              type="datetime-local"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 inventory-input"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500 font-bold uppercase">Görüşme Detayı (notes)</label>
          <textarea
            placeholder="Görüşülen konuları, alınan kararları buraya kronolojik işlenmek üzere girin..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-black text-xs px-5 py-2.5 rounded-lg transition-colors shadow-md"
          >
            {isSubmitting ? 'İşleniyor...' : 'Aktiviteyi İşle'}
          </button>
        </div>
      </form>
    </div>
  );
}

// 3. Ana ActivityManager Bileşeni
interface ActivityManagerProps {
  clientId: string;
  initialActivities: Activity[];
}

export default function ActivityManager({ clientId, initialActivities }: ActivityManagerProps) {
  const supabase = createClient();
  const [activities, setActivities] = useState<Activity[]>(initialActivities || []);

  const handleActivityAdded = (newActivity: Activity) => {
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleDeleteActivity = async (id: string) => {
    const confirmDelete = confirm('Bu görüşme notunu silmek istediğinize emin misiniz?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      setActivities((prev) => prev.filter((act) => act.id !== id));
    } catch (error: any) {
      alert('Aktivite silinirken bir hata oluştu: ' + error.message);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* SOL TARAF: FORM */}
      <div className="md:col-span-1">
        <AddActivityForm clientId={clientId} onActivityAdded={handleActivityAdded} />
      </div>

      {/* SAĞ TARAF: LİSTE */}
      <div className="md:col-span-2 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">
          Görüşme Geçmişi ({activities.length})
        </h2>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 text-center text-xs text-zinc-500 font-medium">
              Bu müşteriye ait henüz geçmiş bir aktivite kaydı bulunmuyor.
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-3 shadow-md group relative">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center bg-zinc-900 border border-zinc-800 text-zinc-300 font-black px-2 py-0.5 rounded text-[10px]">
                      {act.type === 'E-posta' && '📩 E-posta'}
                      {act.type === 'Telefon' && '📞 Telefon'}
                      {act.type === 'Toplantı' && '🤝 Toplantı'}
                      {act.type === 'SMS / WP' && '💬 SMS / WP'}
                      {!['E-posta', 'Telefon', 'Toplantı', 'SMS / WP'].includes(act.type) && act.type}
                    </span>
                    <span className="text-zinc-500 font-mono">{formatDateTime(act.created_at)}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteActivity(act.id)}
                    className="text-zinc-600 hover:text-red-500 transition-colors text-xs p-1"
                    title="Aktiviteyi Sil"
                  >
                    🗑️
                  </button>
                </div>
                <div className="text-xs text-zinc-300 whitespace-pre-wrap font-medium leading-relaxed">
                  {act.notes || <span className="text-zinc-600 italic">Not bırakılmadı.</span>}
                </div>
                {act.next_followup_date && (
                  <div className="text-[10px] bg-indigo-950/20 border border-indigo-900/40 text-indigo-400 px-2.5 py-1 rounded-lg w-fit font-bold">
                    🔔 Hatırlatma Tarihi: {formatDateTime(act.next_followup_date)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}