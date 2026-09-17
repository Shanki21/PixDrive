// src/components/drive/EmptyDrive.tsx
"use client";
import React from "react";
import { ArrowRight, ImagePlus, LayoutTemplate, Share2, Sparkles, UsersRound } from "lucide-react";

type Props = {
  onCreate: () => void;
};

export default function EmptyDrive({ onCreate }: Props) {
  const steps = [
    {
      icon: ImagePlus,
      title: "Create Event",
      detail: "Start with date, client, and delivery preferences.",
    },
    {
      icon: LayoutTemplate,
      title: "Organize Story",
      detail: "Group by ceremony, moments, and highlights.",
    },
    {
      icon: Share2,
      title: "Deliver Link",
      detail: "Send one branded link for all approved photos.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl py-8">
      <div className="relative overflow-hidden rounded-[30px] border border-[#d8b895] bg-[#5b2b0c] p-8 text-white md:p-10">
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8b895] bg-[#7a3f13] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f8ead9]">
              <Sparkles className="h-3.5 w-3.5" />
              Pixdrive Event Flow
            </div>
            <h2 className="font-display mt-5 text-4xl font-semibold leading-tight md:text-5xl">Launch your first event workflow</h2>
            <p className="mt-4 max-w-xl text-sm text-[#f8ead9] md:text-base">
              Pixdrive is now event-first. Build a client-ready workspace with clear steps from upload to final handoff.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={onCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7a3f13] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5b2b0c]"
              >
                Create Event
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#d8b895] bg-[#7a3f13] px-5 py-3 text-sm font-semibold text-[#f8ead9] transition hover:bg-[#8a4b1a]"
              >
                <UsersRound className="h-4 w-4" />
                Watch 90s Overview
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-2xl border border-[#d8b895] bg-[#7a3f13]/80 p-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f8ead9] text-[#7a3f13]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="text-base font-semibold text-white">{step.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-[#f8ead9]">{step.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
