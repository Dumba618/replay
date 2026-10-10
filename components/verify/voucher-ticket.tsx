import { Store, Ticket } from "lucide-react";
import { RETAILER_CONFIG, type Voucher } from "@/types";
import { formatDateTime } from "@/lib/format";

interface VoucherTicketProps {
  voucher: Voucher;
}

/** High-contrast in-store voucher (lime on near-black green, ~14:1) meant to be shown at the till. */
export function VoucherTicket({ voucher }: VoucherTicketProps) {
  return (
    <article
      aria-label={`Voucher ${voucher.code}, ${voucher.discountPercent} percent off at ${RETAILER_CONFIG[voucher.retailer].label}`}
      className="relative mx-auto w-full max-w-sm animate-pop-in overflow-hidden rounded-3xl bg-[hsl(215_35%_16%)] text-white shadow-2xl"
    >
      <div className="flex items-center justify-between bg-lime px-5 py-2.5 text-lime-foreground">
        <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider">
          <Ticket className="size-4" aria-hidden="true" /> RePlay voucher
        </span>
        <span className="text-xs font-bold">Level {voucher.wheelLevel.charAt(0) + voucher.wheelLevel.slice(1).toLowerCase()}</span>
      </div>
      <div className="px-6 pb-6 pt-7 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Your reward</p>
        <p className="mt-1 text-7xl font-extrabold leading-none tracking-tight text-lime">
          {voucher.discountPercent}
          <span className="text-5xl">% OFF</span>
        </p>
        <p className="mt-3 flex items-center justify-center gap-2 text-base font-semibold">
          <Store className="size-4 text-lime" aria-hidden="true" /> {RETAILER_CONFIG[voucher.retailer].label}
        </p>
      </div>
      <div className="relative">
        <div className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" aria-hidden="true" />
        <div className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" aria-hidden="true" />
        <div className="mx-6 border-t-2 border-dashed border-white/30" />
      </div>
      <div className="px-6 pb-6 pt-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Cashier code</p>
        <p className="mt-1 select-all font-mono text-3xl font-bold tracking-[0.18em] text-white">{voucher.code}</p>
        <p className="mt-3 text-sm text-white/85">Show this screen to the cashier before you pay. Valid until {formatDateTime(voucher.expiresAt)}.</p>
      </div>
    </article>
  );
}
