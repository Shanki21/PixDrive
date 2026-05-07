"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthShell from "@/components/auth/AuthShell";
import AuthVisuals from "@/components/auth/AuthVisuals";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import { loadProfile, saveProfile } from "@/lib/profile-storage";

const tutorialItems = [
  {
    title: "List of projects",
    body: 'The "Galleries" tab will contain all your projects for beautifully communicating photos to clients.',
  },
  {
    title: "Projects",
    body: "Upload photos for the gallery, then customize the design and cover artwork.",
  },
  {
    title: "Shop",
    body: "Add products to projects and accept direct requests from clients without extra tools.",
  },
];

const languages = ["English", "Espanol", "Deutsch", "Francais", "Russkiy"];

type SignupStep = "email" | "otp" | "language" | "contacts" | "tutorial";

const inputClass = "pix-input";

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

  const logout = async () => {
    try {
      await fetchWithRetry("/api/auth/logout", { method: "POST" }, { dedupeKey: `client:logout` });
    } catch {
      // Ignore logout API failures and continue with redirect.
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

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
      const dedupe = `request-otp:${email.trim().toLowerCase()}`;
      const res = await fetchWithRetry("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }, { dedupeKey: dedupe, idempotencyKey: `${dedupe}:${Date.now()}` });
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
      const dedupe = `verify-otp:${email.trim().toLowerCase()}:${otp}`;
      const res = await fetchWithRetry("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      }, { dedupeKey: dedupe, idempotencyKey: dedupe });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Invalid or expired OTP");
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
          <Link href="/login" className="font-semibold text-[#7a3f13] hover:text-[#5b2b0c]">
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
        className="font-semibold text-[#7a3f13] hover:text-[#5b2b0c]"
        onClick={() => {
          if (step === "otp") setStep("email");
          if (step === "language") setStep("otp");
          if (step === "contacts") setStep("language");
        }}
      >
        Back
      </button>
    );
  })();

  return (
    <AuthShell right={right} bottom={bottom}>
      {step === "email" ? (
        <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={onRequestOtp} className="pix-card space-y-6 p-8 md:p-10">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pix-heading-xl">
            Sign up
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[16px] text-[#666666]">
            Create your Pixora account and start building your first event workspace.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className={`${inputClass} ${error ? "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" : ""}`}
            />
            {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
          </motion.div>
          <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium text-[#666666] underline">
            Do you have a promo code?
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="pix-btn pix-btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Sending..." : "Continue"}
          </motion.button>
          <p className="text-xs leading-relaxed text-[#666666]">
            By clicking Continue, you agree to the <span className="underline">User Agreement</span> and the{" "}
            <span className="underline">Privacy Policy</span>.
          </p>
        </motion.form>
      ) : null}

      {step === "otp" ? (
        <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={onVerifyOtp} className="pix-card space-y-6 p-8 md:p-10">
          <h1 className="pix-heading-xl">Verify Code</h1>
          <p className="text-base leading-relaxed text-[#666666]">
            Access code sent to <strong className="text-[#111111]">{email}</strong>.
          </p>
          <OtpCodeInput value={otp} onChange={setOtp} />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="pix-btn pix-btn-primary w-full disabled:opacity-40"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Continue"}
          </motion.button>
        </motion.form>
      ) : null}

      {step === "language" ? (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="pix-card space-y-6 p-8 md:p-10">
          <h1 className="pix-heading-xl">Choose Your Language</h1>
          <p className="text-base leading-relaxed text-[#666666]">
            This will set your dashboard language, training materials, and support communication.
          </p>
          <div className="space-y-4">
            {languages.map((lang, index) => (
              <motion.button
                key={lang}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                className="pix-btn pix-btn-secondary h-12 w-full justify-between px-5"
                onClick={() => setStep("contacts")}
              >
                {lang} <span>→</span>
              </motion.button>
            ))}
          </div>
          <button className="text-sm font-medium text-[#666666] underline" onClick={() => void logout()}>
            Log out from this account
          </button>
        </motion.div>
      ) : null}

      {step === "contacts" ? (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="pix-card space-y-4 p-8 md:p-10">
          <h1 className="pix-heading-xl">Fill In Your Contacts</h1>
          <p className="text-base leading-relaxed text-[#666666]">
            One final step: add your contact details so gallery visitors can reach you.
          </p>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" className={inputClass} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48 (123) 123-123" className={inputClass} />
          </div>
          <label className="flex items-center justify-between rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-sm font-semibold text-[#111111]">
            I use WhatsApp
            <input type="checkbox" checked={useWhatsApp} onChange={(e) => setUseWhatsApp(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-sm font-semibold text-[#111111]">
            I use Telegram
            <input type="checkbox" checked={useTelegram} onChange={(e) => setUseTelegram(e.target.checked)} />
          </label>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Occupation</label>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="For example: Wedding photographer"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-[#666666]">
            Your contacts will appear in the Card section, where you can also add social network links.
          </p>
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="pix-btn pix-btn-primary w-full"
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
          </motion.button>
          <button className="text-sm font-medium text-[#666666] underline" onClick={() => void logout()}>
            Log out from this account
          </button>
        </motion.div>
      ) : null}

      {step === "tutorial" ? (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="pix-card flex h-full flex-col p-8 md:p-10">
          <div className="mb-8 flex items-center justify-between">
            <button className="text-sm font-semibold text-[#7a3f13] hover:text-[#5b2b0c]" onClick={() => router.push("/dashboard")}>
              Skip
            </button>
            <p className="text-sm text-[#666666]">{tutorialStep + 1} of 3</p>
          </div>
          <div className="space-y-6 pt-2">
            {tutorialItems.map((item, idx) => {
              const active = idx <= tutorialStep;
              return (
                <motion.div key={item.title} animate={{ opacity: active ? 1 : 0.3 }} className={`${active ? "opacity-100" : "opacity-30"}`}>
                  <h3 className="text-[32px] font-semibold leading-tight text-[#111111]">{item.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-[#666666]">{item.body}</p>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-auto flex items-center justify-between pb-2 pt-8">
            <button className="text-sm font-semibold text-[#7a3f13] hover:text-[#5b2b0c]" onClick={() => setTutorialStep((s) => (s > 0 ? s - 1 : s))}>
              Back
            </button>
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="pix-btn pix-btn-primary w-24"
              onClick={() => {
                if (tutorialStep < 2) {
                  setTutorialStep((s) => s + 1);
                  return;
                }
                router.push("/dashboard");
              }}
            >
              Next
            </motion.button>
          </div>
        </motion.div>
      ) : null}
    </AuthShell>
  );
}
