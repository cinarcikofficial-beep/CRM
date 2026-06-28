'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

// 1. Müşteri Tip Tanımı
interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
}

// 2. Form Propları - Parametre olarak yeni eklenen Client nesnesini kabul edecek şekilde güncelledik
interface AddClientFormProps {
  onClientAdded: (newClient: Client) => void;
}

// Form Bileşeni
function AddClientForm({ onClientAdded }: AddClientFormProps) {
  const supabase = createClient();
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Potansiyel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            company_name: companyName.trim(),
            contact_person: contactPerson.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            status,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        onClientAdded(data[0]); // Yeni eklenen müşteriyi ana listeye fırlatıyoruz
        setCompanyName('');
        setContactPerson('');
        setEmail('');
        setPhone('');
        setStatus('Potansiyel');
      }
    } catch (error: any) {
      alert('Müşteri eklenirken hata oluştu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 shadow-xl">
      <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4">Yeni Müşteri Ekle</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-xs">
        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500 font-bold uppercase">Firma / Müşteri Adı *</label>
          <input type="text" placeholder="Firma Adı" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500 font-bold uppercase">Yetkili Kişi</label>
          <input type="text" placeholder="Yetkili Kişi" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500 font-bold uppercase">E-Posta</label>
          <input type="email" placeholder="E-Posta" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500 font-bold uppercase">Telefon</label>
          <input type="text" placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500 font-bold uppercase">Durum</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer">
            <option value="Potansiyel">Potansiyel</option>
            <option value="Aktif Müşteri">Aktif Müşteri</option>
            <option value="Pasif">Pasif</option>
          </select>
        </div>
        <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-lg transition-colors h-[38px]">
          {isSubmitting ? 'Oluşturuluyor...' : '+ Müşteri Oluştur'}
        </button>
      </form>
    </div>
  );
}

// 3. Ana ClientManager Bileşeni
interface ClientManagerProps {
  initialClients: Client[];
}

export default function ClientManager({ initialClients }: ClientManagerProps) {
  const [clients, setClients] = useState<Client[]>(initialClients || []);

  const handleClientAdded = (newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <AddClientForm onClientAdded={handleClientAdded} />
      </div>
      {/* Eğer alt tabloların veya listelerin varsa buraya ekleyebilirsin */}
      <div className="text-zinc-500 text-xs">
        Toplam Kayıtlı Müşteri: {clients.length}
      </div>
    </div>
  );
}