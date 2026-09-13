"use client";

import { useState } from "react";

type NumberInputProps = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

function toDraft(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

/**
 * Money and quantity input.
 *
 * Keeps its own string draft while focused so half-typed values like "12." or
 * "-" survive a keystroke; the parent only ever sees a number. Values are stored
 * as numbers and formatted for display elsewhere.
 */
export function NumberInput({
  id,
  value,
  onChange,
  disabled = false,
  className,
  placeholder,
  "aria-label": ariaLabel,
}: NumberInputProps) {
  const [draft, setDraft] = useState(() => toDraft(value));
  const [isFocused, setIsFocused] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Adjust the draft during render when the value changes underneath us (a
  // reset, a re-extraction), but never while the user is part-way through typing.
  if (value !== lastValue) {
    setLastValue(value);
    if (!isFocused) setDraft(toDraft(value));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={ariaLabel}
      disabled={disabled}
      placeholder={placeholder}
      value={draft}
      className={className}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setDraft(toDraft(value));
      }}
      onChange={(event) => {
        const raw = event.target.value;
        // Digits, one optional leading minus, one optional decimal point.
        if (!/^-?\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        const parsed = Number.parseFloat(raw);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
    />
  );
}
