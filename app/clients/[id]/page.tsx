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

  // Yeni Görüşme Formu State'leri
  const [newType, setNewType] = useState('Telefon Görüşmesi');
  const [newNotes, setNewNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Görüşme Düzenleme Modal State'leri
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);
  const [editType, setEditType] = useState('Telefon Görüşmesi');
  const [editNotes, setEditNotes] = useState('');
  const [editNextFollowupDate, setEditNextFollowupDate] = useState('');
  const [isUpdatingActivity, setIsUpdatingActivity] = useState(false);

  // Çıkış Yükleniyor State'i
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Müşteri bilgilerini çek
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // 2. Müşteriye ait aktiviteleri/görüşmeleri çek (en yeni en üstte)
      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;
      setActivities(activityData || []);

    } catch (error: any) {
      alert('Veriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Aktif session'daki kullanıcıyı bul
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user.email || data.user.id);
      }
    });
  }, [clientId]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    const confirmLogout = confirm('Oturumu kapatmak istediğinize emin misiniz?');
    if (!confirmLogout) return;

    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      
      if (res.ok) {
        router.push('/register');
        router.refresh();
      } else {
        alert('Çıkış yapılırken bir hata oluştu.');
      }
    } catch (err) {
      console.error(err);
      alert('Bağlantı hatası oluştu.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotes.trim()) return alert('Görüşme notu alanı boş bırakılamaz.');

    try {
      setIsSubmitting(true);

      const insertData: any = {
        client_id: clientId,
        type: newType,
        notes: newNotes.trim(),
        updated_by: currentUser,
      };

      if (nextFollowupDate) {
        insertData.next_followup_date = new Date(nextFollowupDate).toISOString();
      }

      const { data, error } = await supabase
        .from('activities')
        .insert([insertData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setActivities((prev) => [data[0], ...prev]);
        setNewNotes('');
        setNextFollowupDate('');
      }
    } catch (error: any) {
      alert('Görüşme eklenirken hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    const confirmDelete = confirm('Bu görüşme notunu silmek istediğinize emin misiniz?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      setActivities((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      alert('Görüşme silinirken hata oluştu: ' + error.message);
    }
  };

  const openEditActivityModal = (activity: ActivityData) => {
    setEditingActivity(activity);
    setEditType(activity.type || 'Telefon Görüşmesi');
    setEditNotes(activity.notes || '');
    
    if (activity.next_followup_date) {
      const localDate = new Date(activity.next_followup_date);
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      setEditNextFollowupDate(localDate.toISOString().slice(0, 16));
    } else {
      setEditNextFollowupDate('');
    }
    
    setIsEditActivityModalOpen(true);
  };

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity || !editNotes.trim()) return;

    try {
      setIsUpdatingActivity(true);

      const updateData: any = {
        type: editType,
        notes: editNotes.trim(),
        updated_by: currentUser,
        is_completed: false 
      };

      if (editNextFollowupDate) {
        updateData.next_followup_date = new Date(editNextFollowupDate).toISOString();
      } else {
        updateData.next_followup_date = null;
      }

      const { error } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', editingActivity.id);

      if (error) throw error;

      setActivities((prev) =>
        prev.map((item) =>
          item.id === editingActivity.id
            ? {
                ...item,
                type: editType,
                notes: editNotes,
                next_followup_date: editNextFollowupDate ? new Date(editNextFollowupDate).toISOString() : null,
                updated_by: currentUser,
              }
            : item
        )
      );

      setIsEditActivityModalOpen(false);
    } catch (error: any) {
      alert('Güncelleme hatası: ' + error.message);
    } finally {
      setIsUpdatingActivity(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-xs font-medium">
        Müşteri detayları yükleniyor...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-xs font-medium space-y-4 flex-col">
        <span>⚠️ Müşteri bulunamadı veya silinmiş.</span>
        <button onClick={() => router.push('/clients')} className="bg-zinc-900 border border-zinc-800 text-xs px-4 py-2 rounded-lg">
          Listeye Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ÜST GEZİNTİ VE LOGO BARBARI */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4 relative z-40">
          <button 
            onClick={() => router.push('/clients')}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            ← Müşteri Listesine Geri Dön
          </button>

          <div className="hidden sm:block">
            <Image
              src="/verytech_beyaz.png"
              alt="Verytech CRM Logo"
              width={130}
              height={32}
              priority
              className="object-contain"
            />
          </div>

          {/* EN SAĞ KÖŞEYE HİZALANMIŞ ÇIKIŞ YAP BUTONU */}
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/40 text-zinc-400 hover:text-red-400 font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[36px] cursor-pointer disabled:opacity-50"
          >
            {"\uD83D\uDEAA"} {isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
          </button>
        </div>

        {/* KART 1: MÜŞTERİ STATİK KART BİLGİSİ */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">{client.company_name}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Sistem ID: <span className="font-mono text-[11px]">{client.id}</span></p>
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                client.status === 'Aktif Müşteri' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' :
                client.status === 'Pasif' ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
                'bg-indigo-950/40 text-indigo-400 border-indigo-900/60'
              }`}>
                {client.status || 'Potansiyel'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider block">Yetkili Kişi</span>
              <span className="text-zinc-200 font-medium text-sm">{client.contact_person || 'Belirtilmemiş'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider block">Pozisyon / Unvan</span>
              <span className="text-zinc-200 font-medium text-sm">{client.position ? `💼 ${client.position}` : 'Belirtilmemiş'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider block">Bölge (İl / İlçe)</span>
              <span className="text-zinc-200 font-medium text-sm">
                {client.city || '-'} / <span className="text-zinc-400 text-xs">{client.district || '-'}</span>
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider block">İletişim Kanalları</span>
              <div className="font-mono text-[11px] text-zinc-300 space-y-0.5">
                {client.email && <span className="block">{client.email}</span>}
                {client.phone && <span className="block text-zinc-400">{client.phone}</span>}
                {!client.email && !client.phone && <span>-</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* FORMLU ALAN: YENİ GÖRÜŞME NOTU EKLE */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">Yeni Görüşme Ekle</h2>
            <form onSubmit={handleAddActivity} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Görüşme Tipi</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Telefon Görüşmesi">📞 Telefon Görüşmesi</option>
                  <option value="Yüz Yüze Toplantı">🤝 Yüz Yüze Toplantı</option>
                  <option value="E-Posta Gönderimi">📧 E-Posta Gönderimi</option>
                  <option value="Teklif Sunumu">📄 Teklif Sunumu</option>
                  <option value="Diğer">⚙️ Diğer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Görüşme Notları *</label>
                <textarea
                  rows={4}
                  placeholder="Müşteri ile ne konuşuldu? Önemli detayları buraya yazın..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Sonraki Takip / Hatırlatma Tarihi</label>
                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-600 block mt-1">İsteğe bağlıdır. Seçilirse anasayfada uyarı olarak düşer.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-black py-2.5 rounded-lg transition-all shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Kaydediliyor...' : '+ Görüşmeyi Kaydet'}
              </button>
            </form>
          </div>

          {/* LİSTE ALANI: GEÇMİŞ CRM AKIŞI NOTLARI */}
          <div className="md:col-span-2 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 pl-1">Müşteri Geçmişi & Görüşme Notları ({activities.length})</h2>
            
            {activities.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 text-center text-xs text-zinc-600 font-medium">
                Bu müşteriye ait henüz bir görüşme geçmişi girilmemiş 📥
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {activities.map((activity) => (
                  <div key={activity.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 shadow-md space-y-3 relative group transition-all hover:border-zinc-800">
                    
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
                          {activity.type}
                        </span>
                      </div>
                      <div className="text-right font-mono text-[10px] text-zinc-500 space-y-0.5">
                        <span className="block font-bold text-zinc-400">👤 {formatUpdatedBy(activity.updated_by)}</span>
                        <span className="block">{formatDateTime(activity.created_at)}</span>
                      </div>
                    </div>

                    <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap break-words italic">
                      "{activity.notes}"
                    </p>

                    {activity.next_followup_date && (
                      <div className="bg-zinc-900/50 border border-zinc-900 rounded-lg p-2 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 font-bold uppercase text-[10px]">🗓️ Sonraki Takip:</span>
                        <span className="font-mono font-bold text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-900/40">
                          {formatDateTime(activity.next_followup_date)}
                        </span>
                      </div>
                    )}

                    {/* Silme & Düzenleme Butonları */}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button 
                        onClick={() => openEditActivityModal(activity)}
                        className="text-zinc-500 hover:text-amber-500 text-xs bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="text-zinc-500 hover:text-red-500 text-xs bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* GÖRÜŞME DÜZENLEME MODAL'I */}
      {isEditActivityModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-xl overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Görüşme Notunu Düzenle</h3>
              </div>
              <button onClick={() => setIsEditActivityModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleUpdateActivity} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Görüşme Tipi</label>
                <select 
                  value={editType} 
                  onChange={(e) => setEditType(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white cursor-pointer"
                >
                  <option value="Telefon Görüşmesi">📞 Telefon Görüşmesi</option>
                  <option value="Yüz Yüze Toplantı">🤝 Yüz Yüze Toplantı</option>
                  <option value="E-Posta Gönderimi">📧 E-Posta Gönderimi</option>
                  <option value="Teklif Sunumu">📄 Teklif Sunumu</option>
                  <option value="Diğer">⚙️ Diğer</option>
                </select>
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

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Sonraki Takip Tarihi</label>
                <input 
                  type="datetime-local" 
                  value={editNextFollowupDate} 
                  onChange={(e) => setEditNextFollowupDate(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white cursor-pointer" 
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