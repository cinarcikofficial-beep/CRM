'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface ClientData {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const supabase = createClient();

  // Liste ve Arama State'leri
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Yeni Müşteri Ekleme Form State'leri
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState('Potansiyel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Düzenleme Modal State'leri
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('Potansiyel');
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Mevcut Müşterileri Listeleme
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

  useEffect(() => {
    fetchClients();
  }, []);

  // 2. Yeni Müşteri Kaydetme
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return alert('Müşteri / Firma Adı zorunludur.');

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            company_name: newCompanyName,
            contact_person: newContactPerson || null,
            email: newEmail || null,
            phone: newPhone || null,
            status: newStatus,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setClients((prev) => [data[0], ...prev]);
        setNewCompanyName('');
        setNewContactPerson('');
        setNewEmail('');
        setNewPhone('');
        setNewStatus('Potansiyel');
      }
    } catch (error: any) {
      alert('Müşteri eklenirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Müşteri Silme (🗑️)
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

  // 4. Düzenleme Modalını Açma
  const openEditModal = (client: ClientData) => {
    setEditingClient(client);
    setEditCompanyName(client.company_name || '');
    setEditContactPerson(client.contact_person || '');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditStatus(client.status || 'Potansiyel');
    setIsEditModalOpen(true);
  };

  // 5. Güncelleme Kaydetme (✏️)
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editCompanyName.trim()) return;

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('clients')
        .update({
          company_name: editCompanyName,
          contact_person: editContactPerson || null,
          email: editEmail || null,
          phone: editPhone || null,
          status: editStatus,
        })
        .eq('id', editingClient.id);

      if (error) throw error;

      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? { ...c, company_name: editCompanyName, contact_person: editContactPerson, email: editEmail, phone: editPhone, status: editStatus }
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

  const filteredClients = clients.filter((client) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      client.company_name?.toLowerCase().includes(searchLower) ||
      client.contact_person?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-black text-white p-6 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ÜST BAŞLIK */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight">Müşteri Yönetimi</h1>
            <p className="text-xs text-zinc-500">Müşterilerinizi ekleyin, güncelleyin ve filtreleyin.</p>
          </div>
          <button 
            onClick={() => router.push('/reports')}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-indigo-400 hover:text-indigo-300 font-black text-xs px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-2"
          >
            📊 Raporlama Sayfasına Git →
          </button>
        </div>

        {/* YENİ MÜŞTERİ EKLEME FORMU */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4">Yeni Müşteri Ekle</h2>
          <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold uppercase">Firma / Müşteri Adı *</label>
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
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-black text-xs px-4 py-2 rounded-lg transition-colors shadow-md h-[38px]"
            >
              {isSubmitting ? 'Oluşturuluyor...' : '+ Müşteri Oluştur'}
            </button>
          </form>
        </div>

        {/* FİLTRELEME VE ARAMA ALANI */}
        <div>
          <input
            type="text"
            placeholder="Müşteri veya yetkili adı ile filtreleyin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 text-xs px-4 py-2.5 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* MÜŞTERİ TABLOSU */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/20 text-[11px] font-black uppercase text-zinc-500 tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Müşteri / Firma Adı</th>
                <th className="py-3.5 px-4">Yetkili Kişi</th>
                <th className="py-3.5 px-4">İletişim Bilgileri</th>
                <th className="py-3.5 px-4">Kayıt Tarihi</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">Müşteriler yükleniyor...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500 font-medium">Kayıtlı müşteri bulunamadı.</td>
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
                    <td className="py-4 px-4 space-y-0.5 text-zinc-400 font-mono text-[11px]">
                      {client.email && <div className="block">{client.email}</div>}
                      {client.phone && <div className="block text-zinc-500">{client.phone}</div>}
                      {!client.email && !client.phone && <span>-</span>}
                    </td>
                    <td className="py-4 px-4 font-medium text-zinc-500 font-mono text-[11px]">
                      {formatDateTime(client.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-zinc-900 text-indigo-400 border border-zinc-800">
                        {client.status || 'Potansiyel'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => router.push(`/clients/${client.id}`)}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all shadow-sm"
                        >
                          Detay & Notlar →
                        </button>
                        <button onClick={() => openEditModal(client)} className="text-zinc-500 hover:text-amber-500 p-1 text-sm transition-colors">
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteClient(client.id, client.company_name)} className="text-zinc-500 hover:text-red-500 p-1 text-sm transition-colors">
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
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>
            <form onSubmit={handleUpdateClient} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Firma / Müşteri Adı *</label>
                <input type="text" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Yetkili Kişi</label>
                <input type="text" value={editContactPerson} onChange={(e) => setEditContactPerson(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white" />
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
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold uppercase">Durum</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white">
                  <option value="Potansiyel">Potansiyel</option>
                  <option value="Aktif Müşteri">Aktif Müşteri</option>
                  <option value="Pasif">Pasif</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-zinc-900 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg font-bold">Kapat</button>
                <button type="submit" disabled={isUpdating} className="bg-indigo-600 text-white font-black px-4 py-2 rounded-lg">{isUpdating ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}