import { NextRequest, NextResponse } from 'next/server';
import { scrapeSite } from '@/lib/scraper';

export const maxDuration = 60; // Set max duration for Vercel Serverless Functions

export async function POST(req: NextRequest) {
  try {
    const { url, delay, siteType, productListUrl, productUrl } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format and protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL invalide. Vérifiez le format (ex: https://example.com)' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Seuls les protocoles HTTP et HTTPS sont supportés.' }, { status: 400 });
    }

    const result = await scrapeSite(parsedUrl.href, delay, {
      siteType: siteType || 'vitrine',
      productListUrl: productListUrl || undefined,
      productUrl: productUrl || undefined,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to scrape site' }, { status: 500 });
  }
}
