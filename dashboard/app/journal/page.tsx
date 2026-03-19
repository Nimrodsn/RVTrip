'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/strings';
import { days } from '@/lib/itinerary';
import type { PhotoEntry } from '@/lib/types';

export default function JournalPage() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [lightbox, setLightbox] = useState<PhotoEntry | null>(null);
  const [form, setForm] = useState({ locationName: '', day: days[0], note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    const { data } = await supabase.from('photos').select('*').order('timestamp', { ascending: false });
    if (data) setPhotos(data as PhotoEntry[]);
  }

  function getPublicUrl(path: string) {
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }

  async function uploadPhoto() {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file);
    if (uploadError) {
      setUploading(false);
      return;
    }

    const { data } = await supabase
      .from('photos')
      .insert({
        storage_path: path,
        location_name: form.locationName,
        day: form.day,
        timestamp: Date.now(),
        note: form.note,
      })
      .select()
      .single();

    if (data) setPhotos([data as PhotoEntry, ...photos]);
    setForm({ locationName: '', day: days[0], note: '' });
    setFile(null);
    setShowForm(false);
    setUploading(false);
  }

  async function deletePhoto(photo: PhotoEntry) {
    await supabase.storage.from('photos').remove([photo.storage_path]);
    await supabase.from('photos').delete().eq('id', photo.id);
    setPhotos(photos.filter((p) => p.id !== photo.id));
    if (lightbox?.id === photo.id) setLightbox(null);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-primary">{strings.journal.title}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          {showForm ? strings.today.cancel : strings.journal.pickPhoto}
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">בחר תמונה</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">מיקום</label>
              <input
                value={form.locationName}
                onChange={(e) => setForm({ ...form, locationName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="שם המקום"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.budget.day}</label>
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {days.map((d) => (
                  <option key={d} value={d}>יום {d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.journal.addNote}</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder={strings.journal.addNote}
            />
          </div>
          <button
            onClick={uploadPhoto}
            disabled={!file || uploading}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {uploading ? 'מעלה...' : strings.journal.save}
          </button>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <p className="text-center text-gray-400 py-12">{strings.journal.noPhotos}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-square cursor-pointer"
              onClick={() => setLightbox(photo)}
            >
              <img
                src={getPublicUrl(photo.storage_path)}
                alt={photo.location_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-xs font-semibold truncate">{photo.location_name}</p>
                <p className="text-white/60 text-xs">יום {photo.day}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePhoto(photo);
                }}
                className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {strings.journal.delete}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={getPublicUrl(lightbox.storage_path)}
              alt={lightbox.location_name}
              className="max-w-full max-h-[80vh] rounded-xl object-contain"
            />
            <div className="mt-3 text-white text-center">
              <p className="font-semibold">{lightbox.location_name}</p>
              <p className="text-sm text-white/60">יום {lightbox.day}</p>
              {lightbox.note && <p className="text-sm text-white/80 mt-1">{lightbox.note}</p>}
            </div>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -left-3 bg-white text-primary w-8 h-8 rounded-full font-bold text-lg flex items-center justify-center shadow-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
