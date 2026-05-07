"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

type OtpCodeInputProps = {
  value: string;
  onChange: (next: string) => void;
};

export default function OtpCodeInput({ value, onChange }: OtpCodeInputProps) {
  const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  return (
    <div className="flex items-center gap-2">
      {chars.map((char, idx) => (
        <motion.input
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05, duration: 0.35 }}
          whileFocus={{ y: -2, scale: 1.03 }}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={char}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            const digit = raw.slice(-1);
            const next = chars.slice();
            next[idx] = digit;
            onChange(next.join(""));

            if (digit && idx < chars.length - 1) {
              refs.current[idx + 1]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !chars[idx] && idx > 0) {
              refs.current[idx - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, chars.length);
            if (!pasted) return;

            const next = chars.slice();
            for (let i = 0; i < pasted.length; i += 1) {
              next[i] = pasted[i];
            }
            onChange(next.join(""));

            const focusIndex = Math.min(pasted.length, chars.length - 1);
            refs.current[focusIndex]?.focus();
          }}
          className="h-14 w-11 rounded-full border border-[#E5E5E5] bg-white text-center text-xl font-semibold text-[#111111] outline-none transition focus:border-[#7a3f13] focus:shadow-[0_0_0_4px_rgba(122,63,19,0.15)]"
        />
      ))}
    </div>
  );
}
