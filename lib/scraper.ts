import puppeteer, { type Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { extractColors } from './colorExtractor';

type ScrapeOptions = {
  siteType: 'vitrine' | 'ecommerce';
  productListUrl?: string;
  productUrl?: string;
};

/** Dismiss cookie banners, hide overlays & floating widgets */
async function dismissPopups(page: Page) {
  await page.evaluate(() => {
    // Click cookie accept buttons
    const selectors = [
      '#axeptio_btn_acceptAll', '#axeptio_btn_dismiss',
      '.axeptio_widget button[data-type="accept"]', '[data-axeptio-type="accept"]',
      'button[id*="cookie" i][id*="accept" i]', 'button[id*="cookie" i][id*="agree" i]',
      'button[class*="cookie" i][class*="accept" i]', 'button[class*="cookie" i][class*="agree" i]',
      'a[id*="cookie" i][id*="accept" i]', 'a[class*="cookie" i][class*="accept" i]',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '#onetrust-accept-btn-handler', '.cc-btn.cc-allow', '.cc-accept',
      '[data-testid="cookie-accept"]',
      '[aria-label*="cookie" i][aria-label*="accept" i]', '[aria-label*="cookie" i][aria-label*="agree" i]',
      'button[id*="accept" i]', 'button[class*="accept" i]', 'a[class*="accept" i]',
      '.consent-accept', '#consent-accept',
      '[class*="cookie" i] button', '[id*="cookie" i] button',
      '[class*="consent" i] button', '[id*="consent" i] button', '[class*="gdpr" i] button',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel) as HTMLElement | null;
      if (btn && btn.offsetParent !== null) { btn.click(); break; }
    }

    // Text-based fallback
    const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]')) as HTMLElement[];
    const acceptKeywords = ['accept', 'agree', 'allow', 'accepter', 'acceptez', "j'accepte", 'tout accepter', 'ok', 'got it', 'understood'];
    for (const btn of allButtons) {
      const text = (btn.innerText || btn.textContent || '').toLowerCase().trim();
      if (acceptKeywords.some(kw => text.includes(kw)) && btn.offsetParent !== null) {
        const rect = btn.getBoundingClientRect();
        if (rect.width < 400 && rect.width > 20) { btn.click(); break; }
      }
    }

    // CSS injection to hide overlays
    const overlaySelectors = [
      '[class*="cookie-banner" i]', '[class*="cookie-consent" i]', '[class*="cookie-notice" i]',
      '[class*="cookieConsent" i]', '[id*="cookie-banner" i]', '[id*="cookie-consent" i]',
      '[id*="cookieconsent" i]', '[class*="gdpr" i]', '#CybotCookiebotDialog',
      '#onetrust-banner-sdk', '.cc-window',
      '#axeptio_overlay', '.axeptio_widget', '.axeptio-widget', '[id^="axeptio"]',
      '.agJsWidget', '[id^="agWidget"]',
      '[class*="trustpilot-widget" i]', '[id*="trustpilot" i]',
      '[class*="avis-verifies" i]', '[id*="avis-verifies" i]',
      '[class*="chat-widget" i]', '[class*="chatWidget" i]', '[id*="chat-widget" i]',
      '[id*="intercom" i]', '[id*="crisp" i]', '[id*="hubspot-messages" i]', '[id*="tidio" i]',
    ];
    const style = document.createElement('style');
    style.innerHTML = overlaySelectors.map(s => `${s} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`).join('\n');
    document.head.appendChild(style);
  });
  await new Promise(resolve => setTimeout(resolve, 500));
}

/** Take desktop (viewport), desktop full page, and mobile full page screenshots */
async function captureScreenshots(page: Page) {
  // Desktop viewport
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
  const desktopBuf = Buffer.from(await page.screenshot());

  // Desktop full page (cap body height to avoid memory issues)
  await page.evaluate(() => {
    document.body.style.maxHeight = '6000px';
    document.body.style.overflow = 'hidden';
  });
  const desktopFullBuf = Buffer.from(await page.screenshot({ fullPage: true }));

  // Reset body constraints before mobile
  await page.evaluate(() => {
    document.body.style.maxHeight = '';
    document.body.style.overflow = '';
  });

  // Mobile full page
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise(resolve => setTimeout(resolve, 500));
  await page.evaluate(() => {
    document.body.style.maxHeight = '6000px';
    document.body.style.overflow = 'hidden';
  });
  const mobileBuf = Buffer.from(await page.screenshot({ fullPage: true }));

  // Reset for potential next navigation
  await page.evaluate(() => {
    document.body.style.maxHeight = '';
    document.body.style.overflow = '';
  });

  return {
    desktop: `data:image/png;base64,${desktopBuf.toString('base64')}`,
    desktopFull: `data:image/png;base64,${desktopFullBuf.toString('base64')}`,
    mobile: `data:image/png;base64,${mobileBuf.toString('base64')}`,
    desktopBuffer: desktopBuf,
  };
}

