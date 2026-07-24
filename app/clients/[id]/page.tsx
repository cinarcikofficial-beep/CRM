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
  created_at: string;
  updated_by: string | null;
}

interface ActivityData {
  id: string;
  client_id: string;
  user_id?: string | null;
  updated_by?: string | null;
  type: string;
  notes: string | null;
  activity_date: string;
  next_followup_date: string | null;
  created_at: string;
  is_completed: boolean;
  users?: {
    id?: string;
    name?: string;
    full_name?: string;
    email?: string;
  } | null;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const router = useRouter();
  const supabase = createClient();

  const [client, setClient] = useState<ClientData | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  // İleri / Geri Müşteri Navigasyon State'leri
  const [prevClientId, setPrevClientId] = useState<string | null>(null);
  const [nextClientId, setNextClientId] = useState<string | null>(null);

  // Form State - Ekleme
  const [activityType, setActivityType] = useState('Telefon');
  const [activityNotes, setActivityNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Düzenleme
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);
  const [editType, setEditType] = useState('Telefon');
  const [editNotes, setEditNotes] = useState('');
  const [editNextFollowupDate, setEditNextFollowupDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Silme Onay State
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  // Kullanıcı ve Bildirim State'leri
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  // Müşteri & Aktivite Verilerini Çekme
  const fetchClientData = async () => {
    try {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*, users(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (activityError) {
        const { data: fallbackData } = await supabase
          .from('activities')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        setActivities(fallbackData || []);
      } else {
        setActivities(activityData || []);
      }

      // Önceki ve Sonraki Müşteri ID'lerini Tespit Etme
      const { data: allClients, error: listError } = await supabase
        .from('clients')
        .select('id')
        .order('created_at', { ascending: false });

      if (!listError && allClients) {
        const currentIndex = allClients.findIndex((item) => item.id === clientId);
        if (currentIndex !== -1) {
          // Önceki Müşteri
          if (currentIndex > 0) {
            setPrevClientId(allClients[currentIndex - 1].id);
          } else {
            setPrevClientId(null);
          }

          // Sonraki Müşteri
          if (currentIndex < allClients.length - 1) {
            setNextClientId(allClients[currentIndex + 1].id);
          } else {
            setNextClientId(null);
          }
        }
      }

    } catch (error: any) {
      setCustomAlert('Müşteri bilgileri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        setCurrentUserEmail(data.user.email || null);
      }
    });
  }, [clientId]);

