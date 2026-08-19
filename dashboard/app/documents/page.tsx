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
import { cn } from '@/lib/utils';

/** Kept from the tickets-only version so files saved before this page handled every category survive. */
const CACHE_NAME = 'rv-tickets-v1';

/** Snapshot of the Supabase rows, so the list still renders when the API cannot be reached. */
const CATALOG_KEY = 'rv-documents-catalog';

function readCatalog(): DocEntry[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    return raw ? (JSON.parse(raw) as DocEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCatalog(docs: DocEntry[]): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(docs));
  } catch {
    // Storage full or blocked. The cached files themselves are unaffected.
  }
}

async function cacheDocument(url: string): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const res = await fetch(url, { mode: 'cors' });
  if (res.ok) await cache.put(url, res);
}

async function getCachedBlob(url: string): Promise<string | null> {
  const cache = await caches.open(CACHE_NAME);
  // ignoreVary: the stored response came from a cross-origin fetch, so its Vary headers
  // must not decide whether we can reuse it later.
  const res = await cache.match(url, { ignoreVary: true });
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
  const res = await cache.match(url, { ignoreVary: true });
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
  const [viewingDoc, setViewingDoc] = useState<DocEntry | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerUnavailable, setViewerUnavailable] = useState(false);

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

  /** Only place the list changes, so the offline snapshot never drifts from what is on screen. */
  function commitDocs(list: DocEntry[]) {
    setDocs(list);
    writeCatalog(list);
  }

  async function loadDocs() {
    const snapshot = readCatalog();
    if (snapshot.length > 0) {
      setDocs(snapshot);
      refreshCacheStatus(snapshot);
    }

    const { data, error } = await supabase.from('documents').select('*').order('timestamp', { ascending: false });
    // Offline this request simply fails, and the snapshot above is everything we have.
    if (error || !data) return;

    const list = data as DocEntry[];
    commitDocs(list);
    refreshCacheStatus(list);
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
      const newDoc = data as DocEntry;
      commitDocs([newDoc, ...docs]);
      // Cache straight away: the file is already on this device, so an upload should not
      // need a second tap to become usable without a network.
      await handleCache(newDoc);
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
    commitDocs(docs.filter((d) => d.id !== doc.id));
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
    for (const doc of docs) {
      if (cachedUrls.has(getPublicUrl(doc.storage_path))) continue;
      await handleCache(doc);
    }
  }

  async function openDocument(doc: DocEntry) {
    const url = getPublicUrl(doc.storage_path);
    const blobUrl = typeof caches !== 'undefined' ? await getCachedBlob(url) : null;
    setViewingDoc(doc);
    setViewerUrl(blobUrl ?? url);
    // Nothing cached and no network: say so instead of opening a frame that cannot load.
    setViewerUnavailable(!blobUrl && !navigator.onLine);
  }

  function closeViewer() {
    if (viewerUrl && viewerUrl.startsWith('blob:')) URL.revokeObjectURL(viewerUrl);
    setViewingDoc(null);
    setViewerUrl(null);
    setViewerUnavailable(false);
  }

  const filtered = filterCat ? docs.filter((d) => d.category === filterCat) : docs;
  const cachedCount = docs.filter((d) => cachedUrls.has(getPublicUrl(d.storage_path))).length;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title={strings.documents.title}
          meta={docs.length > 0 ? `${cachedCount}/${docs.length} ${strings.documents.offlineStatus}` : undefined}
          action={
            <div className="flex flex-wrap gap-2">
              {cachedCount < docs.length && (
                <Button variant="warning" onClick={handleCacheAll} disabled={!!cachingUrl}>
                  {cachingUrl ? '...' : strings.documents.cacheAll}
                </Button>
              )}
              <Button onClick={() => setShowForm(!showForm)}>
                {showForm ? strings.documents.cancel : strings.documents.addDocument}
              </Button>
            </div>
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
                  {/* Always the in-app viewer: it reads the cached copy first, so it works with no network. */}
                  <Button
                    size="sm"
                    onClick={() => openDocument(doc)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {strings.documents.view}
                  </Button>
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

      {/* Full-Screen Document Viewer Overlay */}
      {viewingDoc && viewerUrl && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {DOC_CATEGORIES.find((c) => c.key === viewingDoc.category)?.emoji || '📄'}
              </span>
              <div>
                <p className="font-bold text-primary text-sm">{viewingDoc.name}</p>
                {cachedUrls.has(getPublicUrl(viewingDoc.storage_path)) && (
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
            {viewerUnavailable ? (
              <div className="max-w-sm text-center">
                <p className="text-4xl mb-3">📡</p>
                <p className="text-sm font-semibold text-primary mb-1">{viewingDoc.name}</p>
                <p className="text-sm text-gray-500">{strings.documents.offlineUnavailable}</p>
              </div>
            ) : viewingDoc.mime_type.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewerUrl}
                alt={viewingDoc.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : viewingDoc.mime_type === 'application/pdf' ? (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title={viewingDoc.name}
              />
            ) : (
              <div className="text-center">
                <p className="text-gray-500 mb-4">{viewingDoc.name}</p>
                <a
                  href={viewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ size: 'lg' })}
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
