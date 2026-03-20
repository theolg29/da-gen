import React, { useState } from "react";
import { useDAStore } from "@/store/daStore";
import { Loader2, Settings2, Store, Globe } from "lucide-react";

export const UrlInput = () => {
  const {
    setUrl,
    setIsLoading,
    setScrapeResult,
    setError,
    isLoading,
    screenshotDelay,
    setScreenshotDelay,
    siteType,
    setSiteType,
  } = useDAStore();
  const [localUrl, setLocalUrl] = useState("");
  const [localProductListUrl, setLocalProductListUrl] = useState("");
  const [localProductUrl, setLocalProductUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAnalyze = async () => {
    if (!localUrl) return;

    // Prepend https:// if no protocol specified
    let urlToAnalyze = localUrl.trim();
    if (!/^https?:\/\//i.test(urlToAnalyze)) {
      urlToAnalyze = `https://${urlToAnalyze}`;
      setLocalUrl(urlToAnalyze);
    }

    // Validate URL format
    try {
      new URL(urlToAnalyze);
    } catch {
      setError("URL invalide. Vérifiez le format (ex: https://example.com)");
      return;
    }

    // Normalize extra URLs
    const prepareUrl = (raw: string) => {
      let u = raw.trim();
      if (!u) return undefined;
      if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
      try { new URL(u); return u; } catch { return undefined; }
    };

    setIsLoading(true);
    setError(null);
    setUrl(urlToAnalyze);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlToAnalyze,
          delay: screenshotDelay,
          siteType,
          productListUrl: siteType === 'ecommerce' ? prepareUrl(localProductListUrl) : undefined,
          productUrl: siteType === 'ecommerce' ? prepareUrl(localProductUrl) : undefined,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setScrapeResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'analyser ce site.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Site type toggle */}
      <div className="flex gap-1.5 p-1 bg-background border border-border rounded-xl">
        <button
          onClick={() => setSiteType('vitrine')}
          className={`flex-1 h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            siteType === 'vitrine'
              ? "bg-foreground text-background shadow-sm"
              : "text-foreground/40 hover:text-foreground/60"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Site vitrine
        </button>
        <button
          onClick={() => setSiteType('ecommerce')}
          className={`flex-1 h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            siteType === 'ecommerce'
              ? "bg-foreground text-background shadow-sm"
              : "text-foreground/40 hover:text-foreground/60"
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          E-commerce
        </button>
      </div>

      {/* Main URL */}
      <div className="flex flex-col md:flex-row gap-3 w-full relative">
        <div className="flex-1 relative">
          <input
            type="text"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            placeholder="https://www.exemple.com"
            className="w-full h-12 bg-background border border-border rounded-xl px-5 text-sm outline-none focus:border-foreground/20 transition-all font-medium placeholder:text-foreground/25"
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-12 w-12 flex items-center justify-center border rounded-xl transition-all cursor-pointer ${showAdvanced ? "bg-foreground/5 border-foreground/10 text-foreground" : "bg-background border-border text-foreground/50 hover:text-foreground hover:bg-foreground/5"}`}
          title="Paramètres avancés"
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !localUrl}
          className="h-12 px-8 bg-foreground text-background rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
        >
          {isLoading ? "Analyse en cours..." : "Générer le projet"}
        </button>
      </div>

      {/* E-commerce extra URLs */}
      {siteType === 'ecommerce' && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
          <input
            type="text"
            value={localProductListUrl}
            onChange={(e) => setLocalProductListUrl(e.target.value)}
            placeholder="Page catalogue — https://www.exemple.com/collections/all"
            className="w-full h-12 bg-background border border-border rounded-xl px-5 text-sm outline-none focus:border-foreground/20 transition-all font-medium placeholder:text-foreground/25"
          />
          <input
            type="text"
            value={localProductUrl}
            onChange={(e) => setLocalProductUrl(e.target.value)}
            placeholder="Page produit — https://www.exemple.com/products/exemple"
            className="w-full h-12 bg-background border border-border rounded-xl px-5 text-sm outline-none focus:border-foreground/20 transition-all font-medium placeholder:text-foreground/25"
          />
        </div>
      )}

      {showAdvanced && (
        <div className="absolute bottom-full right-[200px] mb-3 w-64 bg-background border border-border shadow-2xl rounded-xl p-3 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/80">
              Délai capture (sec)
            </span>
            <div className="flex items-center gap-2 bg-foreground/5 border border-border rounded-lg p-0.5">
              <button
                onClick={() =>
                  setScreenshotDelay(Math.max(1000, screenshotDelay - 1000))
                }
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background hover:shadow-sm text-foreground/60 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
                disabled={screenshotDelay <= 1000}
              >
                <div className="w-2.5 h-[1.5px] bg-current rounded-full" />
              </button>
              <span className="w-4 text-center text-xs font-bold text-foreground">
                {Math.round(screenshotDelay / 1000)}
              </span>
              <button
                onClick={() =>
                  setScreenshotDelay(Math.min(20000, screenshotDelay + 1000))
                }
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background hover:shadow-sm text-foreground/60 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
                disabled={screenshotDelay >= 20000}
              >
                <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                  <div className="absolute w-full h-[1.5px] bg-current rounded-full" />
                  <div className="absolute h-full w-[1.5px] bg-current rounded-full" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
