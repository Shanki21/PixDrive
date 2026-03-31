import type { ReactNode } from "react";

type SectionHeadingProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
};

export default function SectionHeading({ title, description, className }: SectionHeadingProps) {
  return (
    <div className={className}>
      <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#111111]">{title}</h2>
      {description ? <p className="mt-4 max-w-[760px] text-[16px] text-[#666666]">{description}</p> : null}
    </div>
  );
}
