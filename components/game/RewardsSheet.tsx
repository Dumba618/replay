"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang, type StringKey } from "@/lib/i18n";

const PARAGRAPHS: readonly StringKey[] = ["sheet.p1", "sheet.p2", "sheet.p3", "sheet.p4", "sheet.p5", "sheet.p6"];

interface RewardsSheetProps {
  open: boolean;
  onClose: () => void;
}

/** "How rewards work" bottom sheet: the plain-language fairness statement. */
export function RewardsSheet({ open, onClose }: RewardsSheetProps) {
  const { t } = useLang();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 anim-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewards-sheet-title"
        onClick={(event) => event.stopPropagation()}
        className="anim-sheet-up max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 pb-8 text-card-foreground shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="rewards-sheet-title" className="flex items-center gap-2 text-xl font-extrabold">
            <ShieldCheck className="size-6 text-primary" aria-hidden="true" /> {t("sheet.title")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("sheet.close")} className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-secondary">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <ul className="mt-4 space-y-3 text-base leading-relaxed">
          {PARAGRAPHS.map((key) => (
            <li key={key} className="flex gap-3">
              <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <Button ref={closeRef} size="lg" className="mt-6 w-full" onClick={onClose}>
          {t("sheet.close")}
        </Button>
      </div>
    </div>
  );
}
