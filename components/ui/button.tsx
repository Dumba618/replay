import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border-[3px] border-ink font-display text-base font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-[3px] active:shadow-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--ink))] hover:brightness-110",
        lime: "bg-lime text-lime-foreground shadow-[0_4px_0_hsl(var(--ink))] hover:brightness-95",
        outline: "bg-card text-foreground shadow-[0_4px_0_hsl(var(--ink)/0.85)] hover:bg-secondary",
        ghost: "border-transparent text-foreground hover:bg-secondary active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_4px_0_hsl(var(--ink))] hover:brightness-110",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
