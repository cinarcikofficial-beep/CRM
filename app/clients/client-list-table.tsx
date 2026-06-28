'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client'; // İstemci tarafı için doğru import

interface Client {
  id: string;
  company_name?: string;
  name?: string;
  contact_person?: string;
  authorized_person?: string;
  email?: string;
  phone?: string;
  status?: string;
  created_at?: string;
}

interface ClientListTableProps {
  clients: Client[];
}

export default function ClientListTable({ clients: initialClients }: ClientListTableProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Hepsi');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const supabase = createClient();

  // Müşteri Silme Fonksiyonu
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" adlı müşteriyi ve müşteriye ait tüm aktivite geçmişini silmek istediğinize emin misiniz?`)) return;

    setLoadingId(id);
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    setLoadingId(null);

    if (error) {
      alert(`Müşteri silinirken bir hata oluştu: ${error.message}`);
    } else {
      setClients((prev) => prev.filter((client) => client.id !== id));
    }
  };

  // Dinamik Arama ve Filtreleme Mantığı
  const filteredClients = clients.filter((client) => {
    const company = (client.company_name || '').toLowerCase();
    const name = (client.name || '').toLowerCase();
    const person = (client.authorized_person || client.contact_person || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = company.includes(search) || name.includes(search) || person.includes(search);
    const matchesStatus = statusFilter === 'Hepsi' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Durum (Status) Rozet Rengi Belirleyici
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Aktif':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Potansiyel':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Pasif':
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* ARAÇ ÇUBUĞU: ARAMA VE FİLTRELEME */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Şirket adı, yetkili veya müşteri adı ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-zinc-600 shadow-inner"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
        >
          <option value="Hepsi">Tüm Durumlar</option>
          <option value="Aktif">🟢 Aktif</option>
          <option value="Potansiyel">🔵 Potansiyel</option>
          <option value="Pasif">⚫ Pasif</option>
        </select>
      </div>

      {/* MÜŞTERİ LİSTE TABLOSU */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/30 text-xs font-semibold text-zinc-400 tracking-wider">
                <th className="p-4">Müşteri / Firma Adı</th>
                <th className="p-4">Yetkili Kişi</th>
                <th className="p-4">İletişim Bilgileri</th>
                <th className="p-4">Durum</th>
                <th className="p-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm text-zinc-200">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500 font-medium">
                    Kriterlere uygun kayıtlı müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const displayName = client.company_name || client.name || 'İsimsiz Kayıt';
                  const authorized = client.authorized_person || client.contact_person || 'Belirtilmemiş';
                  
                  return (
                    <tr key={client.id} className="hover:bg-zinc-900/20 transition-colors group">
                      <td className="p-4 font-bold text-white tracking-tight">
                        <Link href={`/clients/${client.id}`} className="hover:text-indigo-400 transition-colors block">
                          {displayName}
                        </Link>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">{authorized}</td>
                      <td className="p-4 space-y-0.5 text-xs font-mono text-zinc-400">
                        {client.email && <div className="truncate">{client.email}</div>}
                        {client.phone && <div>{client.phone}</div>}
                        {!client.email && !client.phone && <span className="text-zinc-600 font-sans">-</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(client.status)}`}>
                          {client.status || 'Belirtilmemiş'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-2.5 py-1.5 rounded-md text-zinc-300 hover:text-white transition-all shadow-sm"
                          >
                            Detay & Notlar →
                          </Link>
                          <button
                            onClick={() => handleDelete(client.id, displayName)}
                            disabled={loadingId === client.id}
                            className="text-xs text-zinc-600 hover:text-red-400 p-1 transition-colors disabled:opacity-50"
                            title="Müşteriyi Sil"
                          >
                            {loadingId === client.id ? '...' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ALT BİLGİ ALANI */}
        <div className="bg-zinc-900/10 border-t border-zinc-800/80 px-4 py-3 flex items-center justify-between text-xs text-zinc-500 font-medium">
          <div>Gösterilen Kayıt: {filteredClients.length}</div>
          <div>Toplam Müşteri: {clients.length}</div>
        </div>
      </div>
    </div>
  );
}