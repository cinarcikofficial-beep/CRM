'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

export default function ClientListTable({ initialClients }: { initialClients: Client[] }) {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (clientId: string, newStatus: string) => {
    setUpdatingId(clientId);
    const { error } = await supabase
      .from('clients')
      .update({ status: newStatus })
      .eq('id', clientId);

    if (error) {
      alert('Durum güncellenirken bir hata oluştu: ' + error.message);
    } else {
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
    }
    setUpdatingId(null);
  };

  // Müşteri Silme Fonksiyonu
  const handleDeleteClient = async (clientId: string, companyName: string) => {
    const confirmed = window.confirm(`"${companyName}" firmasını ve bu firmaya ait TÜM geçmiş kayıtları silmek istediğinize emin misiniz?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      alert('Müşteri silinirken bir hata oluştu: ' + error.message);
    } else {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Aktif Müşteri':
        return 'bg-green-950 text-green-400 border-green-800';
      case 'Pasif / Kaybedildi':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'Teklif Verildi':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      case 'Görüşme Halinde':
        return 'bg-yellow-950 text-yellow-400 border-yellow-800';
      default:
        return 'bg-blue-950 text-blue-400 border-blue-800';
    }
  };

  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.company_name.toLowerCase().includes(searchLower) ||
      (client.contact_person && client.contact_person.toLowerCase().includes(searchLower)) ||
      (client.email && client.email.toLowerCase().includes(searchLower)) ||
      (client.phone && client.phone.includes(searchLower))
    );
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (sortBy === 'name-asc') return a.company_name.localeCompare(b.company_name, 'tr');
    if (sortBy === 'name-desc') return b.company_name.localeCompare(a.company_name, 'tr');
    if (sortBy === 'status') return a.status.localeCompare(b.status, 'tr');
    if (sortBy === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  return (
    <div className="bg-zinc-900 p-6 rounded-xl shadow-lg border border-zinc-800 w-full text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-black text-white">Müşteri Listesi</h2>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Toplam {sortedClients.length} kayıt listeleniyor
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="🔍 Firma, yetkili veya iletişim ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-white placeholder-zinc-500 bg-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-48 rounded-md border border-zinc-700 px-3 py-2 text-sm font-bold text-white bg-zinc-800 focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="name-asc" className="bg-zinc-800">🔤 Firma Adı (A → Z)</option>
            <option value="name-desc" className="bg-zinc-800">🔤 Firma Adı (Z → A)</option>
            <option value="status" className="bg-zinc-800">📊 Duruma Göre Sırala</option>
            <option value="date-desc" className="bg-zinc-800">📅 Son Eklenenler</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-xs font-black text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
              <th className="py-3 px-4">Firma Adı</th>
              <th className="py-3 px-4">Yetkili</th>
              <th className="py-3 px-4">İletişim</th>
              <th className="py-3 px-4 text-center">Durum</th>
              <th className="py-3 px-4 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-sm">
            {sortedClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm font-bold text-zinc-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              sortedClients.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-850/50 transition-colors">
                  <td className="py-4 px-4 font-black text-white">{client.company_name}</td>
                  <td className="py-4 px-4 font-bold text-zinc-300">{client.contact_person || '-'}</td>
                  <td className="py-4 px-4 space-y-0.5">
                    <div className="font-bold text-white">{client.email || '-'}</div>
                    <div className="text-xs font-bold text-zinc-400">{client.phone || '-'}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <select
                      value={client.status}
                      disabled={updatingId === client.id}
                      onChange={(e) => handleStatusChange(client.id, e.target.value)}
                      className={`mx-auto block text-xs font-black rounded-md px-2.5 py-1.5 border shadow-sm cursor-pointer transition focus:outline-none focus:ring-1 ${getStatusStyle(
                        client.status
                      )} ${updatingId === client.id ? 'opacity-40' : ''}`}
                    >
                      <option value="Potansiyel" className="bg-zinc-900 text-white">🔵 Potansiyel</option>
                      <option value="Görüşme Halinde" className="bg-zinc-900 text-white">🟡 Görüşme Halinde</option>
                      <option value="Teklif Verildi" className="bg-zinc-900 text-white">🟠 Teklif Verildi</option>
                      <option value="Aktif Müşteri" className="bg-zinc-900 text-white">🟢 Aktif Müşteri</option>
                      <option value="Pasif / Kaybedildi" className="bg-zinc-900 text-white">🔴 Pasif / Kaybedildi</option>
                    </select>
                  </td>
                  <td className="py-4 px-4 text-right whitespace-nowrap space-x-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className="inline-block text-indigo-400 hover:text-indigo-300 font-extrabold bg-indigo-950/50 hover:bg-indigo-900 border border-indigo-800 px-3 py-1.5 rounded-md text-xs transition"
                    >
                      Detay & Notlar →
                    </Link>
                    <button
                      onClick={() => handleDeleteClient(client.id, client.company_name)}
                      className="inline-block text-red-400 hover:text-red-300 font-extrabold bg-red-950/50 hover:bg-red-900 border border-red-800 px-3 py-1.5 rounded-md text-xs transition"
                    >
                      🗑️ Sil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}