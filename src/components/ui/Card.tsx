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
        "rounded-2xl border border-[#E5E5E5] bg-white",
        hover && "transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
    >
      {children}
    </article>
  );
}
