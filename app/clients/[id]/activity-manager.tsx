'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import AddActivityForm from './add-activity-form';

interface Activity {
  id: string;
  client_id: string;
  type: string;
  notes: string | null;
  next_followup_date: string | null;
  created_at: string;
}

export default function ActivityManager({ clientId, initialActivities }: { clientId: string; initialActivities: Activity[] }) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [typeFilter, setTypeFilter] = useState('Hepsi');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  
  const supabase = createClient();

  const handleActivityAdded = (newActivity: Activity) => {
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Bu aktivite notunu silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) {
      alert(`Silme hatası: ${error.message}`);
    } else {
      setActivities((prev) => prev.filter(act => act.id !== id));
    }
  };

  const handleUpdateActivity = async (id: string) => {
    const { data, error } = await supabase
      .from('activities')
      .update({ notes: editNotes }) // Şemadaki 'notes' alanını günceller
      .eq('id', id)
      .select()
      .single();

    if (error) {
      alert(`Güncelleme hatası: ${error.message}`);
    } else if (data) {
      setActivities((prev) => prev.map(act => act.id === id ? data : act));
      setEditingId(null);
    }
  };

  const filteredActivities = activities.filter(act => {
    if (typeFilter === 'Hepsi') return true;
    return act.type === typeFilter;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Telefon': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'E-posta': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Toplantı': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <AddActivityForm clientId={clientId} onActivityAdded={handleActivityAdded} />
      </div>
      
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-bold text-white tracking-tight">Geçmiş Etkileşimler / Görüşme Notları</h3>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="Hepsi">Tüm Etkileşimler</option>
            <option value="Telefon">Telefon Görüşmeleri</option>
            <option value="E-posta">E-postalar</option>
            <option value="Toplantı">Toplantılar</option>
          </select>
        </div>

        {filteredActivities.length === 0 ? (
          <p className="text-zinc-500 text-sm bg-zinc-950 border border-zinc-800 p-6 rounded-xl text-center">
            Görüşme notu veya aktivite bulunamadı.
          </p>
        ) : (
          <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-4">
            {filteredActivities.map((act) => {
              const isEditing = editingId === act.id;
              return (
                <div key={act.id} className="relative bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2 shadow-md">
                  <div className="absolute -left-[21px] top-5 w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-950" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTypeBadge(act.type)}`}>
                        {act.type || 'Not'}
                      </span>
                      <div className="text-xs text-zinc-500 font-mono">
                        {new Date(act.created_at).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    
                    {!isEditing && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(act.id); setEditNotes(act.notes || ''); }} className="text-xs text-zinc-500 hover:text-zinc-300" title="Düzenle">✏️</button>
                        <button onClick={() => handleDeleteActivity(act.id)} className="text-xs text-zinc-500 hover:text-red-400" title="Sil">🗑️</button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full p-2 text-sm bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none" rows={3} />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleUpdateActivity(act.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1 rounded font-medium">Güncelle</button>
                        <button onClick={() => setEditingId(null)} className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-medium">İptal</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {act.notes || '-'}
                    </p>
                  )}

                  {act.next_followup_date && (
                    <div className="text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/10 inline-block px-2 py-0.5 rounded mt-1">
                      ⏰ Hatırlatma Tarihi: {new Date(act.next_followup_date).toLocaleDateString('tr-TR')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}