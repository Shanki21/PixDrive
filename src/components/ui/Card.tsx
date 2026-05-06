import type { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export default function Card({ children, className, hover = false }: CardProps) {
  return (
    <article
      className={clsx(
        "rounded-2xl border border-[#ead7c5] bg-[#fffdf8] shadow-[0_12px_30px_rgba(73,39,20,0.06)]",
        hover && "transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(73,39,20,0.1)]",
        className
      )}
    >
      {children}
    </article>
  );
}
