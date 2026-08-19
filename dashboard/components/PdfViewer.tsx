'use client';

import { useEffect, useRef, useState } from 'react';
import { strings } from '@/lib/strings';
import { buttonClasses } from '@/components/ui/Button';

/** Ceiling on the device pixel ratio, so a large page on a dense screen cannot exhaust canvas memory. */
const MAX_PIXEL_RATIO = 2;

type Props = {
  /** A blob: URL for a saved copy, or the remote URL when nothing was saved. */
  src: string;
  onStatus?: (status: string, data: Record<string, unknown>) => void;
};

/**
 * Draws the pages ourselves instead of handing the file to the browser: Chrome on Android has no
 * built-in PDF viewer, so an iframe or embed shows an empty frame there.
 */
export default function PdfViewer({ src, onStatus }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Held in a ref so a caller that passes an inline callback cannot restart the render loop.
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjs = await import('pdfjs-dist');
        // Served from public/ and precached by the service worker, so this resolves with no network.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const data = await (await fetch(src)).arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const host = hostRef.current;
        if (!host) return;
        host.replaceChildren();

        const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          if (cancelled) return;

          const unscaled = page.getViewport({ scale: 1 });
          const width = host.clientWidth || unscaled.width;
          const viewport = page.getViewport({ scale: (width / unscaled.width) * ratio });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'mb-3 w-full h-auto rounded-lg shadow-sm bg-white';
          host.appendChild(canvas);

          const context = canvas.getContext('2d');
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
        }

        if (cancelled) return;
        setLoading(false);
        onStatusRef.current?.('rendered', { pages: doc.numPages, isBlob: src.startsWith('blob:') });
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        setError(String(err));
        onStatusRef.current?.('failed', { error: String(err), isBlob: src.startsWith('blob:') });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="w-full h-full overflow-auto">
      {loading && <p className="py-8 text-center text-sm text-gray-500">{strings.documents.loadingPdf}</p>}
      {error && (
        <div className="py-8 text-center">
          <p className="mb-3 text-sm text-gray-500">{strings.documents.pdfFailed}</p>
          <a href={src} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: 'sm' })}>
            {strings.documents.open} ↗
          </a>
        </div>
      )}
      <div ref={hostRef} className="w-full" />
    </div>
  );
}
