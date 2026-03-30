"use client";

import React, { useRef } from "react";
import {
  Loader2, ArrowUp, Copy, Check,
  ChevronDown, ChevronUp, Paperclip, X, ChevronRight,
  Linkedin, Instagram,
} from "lucide-react";
import { toast } from "sonner";
import { GeneratedContent } from "@/types";
import { ChipSelector } from "@/components/ui/ChipSelector";

type Props = {
  chips: string[];
  onChipsChange: (chips: string[]) => void;
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  brief: string;
  onBriefChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  content: GeneratedContent | null;
  error: string | null;
};

const ACCEPTED_EXTS = [".md", ".txt", ".pdf"];
const MAX_FILES = 3;

export function ContentChat({
  chips, onChipsChange,
  files, onAddFiles, onRemoveFile,
  brief, onBriefChange,
  onGenerate, isGenerating,
  content, error,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chipsOpen, setChipsOpen] = React.useState(true);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(["case-study", "social"])
  );

  // Auto-grow textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [brief]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isGenerating) onGenerate();
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []).filter((f) =>
      ACCEPTED_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    const merged = [...files, ...incoming].slice(0, MAX_FILES);
    onAddFiles(merged);
    e.target.value = "";
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasContent = content !== null;
  const hasFiles = files.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Results area */}
      <div className={`flex-1 overflow-y-auto px-8 lg:px-16 ${hasContent ? "py-10" : "flex items-end pb-4"}`}>
        {hasContent ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <ResultSection
              id="case-study" title="Cas client" badge="Site web"
              expanded={expandedSections.has("case-study")} onToggle={toggleSection}
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-foreground leading-tight">
                    {content.caseStudy.title}
                  </h2>
                  <p className="text-sm text-foreground/50 font-medium italic">
                    {content.caseStudy.tagline}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <ContentField label="Introduction" value={content.caseStudy.intro} />
                  <ContentField label="Défi client" value={content.caseStudy.challenge} />
                  <ContentField label="Solution apportée" value={content.caseStudy.solution} />
                  <ContentField label="Résultats" value={content.caseStudy.results} />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                    Services · Plateforme
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {content.caseStudy.services.map((s) => (
                      <span key={s} className="text-[11px] font-semibold px-2.5 py-1 bg-foreground/[0.06] rounded-full text-foreground/60">{s}</span>
                    ))}
                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-foreground/[0.06] rounded-full text-foreground/60">
                      {content.caseStudy.platform}
                    </span>
                  </div>
                </div>
                <CopyAllCaseStudy content={content} />
              </div>
            </ResultSection>

            <ResultSection
              id="social" title="Post Instagram · LinkedIn" badge="Réseaux sociaux"
              expanded={expandedSections.has("social")} onToggle={toggleSection}
            >
              <div className="flex flex-col gap-4">
                <div className="bg-foreground/[0.03] rounded-xl p-4 border border-border">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">
                    {content.socialPost.caption}
                  </p>
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
                    {content.socialPost.hashtags.map((h) => (
                      <span key={h} className="text-[11px] font-semibold text-foreground/40">
                        #{h.replace(/^#/, "")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Publish buttons */}
                <PublishButtons content={content} />

                <CopyButton
                  value={
                    content.socialPost.caption + "\n\n" +
                    content.socialPost.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")
                  }
                  label="Copier le post"
                />
              </div>
            </ResultSection>
          </div>
        ) : (
          <div className="w-full" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-8 lg:px-16 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-[12px] text-red-500 font-medium bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2.5">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Prompt area */}
      <div className="px-8 lg:px-16 pb-8 shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">

          {/* Chips collapsible */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setChipsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 shrink-0">
                  Qualifier
                </span>
                {!chipsOpen && chips.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {chips.map((c) => (
                      <span key={c} className="text-[10px] font-semibold px-1.5 py-0.5 bg-foreground text-background rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {!chipsOpen && chips.length === 0 && (
                  <span className="text-[11px] text-foreground/25 font-medium">Aucun filtre sélectionné</span>
                )}
              </div>
              {chipsOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-foreground/25 shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-foreground/25 shrink-0" />
              }
            </button>
            {chipsOpen && (
              <div className="px-4 pb-4 pt-1">
                <ChipSelector selected={chips} onChange={onChipsChange} />
              </div>
            )}
          </div>

          {/* Input card */}
          <div className="bg-card border border-border rounded-2xl shadow-lg shadow-black/[0.04] overflow-hidden">
            <div className={`flex ${hasFiles ? "divide-x divide-border" : ""}`}>

              {/* Files column — left */}
              {hasFiles && (
                <div className="w-36 shrink-0 flex flex-col gap-1 p-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/25 mb-0.5">
                    Fichiers
                  </span>
                  {files.map((file, i) => (
                    <div key={i} className="flex items-start gap-1.5 group">
                      <span className="text-[9px] font-bold text-foreground/35 uppercase mt-0.5 shrink-0">
                        {file.name.split(".").pop()}
                      </span>
                      <span className="text-[10px] font-medium text-foreground/50 truncate flex-1 leading-tight">
                        {file.name.replace(/\.[^.]+$/, "")}
                      </span>
                      <button
                        onClick={() => onRemoveFile(i)}
                        className="opacity-0 group-hover:opacity-100 text-foreground/30 hover:text-foreground/60 transition-all cursor-pointer shrink-0"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <div className="flex-1 flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={brief}
                  onChange={(e) => onBriefChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    hasContent
                      ? "Précisez ou modifiez le contenu..."
                      : "Décrivez le projet client, ses objectifs, sa cible..."
                  }
                  rows={3}
                  className="w-full px-4 pt-4 pb-2 text-sm font-medium bg-transparent outline-none resize-none placeholder:text-foreground/20 text-foreground/80 leading-relaxed"
                />

                {/* Bottom bar */}
                <div className="flex items-center justify-between px-3 pb-3">
                  <button
                    onClick={() => files.length < MAX_FILES && fileInputRef.current?.click()}
                    disabled={files.length >= MAX_FILES}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/30 hover:text-foreground/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Joindre un fichier (.md, .txt, .pdf)"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Joindre</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_EXTS.join(",")}
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-foreground/20 font-medium hidden sm:block">⌘↵</span>
                    <button
                      onClick={onGenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 h-8 px-3 bg-foreground text-background rounded-xl text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      {isGenerating
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <ArrowUp className="w-3.5 h-3.5" />
                      }
                      {isGenerating ? "Génération..." : hasContent ? "Regénérer" : "Générer"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Publish buttons ─────────────────────────────────────────────────────────

function PublishButtons({ content }: { content: GeneratedContent }) {
  const fullText =
    content.socialPost.caption + "\n\n" +
    content.socialPost.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ");

  const publishTo = (platform: "linkedin" | "instagram") => {
    navigator.clipboard.writeText(fullText).then(() => {
      const urls = {
        linkedin: "https://www.linkedin.com/feed/",
        instagram: "https://www.instagram.com/",
      };
      window.open(urls[platform], "_blank", "noopener,noreferrer");
      toast.success(
        `Texte copié ! Collez-le dans votre publication ${platform === "linkedin" ? "LinkedIn" : "Instagram"}.`,
        { duration: 4000 }
      );
    });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => publishTo("linkedin")}
        className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-border text-[11px] font-bold text-foreground/50 hover:text-[#0A66C2] hover:border-[#0A66C2]/30 hover:bg-[#0A66C2]/[0.04] transition-all cursor-pointer"
      >
        <Linkedin className="w-3.5 h-3.5" />
        Publier sur LinkedIn
      </button>
      <button
        onClick={() => publishTo("instagram")}
        className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-border text-[11px] font-bold text-foreground/50 hover:text-[#E1306C] hover:border-[#E1306C]/30 hover:bg-[#E1306C]/[0.04] transition-all cursor-pointer"
      >
        <Instagram className="w-3.5 h-3.5" />
        Publier sur Instagram
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultSection({ id, title, badge, expanded, onToggle, children }: {
  id: string; title: string; badge: string;
  expanded: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-foreground/[0.06] text-foreground/40 rounded-full">
            {badge}
          </span>
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-foreground/30" />
          : <ChevronDown className="w-4 h-4 text-foreground/30" />
        }
      </button>
      {expanded && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function ContentField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/25">{label}</span>
        <CopyButton value={value} label="Copier" />
      </div>
      <p className="text-sm text-foreground/70 leading-relaxed font-medium">{value}</p>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] font-semibold text-foreground/30 hover:text-foreground/60 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copié !" : label}
    </button>
  );
}

function CopyAllCaseStudy({ content }: { content: GeneratedContent }) {
  const [copied, setCopied] = React.useState(false);
  const text = [
    content.caseStudy.title, content.caseStudy.tagline, "",
    content.caseStudy.intro, "", content.caseStudy.challenge, "",
    content.caseStudy.solution, "", content.caseStudy.results, "",
    `Services : ${content.caseStudy.services.join(", ")} · ${content.caseStudy.platform}`,
  ].join("\n");
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold text-foreground/40 hover:text-foreground/70 border border-border rounded-xl hover:border-foreground/20 transition-all cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copié !" : "Copier le cas client"}
    </button>
  );
}
