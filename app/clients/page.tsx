'use client';

import { useState, useEffect } from 'react';
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
  city: any;       
  district: any;   
  created_at: string;
  updated_by: string | null;
}

interface ReminderData {
  id: string;
  client_id: string;
  type: string;
  notes: string | null;
  next_followup_date: string;
  is_completed: boolean;
  clients: {
    company_name: string;
  } | null;
}

export default function ClientsPage() {
  const router = useRouter();
  const supabase = createClient();

  // Aktif Giriş Yapan Kullanıcı Bilgisi
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Liste ve Arama State'leri
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Hatırlatma State'leri
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [postponeReminderId, setPostponeReminderId] = useState<string | null>(null);
  const [customPostponeDate, setCustomPostponeDate] = useState('');

  // Form State'leri
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('');          
  const [newDistrict, setNewDistrict] = useState('');  
  const [newStatus, setNewStatus] = useState('Potansiyel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Düzenleme Modal State'leri
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');        
  const [editDistrict, setEditDistrict] = useState('');
  const [editStatus, setEditStatus] = useState('Potansiyel');
  const [isUpdating, setIsUpdating] = useState(false);

  // Çıkış Yükleniyor State'i
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      alert('Müşteriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          client_id,
          type,
          notes,
          next_followup_date,
          is_completed,
          clients (
            company_name
          )
        `)
        .not('next_followup_date', 'is', null)
        .eq('is_completed', false)
        .order('next_followup_date', { ascending: true });

      if (error) throw error;
      setReminders((data as any) || []);
    } catch (error) {
      console.error('Hatırlatmalar yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchReminders();

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user.email || data.user.id);
      }
    });
  }, []);

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

  const handleCompleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_completed: true })
        .eq('id', id);

      if (error) throw error;
      setReminders((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      alert('İşlem başarısız: ' + error.message);
    }
  };

  const handleCustomPostpone = async (id: string) => {
    if (!customPostponeDate) return alert('Lütfen ileri bir tarih seçin.');

    try {
      const selectedDate = new Date(customPostponeDate).toISOString();

      const { error } = await supabase
        .from('activities')
        .update({ next_followup_date: selectedDate })
        .eq('id', id);

      if (error) throw error;
      
      setPostponeReminderId(null);
      setCustomPostponeDate('');
      fetchReminders();
    } catch (error: any) {
      alert('Erteleme başarısız: ' + error.message);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return alert('Müşteri / Firma Adı zorunludur.');

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            company_name: newCompanyName.trim(),
            contact_person: newContactPerson.trim() || null,
            position: newPosition.trim() || null,
            email: newEmail.trim() || null,
            phone: newPhone.trim() || null,
            city: newCity.trim() || null,            
            district: newDistrict.trim() || null,    
            status: newStatus,
            updated_by: currentUser,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setClients((prev) => [data[0], ...prev]);
        setNewCompanyName('');
        setNewContactPerson('');
        setNewPosition('');
        setNewEmail('');
        setNewPhone('');
        setNewCity('');
        setNewDistrict('');
        setNewStatus('Potansiyel');
      }
    } catch (error: any) {
      alert('Müşteri eklenirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    const confirmDelete = confirm(`"${name}" isimli müşteriyi silmek istediğinize emin misiniz?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      setClients((prev) => prev.filter((client) => client.id !== id));
    } catch (error: any) {
      alert('Müşteri silinirken hata oluştu: ' + error.message);
    }
  };

  const openEditModal = (client: ClientData) => {
    setEditingClient(client);
    setEditCompanyName(client.company_name || '');
    setEditContactPerson(client.contact_person || '');
    setEditPosition(client.position || '');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditCity(typeof client.city === 'string' ? client.city : '');                
    setEditDistrict(typeof client.district === 'string' ? client.district : '');        
    setEditStatus(client.status || 'Potansiyel');
    setIsEditModalOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editCompanyName.trim()) return;

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('clients')
        .update({
          company_name: editCompanyName.trim(),
          contact_person: editContactPerson.trim() || null,
          position: editPosition.trim() || null,
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          city: editCity.trim() || null,            
          district: editDistrict.trim() || null,    
          status: editStatus,
          updated_by: currentUser,
        })
        .eq('id', editingClient.id);

      if (error) throw error;

      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? { 
                ...c, 
                company_name: editCompanyName, 
                contact_person: editContactPerson, 
                position: editPosition, 
                email: editEmail, 
                phone: editPhone, 
                city: editCity, 
                district: editDistrict, 
                status: editStatus,
                updated_by: currentUser
              }
            : c
        )
      );
      setIsEditModalOpen(false);
    } catch (error: any) {
      alert('Güncelleme hatası: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatUpdatedBy = (emailOrId: string | null) => {
    if (!emailOrId) return 'Sistem / Belirsiz';
    if (emailOrId.includes('@')) {
      const handle = emailOrId.split('@')[0];
      const rawName = handle.split('.')[0];
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
    const rawName = emailOrId.split('.')[0];
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  };

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaysReminders = reminders.filter(r => new Date(r.next_followup_date) <= todayEnd);
  const futureReminders = reminders.filter(r => new Date(r.next_followup_date) > todayEnd);

  const filteredClients = clients.filter((client) => {
    const searchLower = searchQuery.toLowerCase();
    const cityStr = client.city && typeof client.city === 'string' ? client.city.toLowerCase() : '';
    const districtStr = client.district && typeof client.district === 'string' ? client.district.toLowerCase() : '';
    const positionStr = client.position && typeof client.position === 'string' ? client.position.toLowerCase() : '';
    
    return (
      client.company_name?.toLowerCase().includes(searchLower) ||
      client.contact_person?.toLowerCase().includes(searchLower) ||
      positionStr.includes(searchLower) || 
      client.status?.toLowerCase().includes(searchLower) ||
      cityStr.includes(searchLower) ||        
      districtStr.includes(searchLower)       
    );
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* LOGOLU ÜST BAŞLIK */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center border-b border-zinc-900 pb-4 gap-4 relative z-40">
          <div className="text-center md:text-left">
            <h1 className="text-xl font-black tracking-tight">Müşteri Yönetimi</h1>
            <p className="text-xs text-zinc-500">Müşterilerinizi ekleyin, güncelleyin ve filtreleyin.</p>
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

          <div className="flex justify-center md:justify-end items-center gap-3 relative">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-lg transition-all text-lg relative flex items-center justify-center h-[38px] w-[38px] cursor-pointer"
              >
                🔔
                {reminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full text-white animate-pulse">
                    {reminders.length}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute top-12 right-0 bg-zinc-950 border border-zinc-800 w-80 md:w-96 rounded-xl shadow-2xl overflow-hidden p-4 space-y-4 z-50 max-h-[500px] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-xs font-black tracking-wide uppercase text-zinc-400">Hatırlatma Paneli ({reminders.length})</span>
                    <button onClick={() => { setIsNotificationOpen(false); setPostponeReminderId(null); }} className="text-zinc-500 hover:text-white text-xs cursor-pointer">✕</button>
                  </div>

                  {reminders.length === 0 ? (
                    <p className="text-xs text-center text-zinc-600 py-4">Bekleyen hatırlatmanız bulunmuyor 🎉</p>
                  ) : (
                    <div className="space-y-4">
                      
                      {/* BUGÜNÜN HATIRLATMALARI */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                          <h4 className="text-[11px] font-black tracking-wider text-red-400 uppercase">Bugünün Hatırlatmaları ({todaysReminders.length})</h4>
                        </div>
                        {todaysReminders.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic bg-zinc-900/20 p-2 rounded border border-zinc-900/40">Bugün yapılması gereken acil bir iş yok.</p>
                        ) : (
                          <div className="space-y-2 divide-y divide-zinc-900">
                            {todaysReminders.map((item) => (
                              <div key={item.id} className="pt-2 first:pt-0 space-y-2 text-xs">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-black text-indigo-400 block hover:underline cursor-pointer break-words flex-1" onClick={() => { router.push(`/clients/${item.client_id}`); setIsNotificationOpen(false); }}>
                                    {item.clients?.company_name}
                                  </span>
                                  <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    {formatDateTime(item.next_followup_date)}
                                  </span>
                                </div>
                                <p className="text-zinc-400 text-[11px] line-clamp-2 italic bg-zinc-900/40 p-1.5 rounded border border-zinc-900 break-words">
                                  "{item.notes || 'Not girilmemiş.'}"
                                </p>

                                {postponeReminderId === item.id ? (
                                  <div className="bg-zinc-900 p-2 rounded border border-zinc-800 space-y-2">
                                    <label className="text-[10px] text-zinc-400 font-bold block uppercase">Yeni Hatırlatma Tarihi:</label>
                                    <input 
                                      type="datetime-local" 
                                      value={customPostponeDate}
                                      onChange={(e) => setCustomPostponeDate(e.target.value)}
                                      className="w-full bg-black border border-zinc-800 text-[11px] p-1.5 rounded text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button onClick={() => setPostponeReminderId(null)} className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 font-bold cursor-pointer">İptal</button>
                                      <button onClick={() => handleCustomPostpone(item.id)} className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white font-black cursor-pointer">Kaydet</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2 pt-0.5">
                                    <button onClick={() => setPostponeReminderId(item.id)} className="bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 px-2 py-1 rounded border border-zinc-800 transition-colors cursor-pointer">⏳ Ertele</button>
                                    <button onClick={() => handleCompleteReminder(item.id)} className="bg-emerald-950/60 hover:bg-emerald-900 text-[10px] font-black text-emerald-400 px-2 py-1 rounded border border-emerald-900/60 transition-colors cursor-pointer">✓ Tamamlandı</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* GELECEK HATIRLATMALAR */}
                      <div className="space-y-2 pt-2 border-t border-zinc-900">
                        <h4 className="text-[11px] font-black tracking-wider text-zinc-500 uppercase">Gelecek Hatırlatmalar ({futureReminders.length})</h4>
                        {futureReminders.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic bg-zinc-900/20 p-2 rounded border border-zinc-900/40">İleri tarihli bir hatırlatma yok.</p>
                        ) : (
                          <div className="space-y-2 divide-y divide-zinc-900">
                            {futureReminders.map((item) => (
                              <div key={item.id} className="pt-2 first:pt-0 space-y-2 text-xs">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-black text-indigo-400 block hover:underline cursor-pointer break-words flex-1" onClick={() => { router.push(`/clients/${item.client_id}`); setIsNotificationOpen(false); }}>
                                    {item.clients?.company_name}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    {formatDateTime(item.next_followup_date)}
                                  </span>
                                </div>
                                <p className="text-zinc-500 text-[11px] line-clamp-2 italic bg-zinc-900/40 p-1.5 rounded border border-zinc-900 break-words">
                                  "{item.notes || 'Not girilmemiş.'}"
                                </p>

                                {postponeReminderId === item.id ? (
                                  <div className="bg-zinc-900 p-2 rounded border border-zinc-800 space-y-2">
                                    <label className="text-[10px] text-zinc-400 font-bold block uppercase">Yeni Hatırlatma Tarihi:</label>
                                    <input 
                                      type="datetime-local" 
                                      value={customPostponeDate}
                                      onChange={(e) => setCustomPostponeDate(e.target.value)}
                                      className="w-full bg-black border border-zinc-800 text-[11px] p-1.5 rounded text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button onClick={() => setPostponeReminderId(null)} className="text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 font-bold cursor-pointer">İptal</button>
                                      <button onClick={() => handleCustomPostpone(item.id)} className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white font-black cursor-pointer">Kaydet</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2 pt-0.5">
                                    <button onClick={() => setPostponeReminderId(item.id)} className="bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 px-2 py-1 rounded border border-zinc-800 transition-colors cursor-pointer">⏳ Ertele</button>
                                    <button onClick={() => handleCompleteReminder(item.id)} className="bg-emerald-950/60 hover:bg-emerald-900 text-[10px] font-black text-emerald-400 px-2 py-1 rounded border border-emerald-900/60 transition-colors cursor-pointer">✓ Tamamlandı</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RAPORLAMA SAYFASINA GİT (SOLDA KALDI) */}
            <button 
              onClick={() => router.push('/reports')}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-indigo-400 hover:text-indigo-300 font-black text-xs px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2 h-[38px] cursor-pointer"
            >
              📊 Raporlama Sayfasına Git →
            </button>

            {/* EN SAĞDAKİ ÇIKIŞ YAP BUTONU */}
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/40 text-zinc-400 hover:text-red-400 font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[38px] cursor-pointer disabled:opacity-50"
            >
              🚪 {isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
            </button>
          </div>
        </div>

        {/* YENİ MÜŞTERI EKLEME FORMU */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4">Yeni Müşteri Ekle</h2>
          <form onSubmit={handleAddClient} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">Firma Adı *</label>
              <input
                type="text"
                placeholder="Firma / Müşteri Adı"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">Yetkili Kişi</label>
              <input
                type="text"
                placeholder="Yetkili Kişi"
                value={newContactPerson}
                onChange={(e) => setNewContactPerson(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">Pozisyon</label>
              <input
                type="text"
                placeholder="Örn: Müdür / Satın Alma"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">E-Posta</label>
              <input
                type="email"
                placeholder="E-Posta"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">Telefon</label>
              <input
                type="text"
                placeholder="Telefon"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">İl</label>
              <input
                type="text"
                placeholder="Örn: İstanbul"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">İlçe</label>
              <input
                type="text"
                placeholder="Örn: Kadıköy"
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">Durum</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
              >
                <option value="Potansiyel">Potansiyel</option>
                <option value="Aktif Müşteri">Aktif Müşteri</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-black text-xs px-4 py-2 rounded-lg transition-colors shadow-md h-[38px] w-full lg:col-span-2 cursor-pointer"
            >
              {isSubmitting ? '...' : '+ Oluştur'}
            </button>
          </form>
        </div>

        {/* FİLTRELEME VE ARAMA ALANI */}
        <div>
          <input
            type="text"
            placeholder="Müşteri, yetkili, pozisyon, durum veya şehir/ilçe ile filtreleyin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 text-xs px-4 py-2.5 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* MÜŞTERI TABLOSU */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/20 text-[11px] font-black uppercase text-zinc-500 tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Müşteri / Firma Adı</th>
                <th className="py-3.5 px-4">Yetkili Kişi</th>
                <th className="py-3.5 px-4">Pozisyon</th>
                <th className="py-3.5 px-4">Bölge (İl / İlçe)</th> 
                <th className="py-3.5 px-4">İletişim Bilgileri</th>
                <th className="py-3.5 px-4">Kayıt Tarihi</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4">Değişikliği Yapan</th>
                <th className="py-3.5 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-zinc-500 font-medium">Müşteriler yükleniyor...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-zinc-500 font-medium">Kayıtlı veya arama kriterine uygun müşteri bulunamadı.</td>
                </tr>
              ) : (
                filteredClients.map((client, index) => (
                  <tr key={client.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="py-4 px-4 text-center font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      {index + 1}
                    </td>
                    <td className="py-4 px-4 font-black text-white tracking-wide">
                      {client.company_name}
                    </td>
                    <td className="py-4 px-4 font-medium text-zinc-300">
                      {client.contact_person || '-'}
                    </td>
                    <td className="py-4 px-4 font-medium text-zinc-400">
                      {client.position ? `💼 ${client.position}` : '-'}
                    </td>
                    <td className="py-4 px-4 font-medium text-zinc-300">
                      {(client.city && typeof client.city === 'string') || (client.district && typeof client.district === 'string') ? (
                        <span>
                          {String(client.city || '-')}{' '}
                          <span className="text-zinc-500 text-[11px]">
                            ({String(client.district || '-')})
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 space-y-0.5 text-zinc-400 font-mono text-[11px]">
                      {client.email && <div className="block">{client.email}</div>}
                      {client.phone && <div className="block text-zinc-500">{client.phone}</div>}
                      {!client.email && !client.phone && <span>-</span>}
                    </td>
                    <td className="py-4 px-4 font-medium text-zinc-500 font-mono text-[11px]">
                      {formatDateTime(client.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                        client.status === 'Aktif Müşteri' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' :
                        client.status === 'Pasif' ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
                        'bg-indigo-950/40 text-indigo-400 border-indigo-900/60'
                      }`}>
                        {client.status || 'Potansiyel'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] font-bold text-zinc-400">
                      {formatUpdatedBy(client.updated_by)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => router.push(`/clients/${client.id}`)}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all shadow-sm cursor-pointer"
                        >
                          Detay & Notlar →
                        </button>
                        <button onClick={() => openEditModal(client)} className="text-zinc-500 hover:text-amber-500 p-1 text-sm transition-colors cursor-pointer">
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteClient(client.id, client.company_name)} className="text-zinc-500 hover:text-red-500 p-1 text-sm transition-colors cursor-pointer">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DÜZENLEME MODALI */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{editCompanyName}</h3>
                <p className="text-[11px] text-zinc-500 font-medium">Müşteri detaylarını düzenleyin</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleUpdateClient} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Firma / Müşteri Adı *</label>
                <input type="text" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">Yetkili Kişi</label>
                  <input type="text" value={editContactPerson} onChange={(e) => setEditContactPerson(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">Pozisyon</label>
                  <input type="text" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">E-Posta</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">Telefon</label>
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">İl</label>
                  <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold uppercase">İlçe</label>
                  <input type="text" value={editDistrict} onChange={(e) => setEditDistrict(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Durum</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white cursor-pointer">
                  <option value="Potansiyel">Potansiyel</option>
                  <option value="Aktif Müşteri">Aktif Müşteri</option>
                  <option value="Pasif">Pasif</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-zinc-900 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg font-bold cursor-pointer">Kapat</button>
                <button type="submit" disabled={isUpdating} className="bg-indigo-600 text-white font-black px-4 py-2 rounded-lg cursor-pointer">{isUpdating ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}