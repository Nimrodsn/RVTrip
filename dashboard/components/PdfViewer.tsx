'use client';

import { useEffect, useRef, useState } from 'react';
import { strings } from '@/lib/strings';
import { buttonClasses } from '@/components/ui/Button';

/** Ceiling on the device pixel ratio, so a large page on a dense screen cannot exhaust canvas memory. */
const MAX_PIXEL_RATIO = 2;

type Props = {
  /** A blob: URL for a saved copy, or the remote URL when nothing was saved. */
  src: string;
};

/**
 * Draws the pages ourselves instead of handing the file to the browser: Chrome on Android has no
 * built-in PDF viewer, so an iframe or embed shows an empty frame there.
 */
export default function PdfViewer({ src }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
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
      } catch {
        if (cancelled) return;
        setLoading(false);
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="w-full h-full overflow-auto">
      {loading && <p className="py-8 text-center text-sm text-gray-500">{strings.documents.loadingPdf}</p>}
      {failed && (
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
