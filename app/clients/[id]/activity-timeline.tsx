'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Activity {
  id: string;
  type: string;
  notes: string;
  activity_date: string;
  next_followup_date: string | null;
}

export default function ActivityTimeline({ initialActivities }: { initialActivities: Activity[] }) {
  const supabase = createClient();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async (activityId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('activities')
      .update({ notes: editNotes })
      .eq('id', activityId);

    if (error) {
      alert('Not güncellenirken hata oluştu: ' + error.message);
    } else {
      setActivities((prev) =>
        prev.map((act) => (act.id === activityId ? { ...act, notes: editNotes } : act))
      );
      setEditingId(null);
    }
    setSaving(false);
  };

  // Aktivite/Not Silme Fonksiyonu
  const handleDeleteActivity = async (activityId: string) => {
    const confirmed = window.confirm('Bu görüşme notunu tamamen silmek istediğinize emin misiniz?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      alert('Not silinirken bir hata oluştu: ' + error.message);
    } else {
      setActivities((prev) => prev.filter((act) => act.id !== activityId));
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 p-6 text-white">
      <h2 className="text-lg font-black text-white mb-6 border-b border-zinc-800 pb-3">
        Görüşme Geçmişi (Zaman Tüneli)
      </h2>

      {activities.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm font-bold border-2 border-dashed border-zinc-800 rounded-lg">
          Bu müşteriyle ilgili henüz hiçbir işlem yapılmamış.
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={activity.id} className="block relative pb-8">
                {activityIdx !== activities.length - 1 ? (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-zinc-800" aria-hidden="true" />
                ) : null}

                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center ring-8 ring-zinc-900 text-md">
                      {activity.type === 'Arama' && '📞'}
                      {activity.type === 'E-posta' && '📧'}
                      {activity.type === 'Toplantı' && '🤝'}
                      {activity.type === 'Teklif İletildi' && '📄'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 pt-1.5">
                    <div className="flex justify-between items-center space-x-4">
                      <p className="text-sm font-black text-zinc-200">{activity.type} gerçekleştirildi</p>
                      <div className="text-right text-xs whitespace-nowrap font-bold text-zinc-400">
                        {new Date(activity.activity_date).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Not Alanı */}
                    <div className="mt-2 bg-zinc-950/40 p-3 rounded-md border border-zinc-800 relative group">
                      {editingId === activity.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={3}
                            className="w-full text-sm text-white font-semibold border border-zinc-700 p-2 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-zinc-800"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200"
                            >
                              İptal
                            </button>
                            <button
                              onClick={() => handleSaveEdit(activity.id)}
                              disabled={saving}
                              className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                              {saving ? 'Kaydediliyor...' : 'Değişikliği Kaydet'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-zinc-300 font-medium whitespace-pre-wrap">{activity.notes}</p>
                          
                          {/* Aksiyon Butonları (Düzenle & Sil) */}
                          <div className="absolute right-3 bottom-2 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 py-0.5 px-2 rounded border border-zinc-800">
                            <button
                              onClick={() => {
                                setEditingId(activity.id);
                                setEditNotes(activity.notes);
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="text-xs text-red-400 hover:text-red-300 font-bold"
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {activity.next_followup_date && (
                      <div className="mt-2 text-xs font-black text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-md inline-flex items-center border border-amber-900/60">
                        ⏳ Hatırlatma: Bir sonraki takip tarihi: {new Date(activity.next_followup_date).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}