/** Navigate to a page, dismiss popups, and capture all screenshots */
async function navigateAndCapture(page: Page, pageUrl: string, delay: number) {
  await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(resolve => setTimeout(resolve, delay));
  await dismissPopups(page);
  return captureScreenshots(page);
}

export async function scrapeSite(url: string, delay: number = 2000, options: ScrapeOptions = { siteType: 'vitrine' }) {
  let browser = null;
  try {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    const exePath = isDev
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar');

    browser = await puppeteer.launch({
      args: isDev ? [] : chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: exePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Intercept font service URLs (Google Fonts, Fontshare, Adobe Fonts)
    const googleFonts: string[] = [];
    const fontshareFonts: string[] = [];
    const adobeFonts: string[] = [];
    page.on('request', (request) => {
      const reqUrl = request.url();
      if (reqUrl.includes('fonts.googleapis.com/css')) googleFonts.push(reqUrl);
      if (reqUrl.includes('api.fontshare.com')) fontshareFonts.push(reqUrl);
      if (reqUrl.includes('use.typekit.net')) adobeFonts.push(reqUrl);
    });

    // Navigate and capture main page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, delay));
    await dismissPopups(page);

    const title = await page.title();
    const domain = new URL(url).hostname;
    page.setDefaultTimeout(25000);

    // Main page screenshots
    const mainScreenshots = await captureScreenshots(page);

    // Extract colors from desktop hero
    const vibrantColors = await extractColors(mainScreenshots.desktopBuffer);

    // Extract logos (multiple candidates)
    let logoCandidates = await page.evaluate(() => {
      const candidates: string[] = [];

      const icon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement;
      if (icon) candidates.push(icon.href);

      const selectors = [
        'header img', 'nav img', '.logo img', '[class*="logo"] img',
        'header svg', 'nav svg', '.logo svg', 'a[href="/"] img', 'a[href="/"] svg',
        '[class*="logo"] svg',
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (el instanceof HTMLImageElement && el.src) {
            candidates.push(el.src);
          }
          if (el instanceof SVGSVGElement) {
            try {
              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(el);
              const encoded = btoa(unescape(encodeURIComponent(svgString)));
              candidates.push(`data:image/svg+xml;base64,${encoded}`);
            } catch {
              // Skip SVGs that can't be serialized
            }
          }
        });
      });

      return Array.from(new Set(candidates)).filter(src => src.startsWith('http') || src.startsWith('data:'));
    });

    const logosBase64: string[] = [];
    for (const src of logoCandidates.slice(0, 8)) {
      try {
        if (src.startsWith('data:')) {
          logosBase64.push(src);
          continue;
        }
        const logoPage = await browser.newPage();
        const response = await logoPage.goto(src, { timeout: 10000 });
        const buffer = await response?.buffer();
        if (buffer) {
          const contentType = response?.headers()['content-type'] || 'image/png';
          logosBase64.push(`data:${contentType};base64,${buffer.toString('base64')}`);
        }
        await logoPage.close();
      } catch { /* skip failed logos */ }
    }

    // CSS colors (buttons, links, accents)
    const cssColors = await page.evaluate(() => {
      const colors = new Set<string>();
      document.querySelectorAll('button, a, [class*="btn"], [class*="active"], h1, h2').forEach(el => {
        const style = window.getComputedStyle(el);
        [style.backgroundColor, style.color].forEach(c => {
          const rgb = c.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
            const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
            const isLight = (r * 299 + g * 587 + b * 114) / 1000 > 128;
            if (hex !== '#FFFFFF' && hex !== '#000000' && hex !== '#0A0A0A') {
              colors.add(JSON.stringify({ hex, isLight, rgb: [r, g, b] }));
            }
          }
        });
      });
      return Array.from(colors).slice(0, 10).map(s => JSON.parse(s));
    });

    // Combine CSS colors (priority) with Vibrant colors, deduplicate
    const combinedColors = [...cssColors, ...vibrantColors];
    const finalColors = Array.from(new Map(combinedColors.map(c => [c.hex, c])).values()).slice(0, 8);

    // Extract fonts
    const extractedFonts = await page.evaluate(() => {
      const fonts = new Map<string, number>();
      const iconKeywords = ['icon', 'symbol', 'remix', 'lucide', 'awesome', 'fontello', 'glyph', 'material'];
      const systemFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica', 'arial', 'times new roman', 'times', 'courier new', 'courier', 'inherit', 'initial', 'unset'];

      document.querySelectorAll('h1, h2, h3, h4, p, span, button, a, li, div').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.fontFamily) {
          const family = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          if (family) {
             const lowerFamily = family.toLowerCase();
             if (!iconKeywords.some(kw => lowerFamily.includes(kw)) && !systemFonts.includes(lowerFamily)) {
               fonts.set(family, (fonts.get(family) || 0) + 1);
             }
          }
        }
      });

      const fontFaceMap: Record<string, string> = {};
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules || [])) {
              if (rule instanceof CSSFontFaceRule) {
                const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                const src = rule.style.getPropertyValue('src');
                if (family && src) fontFaceMap[family] = src;
              }
            }
          } catch { /* cross-origin stylesheets */ }
        }
      } catch { /* no access */ }

      const sorted = Array.from(fonts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
      return { fontNames: sorted.slice(0, 10), fontFaceMap };
    });

    const siteBgColor = await page.evaluate(() => {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      const rgb = bg.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        return "#" + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
      }
      return "#FFFFFF";
    });

    // Normalize font names (camelCase → spaced)
    const normalizeFontName = (name: string): string => {
      return name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim();
    };

    const fontsWithUrls = extractedFonts.fontNames.map(name => {
      const displayName = normalizeFontName(name);
      const searchName = displayName.toLowerCase().replace(/ +/g, '+');
      const googleUrl = googleFonts.find(u => u.toLowerCase().includes(searchName));
      const fontshareUrl = fontshareFonts.find(u => u.toLowerCase().includes(searchName));
      const adobeUrl = adobeFonts.length > 0 ? adobeFonts[0] : undefined;
      const hasFontFace = !!extractedFonts.fontFaceMap[name] || !!extractedFonts.fontFaceMap[displayName];
      const fontUrl = googleUrl || fontshareUrl || adobeUrl || undefined;

      return {
        name: displayName,
        isGoogleFont: !!googleUrl,
        url: fontUrl,
        isSelfHosted: hasFontFace && !fontUrl,
      };
    });

    const primaryFont = fontsWithUrls[0];

    // E-commerce: capture extra page screenshots
    let productListScreenshots: { desktop: string; desktopFull: string; mobile: string; url: string } | undefined;
    let productScreenshots: { desktop: string; desktopFull: string; mobile: string; url: string } | undefined;

    if (options.siteType === 'ecommerce') {
      if (options.productListUrl) {
        try {
          const shots = await navigateAndCapture(page, options.productListUrl, delay);
          productListScreenshots = { desktop: shots.desktop, desktopFull: shots.desktopFull, mobile: shots.mobile, url: options.productListUrl };
        } catch (e) {
          console.error('[scraper] Failed to capture product list page:', e);
        }
      }
      if (options.productUrl) {
        try {
          const shots = await navigateAndCapture(page, options.productUrl, delay);
          productScreenshots = { desktop: shots.desktop, desktopFull: shots.desktopFull, mobile: shots.mobile, url: options.productUrl };
        } catch (e) {
          console.error('[scraper] Failed to capture product page:', e);
        }
      }
    }

    return {
      title,
      domain,
      siteType: options.siteType,
      siteUrl: url,
      logos: logosBase64,
      logo: logosBase64[0] || '',
      colors: finalColors,
      siteBgColor,
      fonts: fontsWithUrls,
      font: primaryFont ? {
        name: primaryFont.name,
        url: primaryFont.url,
        isGoogleFont: primaryFont.isGoogleFont,
      } : {
        name: 'Inter',
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        isGoogleFont: true,
      },
      screenshots: {
        desktop: mainScreenshots.desktop,
        desktopFull: mainScreenshots.desktopFull,
        mobile: mainScreenshots.mobile,
      },
      productListScreenshots,
      productScreenshots,
    };
  } finally {
    if (browser) await (browser as any).close();
  }
}
