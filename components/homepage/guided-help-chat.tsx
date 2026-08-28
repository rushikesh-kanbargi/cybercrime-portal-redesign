"use client";

// Guided Help — a deterministic, rule-based chat-style triage assistant.
// User-directed override of this project's earlier "no chatbot" rule
// (CLAUDE.md #6, amended 2026-08-28 — see the note in that file). Honesty
// constraint unchanged and non-negotiable regardless of that override: no
// AI provider is configured anywhere in this app (lib/ai/config.ts —
// AI_ENABLED defaults false), so this is a scripted decision-tree over
// fixed options plus a small local keyword heuristic for free text —
// never presented as a live/generative model. The UI says so explicitly.

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  role: "assistant" | "user";
  text: string;
}

type OptionKey = "money" | "harassment" | "hacked" | "unsure";

const OPTION_HREFS: Record<OptionKey, string> = {
  money: "/report/money",
  harassment: "/report/harassment",
  hacked: "/report/hacked",
  unsure: "/report/money",
};

const OPTION_KEYS: OptionKey[] = ["money", "harassment", "hacked", "unsure"];

// Deterministic keyword heuristic only — never a language model. Same
// "rules floor" precedent as lib/classify.ts, applied one level up (which
// flow, not which sub-category). English-keyed regardless of UI language,
// same as lib/classify.ts's own keyword lists — a citizen typing in Hindi
// script falls through to "unsure," which still leads to a real, working
// report flow.
function guessOption(text: string): OptionKey {
  const lower = text.toLowerCase();
  if (/hack|password|otp|locked out|can'?t (log|sign) in|account (was )?taken over/.test(lower)) return "hacked";
  if (/harass|threat|stalk|blackmail|leak|intimate|abuse/.test(lower)) return "harassment";
  if (/money|paid|upi|bank|transfer|debit|credit|rs\.?\s?\d|₹|fraud|scam.*pay/.test(lower)) return "money";
  return "unsure";
}

export function GuidedHelpChat() {
  const t = useTranslations("common.guidedHelp");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [{ role: "assistant", text: t("intro") }]);
  const [input, setInput] = React.useState("");
  const [showOptions, setShowOptions] = React.useState(true);
  const [suggested, setSuggested] = React.useState<OptionKey | null>(null);
  const logRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function choose(key: OptionKey) {
    setMessages((m) => [...m, { role: "user", text: t(`options.${key}`) }, { role: "assistant", text: t(`replies.${key}`) }]);
    setShowOptions(false);
    setSuggested(key);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const guess = guessOption(trimmed);
    setMessages((m) => [
      ...m,
      { role: "user", text: trimmed },
      { role: "assistant", text: `${t("freeTextPrefix", { option: t(`options.${guess}`) })} ${t(`replies.${guess}`)}` },
    ]);
    setInput("");
    setShowOptions(false);
    setSuggested(guess);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={t("openLabel")}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        {t("openLabel")}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed right-4 bottom-4 z-30 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <span className="text-sm font-medium text-foreground">{t("title")}</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={t("closeLabel")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="border-b border-border bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">{t("disclaimer")}</p>

      <div ref={logRef} className="flex max-h-72 flex-col gap-2 overflow-y-auto p-3 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-foreground"
                : "max-w-[85%] self-end rounded-lg bg-primary/10 px-3 py-2 text-foreground"
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      {showOptions && (
        <div className="flex flex-col gap-1.5 border-t border-border p-3">
          {OPTION_KEYS.map((key) => (
            <Button key={key} type="button" size="sm" variant="outline" className="justify-start text-left" onClick={() => choose(key)}>
              {t(`options.${key}`)}
            </Button>
          ))}
        </div>
      )}

      {suggested && (
        <div className="border-t border-border p-3">
          <Button type="button" size="sm" className="w-full" onClick={() => router.push(OPTION_HREFS[suggested])}>
            {t("continueButton")}
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("inputPlaceholder")}
          aria-label={t("inputLabel")}
          className="h-9"
        />
        <Button type="submit" size="icon" variant="outline" disabled={!input.trim()} aria-label={t("sendLabel")}>
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
