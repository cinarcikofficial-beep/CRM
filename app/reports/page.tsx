'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface ActivityReportData {
  id: string;
  type: string;
  notes: string | null;
  activity_date: string;
  client_id: string;
  clients: {
    company_name: string;
    contact_person: string;
  } | null;
}

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activities, setActivities] = useState<ActivityReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Filtreleme State'leri
  const [filterRange, setFilterRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Kart Tıklama ile Tür Filtreleme State'i (null ise tümü gösterilir)
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          notes,
          activity_date,
          client_id,
          clients (
            company_name,
            contact_person
          )
        `)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities((data as any) || []);
    } catch (error: any) {
      alert('Rapor verileri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Güvenli Çıkış Yap Fonksiyonu
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

  // 1. Kademe: Zaman Aralığı Filtreleme Mantığı
  const timeFilteredActivities = activities.filter((act) => {
    const actDate = new Date(act.activity_date);
    const now = new Date();

    if (filterRange === 'daily') {
      return actDate.toDateString() === now.toDateString();
    }
    if (filterRange === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return actDate >= oneWeekAgo;
    }
    if (filterRange === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return actDate >= oneMonthAgo;
    }
    if (filterRange === 'custom') {
      if (!startDate && !endDate) return true;
      let start = startDate ? new Date(startDate) : new Date('1970-01-01');
      let end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return actDate >= start && actDate <= end;
    }
    return true;
  });

  // Tür Kartlarındaki Sayaçlar
  const stats = timeFilteredActivities.reduce(
    (acc, act) => {
      acc.total += 1;
      const currentType = act.type || '';
      
      if (currentType.includes('Telefon')) acc.telefon += 1;
      else if (currentType.includes('Mail') || currentType.includes('E-posta') || currentType.includes('E-Posta')) acc.mail += 1;
      else if (currentType.includes('Toplantı')) acc.toplanti += 1;
      else if (currentType.includes('Teklif')) acc.teklif += 1;
      else acc.sms += 1;
      
      return acc;
    },
    { total: 0, telefon: 0, mail: 0, toplanti: 0, teklif: 0, sms: 0 }
  );

  // 2. Kademe: Kart Tıklamasına Göre (Tür) Filtreleme Mantığı
  const finalFilteredActivities = timeFilteredActivities.filter((act) => {
    if (!selectedType) return true;
    const currentType = act.type || '';
    
    if (selectedType === 'Telefon') return currentType.includes('Telefon');
    if (selectedType === 'Mail') return currentType.includes('Mail') || currentType.includes('E-posta') || currentType.includes('E-Posta');
    if (selectedType === 'Toplantı') return currentType.includes('Toplantı');
    if (selectedType === 'Teklif') return currentType.includes('Teklif');
    if (selectedType === 'SMS') {
      return !currentType.includes('Telefon') && 
             !currentType.includes('Mail') && 
             !currentType.includes('E-posta') && 
             !currentType.includes('E-Posta') && 
             !currentType.includes('Toplantı') && 
             !currentType.includes('Teklif');
    }
    return currentType === selectedType;
  });

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getPeriodText = () => {
    if (filterRange === 'daily') return 'Günlük Performans Raporu';
    if (filterRange === 'weekly') return 'Haftalık Performans Raporu (Son 7 Gün)';
    if (filterRange === 'monthly') return 'Aylık Performans Raporu (Son 30 Gün)';
    if (filterRange === 'custom') return 'Özel Tarih Aralığı Raporu';
    return 'Genel Performans Raporu (Tüm Zamanlar)';
  };

  const toggleTypeFilter = (type: string) => {
    if (selectedType === type) {
      setSelectedType(null); 
    } else {
      setSelectedType(type); 
    }
  };

  const handleSendEmail = () => {
    const displayType = selectedType === 'Teklif' ? 'Teklif Atma' : selectedType || 'Tümü';
    const subject = encodeURIComponent(`CRM Aktivite Raporu - ${getPeriodText()}`);
    let bodyText = `CRM AKTIVITE RAPORU\n\n`;
    bodyText += `Rapor Tipi: ${getPeriodText()}\n`;
    if (filterRange === 'custom') bodyText += `Aralık: ${startDate || 'Başlangıç yok'} / ${endDate || 'Bitiş yok'}\n`;
    bodyText += `Filtrelenen Tür: ${displayType}\n\n`;
    
    bodyText += `--- ÖZET İSTATİSTİKLER ---\n`;
    bodyText += `Toplam Aktivite: ${stats.total}\n`;
    bodyText += `📞 Telefon: ${stats.telefon}\n`;
    bodyText += `✉️ E-posta: ${stats.mail}\n`;
    bodyText += `🤝 Toplantı: ${stats.toplanti}\n`;
    bodyText += `📄 Teklif Atma: ${stats.teklif}\n`;
    bodyText += `💬 SMS / WP: ${stats.sms}\n\n`;
    
    bodyText += `--- İŞLEM KRONOLOJİSİ ---\n`;
    finalFilteredActivities.forEach((act, index) => {
      bodyText += `${index + 1}) [${act.type}] ${act.clients?.company_name || 'Müşteri'} - ${formatDateTime(act.activity_date)}\nNot: ${act.notes || '-'}\n\n`;
    });

    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 print:bg-white print:text-black print:p-0">
      <div className="max-w-7xl mx-auto space-y-6 print:space-y-4">
        
        {/* ÜST BAŞLIK ALANI */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-4 print:border-zinc-300">
          <div>
            <h1 className="text-xl font-black tracking-tight print:text-black">CRM Aktivite Raporu</h1>
            <p className="text-xs text-zinc-500 print:text-zinc-600 font-medium mt-0.5">
              {getPeriodText()} {selectedType ? `(Sadece ${selectedType === 'Teklif' ? 'Teklif Atma' : selectedType} aktiviteleri gösteriliyor)` : ''}
            </p>
          </div>
          
          {/* BUTONLAR VE SAĞ ÜST KÖŞE SİMETRİSİ */}
          <div className="flex items-center gap-2 print:hidden self-start md:self-center">
            <button
              onClick={handleSendEmail}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-md cursor-pointer h-[36px]"
            >
              ✉️ Raporu E-Posta Gönder
            </button>
            <button
              onClick={() => window.print()}
              className="text-xs bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-white font-bold hover:bg-zinc-800 transition-colors shadow-md cursor-pointer h-[36px]"
            >
              🖨️ Yazdır / PDF
            </button>
            <button 
              onClick={() => router.push('/clients')}
              className="text-xs bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors shadow-md cursor-pointer h-[36px]"
            >
              ← Müşteri Yönetimi
            </button>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/40 text-zinc-400 hover:text-red-400 font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[36px] cursor-pointer disabled:opacity-50"
            >
              🚪 {isLoggingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
            </button>
          </div>
        </div>

        {/* TARİH VE ARALIK FİLTRELERİ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-950 border border-zinc-800 p-4 rounded-xl print:hidden">
          <div className="flex flex-wrap gap-2">
            {(['all', 'daily', 'weekly', 'monthly', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setFilterRange(range);
                  if (range !== 'custom') { setStartDate(''); setEndDate(''); }
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterRange === range ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white bg-zinc-900/50 border border-zinc-800'
                }`}
              >
                {range === 'all' && 'Tüm Zamanlar'}
                {range === 'daily' && 'Bugün'}
                {range === 'weekly' && 'Bu Hafta'}
                {range === 'monthly' && 'Bu Ay'}
                {range === 'custom' && '🗓️ Özel Tarih Seç'}
              </button>
            ))}
          </div>

          <div className={`flex items-center gap-2 transition-opacity ${filterRange === 'custom' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setFilterRange('custom'); }}
              className="bg-zinc-900 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
            <span className="text-zinc-600 text-xs">ve</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setFilterRange('custom'); }}
              className="bg-zinc-900 border border-zinc-800 text-xs px-3 py-1.5 rounded-lg text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* TIKLANABİLİR ÖZET İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6 print:gap-2">
          <div 
            onClick={() => setSelectedType(null)}
            className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border print:p-3 ${
              selectedType === null 
                ? 'bg-zinc-900/50 border-indigo-500' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase font-black block">Tüm Aktiviteler</span>
            <span className="text-2xl font-black text-white print:text-lg">{stats.total}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Telefon')}
            className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border print:p-3 ${
              selectedType === 'Telefon' 
                ? 'bg-zinc-900/50 border-indigo-500 shadow-indigo-500/10' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase font-black block">📞 Telefon</span>
            <span className="text-2xl font-black text-indigo-400 print:text-lg">{stats.telefon}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Mail')}
            className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border print:p-3 ${
              selectedType === 'Mail' 
                ? 'bg-zinc-900/50 border-indigo-500 shadow-indigo-500/10' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase font-black block">✉️ E-posta</span>
            <span className="text-2xl font-black text-emerald-400 print:text-lg">{stats.mail}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Toplantı')}
            className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border print:p-3 ${
              selectedType === 'Toplantı' 
                ? 'bg-zinc-900/50 border-indigo-500 shadow-indigo-500/10' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase font-black block">🤝 Toplantı</span>
            <span className="text-2xl font-black text-amber-400 print:text-lg">{stats.toplanti}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Teklif')}
            className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border print:p-3 ${
              selectedType === 'Teklif' 
                ? 'bg-zinc-900/50 border-indigo-500 shadow-indigo-500/10' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase font-black block">📄 Teklif Atma</span>
            <span className="text-2xl font-black text-sky-400 print:text-lg">{stats.teklif}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('SMS')}
            className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border print:p-3 ${
              selectedType === 'SMS' 
                ? 'bg-zinc-900/50 border-indigo-500 shadow-indigo-500/10' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase font-black block">💬 SMS / WP</span>
            <span className="text-2xl font-black text-purple-400 print:text-lg">{stats.sms}</span>
          </div>
        </div>

        {/* DİNAMİK LİSTELEME ALANI */}
        <div className="space-y-3 print:space-y-2">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-zinc-400 print:text-black print:text-xs">
              İşlem Kronolojisi ({finalFilteredActivities.length} Kayıt Gösteriliyor)
            </h2>
            {selectedType && (
              <button 
                onClick={() => setSelectedType(null)} 
                className="text-[11px] text-indigo-400 hover:underline print:hidden cursor-pointer"
              >
                Tür Filtresini Temizle (Tümünü Göster)
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="p-8 bg-zinc-950 border border-zinc-800 text-center rounded-xl text-zinc-500 text-sm">Veriler süzülüyor...</div>
          ) : finalFilteredActivities.length === 0 ? (
            <div className="p-8 bg-zinc-950 border border-zinc-800 text-center rounded-xl text-zinc-500 text-sm">
              Seçilen kriterlere uygun herhangi bir aktivite notu bulunamadı.
            </div>
          ) : (
            <div className="space-y-3 print:space-y-2">
              {finalFilteredActivities.map((act) => (
                <div 
                  key={act.id} 
                  className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl space-y-2 shadow-md print:bg-white print:border-zinc-300 print:p-3 print:shadow-none break-inside-avoid"
                >
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2 print:border-zinc-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 print:bg-zinc-100 print:border-zinc-300 print:text-black">
                        {act.type?.includes('Telefon') ? '📞 Telefon' : 
                         act.type?.includes('Mail') || act.type?.includes('E-posta') || act.type?.includes('E-Posta') ? '✉️ Mail' : 
                         act.type?.includes('Toplantı') ? '🤝 Toplantı' : 
                         act.type?.includes('Teklif') ? '📄 Teklif' : '💬 SMS'}
                      </span>
                      <span className="text-xs font-black text-indigo-400 print:text-black">
                        {act.clients?.company_name || 'Bilinmeyen Müşteri'}
                      </span>
                      {act.clients?.contact_person && (
                        <span className="text-xs text-zinc-500 print:text-zinc-600 font-medium">({act.clients.contact_person})</span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono print:text-zinc-600">{formatDateTime(act.activity_date)}</span>
                  </div>
                  
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans print:text-black print:text-xs">
                    {act.notes}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}