  // Yeni Aktivite Ekleme
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityNotes.trim()) {
      setCustomAlert('Lütfen görüşme notu giriniz.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: authData } = await supabase.auth.getUser();
      const activeEmail = authData?.user?.email || currentUserEmail;
      const activeUserId = authData?.user?.id || currentUserId;

      const payload: any = {
        client_id: clientId,
        type: activityType,
        notes: activityNotes.trim(),
        next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : null,
        is_completed: false,
        updated_by: activeEmail,
      };

      if (activeUserId) {
        payload.user_id = activeUserId;
      }

      const { error } = await supabase.from('activities').insert([payload]);

      if (error) throw error;

      setActivityNotes('');
      setNextFollowupDate('');
      fetchClientData();
      setCustomAlert('Görüşme kaydı başarıyla eklendi.');
    } catch (error: any) {
      setCustomAlert('Aktivite eklenirken hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Düzenleme Modalını Açma
  const handleOpenEdit = (act: ActivityData) => {
    setEditingActivity(act);
    setEditType(act.type || 'Telefon');
    setEditNotes(act.notes || '');
    if (act.next_followup_date) {
      const d = new Date(act.next_followup_date);
      const formatted = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditNextFollowupDate(formatted);
    } else {
      setEditNextFollowupDate('');
    }
  };

  // Aktivite Güncelleme
  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    if (!editNotes.trim()) {
      setCustomAlert('Lütfen görüşme notu giriniz.');
      return;
    }

    try {
      setIsUpdating(true);
      const { data: authData } = await supabase.auth.getUser();
      const activeEmail = authData?.user?.email || currentUserEmail;

      const { error } = await supabase
        .from('activities')
        .update({
          type: editType,
          notes: editNotes.trim(),
          next_followup_date: editNextFollowupDate ? new Date(editNextFollowupDate).toISOString() : null,
          updated_by: activeEmail,
        })
        .eq('id', editingActivity.id);

      if (error) throw error;

      setEditingActivity(null);
      fetchClientData();
      setCustomAlert('Görüşme kaydı başarıyla güncellendi.');
    } catch (error: any) {
      setCustomAlert('Güncelleme yapılırken hata oluştu: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Aktivite Silme Onaylı
  const handleDeleteActivity = async () => {
    if (!deletingActivityId) return;

    try {
      const { error } = await supabase.from('activities').delete().eq('id', deletingActivityId);
      if (error) throw error;
      setActivities((prev) => prev.filter((act) => act.id !== deletingActivityId));
      setDeletingActivityId(null);
    } catch (error: any) {
      setCustomAlert('Aktivite silinirken hata oluştu: ' + error.message);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/register');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getUserName = (act: ActivityData) => {
    const rawUser = act.updated_by || act.user_id;

    if (rawUser && typeof rawUser === 'string') {
      if (rawUser.includes('@')) {
        const emailHandle = rawUser.split('@')[0];
        const firstName = emailHandle.split('.')[0];
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
      }
      if (!rawUser.includes('-')) {
        return rawUser;
      }
    }

    const u = Array.isArray(act.users) ? act.users[0] : act.users;
    if (u) {
      const name = u.name || u.full_name || u.email;
      if (name) {
        if (name.includes('@')) {
          const handle = name.split('@')[0].split('.')[0];
          return handle.charAt(0).toUpperCase() + handle.slice(1);
        }
        return name;
      }
    }

    if (act.user_id && act.user_id === currentUserId && currentUserEmail) {
      const handle = currentUserEmail.split('@')[0].split('.')[0];
      return handle.charAt(0).toUpperCase() + handle.slice(1);
    }

    return 'Kullanıcı';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1321] text-slate-100 flex items-center justify-center font-sans">
        <p className="text-slate-400 text-sm animate-pulse">Müşteri detayları ve görüşmeler yükleniyor...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#0d1321] text-slate-100 p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-red-400 text-sm">Müşteri bulunamadı veya silinmiş olabilir.</p>
        <button
          onClick={() => router.push('/clients')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-bold cursor-pointer"
        >
          ← Müşteri Listesine Dön
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1321] text-slate-100 p-6 relative font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ÜST BAŞLIK & NAVİGASYON */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto justify-start flex-wrap">
            <button
              onClick={() => router.push('/clients')}
              className="bg-[#141d30] hover:bg-[#1c263c] border border-slate-700/50 text-slate-200 font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[38px] cursor-pointer"
            >
              ← Müşteri Listesine Geri Dön
            </button>

            {/* ÖNCEKİ MÜŞTERİ BUTONU */}
            <button
              onClick={() => prevClientId && router.push(`/clients/${prevClientId}`)}
              disabled={!prevClientId}
              title={prevClientId ? 'Bir Önceki Müşteriye Geç' : 'Listenin başındaki müşteridesiniz'}
              className={`border text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[38px] ${
                prevClientId
                  ? 'bg-indigo-600/20 hover:bg-indigo-600/40 border-indigo-500/50 text-indigo-300 cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              ← Önceki Müşteri
            </button>

            {/* SONRAKİ MÜŞTERİ BUTONU */}
            <button
              onClick={() => nextClientId && router.push(`/clients/${nextClientId}`)}
              disabled={!nextClientId}
              title={nextClientId ? 'Bir Sonraki Müşteriye Geç' : 'Listenin sonındaki müşteridesiniz'}
              className={`border text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[38px] ${
                nextClientId
                  ? 'bg-indigo-600/20 hover:bg-indigo-600/40 border-indigo-500/50 text-indigo-300 cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              Sonraki Müşteri →
            </button>
          </div>

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

          <div className="flex justify-end items-center gap-2 w-full md:w-auto">
            {/* RAPORLAR BUTONU */}
            <button
              onClick={() => router.push('/reports')}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2.5 rounded-lg transition-all shadow-md cursor-pointer h-[38px] flex items-center gap-1.5 whitespace-nowrap"
            >
              📊 Raporlar
            </button>

            {/* ÇIKIŞ YAP BUTONU */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-amber-950/20 hover:bg-amber-900/40 border border-amber-900/30 text-amber-400 font-semibold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[38px] cursor-pointer disabled:opacity-50"
            >
              🚪 {isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
            </button>
          </div>
        </div>

        {/* MÜŞTERİ BİLGİ KARTI */}
        <div className="bg-[#141d30] border border-slate-800/80 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-800/60 pb-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">{client.company_name}</h1>
            </div>
            <span className={`px-3 py-1 rounded text-xs font-black tracking-wider uppercase border ${
              client.status === 'Aktif Müşteri' 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                : client.status === 'Pasif' 
                ? 'bg-zinc-900 text-zinc-500 border-zinc-800' 
                : 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50'
            }`}>
              {client.status || 'Potansiyel'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Yetkili Kişi</span>
              <span className="font-semibold text-slate-200">{client.contact_person || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pozisyon / Unvan</span>
              <span className="font-semibold text-slate-300">
                {client.position ? `💼 ${client.position}` : '-'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bölge (İl / İlçe)</span>
              <span className="font-semibold text-slate-300">
                {client.city || client.district ? `${client.city || '-'} / ${client.district || '-'}` : '-'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">İletişim Kanalları</span>
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="text-indigo-400 hover:text-indigo-300 hover:underline font-medium truncate block transition-colors"
                >
                  ✉️ {client.email}
                </a>
              )}
              {client.phone && <p className="text-slate-300 font-mono">📞 {client.phone}</p>}
              {!client.email && !client.phone && <p className="text-slate-600">-</p>}
            </div>
          </div>
        </div>

        {/* ALT ALAN: AKTİVİTE EKLE VE GEÇMİŞ LİSTESİ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* YENİ GÖRÜŞME EKLE FORMU */}
          <div className="bg-[#141d30] border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4 h-fit">
            <h2 className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Yeni Görüşme Ekle</h2>
            
            <form onSubmit={handleAddActivity} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-bold uppercase">Görüşme Tipi</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full bg-[#1c263c] border border-slate-700/60 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="Telefon">📞 Telefon</option>
                  <option value="E-Posta">✉️ E-Posta</option>
                  <option value="Toplantı">🤝 Toplantı</option>
                  <option value="Teklif Atma">📄 Teklif Atma</option>
                  <option value="Mail Dönüş">📬 Mail Dönüş</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-bold uppercase">Görüşme Notları *</label>
                <textarea
                  rows={4}
                  placeholder="Müşteri ile yapılan görüşme detaylarını buraya yazın..."
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  className="w-full bg-[#1c263c] border border-slate-700/60 text-xs p-3 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-bold uppercase">Sonraki Takip Tarihi</label>
                <input
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full bg-[#1c263c] border border-slate-700/60 text-xs p-2.5 rounded-lg text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-black text-xs py-2.5 rounded-lg transition-all shadow-md cursor-pointer mt-2"
              >
                {isSubmitting ? 'Kaydedildiği...' : '+ Görüşmeyi Kaydet'}
              </button>
            </form>
          </div>

          {/* MÜŞTERİ GEÇMİŞİ LİSTESİ */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              Müşteri Geçmişi & Görüşme Notları ({activities.length})
            </h2>

            {activities.length === 0 ? (
              <div className="bg-[#141d30] border border-slate-800/80 rounded-xl p-8 text-center text-slate-500 text-xs">
                Bu müşteri için henüz kaydedilmiş bir görüşme notu bulunmuyor.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div key={act.id} className="bg-[#141d30] border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <span className="bg-slate-900 border border-slate-700/60 text-indigo-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                        {act.type}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(act)}
                          className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          onClick={() => setDeletingActivityId(act.id)}
                          className="bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1"
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 italic leading-relaxed bg-[#0d1321]/50 p-3 rounded-lg border border-slate-800/40">
                      "{act.notes}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                      <div className="flex items-center gap-3">
                        <span>📅 {formatDateTime(act.created_at || act.activity_date)}</span>
                        <span>👤 {getUserName(act)}</span>
                      </div>

                      {act.next_followup_date && (
                        <span className="bg-amber-950/40 border border-amber-900/50 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded">
                          🔔 Sonraki Takip: {formatDateTime(act.next_followup_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* DÜZENLEME MODAL */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                ✏️ Görüşme Kaydını Düzenle
              </h3>
              <button
                onClick={() => setEditingActivity(null)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateActivity} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-bold uppercase">Görüşme Tipi</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full bg-[#1c263c] border border-slate-700/60 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
                >
                  <option value="Telefon">📞 Telefon</option>
                  <option value="E-Posta">✉️ E-Posta</option>
                  <option value="Toplantı">🤝 Toplantı</option>
                  <option value="Teklif Atma">📄 Teklif Atma</option>
                  <option value="Mail Dönüş">📬 Mail Dönüş</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-bold uppercase">Görüşme Notları *</label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#1c263c] border border-slate-700/60 text-xs p-3 rounded-lg text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-bold uppercase">Sonraki Takip Tarihi</label>
                <input
                  type="datetime-local"
                  value={editNextFollowupDate}
                  onChange={(e) => setEditNextFollowupDate(e.target.value)}
                  className="w-full bg-[#1c263c] border border-slate-700/60 text-xs p-2.5 rounded-lg text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg font-bold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white text-xs px-5 py-2.5 rounded-lg font-bold cursor-pointer transition-all"
                >
                  {isUpdating ? 'Güncelleniyor...' : 'Güncellemeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {deletingActivityId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-2xl">⚠️</span>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-200">Silme Onayı</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Bu görüşme kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingActivityId(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDeleteActivity}
                className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-5 py-2 rounded-xl transition-colors shadow-md cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SİSTEM BİLDİRİM PENCERESİ */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 text-indigo-400">
              <span className="text-2xl">💡</span>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-200">Sistem Bilgisi</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">{customAlert}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setCustomAlert(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-5 py-2 rounded-xl transition-colors shadow-md cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}