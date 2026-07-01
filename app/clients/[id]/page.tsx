'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

interface ClientData {
  id: string;
  company_name: string;
  contact_person: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  city: string | null;
  district: string | null;
}

interface ActivityData {
  id: string;
  type: string;
  notes: string | null;
  next_followup_date: string | null;
  created_at: string;
  updated_by: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: PageProps) {
  const router = useRouter();
  const supabase = createClient();
  const { id: clientId } = use(params);

  // Aktif Kullanıcı Bilgisi
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Data State'leri
  const [client, setClient] = useState<ClientData | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni Aktivite Form State'leri
  const [type, setType] = useState('Telefon Görüşmesi');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aktivite Düzenleme Modal State'leri
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);
  const [editType, setEditType] = useState('Telefon Görüşmesi');
  const [editNextFollowupDate, setEditNextFollowupDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdatingActivity, setIsUpdatingActivity] = useState(false);

  // E-posta adresinden sadece saf ismi çeken fonksiyon (kerim.kaplan@... -> Kerim)
  const formatUpdatedBy = (emailOrId: string | null) => {
    if (!emailOrId) return 'Sistem';
    if (emailOrId.includes('@')) {
      const handle = emailOrId.split('@')[0];
      const rawName = handle.split('.')[0];
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
    const rawName = emailOrId.split('.')[0];
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Müşteri Bilgilerini Getir
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // 2. Müşteriye Ait Aktiviteleri Getir
      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;
      setActivities(activityData || []);

    } catch (error: any) {
      alert('Veriler yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Sayfa açılışında yedek olarak hafızaya alalım
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user.email || data.user.id);
      }
    });
  }, [clientId]);

  // ISO Tarih formatını datetime-local inputuyla uyumlu hale getiren fonksiyon
  const formatToDatetimeLocal = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Düzenleme modalını açan fonksiyon
  const openEditActivityModal = (activity: ActivityData) => {
    setEditingActivity(activity);
    setEditType(activity.type || 'Telefon Görüşmesi');
    setEditNotes(activity.notes || '');
    setEditNextFollowupDate(formatToDatetimeLocal(activity.next_followup_date));
    setIsEditActivityModalOpen(true);
  };

  // Aktivite Güncelleme İşlemi (Başarı alert uyarısı kaldırıldı)
  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editNotes.trim()) return alert('Görüşme detayı boş bırakılamaz.');

    try {
      setIsUpdatingActivity(true);

      const { data: authData } = await supabase.auth.getUser();
      const activeUserEmail = authData?.user?.email || authData?.user?.id || currentUser;

      const { error } = await supabase
        .from('activities')
        .update({
          type: editType,
          notes: editNotes.trim(),
          next_followup_date: editNextFollowupDate || null,
          updated_by: activeUserEmail,
        })
        .eq('id', editingActivity.id);

      if (error) throw error;

      setActivities((prev) =>
        prev.map((act) =>
          act.id === editingActivity.id
            ? {
                ...act,
                type: editType,
                notes: editNotes.trim(),
                next_followup_date: editNextFollowupDate || null,
                updated_by: activeUserEmail,
              }
            : act
        )
      );

      setIsEditActivityModalOpen(false);
    } catch (error: any) {
      alert('Aktivite güncellenirken hata oluştu: ' + error.message);
    } finally {
      setIsUpdatingActivity(false);
    }
  };

  // Yeni Aktivite Ekleme İşlemi (Başarı alert uyarısı kaldırıldı)
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return alert('Lütfen görüşme detayını giriniz.');

    try {
      setIsSubmitting(true);

      const { data: authData } = await supabase.auth.getUser();
      const activeUserEmail = authData?.user?.email || authData?.user?.id || currentUser;

      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            client_id: clientId,
            type,
            notes: notes.trim(),
            next_followup_date: nextFollowupDate || null,
            updated_by: activeUserEmail,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setActivities((prev) => [data[0], ...prev]);
        setNotes('');
        setNextFollowupDate('');
      }
    } catch (error: any) {
      alert('Aktivite eklenirken hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Silme İşlemi (İstediğin gibi sadece bu onay uyarısı aktif bırakıldı)
  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Bu aktivite kaydını silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      setActivities((prev) => prev.filter((act) => act.id !== id));
    } catch (error: any) {
      alert('Silme işlemi başarısız: ' + error.message);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-xs">Yükleniyor...</div>;
  }

  if (!client) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-xs">Müşteri bulunamadı.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ÜST BAR / NAVBAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-zinc-900 pb-4 gap-4">
          <button 
            onClick={() => router.push('/clients')}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            ← Müşteri Listesine Dön
          </button>

          <div className="flex justify-center items-center">
            <Image
              src="/verytech_beyaz.png"
              alt="Verytech CRM Logo"
              width={160}
              height={40}
              priority
              className="object-contain"
            />
          </div>

          <div className="text-zinc-600 font-mono text-[11px] hidden sm:block">
            v1.0.0 Live
          </div>
        </div>

        {/* ANA İÇERİK ALANI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* SOL TARAF: MÜŞTERİ BİLGİ KARTI */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-5 shadow-xl">
            <div className="space-y-1.5">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                client.status === 'Aktif Müşteri' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' :
                client.status === 'Pasif' ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
                'bg-indigo-950/40 text-indigo-400 border-indigo-900/60'
              }`}>
                {client.status || 'Potansiyel'}
              </span>
              <h2 className="text-lg font-black tracking-wide text-white break-words">{client.company_name}</h2>
            </div>

            <hr className="border-zinc-900" />

            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">YETKİLİ</div>
                <div className="text-sm font-medium text-zinc-300 mt-0.5">{client.contact_person || '-'}</div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">POZİSYON</div>
                <div className="text-sm font-medium text-zinc-400 mt-0.5">
                  {client.position ? `💼 ${client.position}` : '-'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">E-POSTA</div>
                <div className="text-sm font-medium text-zinc-300 font-mono mt-0.5 break-all">{client.email || '-'}</div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">TELEFON</div>
                <div className="text-sm font-medium text-zinc-300 font-mono mt-0.5">{client.phone || '-'}</div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">BÖLGE (İL / İLÇE)</div>
                <div className="text-sm font-medium text-zinc-300 mt-0.5 uppercase">
                  {client.city || '-'} / {client.district || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* SAĞ TARAF: FORM VE GÖRÜŞME GEÇMİŞİ */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* YENİ AKTİVİTE FORMU */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400">Yeni Aktivite & Görüşme Notu Ekle</h3>
              
              <form onSubmit={handleAddActivity} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500 font-bold uppercase">Yöntem (type)</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="Telefon Görüşmesi">📞 Telefon Görüşmesi</option>
                      <option value="Yüz Yüze Toplantı">🤝 Yüz Yüze Toplantı</option>
                      <option value="E-Posta Gönderimi">📩 E-Posta Gönderimi</option>
                      <option value="Online Toplantı">💻 Online Toplantı</option>
                      <option value="Teklif Atma">📄 Teklif Atma</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500 font-bold uppercase">Hatırlatma (next_followup_date)</label>
                    <input
                      type="datetime-local"
                      value={nextFollowupDate}
                      onChange={(e) => setNextFollowupDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">Görüşme Detayı (notes)</label>
                  <textarea
                    rows={4}
                    placeholder="Görüşülen konuları, alınan kararları buraya kronolojik işlenmek üzere girin..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-black px-5 py-2.5 rounded-lg transition-colors shadow-md cursor-pointer"
                  >
                    {isSubmitting ? 'İşleniyor...' : 'Aktiviteyi İşle'}
                  </button>
                </div>
              </form>
            </div>

            {/* GÖRÜŞME GEÇMİŞİ LİSTESİ */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400">
                Görüşme Geçmişi ({activities.length})
              </h3>

              {activities.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 text-center text-xs text-zinc-600 font-medium">
                  Bu müşteriye ait henüz bir aktivite veya görüşme notu girilmemiş.
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-3 shadow-md">
                      
                      {/* ÜST BİLGİ ALANI */}
                      <div className="flex items-center justify-between text-xs border-b border-zinc-900/60 pb-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-300 font-bold text-[11px]">
                            {act.type === 'Telefon Görüşmesi' ? '📞' : 
                             act.type === 'Yüz Yüze Toplantı' ? '🤝' : 
                             act.type === 'E-Posta Gönderimi' ? '📩' : 
                             act.type === 'Online Toplantı' ? '💻' : 
                             act.type === 'Teklif Atma' ? '📄' : '📝'} {act.type}
                          </span>
                          <span className="text-zinc-500 font-mono text-[11px]">
                            {formatDateTime(act.created_at)}
                          </span>

                          {/* AKTİVİTEYİ EKLEYEN BİLGİSİ */}
                          <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-900/30">
                            ✍️ Ekleyen: {formatUpdatedBy(act.updated_by)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
                          <button 
                            onClick={() => openEditActivityModal(act)} 
                            className="hover:text-amber-500 transition-colors cursor-pointer"
                          >
                            Düzenle ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteActivity(act.id)} 
                            className="hover:text-red-500 transition-colors cursor-pointer"
                          >
                            Sil 🗑️
                          </button>
                        </div>
                      </div>

                      {/* NOT METNİ */}
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words pl-1">
                        {act.notes}
                      </p>

                      {/* GELECEK HATIRLATMA TARİHİ VARSA */}
                      {act.next_followup_date && (
                        <div className="text-[10px] font-mono font-bold bg-red-950/20 text-red-400 border border-red-900/40 px-2 py-1 rounded w-fit">
                          ⏳ Sonraki Takip / Hatırlatma: {formatDateTime(act.next_followup_date)}
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

      {/* AKTİVİTE DÜZENLEME MODALI */}
      {isEditActivityModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Aktiviteyi Düzenle</h3>
                <p className="text-[11px] text-zinc-500 font-medium">Görüşme detaylarını ve hatırlatmayı güncelleyin</p>
              </div>
              <button 
                onClick={() => setIsEditActivityModalOpen(false)} 
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateActivity} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">Yöntem (type)</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white cursor-pointer focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="Telefon Görüşmesi">📞 Telefon Görüşmesi</option>
                    <option value="Yüz Yüze Toplantı">🤝 Yüz Yüze Toplantı</option>
                    <option value="E-Posta Gönderimi">📩 E-Posta Gönderimi</option>
                    <option value="Online Toplantı">💻 Online Toplantı</option>
                    <option value="Teklif Atma">📄 Teklif Atma</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">Hatırlatma (next_followup_date)</label>
                  <input
                    type="datetime-local"
                    value={editNextFollowupDate}
                    onChange={(e) => setEditNextFollowupDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Görüşme Detayı (notes)</label>
                <textarea
                  rows={5}
                  placeholder="Görüşme notlarını girin..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-900 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditActivityModalOpen(false)} 
                  className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdatingActivity} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {isUpdatingActivity ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}