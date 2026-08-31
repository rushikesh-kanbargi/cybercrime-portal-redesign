"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Drop-in for a native <select>+<option> list, same controlled-value shape,
// but backed by Radix's own popup instead of the OS-drawn one — on Linux,
// Chromium/GTK renders native <select> popups outside the page's CSS,
// ignoring color-scheme, so they stay light in dark mode regardless of any
// page-level theming.
export interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function FormSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
  ariaLabel,
  ariaInvalid,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ariaInvalid?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(
          "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30 data-[size=default]:h-11",
          className,
        )}
      >
        <SelectValue placeholder={placeholder}>{options.find((o) => o.value === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
