"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthVisuals from "@/components/auth/AuthVisuals";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import { loadProfile, saveProfile } from "@/lib/profile-storage";

const tutorialItems = [
  {
    title: "List of projects",
    body: 'The "Galleries" tab will contain all of your projects for beautifully communicating photos to clients',
  },
  {
    title: "Projects",
    body: "Upload photos for the gallery, customize the design and cover artwork",
  },
  {
    title: "Shop",
    body: "Add goods to any projects in the gallery. You can buy such goods directly in the project or leave a request",
  },
];

const languages = ["English", "Espanol", "Deutsch", "Francais", "Russkiy"];

type SignupStep = "email" | "otp" | "language" | "contacts" | "tutorial";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [useWhatsApp, setUseWhatsApp] = useState(true);
  const [useTelegram, setUseTelegram] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tutorialStep, setTutorialStep] = useState(0);

  const right = useMemo(() => {
    if (step === "contacts") return <AuthVisuals mode="contactCard" />;
    if (step === "tutorial") return <AuthVisuals mode="tutorial" tutorialStep={tutorialStep} />;
    return <AuthVisuals mode="darkGallery" />;
  }, [step, tutorialStep]);

  const onRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Please enter a valid email address");
        return;
      }
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError("Invalid or expired OTP");
        return;
      }
      setStep("language");
    } finally {
      setLoading(false);
    }
  };

  const bottom = (() => {
    if (step === "email") {
      return (
        <p>
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      );
    }
    if (step === "tutorial") {
      return null;
    }
    return (
      <button
        className="underline"
        onClick={() => {
          if (step === "otp") setStep("email");
          if (step === "language") setStep("otp");
          if (step === "contacts") setStep("language");
        }}
      >
        {"<-"} Back
      </button>
    );
  })();

  return (
    <AuthShell right={right} bottom={bottom}>
      {step === "email" ? (
        <form onSubmit={onRequestOtp} className="space-y-6">
          <h1 className="font-display text-5xl font-semibold text-[#111320]">Sign up</h1>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#151821]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className={`h-12 w-full rounded-full border bg-white px-5 text-sm outline-none ${
                error ? "border-red-400" : "border-[#9f9f9f]"
              }`}
            />
            {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
          </div>
          <button type="button" className="text-sm underline">
            Do you have a promo code?
          </button>
          <button className="h-11 w-full rounded-full bg-[#101114] text-sm font-semibold text-white" disabled={loading}>
            {loading ? "Sending..." : "Continue"}
          </button>
          <p className="text-xs leading-relaxed text-[#1b1f27]">
            By clicking the &quot;Continue&quot; button, you agree to the terms of the{" "}
            <span className="underline">User Agreement</span> and the <span className="underline">Privacy Policy</span>.
          </p>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={onVerifyOtp} className="space-y-6">
          <h1 className="font-display text-5xl font-semibold text-[#111320]">Sign up</h1>
          <p className="text-base leading-relaxed text-[#101218]">
            Access code sent to <strong>{email}</strong>.
          </p>
          <OtpCodeInput value={otp} onChange={setOtp} />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button
            className="h-11 w-full rounded-full bg-[#101114] text-sm font-semibold text-white disabled:opacity-40"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>
      ) : null}

      {step === "language" ? (
        <div className="space-y-6">
          <h1 className="font-display text-5xl font-semibold leading-tight text-[#111320]">Choose your language</h1>
          <p className="text-base leading-relaxed text-[#101218]">
            For the control panel, training materials, and communication with the support team. You can change it any
            time in your account settings.
          </p>
          <div className="space-y-4">
            {languages.map((lang) => (
              <button
                key={lang}
                className="flex h-12 w-full items-center justify-between rounded-full border border-[#d8d8d8] bg-white px-5 text-sm"
                onClick={() => setStep("contacts")}
              >
                {lang} <span>{"->"}</span>
              </button>
            ))}
          </div>
          <button className="text-sm font-semibold underline">Log out from this account</button>
        </div>
      ) : null}

      {step === "contacts" ? (
        <div className="space-y-4">
          <h1 className="font-display text-5xl font-semibold leading-tight text-[#111320]">Fill in your contacts</h1>
          <p className="text-base leading-relaxed text-[#101218]">
            The last step left! Fill in your contacts so that gallery visitors can contact you.
          </p>
          <div>
            <label className="mb-2 block text-sm font-semibold">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="h-12 w-full rounded-full border border-[#999] bg-white px-4 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+48 (123) 123-123"
              className="h-12 w-full rounded-full border border-[#ddd] bg-white px-4 text-sm"
            />
          </div>
          <label className="flex items-center justify-between text-sm font-semibold">
            I use WhatsApp
            <input type="checkbox" checked={useWhatsApp} onChange={(e) => setUseWhatsApp(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between text-sm font-semibold">
            I use Telegram
            <input type="checkbox" checked={useTelegram} onChange={(e) => setUseTelegram(e.target.checked)} />
          </label>
          <div>
            <label className="mb-2 block text-sm font-semibold">Occupation</label>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="For example: Wedding photographer"
              className="h-12 w-full rounded-full border border-[#ddd] bg-white px-4 text-sm"
            />
          </div>
          <p className="text-xs text-[#151821]">
            Your contacts will appear in the &quot;Card&quot; section. In the same section, you can add your social
            networks.
          </p>
          <button
            className="h-11 w-full rounded-full bg-[#101114] text-sm font-semibold text-white"
            onClick={() => {
              const current = loadProfile();
              saveProfile({
                ...current,
                name: name.trim(),
                phone: phone.trim(),
                occupation: occupation.trim(),
                email: email.trim().toLowerCase(),
              });
              setStep("tutorial");
            }}
          >
            Start
          </button>
          <button className="text-sm font-semibold underline">Log out from this account</button>
        </div>
      ) : null}

      {step === "tutorial" ? (
        <div className="flex h-full flex-col">
          <div className="mb-8 flex items-center justify-between">
            <button className="text-sm font-semibold underline" onClick={() => router.push("/dashboard")}>
              Skip
            </button>
            <p className="text-sm text-[#5f6672]">{tutorialStep + 1} of 3</p>
          </div>
          <div className="space-y-6 pt-12">
            {tutorialItems.map((item, idx) => {
              const active = idx <= tutorialStep;
              return (
                <div key={item.title} className={`${active ? "opacity-100" : "opacity-30"}`}>
                  <h3 className="font-display text-5xl font-semibold text-[#121722]">{item.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-[#141821]">{item.body}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-auto flex items-center justify-between pb-2 pt-8">
            <button
              className="text-sm font-semibold underline"
              onClick={() => setTutorialStep((s) => (s > 0 ? s - 1 : s))}
            >
              {"<-"} Back
            </button>
            <button
              className="h-10 w-24 rounded-md bg-black text-sm font-semibold text-white"
              onClick={() => {
                if (tutorialStep < 2) {
                  setTutorialStep((s) => s + 1);
                  return;
                }
                router.push("/dashboard");
              }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </AuthShell>
  );
}
