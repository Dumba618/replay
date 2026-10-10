import Link from "next/link";
import { ArrowRight, BarChart3, Gift, KeyRound, Recycle, Smartphone, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scene } from "@/components/game/minigames/Scene";
import { Sprite } from "@/components/game/minigames/sprites";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Store, title: "Hand it in", text: "Drop your old laptop, phone, monitor, cables or batteries at the cashier counter." },
  { icon: KeyRound, title: "Get a PIN", text: "The clerk registers the item and shows a one-time 4-digit code." },
  { icon: Smartphone, title: "Verify & level up", text: "Enter the PIN on your phone. Every drop-off moves you up the ladder." },
  { icon: Gift, title: "Play & save", text: "Play a quick game for your in-store voucher. A higher level unlocks bigger rewards." },
] as const;

const ENTRIES = [
  { href: "/clerk", title: "Clerk terminal", text: "Register drop-offs and issue PINs.", icon: KeyRound },
  { href: "/verify", title: "Customer phone", text: "Enter your PIN, level up and spin.", icon: Smartphone },
  { href: "/dashboard", title: "EPR dashboard", text: "Live compliance and loyalty data.", icon: BarChart3 },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <section className="relative overflow-hidden bg-sky text-ink">
        <Scene />
        <div className="pointer-events-none absolute inset-0 z-10 hidden sm:block" aria-hidden="true">
          <span className="anim-bob absolute right-[8%] top-[26%] size-24"><Sprite name="smartphone" /></span>
          <span className="anim-bob absolute right-[22%] top-[48%] size-20" style={{ animationDelay: "0.6s" }}><Sprite name="banana" /></span>
          <span className="anim-bob absolute right-[6%] top-[58%] size-20" style={{ animationDelay: "1.2s" }}><Sprite name="battery" /></span>
        </div>
        <div className="container relative z-10 flex flex-col gap-10 pb-40 pt-8 md:pb-56 md:pt-12">
          <Logo />
          <div className="max-w-2xl space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-white px-4 py-1 text-sm font-bold shadow-[0_3px_0_hsl(var(--ink))]">
              <Recycle className="size-4 text-primary" aria-hidden="true" /> Georgia · Tbilisi &amp; Batumi
            </p>
            <h1 className="text-balance text-5xl font-bold leading-[1.05] md:text-7xl">
              Give e-waste a <span className="rounded-2xl bg-sun px-2">second round.</span>
            </h1>
            <p className="max-w-xl text-lg font-medium text-ink/80">
              Every cashier counter becomes a collection point. Customers level up, play a quick game and get an instant in-store discount; importers get audit-ready WEEE data.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/verify" className={cn(buttonVariants({ size: "lg" }))}>
                Open customer view <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/clerk" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Clerk terminal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12" aria-labelledby="how-title">
        <h2 id="how-title" className="text-3xl font-extrabold tracking-tight">
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardContent className="space-y-3 p-5">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <p className="font-mono text-xs font-bold text-muted-foreground">STEP {index + 1}</p>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="container pb-16" aria-labelledby="screens-title">
        <h2 id="screens-title" className="text-3xl font-extrabold tracking-tight">
          Demo screens
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {ENTRIES.map((entry) => (
            <Link key={entry.href} href={entry.href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary group-hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-lime text-lime-foreground">
                    <entry.icon className="size-6" aria-hidden="true" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold">{entry.title}</span>
                    <span className="block text-sm text-muted-foreground">{entry.text}</span>
                  </span>
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
