"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

interface ConfirmedStageProps {
  reducedMotion: boolean;
  onDone: () => void;
}

const AUTO_ADVANCE_MS = 1800;

/** CONFIRMED stage: a short, tappable confirmation while the progress bar above animates. */
export function ConfirmedStage({ reducedMotion, onDone }: ConfirmedStageProps) {
  const { t } = useLang();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current(), reducedMotion ? 900 : AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);
  return (
    <button type="button" onClick={onDone} className="w-full cursor-pointer space-y-3 rounded-3xl py-10 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-live="polite">
      <span className="mx-auto grid size-24 animate-pop-in place-items-center rounded-full bg-primary text-primary-foreground">
        <CheckCircle2 className="size-14" aria-hidden="true" />
      </span>
      <span className="block text-3xl font-extrabold tracking-tight">{t("confirmed.title")}</span>
      <span className="block text-muted-foreground">{t("confirmed.sub")}</span>
    </button>
  );
}
