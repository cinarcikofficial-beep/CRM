'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

interface ActivityReportData {
  id: string;
  type: string;
  notes: string | null;
  activity_date: string;
  client_id: string;
  updated_by: string | null;
  clients: {
    company_name: string;
    contact_person: string | null;
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
  
  // Tür Filtreleme (Kart tıklamaları için)
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Premium UX Bilgilendirme Kutuları
  const [customAlert, setCustomAlert] = useState<string | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
          updated_by,
          clients (
            company_name,
            contact_person
          )
        `)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities((data as any) || []);
    } catch (error: any) {
      setCustomAlert('Rapor verileri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setCustomConfirm({
      message: 'Oturumu kapatmak istediğinize emin misiniz?',
      onConfirm: async () => {
        setIsLoggingOut(true);
        try {
          const res = await fetch('/api/auth/logout', { method: 'POST' });
          if (res.ok) {
            router.push('/register');
            router.refresh();
          } else {
            setCustomAlert('Çıkış yapılırken bir hata oluştu.');
          }
        } catch (err) {
          console.error(err);
          setCustomAlert('Bağlantı hatası oluştu.');
        } finally {
          setIsLoggingOut(false);
          setCustomConfirm(null);
        }
      }
    });
  };

  // 1. Kademe: Zaman Aralığı Filtreleme
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

  // İstatistik Sayaçlarının Hesaplanması (Mail Dönüş öncelikli ayıklandı)
  const stats = timeFilteredActivities.reduce(
    (acc, act) => {
      acc.total += 1;
      const currentType = act.type || '';
      
      if (currentType.includes('Dönüş') || currentType.includes('Donus')) {
        acc.mailDonus += 1;
      } else if (currentType.includes('Telefon')) {
        acc.telefon += 1;
      } else if (currentType.includes('Mail') || currentType.includes('E-posta') || currentType.includes('E-Posta')) {
        acc.mail += 1;
      } else if (currentType.includes('Toplantı')) {
        acc.toplanti += 1;
      } else if (currentType.includes('Teklif')) {
        acc.teklif += 1;
      } else {
        acc.mailDonus += 1;
      }
      
      return acc;
    },
    { total: 0, telefon: 0, mail: 0, toplanti: 0, teklif: 0, mailDonus: 0 }
  );

  // 2. Kademe: Kart Tıklamasına Göre Tür Süzgeci
  const finalFilteredActivities = timeFilteredActivities.filter((act) => {
    if (!selectedType) return true;
    const currentType = act.type || '';
    
    if (selectedType === 'Telefon') return currentType.includes('Telefon');
    if (selectedType === 'Mail') {
      return (currentType.includes('Mail') || currentType.includes('E-posta') || currentType.includes('E-Posta')) && 
             !currentType.includes('Dönüş') && !currentType.includes('Donus');
    }
    if (selectedType === 'Toplantı') return currentType.includes('Toplantı');
    if (selectedType === 'Teklif') return currentType.includes('Teklif');
    if (selectedType === 'Mail Dönüş') {
      return currentType.includes('Dönüş') || currentType.includes('Donus') || (
        !currentType.includes('Telefon') && 
        !currentType.includes('Toplantı') && 
        !currentType.includes('Teklif') &&
        !currentType.includes('Mail') &&
        !currentType.includes('E-posta') &&
        !currentType.includes('E-Posta')
      );
    }
    return currentType === selectedType;
  });

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatUpdatedBy = (emailOrId: string | null) => {
    if (!emailOrId) return 'Sistem';
    if (emailOrId.includes('@')) {
      const handle = emailOrId.split('@')[0];
      const rawName = handle.split('.')[0];
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
    const rawName = emailOrId.split('.')[0];
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
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
    bodyText += `↩️ Mail Dönüş: ${stats.mailDonus}\n\n`;
    
    bodyText += `--- İŞLEM KRONOLOJİSİ ---\n`;
    finalFilteredActivities.forEach((act, index) => {
      bodyText += `${index + 1}) [${act.type}] ${act.clients?.company_name || 'Müşteri'} - ${formatDateTime(act.activity_date)} (Ekleyen: ${formatUpdatedBy(act.updated_by)})\nNot: ${act.notes || '-'}\n\n`;
    });

    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  };

  return (
    <div className="min-h-screen bg-[#0d1321] text-slate-100 p-6 relative font-sans antialiased print:bg-white print:text-black print:p-0">
      <div className="max-w-7xl mx-auto space-y-6 print:space-y-4">
        
        {/* ÜST BAŞLIK BARBARI */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-4 gap-4 print:flex print:justify-between print:border-zinc-300">
          <div className="text-center md:text-left">
            <h1 className="text-xl font-bold tracking-tight text-white print:text-black">CRM Aktivite Raporu</h1>
            <p className="text-xs text-slate-400 print:text-zinc-600 font-medium mt-0.5">
              {getPeriodText()} {selectedType ? `(Sadece ${selectedType === 'Teklif' ? 'Teklif Atma' : selectedType} gösteriliyor)` : ''}
            </p>
          </div>
          
          <div className="flex justify-center items-center print:hidden">
            <Image
              src="/verytech_beyaz.png"
              alt="Verytech CRM Logo"
              width={160}
              height={40}
              priority
              className="object-contain"
            />
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-2 print:hidden">
            <button
              onClick={handleSendEmail}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-black px-3.5 py-2.5 rounded-lg transition-all shadow-md cursor-pointer h-[38px] uppercase tracking-wide whitespace-nowrap flex items-center gap-1.5"
            >
              ✉️ E-Posta Gönder
            </button>
            <button
              onClick={() => window.print()}
              className="text-xs bg-[#141d30] hover:bg-[#1c263c] border border-slate-700/50 px-3.5 py-2.5 rounded-lg text-slate-200 font-bold hover:text-white transition-all shadow-md cursor-pointer h-[38px] whitespace-nowrap flex items-center gap-1.5"
            >
              🖨️ Yazdır / PDF
            </button>
            <button 
              onClick={() => router.push('/clients')}
              className="text-xs bg-[#141d30] hover:bg-[#1c263c] border border-slate-700/50 px-3.5 py-2.5 rounded-lg text-slate-300 hover:text-white transition-all shadow-md cursor-pointer h-[38px] flex items-center gap-1.5 whitespace-nowrap"
            >
              ← Müşteriler
            </button>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs bg-amber-955/20 hover:bg-amber-900/40 border border-amber-900/30 text-amber-400 font-semibold px-3.5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5 h-[38px] cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              🚪 {isLoggingOut ? '...' : 'Çıkış'}
            </button>
          </div>
        </div>

        {/* TARİH VE ARALIK FİLTRELERİ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141d30] border border-slate-800/80 p-4 rounded-xl print:hidden">
          <div className="flex flex-wrap gap-2">
            {(['all', 'daily', 'weekly', 'monthly', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setFilterRange(range);
                  if (range !== 'custom') { setStartDate(''); setEndDate(''); }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  filterRange === range 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white bg-[#1c263c] border-slate-700/50'
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

          <div className={`flex items-center gap-2 transition-all ${filterRange === 'custom' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setFilterRange('custom'); }}
              className="bg-[#1c263c] border border-slate-700/60 text-xs px-3 py-2 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
            <span className="text-slate-500 text-xs font-bold">ve</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setFilterRange('custom'); }}
              className="bg-[#1c263c] border border-slate-700/60 text-xs px-3 py-2 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* METRİK SAYAÇ KARTLARI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6 print:gap-2">
          <div 
            onClick={() => setSelectedType(null)}
            className={`p-5 rounded-2xl shadow-xl cursor-pointer transition-all border duration-200 ${
              selectedType === null 
                ? 'bg-[#1c263c] border-indigo-500 shadow-indigo-950/20' 
                : 'bg-[#141d30] border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">Tüm Aktiviteler</span>
            <span className="text-2xl font-black text-white">{stats.total}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Telefon')}
            className={`p-5 rounded-2xl shadow-xl cursor-pointer transition-all border duration-200 ${
              selectedType === 'Telefon' 
                ? 'bg-[#1c263c] border-indigo-500 shadow-indigo-950/20' 
                : 'bg-[#141d30] border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">📞 Telefon</span>
            <span className="text-2xl font-black text-indigo-400">{stats.telefon}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Mail')}
            className={`p-5 rounded-2xl shadow-xl cursor-pointer transition-all border duration-200 ${
              selectedType === 'Mail' 
                ? 'bg-[#1c263c] border-indigo-500 shadow-indigo-950/20' 
                : 'bg-[#141d30] border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">✉️ E-posta</span>
            <span className="text-2xl font-black text-emerald-400">{stats.mail}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Toplantı')}
            className={`p-5 rounded-2xl shadow-xl cursor-pointer transition-all border duration-200 ${
              selectedType === 'Toplantı' 
                ? 'bg-[#1c263c] border-indigo-500 shadow-indigo-950/20' 
                : 'bg-[#141d30] border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">🤝 Toplantı</span>
            <span className="text-2xl font-black text-amber-400">{stats.toplanti}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Teklif')}
            className={`p-5 rounded-2xl shadow-xl cursor-pointer transition-all border duration-200 ${
              selectedType === 'Teklif' 
                ? 'bg-[#1c263c] border-indigo-500 shadow-indigo-950/20' 
                : 'bg-[#141d30] border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">📄 Teklif Atma</span>
            <span className="text-2xl font-black text-sky-400">{stats.teklif}</span>
          </div>

          <div 
            onClick={() => toggleTypeFilter('Mail Dönüş')}
            className={`p-5 rounded-2xl shadow-xl cursor-pointer transition-all border duration-200 ${
              selectedType === 'Mail Dönüş' 
                ? 'bg-[#1c263c] border-indigo-500 shadow-indigo-950/20' 
                : 'bg-[#141d30] border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block mb-1">↩️ Mail Dönüş</span>
            <span className="text-2xl font-black text-purple-400">{stats.mailDonus}</span>
          </div>
        </div>

        {/* DİNAMİK KRONOLOJİ AKIŞ PANELİ */}
        <div className="space-y-4 print:space-y-2">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              İşlem Kronolojisi ({finalFilteredActivities.length} Kayıt Gösteriliyor)
            </h2>
            {selectedType && (
              <button 
                onClick={() => setSelectedType(null)} 
                className="text-[11px] text-indigo-400 font-bold hover:underline print:hidden cursor-pointer"
              >
                Tür Filtresini Temizle (Tümünü Göster)
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="p-12 bg-[#141d30] border border-slate-800/80 text-center rounded-2xl text-slate-400 text-xs font-bold">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Aktiviteler süzülüyor...
            </div>
          ) : finalFilteredActivities.length === 0 ? (
            <div className="p-10 bg-[#141d30] border border-slate-800/80 text-center rounded-2xl text-slate-500 text-xs italic">
              Seçilen arama kriterlerine uygun herhangi bir görüşme veya aktivite notu bulunamadı.
            </div>
          ) : (
            <div className="space-y-3 print:space-y-2">
              {finalFilteredActivities.map((act) => (
                <div 
                  key={act.id} 
                  className="bg-[#141d30] border border-slate-800/70 p-5 rounded-2xl space-y-3 shadow-md hover:border-slate-700/60 transition-all print:bg-white print:border-zinc-300 print:p-3 print:shadow-none break-inside-avoid"
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-850 pb-2 print:border-zinc-200">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black tracking-wide px-2.5 py-1 rounded-lg bg-indigo-955/40 text-indigo-400 border border-indigo-900/40 uppercase print:bg-zinc-100 print:border-zinc-300 print:text-black">
                        {act.type?.includes('Dönüş') || act.type?.includes('Donus') ? '↩️ Mail Dönüş' : 
                         act.type?.includes('Telefon') ? '📞 Telefon' : 
                         act.type?.includes('Mail') || act.type?.includes('E-posta') || act.type?.includes('E-Posta') ? '✉️ Mail' : 
                         act.type?.includes('Toplantı') ? '🤝 Toplantı' : 
                         act.type?.includes('Teklif') ? '📄 Teklif' : '↩️ Mail Dönüş'}
                      </span>
                      <span className="text-xs font-black text-white hover:underline cursor-pointer print:text-black" onClick={() => router.push(`/clients/${act.client_id}`)}>
                        {act.clients?.company_name || 'Bilinmeyen Müşteri'}
                      </span>
                      {act.clients?.contact_person && (
                        <span className="text-[11px] text-slate-500 font-bold print:text-zinc-600">({act.clients.contact_person})</span>
                      )}
                    </div>
                    
                    <span className="text-[10px] text-slate-400 font-mono print:text-zinc-600">{formatDateTime(act.activity_date)}</span>
                  </div>
                  
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-[#0d1321]/40 p-3 rounded-xl border border-slate-850 print:bg-transparent print:border-none print:p-0 print:text-black">
                    "{act.notes}"
                  </p>

                  <div className="flex justify-end text-[10px] text-slate-500 pt-1 print:text-zinc-600">
                    <span className="font-black text-slate-400 bg-[#0d1321] border border-slate-800/60 px-2 py-0.5 rounded flex items-center gap-1 print:bg-transparent print:border-none print:text-zinc-700">
                      👤 {formatUpdatedBy(act.updated_by)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ONAY PENCERELERİ... */}
      {customConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in print:hidden">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <span className="text-2xl">⚠️</span>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-200">Onay Gerekiyor</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">{customConfirm.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCustomConfirm(null)}
                className="bg-[#1c263c] hover:bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                İptal
              </button>
              <button 
                onClick={customConfirm.onConfirm}
                className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BİLGİLENDİRME PENCERELERİ... */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in print:hidden">
          <div className="bg-[#141d30] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3 text-indigo-400">
              <span className="text-2xl">💡</span>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-200">Sistem Bilgisi</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">{customAlert}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setCustomAlert(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
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