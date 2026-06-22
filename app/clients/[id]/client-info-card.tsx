'use client';

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  status: string;
}

export default function ClientInfoCard({ client }: { client: Client }) {
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

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 p-6 text-white">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Firma Bilgileri</h2>
        <button 
          onClick={() => alert('Düzenleme modülü yakında eklenecek.')}
          className="text-xs font-bold bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1.5 rounded-md transition"
        >
          ✏️ Bilgileri Düzenle
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Firma Adı</label>
          <p className="text-lg font-black text-white">{client.company_name}</p>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">Yetkili Kişi</label>
          <p className="text-sm font-extrabold text-zinc-200">{client.contact_person || 'Belirtilmemiş'}</p>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">E-Posta Adresi</label>
          <p className="text-sm font-bold text-zinc-300 break-all">{client.email || 'Belirtilmemiş'}</p>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">Telefon</label>
          <p className="text-sm font-bold text-zinc-300">{client.phone || 'Belirtilmemiş'}</p>
        </div>

        <div className="pt-2 border-t border-zinc-800/60">
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2">Mevcut Durum</label>
          <span className={`inline-block text-xs font-black rounded-md px-3 py-1.5 border shadow-sm ${getStatusStyle(client.status)}`}>
            {client.status}
          </span>
        </div>
      </div>
    </div>
  );
}