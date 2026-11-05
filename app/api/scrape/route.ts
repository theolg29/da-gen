import { NextRequest } from 'next/server';
import { scrapeSite } from '@/lib/scraper';
import { validateExternalUrl } from '@/lib/security';

// Scraping is long-running (navigation + screenshots + extra pages).
export const maxDuration = 300;

const MAX_EXTRA_PAGES = 6;

export async function POST(req: NextRequest) {
  const { url, delay, extraPages, zoom } = await req.json();

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }

  // Zoom navigateur des captures desktop : 50%–150%, défaut 100%.
  const safeZoom = typeof zoom === 'number' && isFinite(zoom)
    ? Math.min(1.5, Math.max(0.5, zoom))
    : 1;

  const validated = validateExternalUrl(url);
  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 });
  }
  const parsedUrl = validated.url;

  // Validate extra pages: must be valid http(s), not internal, same host.
  const safeExtraPages: { label: string; url: string }[] = [];
  if (Array.isArray(extraPages)) {
    for (const ep of extraPages.slice(0, MAX_EXTRA_PAGES)) {
      if (!ep || typeof ep.url !== 'string') continue;
      const v = validateExternalUrl(ep.url);
      if ('error' in v) continue;
      if (v.url.host !== parsedUrl.host) continue;
      safeExtraPages.push({ label: String(ep.label ?? ''), url: v.url.href });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Le scraper garde des listeners Puppeteer (`requestfailed`, `response`,
      // `pageerror`) actifs jusqu'à la fermeture du navigateur : ils peuvent
      // logger APRÈS qu'on a fermé le flux (scrape en erreur, client parti).
      // `enqueue` sur un controller fermé jette « Invalid state: Controller is
      // already closed » — depuis un listener, ça remonte en unhandledRejection
      // et fait tomber le process Node. On no-ope donc après la fermeture.
      let closed = false;
      const send = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true; // flux coupé côté client : on arrête d'émettre
        }
      };
      const sendLog = (data: { time: number; msg: string }) => {
        send(`event: log\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const result = await scrapeSite(parsedUrl.href, delay, safeExtraPages, sendLog, safeZoom);

        const json = JSON.stringify(result);
        const CHUNK_SIZE = 64 * 1024;
        const totalChunks = Math.ceil(json.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          send(`event: result-chunk\ndata: ${JSON.stringify({ i, total: totalChunks, chunk })}\n\n`);
        }
        send(`event: done\ndata: {}\n\n`);
      } catch (error: unknown) {
        console.error('Scraping error:', error);
        send(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to scrape site' })}\n\n`);
      } finally {
        closed = true;
        try { controller.close(); } catch { /* déjà fermé */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
