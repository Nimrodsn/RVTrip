'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import { strings } from '@/lib/strings';
import { days } from '@/lib/itinerary';
import type { PhotoEntry } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Reveal from '@/components/ui/Reveal';
import StaggerList from '@/components/ui/StaggerList';
import Card, { CARD_SURFACE } from '@/components/ui/Card';
import GlareCard from '@/components/ui/GlareCard';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function JournalPage() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [lightbox, setLightbox] = useState<PhotoEntry | null>(null);
  const [form, setForm] = useState({ locationName: '', day: days[0], note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const motionEnabled = useMotionEnabled();

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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title={strings.journal.title}
          action={
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? strings.today.cancel : strings.journal.pickPhoto}
            </Button>
          }
        />
      </div>

      {/* Upload Form */}
      {showForm && (
        <Reveal duration={250} className={cn(CARD_SURFACE, 'p-6 mb-6')}>
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
          <Button onClick={uploadPhoto} disabled={!file || uploading} className="px-6">
            {uploading ? 'מעלה...' : strings.journal.save}
          </Button>
        </Reveal>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📸"
            title={strings.journal.noPhotos}
            description={strings.journal.emptyHint}
            action={<Button onClick={() => setShowForm(true)}>{strings.journal.pickPhoto}</Button>}
          />
        </Card>
      ) : (
        <StaggerList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <GlareCard
              key={photo.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-gray-100 transition-transform hover:-translate-y-0.5"
            >
              <div className="h-full w-full" onClick={() => setLightbox(photo)}>
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
                  className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {strings.journal.delete}
                </button>
              </div>
            </GlareCard>
          ))}
        </StaggerList>
      )}

      {/* Lightbox */}
      {lightbox && (
        <motion.div
          data-motion=""
          initial={motionEnabled ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: motionEnabled ? 0.18 : 0 }}
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
        </motion.div>
      )}
    </div>
  );
}
