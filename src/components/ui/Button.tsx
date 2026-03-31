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
    "inline-flex items-center justify-center rounded-full font-semibold transition",
    "hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" ? "bg-[#0f766e] text-white hover:bg-[#115e59]" : "border border-[#E5E5E5] bg-white text-[#111111] hover:border-[#0f766e]",
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
