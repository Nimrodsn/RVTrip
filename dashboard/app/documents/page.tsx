'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/strings';
import type { DocEntry, DocCategory } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Reveal from '@/components/ui/Reveal';
import StaggerList from '@/components/ui/StaggerList';
import Card, { CARD_SURFACE } from '@/components/ui/Card';
import Button, { buttonClasses } from '@/components/ui/Button';
import FilterPills from '@/components/ui/FilterPills';
import AccordionSection from '@/components/ui/AccordionSection';
import { cn } from '@/lib/utils';

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

/** Sentinel for the "all" pill, since the filter itself is a nullable category. */
const ALL_CATEGORIES = '__all__';

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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title={strings.documents.title}
          action={
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? strings.documents.cancel : strings.documents.addDocument}
            </Button>
          }
        />
      </div>

      {/* Upload Form */}
      {showForm && (
        <Reveal duration={250} className={cn(CARD_SURFACE, 'p-6 mb-6')}>
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
          <Button onClick={uploadDoc} disabled={!file || uploading} className="px-6">
            {uploading ? 'מעלה...' : strings.documents.save}
          </Button>
        </Reveal>
      )}

      {/* Quick Tickets Banner */}
      {ticketDocs.length > 0 && (
        <AccordionSection
          defaultOpen
          className="mb-6 border-2 border-amber-200 bg-amber-50"
          contentClassName="border-amber-200"
          title={<span className="text-amber-900">🎫 {strings.documents.offlineTickets}</span>}
          meta={<span className="text-xs font-medium text-amber-700">{ticketDocs.length}</span>}
        >
          <div className="mb-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleCacheAll}
              className="bg-amber-200 text-amber-800 hover:bg-amber-300"
            >
              {strings.documents.cacheAll}
            </Button>
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
                      <Button
                        size="sm"
                        onClick={() => handleCache(doc)}
                        disabled={isCaching}
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200"
                      >
                        {isCaching ? '...' : strings.documents.saveOffline}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => openTicketViewer(doc)}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {strings.documents.viewTicket}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* Category Filter Tabs */}
      <FilterPills
        className="mb-6"
        size="sm"
        layoutId="documents-category-pill"
        ariaLabel={strings.documents.category}
        activeValue={filterCat ?? ALL_CATEGORIES}
        onChange={(value) => setFilterCat(value === ALL_CATEGORIES ? null : (value as DocCategory))}
        items={[
          { value: ALL_CATEGORIES, label: `${strings.map.filterAll} (${docs.length})` },
          ...DOC_CATEGORIES.map((cat) => ({
            value: cat.key,
            label: `${cat.emoji} ${cat.label} (${docs.filter((d) => d.category === cat.key).length})`,
          })),
        ]}
      />

      {/* Document List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📎"
            title={strings.documents.noDocs}
            description={strings.documents.emptyHint}
            action={<Button onClick={() => setShowForm(true)}>{strings.documents.addDocument}</Button>}
          />
        </Card>
      ) : (
        <StaggerList className="space-y-3">
          {filtered.map((doc) => {
            const url = getPublicUrl(doc.storage_path);
            const isCached = cachedUrls.has(url);
            const isCaching = cachingUrl === url;
            return (
              <Card key={doc.id} interactive className="flex items-center gap-4 p-4">
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
                <div className="relative z-10 flex gap-2 shrink-0 flex-wrap">
                  {!isCached ? (
                    <Button
                      size="sm"
                      onClick={() => handleCache(doc)}
                      disabled={isCaching}
                      className="bg-amber-50 text-amber-700 hover:bg-amber-100"
                    >
                      {isCaching ? '...' : strings.documents.saveOffline}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleUncache(doc)}
                      className="bg-gray-50 text-gray-500 hover:bg-gray-100"
                    >
                      {strings.documents.removeCached}
                    </Button>
                  )}
                  {doc.category === 'ticket' && (
                    <Button
                      size="sm"
                      onClick={() => openTicketViewer(doc)}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {strings.documents.viewTicket}
                    </Button>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({
                      size: 'sm',
                      className: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                    })}
                  >
                    {strings.documents.open} ↗
                  </a>
                  <Button
                    size="sm"
                    onClick={() => deleteDoc(doc)}
                    className="bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    {strings.documents.delete}
                  </Button>
                </div>
              </Card>
            );
          })}
        </StaggerList>
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
