"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_SHIFT_PX = 22;
const FACTORS = { sky: 0.12, far: 0.3, mid: 0.6, near: 1 } as const;

function Cloud({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 56" className={cn("absolute", className)} aria-hidden="true">
      <path d="M12 46 C0 46 0 28 14 28 C14 14 34 8 44 20 C52 6 78 8 82 26 C98 22 108 34 100 46 Z" fill="#ffffff" />
      <path d="M12 46 H100 C104 46 106 42 106 40 C100 48 20 50 12 46 Z" fill="#c9ecfb" />
    </svg>
  );
}

/**
 * Layered 2.5D backdrop: sky, sun and clouds, then three flat hill layers. The layers slide at
 * different speeds as the pointer or finger moves, which gives depth. Solid colours only (no
 * textures), original artwork, transform-only motion, and no motion at all under reduced motion.
 */
export function Scene({ className }: { className?: string }) {
  const skyRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let nx = 0;
    const apply = () => {
      frame = 0;
      const shift = (factor: number) => `translate3d(${(-nx * MAX_SHIFT_PX * factor).toFixed(1)}px,0,0)`;
      if (skyRef.current) skyRef.current.style.transform = shift(FACTORS.sky);
      if (farRef.current) farRef.current.style.transform = shift(FACTORS.far);
      if (midRef.current) midRef.current.style.transform = shift(FACTORS.mid);
      if (nearRef.current) nearRef.current.style.transform = shift(FACTORS.near);
    };
    const onMove = (event: PointerEvent) => {
      nx = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2));
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-sky", className)} aria-hidden="true">
      <div ref={skyRef} className="absolute inset-y-0 -inset-x-[8%] will-change-transform">
        <div className="absolute right-[14%] top-[7%] size-36 rounded-full bg-sun/30" />
        <div className="absolute right-[18%] top-[9.5%] size-24 rounded-full bg-sun" />
        <div className="anim-drift absolute inset-x-0 top-[12%] h-24">
          <Cloud className="left-[10%] top-0 w-28" />
        </div>
        <div className="anim-drift-slow absolute inset-x-0 top-[28%] h-20">
          <Cloud className="right-[16%] top-0 w-24" />
        </div>
      </div>

      <div ref={farRef} className="absolute bottom-0 -inset-x-[8%] h-[46%] will-change-transform">
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="size-full">
          <path d="M0 70 C60 20 120 24 190 56 C250 84 310 30 400 52 V200 H0Z" fill="hsl(100 55% 58%)" />
          <path d="M0 70 C60 20 120 24 190 56 C250 84 310 30 400 52" fill="none" stroke="hsl(100 65% 72%)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>

      <div ref={midRef} className="absolute bottom-0 -inset-x-[8%] h-[34%] will-change-transform">
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="size-full">
          <path d="M0 78 C70 36 150 40 214 70 C280 100 340 52 400 64 V200 H0Z" fill="hsl(100 18% 24% / 0.16)" transform="translate(0 10)" />
          <path d="M0 78 C70 36 150 40 214 70 C280 100 340 52 400 64 V200 H0Z" fill="hsl(101 62% 46%)" />
          <path d="M0 78 C70 36 150 40 214 70 C280 100 340 52 400 64" fill="none" stroke="hsl(100 72% 62%)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>

      <div ref={nearRef} className="absolute bottom-0 -inset-x-[8%] h-[22%] will-change-transform">
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="size-full">
          <path d="M0 64 C80 28 170 34 250 60 C320 82 360 54 400 48 V200 H0Z" fill="hsl(110 30% 18% / 0.2)" transform="translate(0 12)" />
          <path d="M0 64 C80 28 170 34 250 60 C320 82 360 54 400 48 V200 H0Z" fill="hsl(102 74% 36%)" />
          <path d="M0 64 C80 28 170 34 250 60 C320 82 360 54 400 48" fill="none" stroke="hsl(100 70% 52%)" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div className="absolute bottom-[48%] left-[12%] flex flex-col items-center">
          <div className="size-12 rounded-full bg-[hsl(104_70%_30%)] ring-[3px] ring-[hsl(104_70%_22%)]" />
          <div className="-mt-1 h-6 w-2.5 bg-[hsl(28_45%_28%)]" />
        </div>
        <div className="absolute bottom-[40%] right-[14%] flex flex-col items-center">
          <div className="size-9 rounded-full bg-[hsl(104_70%_30%)] ring-[3px] ring-[hsl(104_70%_22%)]" />
          <div className="-mt-1 h-5 w-2 bg-[hsl(28_45%_28%)]" />
        </div>
      </div>
    </div>
  );
}
