"use client";

import React, { useCallback } from "react";
import { Paperclip, X } from "lucide-react";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
};

const ACCEPTED = [".md", ".txt", ".pdf"];
const MAX_FILES = 3;

export function FileUpload({ files, onChange }: Props) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const valid = Array.from(incoming).filter((f) =>
        ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      const merged = [...files, ...valid].slice(0, MAX_FILES);
      onChange(merged);
    },
    [files, onChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const extLabel = (name: string) => name.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <div className="flex flex-col gap-2">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-1.5 py-4 px-3
          border border-dashed rounded-xl cursor-pointer transition-all
          ${isDragging
            ? "border-foreground/40 bg-foreground/5"
            : "border-border hover:border-foreground/20 hover:bg-foreground/[0.02]"
          }
          ${files.length >= MAX_FILES ? "opacity-40 pointer-events-none" : ""}
        `}
      >
        <Paperclip className="w-3.5 h-3.5 text-foreground/30" />
        <p className="text-[11px] font-medium text-foreground/30 text-center">
          {files.length >= MAX_FILES
            ? "Limite atteinte (3 fichiers)"
            : "Déposer ou cliquer — .md .txt .pdf"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-foreground/[0.04] rounded-lg"
            >
              <span className="text-[9px] font-bold bg-foreground/10 text-foreground/50 px-1.5 py-0.5 rounded">
                {extLabel(file.name)}
              </span>
              <span className="flex-1 text-[11px] font-medium text-foreground/60 truncate">
                {file.name}
              </span>
              <button
                onClick={() => handleRemove(i)}
                className="text-foreground/30 hover:text-foreground/60 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
