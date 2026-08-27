"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

// Native window.speechSynthesis — zero dependencies, the CLAUDE.md design
// rule ("teen to elderly... optional read-aloud") asks for exactly this,
// nothing fancier. `text` is plain text, already stripped of markup by the
// caller; we don't try to read HTML structure aloud.
//
// Always renders the same button on server and client (no support check
// before mount, so no hydration mismatch) — unsupported browsers only find
// out when they actually press it, via `unsupportedLabel`.
export function ReadAloudButton({
  text,
  label,
  stopLabel,
  unsupportedLabel,
}: {
  text: string;
  label: string;
  stopLabel: string;
  unsupportedLabel: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggle() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setUnsupported(true);
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={toggle} aria-pressed={speaking}>
        {speaking ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        {speaking ? stopLabel : label}
      </Button>
      {unsupported ? (
        <span className="text-xs text-muted-foreground" role="status">
          {unsupportedLabel}
        </span>
      ) : null}
    </div>
  );
}
