'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  created_at: string;
  updated_by: string | null;
}

interface ActivityData {
  id: string;
  client_id: string;
  type: string;
  notes: string | null;
  activity_date: string;
  next_followup_date: string | null;
  is_completed: boolean;
  updated_by: string | null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id as string;

  // DEĞİŞİKLİK: Başlangıçta null atandı, useEffect içinde dinamik doldurulacak.
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State'leri (Varsayılan olarak ilk raporlama alanı seçildi)
  const [notes, setNotes] = useState('');
  const [activityType, setActivityType] = useState('Telefon');
  const [nextFollowup, setNextFollowup] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Düzenleme Modalı State'leri
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editActivityType, setEditActivityType] = useState('Telefon');
  const [editNextFollowup, setEditNextFollowup] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Özel Onay/Hata Pencereleri State'leri
  const [customAlert, setCustomAlert] = useState<string | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Veri Çekme
  useEffect(() => {
    const loadInitialData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);

        // DEĞİŞİKLİK: Giriş yapan aktif kullanıcının bilgisini çekiyoruz
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setCurrentUser(userData.user.email || userData.user.id);
        }

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

      } catch (err: any) {
        console.error("Veri yükleme hatası:", err.message);
        setCustomAlert("Müşteri geçmişi yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [id, supabase]);

  const handleLogout = async () => {
    setCustomConfirm({
      message: "Oturumu kapatmak istediğinize emin misiniz?",
      onConfirm: async () => {
        setIsLoggingOut(true);
        try {
          router.push('/register');
        } catch (err) {
          setCustomAlert("Bağlantı hatası oluştu.");
        } finally {
          setIsLoggingOut(false);
          setCustomConfirm(null);
        }
      }
    });
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setCustomAlert("Lütfen görüşme notlarını doldurun.");
      return;
    }

    setIsSubmitting(true);
    try {
      const activityPayload = {
        client_id: id,
        type: activityType, // Raporlama alanına uygun değer gider (Örn: "E-Posta")
        notes: notes.trim(),
        activity_date: new Date().toISOString(),
        next_followup_date: nextFollowup ? new Date(nextFollowup).toISOString() : null,
        is_completed: false,
        updated_by: currentUser
      };

      const { data, error } = await supabase
        .from('activities')
        .insert([activityPayload])
        .select()
        .single();

      if (error) throw error;

      setActivities([data, ...activities]);
      setNotes('');
      setNextFollowup('');
    } catch (err: any) {
      setCustomAlert("Görüşme notu kaydedilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = (activityId: string) => {
    setCustomConfirm({
      message: "Bu görüşme notunu silmek istediğinize emin misiniz?",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('activities').delete().eq('id', activityId);
          if (error) throw error;
          setActivities(activities.filter(act => act.id !== activityId));
        } catch (err: any) {
          setCustomAlert("Silme işlemi gerçekleştirilemedi.");
        } finally {
          setCustomConfirm(null);
        }
      }
    });
  };

  const openEditActivityModal = (activity: ActivityData) => {
    setEditingActivity(activity);
    setEditNotes(activity.notes || '');
    setEditActivityType(activity.type || 'Telefon');
    setEditNextFollowup(activity.next_followup_date ? activity.next_followup_date.slice(0, 16) : '');
    setIsEditModalOpen(true);
  };

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    if (!editNotes.trim()) {
      setCustomAlert("Görüşme notu boş bırakılamaz.");
      return;
    }

    setIsUpdating(true);
    try {
      const updatedPayload = {
        notes: editNotes.trim(),
        type: editActivityType,
        next_followup_date: editNextFollowup ? new Date(editNextFollowup).toISOString() : null,
        updated_by: currentUser
      };

      const { error } = await supabase
        .from('activities')
        .update(updatedPayload)
        .eq('id', editingActivity.id);

      if (error) throw error;

      setActivities(prev =>
        prev.map(act => act.id === editingActivity.id ? { ...act, ...updatedPayload } : act)
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      setCustomAlert("Değişiklikler kaydedilirken bir hata oluştu.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // E-posta adresini isme dönüştüren küçük bir temizlik fonksiyonu (Örn: barlas.soyad@veri.com -> Barlas)
  const formatUpdatedBy = (emailOrId: string | null) => {
    if (!emailOrId) return 'Sistem';
    if (emailOrId.includes('@')) {
      const handle = emailOrId.split('@')[0];
      const rawName = handle.split('.')[0];
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
    return emailOrId.slice(0, 7);
  };

  // Badge'lerin ikon yönetimini raporlama alanlarına göre ayarlayan yardımcı fonksiyon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Telefon': return '📞';
      case 'E-Posta': return '✉️';
      case 'Toplantı': return '🤝';
      case 'Teklif Atma': return '📄';
      case 'SMS / WP': return '💬';
      default: return '📝';
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1321] text-slate-100 p-6 relative font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ÜST GEZİNTİ BARBARI */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-4 gap-4 relative z-40">
          <button 
            onClick={() => router.push('/clients')}
            className="bg-[#141d30] hover:bg-[#1c263c] border border-slate-700/60 text-xs font-bold px-4 py-2 rounded-lg transition-all text-slate-300 flex items-center gap-2 cursor-pointer h-[38px]"
          >
            ← Müşteri Listesine Geri Dön
          </button>

          <div className="flex justify-center items-center">
            <Image src="/verytech_beyaz.png" alt="Verytech CRM Logo" width={160} height={40} priority className="object-contain" />
          </div>

          <button 
            onClick={handleLogout} disabled={isLoggingOut}
            className="bg-amber-950/20 hover:bg-amber-900/40 border border-amber-900/30 text-amber-400 font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[38px] cursor-pointer disabled:opacity-50"
          >
            🚪 {isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Müşteri detayları veritabanından çağrılıyor...</div>
        ) : (
          <>
            {/* MÜŞTERİ KART PANELİ */}
            <div className="bg-[#141d30] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-wide">{client?.company_name}</h1>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">Sistem ID: {client?.id}</p>
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-zinc-900 text-slate-400 border border-zinc-800">
                  {client?.status || 'POTANSİYEL'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800/60">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase block">YETKİLİ KİŞİ</span>
                  <span className="text-sm font-semibold text-slate-200">{client?.contact_person || '-'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase block">POZİSYON / UNVAN</span>
                  <span className="text-sm font-semibold text-slate-200 flex items-center gap-1">💼 {client?.position || '-'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase block">BÖLGE (İL / İLÇE)</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {client?.city} / <span className="text-slate-400 font-normal">{client?.district}</span>
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase block">İLETİŞİM KANALLARI</span>
                  <div className="text-xs font-mono font-medium leading-relaxed">
                    <div className="text-indigo-300">{client?.email || '-'}</div>
                    <div className="text-slate-400">{client?.phone || ''}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ALT DETAY ALANI */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* RAPORLAMA UYUMLU GÖRÜŞME EKLEME FORMU */}
              <div className="bg-[#141d30] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">YENİ GÖRÜŞME EKLE</h3>
                
                <form onSubmit={handleAddActivity} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">GÖRÜŞME TİPİ (RAPORLAMA ALANI)</label>
                    <select
                      value={activityType} onChange={(e) => setActivityType(e.target.value)}
                      className="w-full bg-[#1c263c] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer h-[36px]"
                    >
                      <option value="Telefon">📞 Telefon</option>
                      <option value="E-Posta">✉️ E-Posta</option>
                      <option value="Toplantı">🤝 Toplantı</option>
                      <option value="Teklif Atma">📄 Teklif Atma</option>
                      <option value="SMS / WP">💬 SMS / WP</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">GÖRÜŞME NOTLARI *</label>
                    <textarea
                      required rows={4} placeholder="Müşteri ile ne konuşuldu? İstatistiklere yansıyacak detayları girin..." value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-[#1c263c] border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SONRAKİ TAKİP TARİHİ</label>
                    <input
                      type="datetime-local" value={nextFollowup} onChange={(e) => setNextFollowup(e.target.value)}
                      className="w-full bg-[#1c263c] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit" disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-2.5 rounded-xl shadow-lg hover:shadow-indigo-600/20 transition-all cursor-pointer h-[38px]"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : '+ Görüşmeyi Kaydet'}
                  </button>
                </form>
              </div>

              {/* GÖRÜŞME GEÇMİŞİ AKIŞI */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase px-1">
                  MÜŞTERI GEÇMİŞI & GÖRÜŞME NOTLARI ({activities.length})
                </h3>

                {activities.length === 0 ? (
                  <div className="bg-[#141d30]/60 border border-slate-800 p-8 text-center rounded-2xl text-slate-500 text-xs font-medium">
                    Bu müşteriye ait henüz bir görüşme notu bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {activities.map((activity) => (
                      <div key={activity.id} className="bg-[#141d30] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3 relative">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="bg-[#1c263c] border border-slate-700/60 text-slate-300 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                            {getActivityIcon(activity.type)} {activity.type}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openEditActivityModal(activity)} className="bg-[#1c263c] hover:bg-[#253250] text-amber-400 font-bold text-[10px] px-2.5 py-1 rounded border border-slate-700/60 cursor-pointer">✏️ Düzenle</button>
                            <button onClick={() => handleDeleteActivity(activity.id)} className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer">🗑️ Sil</button>
                          </div>
                        </div>

                        <p className="text-sm text-slate-200 whitespace-pre-wrap italic">"{activity.notes}"</p>

                        <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-500 pt-2">
                          <div className="flex gap-4">
                            <span>📅 {formatDateTime(activity.activity_date)}</span>
                            {/* DEĞİŞİKLİK: Ekrandaki isim gösterimi formatUpdatedBy yardımıyla temizlendi */}
                            <span className="font-bold text-slate-400">👤 {formatUpdatedBy(activity.updated_by)}</span>
                          </div>
                          {activity.next_followup_date && (
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                              🔔 Sonraki Takip: {formatDateTime(activity.next_followup_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}

      </div>

      {/* RAPORLAMA UYUMLU DÜZENLEME MODALI */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0d1321]/40">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Görüşme Notunu Düzenle</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleUpdateActivity} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Görüşme Tipi</label>
                <select value={editActivityType} onChange={(e) => setEditActivityType(e.target.value)} className="w-full bg-[#1c263c] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white h-[36px] focus:outline-none">
                  <option value="Telefon">📞 Telefon</option>
                  <option value="E-Posta">✉️ E-Posta</option>
                  <option value="Toplantı">🤝 Toplantı</option>
                  <option value="Teklif Atma">📄 Teklif Atma</option>
                  <option value="SMS / WP">💬 SMS / WP</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Görüşme Notları *</label>
                <textarea required rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full bg-[#1c263c] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 resize-none focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Sonraki Takip Tarihi</label>
                <input type="datetime-local" value={editNextFollowup} onChange={(e) => setEditNextFollowup(e.target.value)} className="w-full bg-[#1c263c] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-slate-900 text-slate-400 font-bold text-xs px-4 py-2 rounded-lg border border-slate-700/40">İptal</button>
                <button type="submit" disabled={isUpdating} className="bg-indigo-600 text-white font-black text-xs px-5 py-2 rounded-lg shadow-md">{isUpdating ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİSTEM MODALLARI */}
      {customConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-500">
              <span>⚠️</span>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-200">Onay Gerekiyor</h4>
            </div>
            <p className="text-xs text-slate-300 font-medium">{customConfirm.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setCustomConfirm(null)} className="bg-slate-900 text-slate-400 font-bold text-xs px-4 py-2 rounded-xl border border-slate-700/40">İptal</button>
              <button onClick={customConfirm.onConfirm} className="bg-red-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md">Onayla</button>
            </div>
          </div>
        </div>
      )}

      {customAlert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-indigo-400">
              <span>💡</span>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-200">Sistem Bilgisi</h4>
            </div>
            <p className="text-xs text-slate-300 font-medium">{customAlert}</p>
            <div className="flex justify-end">
              <button onClick={() => setCustomAlert(null)} className="bg-indigo-600 text-white font-black text-xs px-5 py-2 rounded-xl shadow-md">Tamam</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}