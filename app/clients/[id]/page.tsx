import { createClient } from '@/utils/supabase/server';
import AddActivityForm from './add-activity-form';
import ClientInfoCard from './client-info-card';
import ActivityTimeline from './activity-timeline'; // Yeni oluşturduğumuz dosyayı buraya bağladık
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (!client) {
    notFound();
  }

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('client_id', id)
    .order('activity_date', { ascending: false });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Üst Kısım Dönüş Linki ve Başlık */}
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <Link href="/clients" className="text-sm text-indigo-400 hover:text-indigo-300 font-bold">
          ← Müşteri Listesine Dön
        </Link>
        <h1 className="text-3xl font-black text-white mt-2">{client.company_name}</h1>
        <p className="text-sm font-medium text-zinc-400">Müşteri Detay Yönetimi ve Görüşme Notları</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <ClientInfoCard client={client} />
          <AddActivityForm clientId={id} />
        </div>

        {/* Sağ Kolon: Zaman Tüneli */}
        <div className="lg:col-span-2">
          <ActivityTimeline initialActivities={activities || []} />
        </div>
      </div>
    </div>
  );
}