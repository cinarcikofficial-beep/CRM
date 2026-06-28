'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface ClientData {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
}

interface ActivityData {
  id: string;
  client_id: string;
  type: string;
  notes: string | null;
  activity_date: string;
  next_followup_date: string | null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string; 
  const supabase = createClient();

  const [client, setClient] = useState<ClientData | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni Aktivite State'leri
  const [type, setType] = useState('Telefon');
  const [notes, setNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Düzenleme (Inline Edit) State'leri
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (clientError) throw clientError;
      setClient(clientData);

      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', id)
        .order('activity_date', { ascending: false });

      if (activityError) throw activityError;
      setActivities(activityData || []);

    } catch (error: any) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || !id) return;
    setSubmitLoading(true);

    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          client_id: id,
          type: type,
          notes: notes,
          next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
          activity_date: new Date().toISOString()
        }]);

      if (error) throw error;

      setNotes('');
      setNextFollowupDate('');
      fetchDetails();
    } catch (error: any) {
      alert('Aktivite eklenemedi: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Aktivite Notunu Güncelleme Fonksiyonu
  const handleUpdateActivity = async (actId: string) => {
    if (!editingNotes.trim()) return;
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('activities')
        .update({ notes: editingNotes })
        .eq('id', actId);

      if (error) throw error;

      // State'i yerel olarak güncelle ve düzenleme modundan çık
      setActivities((prev) =>
        prev.map((act) => (act.id === actId ? { ...act, notes: editingNotes } : act))
      );
      setEditingId(null);
    } catch (error: any) {
      alert('Not güncellenirken hata oluştu: ' + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteActivity = async (actId: string) => {
    if (!confirm('Bu aktivite notunu silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('activities').delete().eq('id', actId);
      if (error) throw error;
      setActivities((prev) => prev.filter((a) => a.id !== actId));
    } catch (error: any) {
      alert('Not silinemedi.');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) return <div className="p-8 text-white text-center text-sm font-medium">Yükleniyor...</div>;
  if (!client) return <div className="p-8 text-red-400 text-center text-sm font-bold">Müşteri kaydı bulunamadı.</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <button 
          onClick={() => router.push('/clients')}
          className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          ← Müşteri Listesine Dön
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* SOL: Tasarımı Korunan Müşteri Künye Kartı */}
          <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl space-y-4 shadow-xl lg:sticky lg:top-6">
            <div className="border-b border-zinc-800 pb-3">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2 inline-block">
                {client.status}
              </span>
              <h2 className="text-base font-black text-white tracking-tight">{client.company_name}</h2>
            </div>
            <div className="text-xs space-y-3 text-zinc-300">
              <div>
                <span className="text-zinc-600 block text-[10px] uppercase font-bold">Yetkili</span>
                <p className="font-medium">{client.contact_person}</p>
              </div>
              <div>
                <span className="text-zinc-600 block text-[10px] uppercase font-bold">E-posta</span>
                <p className="font-mono text-zinc-400">{client.email}</p>
              </div>
              <div>
                <span className="text-zinc-600 block text-[10px] uppercase font-bold">Telefon</span>
                <p className="font-mono text-zinc-400">{client.phone || '-'}</p>
              </div>
            </div>
          </div>

          {/* SAĞ: Aktivite Girişi ve Akış Geçmişi */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Form Kutusu */}
            <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-200">Yeni Aktivite & Görüşme Notu Ekle</h3>
              <form onSubmit={handleActivitySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500 font-medium">Yöntem (type)</label>
                    <select 
                      value={type} 
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white focus:outline-none"
                    >
                      <option value="Telefon">📞 Telefon Görüşmesi</option>
                      <option value="Mail">✉️ E-posta</option>
                      <option value="Toplantı">🤝 Yüz Yüze Toplantı</option>
                      <option value="SMS">💬 WhatsApp / SMS</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500 font-medium">Hatırlatma (next_followup_date)</label>
                    <input 
                      type="datetime-local" 
                      value={nextFollowupDate}
                      onChange={(e) => setNextFollowupDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-medium">Görüşme Detayı (notes)</label>
                  <textarea
                    required
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Görüşülen konuları, alınan kararları buraya kronolojik işlenmek üzere girin..."
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-sans resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={submitLoading} className="bg-indigo-600 px-5 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {submitLoading ? 'Kaydediliyor...' : 'Aktiviteyi İşle'}
                  </button>
                </div>
              </form>
            </div>

            {/* Zaman Akışı Listesi */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-400 px-1">Görüşme Geçmişi ({activities.length})</h3>
              {activities.length === 0 ? (
                <div className="text-center p-8 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  Bu müşteriye henüz hiç aktivite girilmemiş.
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl space-y-3 shadow-md">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                            {act.type === 'Telefon' ? '📞 Telefon' : act.type === 'Mail' ? '✉️ Mail' : act.type === 'Toplantı' ? '🤝 Toplantı' : '💬 SMS'}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">{formatDateTime(act.activity_date)}</span>
                        </div>
                        
                        {/* Sağ üst buton grubu */}
                        <div className="flex items-center gap-3">
                          {editingId !== act.id && (
                            <button 
                              onClick={() => {
                                setEditingId(act.id);
                                setEditingNotes(act.notes || '');
                              }}
                              className="text-zinc-500 hover:text-indigo-400 text-xs transition-colors"
                            >
                              Düzenle ✏️
                            </button>
                          )}
                          <button onClick={() => handleDeleteActivity(act.id)} className="text-zinc-600 hover:text-red-400 text-xs transition-colors">
                            Sil 🗑️
                          </button>
                        </div>
                      </div>

                      {/* Notun Gösterim / Düzenleme Alanı */}
                      {editingId === act.id ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={3}
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-sans resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={editLoading}
                              className="px-3 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded text-[11px] text-zinc-400 font-bold transition-colors"
                            >
                              İptal
                            </button>
                            <button
                              onClick={() => handleUpdateActivity(act.id)}
                              disabled={editLoading}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-[11px] text-white font-bold transition-colors disabled:opacity-50"
                            >
                              {editLoading ? 'Güncelleniyor...' : 'Kaydet'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">{act.notes}</p>
                      )}

                      {act.next_followup_date && (
                        <div className="text-[11px] font-mono text-amber-500/80 pt-2 border-t border-zinc-900/40">
                          🔔 Gelecek Hatırlatma: {formatDateTime(act.next_followup_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}