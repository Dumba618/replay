"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const LENGTH = 4;

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all four digits are present. */
  onComplete: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Changing this number replays the shake animation. */
  shakeKey?: number;
}

/** Four auto-advancing digit boxes: typing, pasting, SMS autofill and Backspace all work. */
export function PinInput({ value, onChange, onComplete, disabled = false, invalid = false, shakeKey = 0 }: PinInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!disabled && value.length === 0) refs.current[0]?.focus();
  }, [disabled, value.length]);

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete(clean);
    else refs.current[clean.length]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 0) {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    // A multi-digit change is an autofill/paste: spread it from this box onward.
    commit((value.slice(0, index) + digits).slice(0, LENGTH));
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      event.preventDefault();
      onChange(value.slice(0, index - 1));
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    commit(event.clipboardData.getData("text"));
  };

  return (
    <div key={shakeKey} role="group" aria-label="4-digit PIN" className={cn("flex justify-center gap-3", invalid && "animate-shake")}>
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={index === 0 ? LENGTH : 1}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={invalid}
          className={cn(
            "size-16 rounded-2xl border-2 bg-card text-center font-mono text-3xl font-bold shadow-sm transition-all duration-200 sm:size-20 sm:text-4xl",
            "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
            value[index] ? "border-primary" : "border-border",
            invalid && "border-destructive",
            disabled && "opacity-60",
          )}
        />
      ))}
    </div>
  );
}
