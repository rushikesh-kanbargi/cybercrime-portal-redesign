"use client";

import * as React from "react";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// §19.5 — real labelled <input type="file">, drag-drop as an addition only,
// per-file removal. Compression / scan-status / upload-progress are feature
// logic for the evidence-upload flow, not this primitive.
//
// `accept` mirrors the native <input accept> attribute, but the browser
// only enforces that on the file *picker* — never on drag-and-drop. Without
// this check, a dropped mismatched file used to sit in the list for one
// render before the caller's own filtering (if any) removed it. Checking
// here means it's never added in the first place, for every caller, not
// just the ones that remember to filter themselves.
function fileMatchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept.split(",").some((raw) => {
    const entry = raw.trim().toLowerCase();
    if (!entry) return true;
    if (entry.startsWith(".")) return name.endsWith(entry);
    if (entry.endsWith("/*")) return file.type.startsWith(entry.slice(0, -1));
    return file.type === entry;
  });
}
export interface FileUploadProps {
  id: string;
  label: string;
  helperText?: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Called with any picked/dropped files that don't match `accept`, so the
   * caller can still show its own translated error copy — filtering here
   * only stops the mismatch from entering the list, it doesn't silence it. */
  onRejectedFiles?: (files: File[]) => void;
  className?: string;
  /** §16.3 #12/#15 — real, translated copy; no hardcoded English inside a shared primitive. */
  dragPrompt: string;
  chooseFilesLabel: string;
  removeFileLabel: (name: string) => string;
  /** Announced in a live region whenever the selection changes (§16.3 #15). */
  filesSelectedAnnouncement: (count: number) => string;
}

export function FileUpload({
  id,
  label,
  helperText,
  accept,
  multiple = true,
  files,
  onFilesChange,
  onRejectedFiles,
  className,
  dragPrompt,
  chooseFilesLabel,
  removeFileLabel,
  filesSelectedAnnouncement,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const all = Array.from(incoming);
    const picked = all.filter((f) => fileMatchesAccept(f, accept));
    const rejected = all.filter((f) => !fileMatchesAccept(f, accept));
    if (rejected.length > 0) onRejectedFiles?.(rejected);
    if (picked.length === 0) return;
    const next = multiple ? [...files, ...picked] : [picked[0]];
    onFilesChange(next);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/40 px-4 py-6 text-center transition-colors",
          isDragging && "border-ring bg-accent",
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          {dragPrompt}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="ml-1 font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {chooseFilesLabel}
          </button>
        </p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => addFiles(e.target.files)}
          className="sr-only"
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {filesSelectedAnnouncement(files.length)}
      </p>

      {files.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={removeFileLabel(file.name)}
                className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
