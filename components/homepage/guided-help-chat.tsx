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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Same custom bezier the rest of the site uses for entrances (globals.css
// --ease-standard) — one shared feel, not a one-off curve for this widget.
const EASE_STANDARD = [0.16, 1, 0.3, 1] as const;

const AUTO_PEEK_STORAGE_KEY = "ccrt-guided-help-peeked";

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
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [{ role: "assistant", text: t("intro") }]);
  const [input, setInput] = React.useState("");
  const [showOptions, setShowOptions] = React.useState(true);
  const [suggested, setSuggested] = React.useState<OptionKey | null>(null);
  const [thinking, setThinking] = React.useState(false);
  const [autoPeeking, setAutoPeeking] = React.useState(false);
  const logRef = React.useRef<HTMLDivElement>(null);
  const thinkingTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, thinking, reduceMotion]);

  React.useEffect(() => {
    return () => {
      if (thinkingTimeout.current) clearTimeout(thinkingTimeout.current);
    };
  }, []);

  // First-visit-only "peek": auto-open the closed launcher briefly so a new
  // visitor notices it exists, then auto-close itself — never asks for
  // interaction, never repeats once localStorage has the flag. Any real
  // click from the visitor (open or close) cancels the auto-close below so
  // their own action always wins over the timer.
  React.useEffect(() => {
    if (localStorage.getItem(AUTO_PEEK_STORAGE_KEY)) return;
    localStorage.setItem(AUTO_PEEK_STORAGE_KEY, "1");
    const openTimer = setTimeout(() => {
      setOpen(true);
      setAutoPeeking(true);
    }, 1400);
    return () => clearTimeout(openTimer);
  }, []);

  React.useEffect(() => {
    if (!autoPeeking) return;
    const closeTimer = setTimeout(() => {
      setOpen(false);
      setAutoPeeking(false);
    }, 3200);
    return () => clearTimeout(closeTimer);
  }, [autoPeeking]);

  // A brief simulated "typing" beat before the scripted reply lands — makes
  // a conversation out of what's otherwise an instant lookup, without ever
  // pretending it's a live model composing the answer (disclaimer stays put).
  function reply(assistantText: string) {
    setThinking(true);
    thinkingTimeout.current = setTimeout(
      () => {
        setThinking(false);
        setMessages((m) => [...m, { role: "assistant", text: assistantText }]);
      },
      reduceMotion ? 0 : 600,
    );
  }

  function choose(key: OptionKey) {
    setMessages((m) => [...m, { role: "user", text: t(`options.${key}`) }]);
    setShowOptions(false);
    setSuggested(key);
    reply(t(`replies.${key}`));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const guess = guessOption(trimmed);
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setShowOptions(false);
    setSuggested(guess);
    reply(`${t("freeTextPrefix", { option: t(`options.${guess}`) })} ${t(`replies.${guess}`)}`);
  }

  const spring = { type: "spring" as const, stiffness: 420, damping: 32 };

  return (
    <AnimatePresence initial={false}>
      {!open ? (
        <motion.button
          key="launcher"
          type="button"
          onClick={() => {
            setOpen(true);
            setAutoPeeking(false);
          }}
          initial={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
          whileHover={reduceMotion ? undefined : { scale: 1.05 }}
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          transition={spring}
          className="fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={t("openLabel")}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          {t("openLabel")}
        </motion.button>
      ) : (
        <motion.div
          key="panel"
          role="dialog"
          aria-label={t("title")}
          initial={reduceMotion ? undefined : { opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.92, y: 16 }}
          transition={spring}
          style={{ transformOrigin: "bottom right" }}
          className="fixed right-4 bottom-4 z-30 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium text-foreground">{t("title")}</span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAutoPeeking(false);
              }}
              className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label={t("closeLabel")}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <p className="border-b border-border bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">{t("disclaimer")}</p>

          <div ref={logRef} className="flex max-h-72 flex-col gap-2 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE_STANDARD }}
                className={
                  m.role === "assistant"
                    ? "max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-foreground"
                    : "max-w-[85%] self-end rounded-lg bg-primary/10 px-3 py-2 text-foreground"
                }
              >
                {m.text}
              </motion.div>
            ))}
            {thinking && (
              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex max-w-[85%] items-center gap-1 self-start rounded-lg bg-muted px-3 py-2.5"
                role="status"
              >
                <span className="sr-only">{t("typingLabel")}</span>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-muted-foreground/60"
                    aria-hidden="true"
                    animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {showOptions && (
            <div className="flex flex-col gap-1.5 border-t border-border p-3">
              {OPTION_KEYS.map((key) => (
                <Button key={key} type="button" size="sm" variant="outline" className="min-h-11 justify-start text-left" onClick={() => choose(key)}>
                  {t(`options.${key}`)}
                </Button>
              ))}
            </div>
          )}

          {suggested && !thinking && (
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: EASE_STANDARD }}
              className="border-t border-border p-3"
            >
              <Button type="button" size="sm" className="min-h-11 w-full" onClick={() => router.push(OPTION_HREFS[suggested])}>
                {t("continueButton")}
              </Button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("inputPlaceholder")}
              aria-label={t("inputLabel")}
              className="h-11"
            />
            <Button type="submit" size="icon" className="min-h-11 min-w-11" variant="outline" disabled={!input.trim()} aria-label={t("sendLabel")}>
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
