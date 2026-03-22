'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/strings';
import type { DocEntry, DocCategory } from '@/lib/types';

const DOC_CATEGORIES: { key: DocCategory; label: string; emoji: string }[] = [
  { key: 'flight', label: strings.documents.flight, emoji: '✈️' },
  { key: 'insurance', label: strings.documents.insurance, emoji: '🛡️' },
  { key: 'reservation', label: strings.documents.reservation, emoji: '🏨' },
  { key: 'rental', label: strings.documents.rental, emoji: '🚐' },
  { key: 'passport', label: strings.documents.passport, emoji: '🛂' },
  { key: 'license', label: strings.documents.license, emoji: '🪪' },
  { key: 'other', label: strings.documents.other, emoji: '📄' },
];

const CATEGORY_LABELS: Record<DocCategory, string> = Object.fromEntries(
  DOC_CATEGORIES.map((c) => [c.key, c.label])
) as Record<DocCategory, string>;

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [filterCat, setFilterCat] = useState<DocCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ note: '', category: 'other' as DocCategory });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('timestamp', { ascending: false });
    if (data) setDocs(data as DocEntry[]);
  }

  function getPublicUrl(path: string) {
    return supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
  }

  async function uploadDoc() {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file);
    if (uploadError) {
      setUploading(false);
      return;
    }

    const { data } = await supabase
      .from('documents')
      .insert({
        name: file.name,
        storage_path: path,
        mime_type: file.type,
        size: file.size,
        category: form.category,
        note: form.note,
        timestamp: Date.now(),
      })
      .select()
      .single();

    if (data) setDocs([data as DocEntry, ...docs]);
    setForm({ note: '', category: 'other' });
    setFile(null);
    setShowForm(false);
    setUploading(false);
  }

  async function deleteDoc(doc: DocEntry) {
    await supabase.storage.from('documents').remove([doc.storage_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    setDocs(docs.filter((d) => d.id !== doc.id));
  }

  const filtered = filterCat ? docs.filter((d) => d.category === filterCat) : docs;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-primary">{strings.documents.title}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          {showForm ? strings.documents.cancel : strings.documents.addDocument}
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.documents.pickFile}</label>
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.documents.category}</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as DocCategory })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {DOC_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{strings.documents.note}</label>
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="..."
              />
            </div>
          </div>
          <button
            onClick={uploadDoc}
            disabled={!file || uploading}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {uploading ? 'מעלה...' : strings.documents.save}
          </button>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterCat(null)}
          className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
            filterCat === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          הכל ({docs.length})
        </button>
        {DOC_CATEGORIES.map((cat) => {
          const count = docs.filter((d) => d.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setFilterCat(cat.key)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                filterCat === cat.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Document List */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">{strings.documents.noDocs}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                {DOC_CATEGORIES.find((c) => c.key === doc.category)?.emoji || '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary text-sm truncate">{doc.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span>{CATEGORY_LABELS[doc.category]}</span>
                  {doc.size && <span>{(doc.size / 1024).toFixed(0)} KB</span>}
                  {doc.note && <span>· {doc.note}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={getPublicUrl(doc.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  {strings.documents.open} ↗
                </a>
                <button
                  onClick={() => deleteDoc(doc)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  {strings.documents.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
