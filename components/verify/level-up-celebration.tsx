"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LEVEL_CONFIG } from "@/types";
import type { LevelUp } from "@/types/api";
import { LevelBadge } from "@/components/level-badge";
import { Scene } from "@/components/game/minigames/Scene";
import { celebrate } from "@/lib/confetti";
import { Button } from "@/components/ui/button";

interface LevelUpCelebrationProps {
  levelUp: LevelUp;
  onContinue: () => void;
}

const PARTICLE_COUNT = 28;
const PARTICLE_COLORS = ["hsl(var(--sun))", "hsl(var(--flame))", "#ffffff"] as const;

export function LevelUpCelebration({ levelUp, onContinue }: LevelUpCelebrationProps) {
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toConfig = LEVEL_CONFIG[levelUp.to];

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 130 + (i % 5) * 28;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 6 + (i % 4) * 3,
          color: PARTICLE_COLORS[i % PARTICLE_COLORS.length] ?? "#ffffff",
          delay: 0.35 + (i % 7) * 0.03,
        };
      }),
    [],
  );

  useEffect(() => {
    buttonRef.current?.focus();
    void celebrate(reduceMotion ?? false, "big");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue, reduceMotion]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-sky px-6 text-center text-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Scene />
      <div className="relative z-10 grid size-56 place-items-center">
        {!reduceMotion &&
          particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute rounded-full"
              style={{ width: p.size, height: p.size, backgroundColor: p.color }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1, 0.6] }}
              transition={{ duration: 1.3, delay: p.delay, ease: "easeOut" }}
            />
          ))}
        <motion.div
          initial={reduceMotion ? false : { scale: 0, rotate: -120, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}
        >
          <LevelBadge level={levelUp.to} size="xl" />
        </motion.div>
      </div>
      <motion.p
        className="relative z-10 mt-8 rounded-full border-[3px] border-ink bg-sun px-4 py-1 text-sm font-extrabold uppercase tracking-[0.3em] text-ink"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        Level up!
      </motion.p>
      <motion.h2
        id="levelup-title"
        className="relative z-10 mt-3 text-4xl font-extrabold tracking-tight"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        You reached {toConfig.label}
      </motion.h2>
      <motion.p
        className="relative z-10 mt-3 max-w-xs text-base font-medium text-ink/80"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
      >
        {toConfig.tagline} Rewards at this level go up to {toConfig.maxDiscountPercent}% off.
      </motion.p>
      <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="relative z-10 mt-10">
        <Button ref={buttonRef} size="lg" onClick={onContinue}>
          Continue <ArrowRight aria-hidden="true" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
