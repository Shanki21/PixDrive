"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthShell from "@/components/auth/AuthShell";
import AuthVisuals from "@/components/auth/AuthVisuals";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import { loadProfile, saveProfile } from "@/lib/profile-storage";
import { showPixoraAlert, showPixoraToast } from "@/lib/pixora-alerts";

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
    body: "Share polished galleries and collect client selections without extra tools.",
  },
];

const languages = ["English", "Espanol", "Deutsch", "Francais", "Russkiy"];

type SignupStep = "email" | "otp" | "language" | "contacts" | "company" | "tutorial";

const inputClass = "pix-input";
const selectClass = "pix-input appearance-none";
const industryOptions = ["Photographer", "Videographer", "Photo Studio", "Event Agency", "Creative Agency", "Other"];
const industryAreaOptions = ["Freelancer", "Wedding", "Events", "Portraits", "Corporate", "School", "Fashion"];
const eventsPerYearOptions = ["Less Than 10", "10 - 25", "26 - 50", "51 - 100", "100+"];

type AuthJson = {
  ok?: boolean;
  code?: string;
  message?: string;
};

async function parseJsonSafe(res: Response): Promise<AuthJson | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as AuthJson;
  } catch {
    return null;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Photographer");
  const [industryArea, setIndustryArea] = useState("");
  const [averageEventsPerYear, setAverageEventsPerYear] = useState("");
  const [billingCompanyName, setBillingCompanyName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [useWhatsApp, setUseWhatsApp] = useState(true);
  const [useTelegram, setUseTelegram] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const otpRequestIdRef = useRef(0);
  const verifyRequestIdRef = useRef(0);

  const showAuthError = (message: string) => {
    setError(message);
    void showPixoraAlert({
      title: "Signup needs attention",
      text: message,
      icon: "error",
    });
  };

  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const timer = window.setTimeout(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn, step]);

  const requestOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const dedupe = `request-otp:${normalizedEmail}`;
    const res = await fetchWithRetry("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, intent: "signup" }),
    }, { dedupeKey: dedupe, idempotencyKey: `${dedupe}:${Date.now()}` });
    const data = await parseJsonSafe(res);
    if (!res.ok || !data?.ok) {
      showAuthError(data?.message ?? "Please enter a valid email address");
      return false;
    }

    setEmail(normalizedEmail);
    setOtp("");
    setResendIn(30);
    void showPixoraToast({ title: "OTP sent to your email" });
    return true;
  };

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
    if (step === "contacts" || step === "company") return <AuthVisuals mode="contactCard" />;
    if (step === "tutorial") return <AuthVisuals mode="tutorial" tutorialStep={tutorialStep} />;
    return <AuthVisuals mode="darkGallery" />;
  }, [step, tutorialStep]);

  const onRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const requestId = otpRequestIdRef.current + 1;
    otpRequestIdRef.current = requestId;
    setLoading(true);
    setError("");
    try {
      const sent = await requestOtp();
      if (requestId !== otpRequestIdRef.current) return;
      if (!sent) return;
      setStep("otp");
    } catch {
      if (requestId !== otpRequestIdRef.current) return;
      showAuthError("Network error. Please try again.");
    } finally {
      if (requestId === otpRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const onResendOtp = async () => {
    if (resendIn > 0 || loading) return;
    const requestId = otpRequestIdRef.current + 1;
    otpRequestIdRef.current = requestId;
    setLoading(true);
    setError("");
    try {
      await requestOtp();
    } catch {
      if (requestId !== otpRequestIdRef.current) return;
      showAuthError("Network error. Please try again.");
    } finally {
      if (requestId === otpRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const onVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const requestId = verifyRequestIdRef.current + 1;
    verifyRequestIdRef.current = requestId;
    setLoading(true);
    setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const dedupe = `verify-otp:${normalizedEmail}:${otp}`;
      const res = await fetchWithRetry("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code: otp, intent: "signup" }),
      }, { dedupeKey: dedupe, idempotencyKey: dedupe });
      const data = await parseJsonSafe(res);
      if (requestId !== verifyRequestIdRef.current) return;
      if (!res.ok || !data?.ok) {
        showAuthError(data?.message ?? "Invalid or expired OTP");
        return;
      }
      setEmail(normalizedEmail);
      setStep("language");
    } catch {
      if (requestId !== verifyRequestIdRef.current) return;
      showAuthError("Network error. Please try again.");
    } finally {
      if (requestId === verifyRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const saveOnboardingProfile = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const profile = {
      name: name.trim(),
      phone: phone.trim(),
      occupation: occupation.trim(),
      email: normalizedEmail,
      country: country.trim(),
      state: stateName.trim(),
      city: city.trim(),
      companyName: companyName.trim(),
      industry: industry.trim(),
      industryArea: industryArea.trim(),
      averageEventsPerYear: averageEventsPerYear.trim(),
      billingCompanyName: billingCompanyName.trim(),
      taxNumber: taxNumber.trim(),
    };
    const current = loadProfile();
    saveProfile({ ...current, ...profile });

    try {
      await fetchWithRetry("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      }, { dedupeKey: `signup:profile:${normalizedEmail}` });
    } catch {
      // Local profile is already saved; settings page can retry later.
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
          if (step === "company") setStep("contacts");
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
            Create your Pixdrive account and start building your first event workspace.
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
          <OtpCodeInput value={otp} onChange={setOtp} disabled={loading} />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[#666666]">
              {resendIn > 0 ? `Resend available in ${resendIn}s` : "Did not receive the code?"}
            </span>
            <button
              type="button"
              onClick={onResendOtp}
              disabled={loading || resendIn > 0}
              className="font-semibold text-[#7a3f13] hover:text-[#5b2b0c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Resend OTP
            </button>
          </div>
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
                {lang} <span>?</span>
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
            These details help Pixdrive prepare your account and client-facing studio identity.
          </p>
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="pix-btn pix-btn-primary w-full"
            onClick={() => {
              setStep("company");
            }}
          >
            Continue
          </motion.button>
          <button className="text-sm font-medium text-[#666666] underline" onClick={() => void logout()}>
            Log out from this account
          </button>
        </motion.div>
      ) : null}

      {step === "company" ? (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="pix-card space-y-4 p-8 md:p-10">
          <h1 className="pix-heading-xl">Company Details</h1>
          <p className="text-base leading-relaxed text-[#666666]">
            Tell us how your studio operates so Pixdrive can shape your dashboard around the way you deliver events.
          </p>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your studio name" className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
                {industryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">Area</label>
              <select value={industryArea} onChange={(e) => setIndustryArea(e.target.value)} className={selectClass}>
                <option value="">Select industry area</option>
                {industryAreaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Average Number of Events per Year</label>
            <select value={averageEventsPerYear} onChange={(e) => setAverageEventsPerYear(e.target.value)} className={selectClass}>
              <option value="">Select volume</option>
              {eventsPerYearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">Country</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">State</label>
              <input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Uttar Pradesh" className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111111]">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Noida" className={inputClass} />
            </div>
          </div>
          <div className="rounded-lg border border-[#ead7c5] bg-white/72 p-4">
            <p className="text-sm font-semibold text-[#2a170d]">Billing Details</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#111111]">Company Name</label>
                <input value={billingCompanyName} onChange={(e) => setBillingCompanyName(e.target.value)} placeholder="Registered company name" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#111111]">GST/VAT Number</label>
                <input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder="Optional" className={inputClass} />
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="pix-btn pix-btn-primary w-full"
            disabled={loading}
            onClick={async () => {
              if (loading) return;
              setLoading(true);
              await saveOnboardingProfile();
              setLoading(false);
              setStep("tutorial");
            }}
          >
            {loading ? "Saving..." : "Start"}
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
