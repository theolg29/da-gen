"use client";

import React from "react";
import { ChipSelector } from "@/components/ui/ChipSelector";
import { FileUpload } from "@/components/ui/FileUpload";
import { useDAStore } from "@/store/daStore";
import { Loader2, Sparkles, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

type CaseStudy = {
  title: string;
  tagline: string;
  intro: string;
  challenge: string;
  solution: string;
  results: string;
  services: string[];
  platform: string;
};

type SocialPost = {
  caption: string;
  hashtags: string[];
};

type GeneratedContent = {
  caseStudy: CaseStudy;
  socialPost: SocialPost;
};

export function ContentGenerator() {
  const { scrapeResult } = useDAStore();
  const [chips, setChips] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [clientBrief, setClientBrief] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [content, setContent] = React.useState<GeneratedContent | null>(null);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(["case-study", "social"]));

  const handleGenerate = async () => {
    if (!scrapeResult) return;
    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("chips", JSON.stringify(chips));
      formData.append("siteData", JSON.stringify({
        title: scrapeResult.title,
        domain: scrapeResult.domain,
        siteUrl: scrapeResult.siteUrl,
      }));
      formData.append("clientBrief", clientBrief);
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/generate-content", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Chips */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
          Caractériser le projet
        </span>
        <ChipSelector selected={chips} onChange={setChips} />
      </div>

      {/* Brief libre */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
          Brief (optionnel)
        </span>
        <textarea
          value={clientBrief}
          onChange={(e) => setClientBrief(e.target.value)}
          placeholder="Quelques mots sur le projet, les objectifs du client, les contraintes..."
          rows={3}
          className="w-full text-[11px] font-medium bg-foreground/[0.03] border border-border rounded-lg px-3 py-2 outline-none resize-none placeholder:text-foreground/20 text-foreground/70 focus:border-foreground/20 transition-colors"
        />
      </div>

      {/* File upload */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
          Documents contextuels
        </span>
        <FileUpload files={files} onChange={setFiles} />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full h-10 bg-foreground text-background rounded-xl font-semibold text-xs tracking-wide hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            {content ? "Regénérer" : "Générer le contenu"}
          </>
        )}
      </button>

      {error && (
        <p className="text-[11px] text-red-500 font-medium bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Generated content */}
      {content && (
        <div className="flex flex-col gap-3 mt-1">
          <div className="h-px bg-border" />

          {/* Case Study */}
          <ContentSection
            id="case-study"
            title="Cas client"
            expanded={expandedSections.has("case-study")}
            onToggle={toggleSection}
          >
            <div className="flex flex-col gap-3">
              <CopyBlock label="Titre" value={content.caseStudy.title} />
              <CopyBlock label="Accroche" value={content.caseStudy.tagline} />
              <CopyBlock label="Intro" value={content.caseStudy.intro} />
              <CopyBlock label="Défi" value={content.caseStudy.challenge} />
              <CopyBlock label="Solution" value={content.caseStudy.solution} />
              <CopyBlock label="Résultats" value={content.caseStudy.results} />
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/25">
                  Services
                </span>
                <div className="flex flex-wrap gap-1">
                  {content.caseStudy.services.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-foreground/[0.06] rounded-full text-foreground/60"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <CopyBlock label="Plateforme" value={content.caseStudy.platform} />
            </div>
          </ContentSection>

          {/* Social Post */}
          <ContentSection
            id="social"
            title="Post Instagram / LinkedIn"
            expanded={expandedSections.has("social")}
            onToggle={toggleSection}
          >
            <div className="flex flex-col gap-3">
              <CopyBlock label="Légende" value={content.socialPost.caption} multiline />
              <CopyBlock
                label="Hashtags"
                value={content.socialPost.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
              />
            </div>
          </ContentSection>

          {/* Copy all */}
          <CopyAllButton content={content} />
        </div>
      )}
    </div>
  );
}

function ContentSection({
  id,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors cursor-pointer"
      >
        <span className="text-[11px] font-bold text-foreground/70">{title}</span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-foreground/30" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-foreground/30" />
        )}
      </button>
      {expanded && <div className="p-3">{children}</div>}
    </div>
  );
}

function CopyBlock({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/25">{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[9px] font-semibold text-foreground/30 hover:text-foreground/60 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      {multiline ? (
        <p className="text-[11px] text-foreground/70 leading-relaxed whitespace-pre-wrap bg-foreground/[0.03] rounded-lg px-2.5 py-2 font-medium">
          {value}
        </p>
      ) : (
        <p className="text-[11px] text-foreground/70 font-medium">{value}</p>
      )}
    </div>
  );
}

function CopyAllButton({ content }: { content: GeneratedContent }) {
  const [copied, setCopied] = React.useState(false);

  const buildText = () => {
    const cs = content.caseStudy;
    const sp = content.socialPost;
    return [
      `=== CAS CLIENT ===`,
      `Titre : ${cs.title}`,
      `Accroche : ${cs.tagline}`,
      ``,
      `Intro :\n${cs.intro}`,
      ``,
      `Défi :\n${cs.challenge}`,
      ``,
      `Solution :\n${cs.solution}`,
      ``,
      `Résultats :\n${cs.results}`,
      ``,
      `Services : ${cs.services.join(", ")}`,
      `Plateforme : ${cs.platform}`,
      ``,
      `=== POST SOCIAL ===`,
      sp.caption,
      ``,
      sp.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" "),
    ].join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full h-8 flex items-center justify-center gap-2 text-[11px] font-semibold text-foreground/40 hover:text-foreground/70 border border-border rounded-xl hover:border-foreground/20 transition-all cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Tout copié !" : "Tout copier"}
    </button>
  );
}
