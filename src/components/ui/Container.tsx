import type { ReactNode } from "react";
import clsx from "clsx";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function Container({ children, className }: ContainerProps) {
  return <div className={clsx("pixora-container px-6 md:px-10", className)}>{children}</div>;
}

