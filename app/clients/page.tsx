import { createClient } from '@/utils/supabase/server';
import AddClientForm from './add-client-form';
import ClientListTable from './client-list-table';

export default async function ClientsPage() {
  const supabase = await createClient();

  // Veritabanından tüm müşterileri çekiyoruz
  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, contact_person, email, phone, status, created_at')
    .order('company_name', { ascending: true });

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Üst Başlık Alanı - Siyah arka planda görünmesi için text-white yapıldı */}
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-black text-white">Verytech  - Müşteri Yönetimi</h1>
        <p className="text-sm font-bold text-zinc-400 mt-1">
          Yeni potansiyel müşterileri ekleyebilir, arama yapabilir ve süreçlerini anlık takip edebilirsiniz.
        </p>
      </div>

      {/* Üst Alan: Müşteri Ekleme Formu (Tam Genişlikte Ferah Düzen) */}
      <div className="w-full">
        <AddClientForm />
      </div>

      {/* Alt Alan: Akıllı Filtreli ve Anlık Güncellenebilir Müşteri Tablosu */}
      <div className="w-full">
        <ClientListTable initialClients={clients || []} />
      </div>
    </div>
  );
}