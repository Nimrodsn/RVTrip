'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/strings';
import type { DocEntry, DocCategory } from '@/lib/types';

const CACHE_NAME = 'rv-tickets-v1';

async function cacheDocument(url: string): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const res = await fetch(url, { mode: 'cors' });
  if (res.ok) await cache.put(url, res);
}

async function getCachedBlob(url: string): Promise<string | null> {
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(url);
  if (!res) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function removeCachedDocument(url: string): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(url);
}

async function checkCached(url: string): Promise<boolean> {
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(url);
  return !!res;
}

const DOC_CATEGORIES: { key: DocCategory; label: string; emoji: string }[] = [
  { key: 'flight', label: strings.documents.flight, emoji: '✈️' },
  { key: 'insurance', label: strings.documents.insurance, emoji: '🛡️' },
  { key: 'reservation', label: strings.documents.reservation, emoji: '🏨' },
  { key: 'rental', label: strings.documents.rental, emoji: '🚐' },
  { key: 'passport', label: strings.documents.passport, emoji: '🛂' },
  { key: 'license', label: strings.documents.license, emoji: '🪪' },
  { key: 'ticket', label: strings.documents.ticket, emoji: '🎫' },
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

  const [cachedUrls, setCachedUrls] = useState<Set<string>>(new Set());
  const [cachingUrl, setCachingUrl] = useState<string | null>(null);
  const [viewingTicket, setViewingTicket] = useState<DocEntry | null>(null);
  const [ticketBlobUrl, setTicketBlobUrl] = useState<string | null>(null);

  function getPublicUrl(path: string) {
    return supabase.storage.from('documents').getPublicUrl(path).data.publicUrl;
  }

  const refreshCacheStatus = useCallback(async (docList: DocEntry[]) => {
    if (typeof caches === 'undefined') return;
    const cached = new Set<string>();
    for (const doc of docList) {
      const url = getPublicUrl(doc.storage_path);
      if (await checkCached(url)) cached.add(url);
    }
    setCachedUrls(cached);
  }, []);

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('timestamp', { ascending: false });
    if (data) {
      const list = data as DocEntry[];
      setDocs(list);
      refreshCacheStatus(list);
    }
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

    if (data) {
      const newDocs = [data as DocEntry, ...docs];
      setDocs(newDocs);
    }
    setForm({ note: '', category: 'other' });
    setFile(null);
    setShowForm(false);
    setUploading(false);
  }

  async function deleteDoc(doc: DocEntry) {
    const url = getPublicUrl(doc.storage_path);
    if (typeof caches !== 'undefined') await removeCachedDocument(url);
    await supabase.storage.from('documents').remove([doc.storage_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    const newDocs = docs.filter((d) => d.id !== doc.id);
    setDocs(newDocs);
    setCachedUrls((prev) => { const next = new Set(prev); next.delete(url); return next; });
  }

  async function handleCache(doc: DocEntry) {
    if (typeof caches === 'undefined') return;
    const url = getPublicUrl(doc.storage_path);
    setCachingUrl(url);
    try {
      await cacheDocument(url);
      setCachedUrls((prev) => new Set(prev).add(url));
    } catch { /* network error -- ignore */ }
    setCachingUrl(null);
  }

  async function handleUncache(doc: DocEntry) {
    if (typeof caches === 'undefined') return;
    const url = getPublicUrl(doc.storage_path);
    await removeCachedDocument(url);
    setCachedUrls((prev) => { const next = new Set(prev); next.delete(url); return next; });
  }

  async function handleCacheAll() {
    const tickets = docs.filter((d) => d.category === 'ticket');
    for (const doc of tickets) {
      await handleCache(doc);
    }
  }

  async function openTicketViewer(doc: DocEntry) {
    const url = getPublicUrl(doc.storage_path);
    setViewingTicket(doc);
    const blobUrl = await getCachedBlob(url);
    if (blobUrl) {
      setTicketBlobUrl(blobUrl);
    } else {
      setTicketBlobUrl(url);
    }
  }

  function closeViewer() {
    if (ticketBlobUrl && ticketBlobUrl.startsWith('blob:')) URL.revokeObjectURL(ticketBlobUrl);
    setViewingTicket(null);
    setTicketBlobUrl(null);
  }

  const filtered = filterCat ? docs.filter((d) => d.category === filterCat) : docs;
  const ticketDocs = docs.filter((d) => d.category === 'ticket');

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

      {/* Quick Tickets Banner */}
      {ticketDocs.length > 0 && (
        <div className="bg-amber-50 rounded-xl border-2 border-amber-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              🎫 {strings.documents.offlineTickets}
            </h2>
            <button
              onClick={handleCacheAll}
              className="px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-300 transition-colors"
            >
              {strings.documents.cacheAll}
            </button>
          </div>
          <div className="space-y-2">
            {ticketDocs.map((doc) => {
              const url = getPublicUrl(doc.storage_path);
              const isCached = cachedUrls.has(url);
              const isCaching = cachingUrl === url;
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100"
                >
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      isCached ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{doc.name}</p>
                    {isCached && (
                      <span className="text-[10px] font-medium text-green-600">{strings.documents.cached}</span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isCached && (
                      <button
                        onClick={() => handleCache(doc)}
                        disabled={isCaching}
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors disabled:opacity-50"
                      >
                        {isCaching ? '...' : strings.documents.saveOffline}
                      </button>
                    )}
                    <button
                      onClick={() => openTicketViewer(doc)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {strings.documents.viewTicket}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
          {filtered.map((doc) => {
            const url = getPublicUrl(doc.storage_path);
            const isCached = cachedUrls.has(url);
            const isCaching = cachingUrl === url;
            return (
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
                    {isCached && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {strings.documents.cached}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {!isCached ? (
                    <button
                      onClick={() => handleCache(doc)}
                      disabled={isCaching}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      {isCaching ? '...' : strings.documents.saveOffline}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUncache(doc)}
                      className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                    >
                      {strings.documents.removeCached}
                    </button>
                  )}
                  {doc.category === 'ticket' && (
                    <button
                      onClick={() => openTicketViewer(doc)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {strings.documents.viewTicket}
                    </button>
                  )}
                  <a
                    href={url}
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
            );
          })}
        </div>
      )}

      {/* Full-Screen Ticket Viewer Overlay */}
      {viewingTicket && ticketBlobUrl && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎫</span>
              <div>
                <p className="font-bold text-primary text-sm">{viewingTicket.name}</p>
                {cachedUrls.has(getPublicUrl(viewingTicket.storage_path)) && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {strings.documents.cached}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={closeViewer}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-4 bg-gray-50">
            {viewingTicket.mime_type.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ticketBlobUrl}
                alt={viewingTicket.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : viewingTicket.mime_type === 'application/pdf' ? (
              <iframe
                src={ticketBlobUrl}
                className="w-full h-full border-0"
                title={viewingTicket.name}
              />
            ) : (
              <div className="text-center">
                <p className="text-gray-500 mb-4">{viewingTicket.name}</p>
                <a
                  href={ticketBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {strings.documents.open} ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
