import React from "react";
import { useDAStore } from "@/store/daStore";
import { Globe, FileText } from "lucide-react";

export const PageScreenshots = () => {
  const { scrapeResult, activePageIndex, setActivePageIndex } = useDAStore();

  if (!scrapeResult || scrapeResult.extraPages.length === 0) return null;

  const pages = [
    { label: "Accueil", url: scrapeResult.siteUrl },
    ...scrapeResult.extraPages.map((p) => ({ label: p.label, url: p.url })),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider mb-0.5">
        Pages
      </span>
      {pages.map((page, i) => (
        <button
          key={i}
          onClick={() => setActivePageIndex(i)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            activePageIndex === i
              ? "border-foreground/15 bg-foreground/[0.04]"
              : "border-transparent hover:bg-foreground/[0.02] opacity-50 hover:opacity-80"
          }`}
        >
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
              activePageIndex === i
                ? "bg-foreground text-background"
                : "bg-foreground/5 text-foreground/40"
            }`}
          >
            {i === 0 ? (
              <Globe className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 shrink-0" />
            )}
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
