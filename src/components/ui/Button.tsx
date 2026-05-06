import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return clsx(
    "inline-flex items-center justify-center rounded-2xl font-semibold transition",
    "hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary"
      ? "bg-[#5b2b0c] text-white shadow-[0_12px_22px_rgba(91,43,12,0.2)] hover:bg-[#7a3f13]"
      : "border border-[#ead7c5] bg-[#fffdf8] text-[#2a170d] hover:border-[#7a3f13] hover:text-[#7a3f13]",
    size === "sm" && "h-10 px-4 text-sm",
    size === "md" && "h-11 px-6 text-sm",
    size === "lg" && "h-12 px-8 text-base",
    className
  );
}

export default function Button({ children, variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}
