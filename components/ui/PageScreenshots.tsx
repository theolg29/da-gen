import React from "react";
import { useDAStore } from "@/store/daStore";
import { Globe, LayoutGrid, Package } from "lucide-react";

export const PageScreenshots = () => {
  const { scrapeResult, activePage, setActivePage } = useDAStore();

  if (!scrapeResult) return null;

  const isEcommerce = scrapeResult.siteType === "ecommerce";

  const pages: {
    key: typeof activePage;
    label: string;
    url: string;
    icon: React.ReactNode;
    available: boolean;
  }[] = [
    {
      key: "home",
      label: "Accueil",
      url: scrapeResult.siteUrl,
      icon: <Globe className="w-3.5 h-3.5 shrink-0" />,
      available: true,
    },
    {
      key: "productList",
      label: "Catalogue",
      url: scrapeResult.productListScreenshots?.url || "",
      icon: <LayoutGrid className="w-3.5 h-3.5 shrink-0" />,
      available: isEcommerce && !!scrapeResult.productListScreenshots,
    },
    {
      key: "product",
      label: "Produit",
      url: scrapeResult.productScreenshots?.url || "",
      icon: <Package className="w-3.5 h-3.5 shrink-0" />,
      available: isEcommerce && !!scrapeResult.productScreenshots,
    },
  ];

  const availablePages = pages.filter((p) => p.available);

  // If only home page, don't show the selector
  if (availablePages.length <= 1) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider mb-0.5">
        Pages
      </span>
      {availablePages.map((page) => (
        <button
          key={page.key}
          onClick={() => setActivePage(page.key)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            activePage === page.key
              ? "border-foreground/15 bg-foreground/[0.04]"
              : "border-transparent hover:bg-foreground/[0.02] opacity-50 hover:opacity-80"
          }`}
        >
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
              activePage === page.key
                ? "bg-foreground text-background"
                : "bg-foreground/5 text-foreground/40"
            }`}
          >
            {page.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-tight">{page.label}</p>
            <p className="text-[10px] text-foreground/30 font-medium truncate mt-0.5">
              {page.url}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
