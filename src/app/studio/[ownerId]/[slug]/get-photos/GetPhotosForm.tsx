"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { showPixoraToast } from "@/lib/pixora-alerts";

type GetPhotosFormProps = {
  galleryId: string;
  gallerySlug: string;
  galleryName: string;
};

const CLIENT_PROFILE_PREFIX = "wf_client_profile:";
const CLIENT_KEY_PREFIX = "wf_client_key:";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createClientKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function GetPhotosForm({ galleryId, gallerySlug, galleryName }: GetPhotosFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.replace(/[^\d+]/g, "").trim();

    if (!cleanName || !cleanEmail || !cleanMobile) {
      setError("Name, email, and mobile number are required.");
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (cleanMobile.replace(/\D/g, "").length < 7) {
      setError("Enter a valid mobile number.");
      return;
    }
    if (!consent) {
      setError("Consent is required to save your gallery access details.");
      return;
    }

    setSubmitting(true);
    try {
      const clientKey = window.localStorage.getItem(`${CLIENT_KEY_PREFIX}${galleryId}`) || createClientKey();
      window.localStorage.setItem(`${CLIENT_KEY_PREFIX}${galleryId}`, clientKey);
      window.localStorage.setItem(
        `${CLIENT_PROFILE_PREFIX}${galleryId}`,
        JSON.stringify({ name: cleanName, email: cleanEmail })
      );
      const response = await fetch(`/api/disk/${encodeURIComponent(gallerySlug)}/client-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientKey,
          name: cleanName,
          email: cleanEmail,
          mobile: cleanMobile,
          consent,
          marketing,
        }),
      });
      if (!response.ok) {
        throw new Error("Unable to save client profile.");
      }
      void showPixoraToast({ title: "Gallery access saved" });
      const isCustomDomainPath = window.location.pathname === `/${encodeURIComponent(gallerySlug)}/get-photos`;
      const galleryPath = isCustomDomainPath ? `/${encodeURIComponent(gallerySlug)}` : `/disk/${encodeURIComponent(gallerySlug)}`;
      router.push(`${galleryPath}?clientKey=${encodeURIComponent(clientKey)}`);
    } catch {
      setError("Unable to prepare your gallery access right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-3xl border border-[#eadccf] bg-[#fffdf8] p-5 shadow-[0_18px_60px_rgba(73,39,20,0.08)] sm:p-7"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a3f13]">{galleryName}</p>
      <div className="mt-5 grid gap-5">

      <label className="block text-sm font-semibold text-[#2a170d]">
        Name *
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" maxLength={120} autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-[#ead7c5] bg-white px-4 text-[#3a2112] outline-none transition focus:border-[#7a3f13] focus:shadow-[0_0_0_4px_rgba(122,63,19,0.12)]" />
      </label>
      <label className="block text-sm font-semibold text-[#2a170d]">
        Email ID *
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength={180} autoComplete="email" inputMode="email" className="mt-2 h-12 w-full rounded-xl border border-[#ead7c5] bg-white px-4 text-[#3a2112] outline-none transition focus:border-[#7a3f13] focus:shadow-[0_0_0_4px_rgba(122,63,19,0.12)]" />
      </label>
      <label className="block text-sm font-semibold text-[#2a170d]">
        Mobile Number *
        <input value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Enter mobile number" maxLength={24} autoComplete="tel" inputMode="tel" className="mt-2 h-12 w-full rounded-xl border border-[#ead7c5] bg-white px-4 text-[#3a2112] outline-none transition focus:border-[#7a3f13] focus:shadow-[0_0_0_4px_rgba(122,63,19,0.12)]" />
      </label>

      <label className="flex gap-3 rounded-2xl border border-[#ead7c5] bg-white p-3 text-xs leading-5 text-[#5b3a23]">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-[#7a3f13]" />
        <span>I agree to the Privacy Policy and consent to saving my gallery access details.</span>
      </label>
      <label className="flex gap-3 rounded-2xl border border-[#ead7c5] bg-white p-3 text-xs leading-5 text-[#5b3a23]">
        <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} className="mt-1 accent-[#7a3f13]" />
        <span>I would like to receive future promotions, offers, and communications from the event organizers.</span>
      </label>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#7a3f13] text-sm font-bold text-white transition hover:bg-[#5b2b0c] disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitting ? "Preparing Gallery..." : "Get My Photos"}
      </button>
      <p className="pt-1 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a735f]">Secured by Pixora</p>
      </div>
    </form>
  );
}
