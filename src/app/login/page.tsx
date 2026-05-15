"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import fetchWithRetry from "@/lib/fetchWithRetry";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import AuthShell from "@/components/auth/AuthShell";
import AuthVisuals from "@/components/auth/AuthVisuals";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import { loadProfile, saveProfile } from "@/lib/profile-storage";
import { showPixoraAlert, showPixoraToast } from "@/lib/pixora-alerts";

type AuthJson = {
  ok?: boolean;
  exists?: boolean;
  code?: string;
  message?: string;
};

async function parseJsonSafe(res: Response): Promise<AuthJson | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await res.json()) as AuthJson;
  } catch {
    return null;
  }
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const showAuthError = (message: string) => {
    setError(message);
    void showPixoraAlert({
      title: "Login needs attention",
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
    const dedupe = `request-otp:${email.trim().toLowerCase()}`;
    const otpRes = await fetchWithRetry("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, intent: "login" }),
    }, { dedupeKey: dedupe, idempotencyKey: `${dedupe}:${Date.now()}` });

    const otpData = await parseJsonSafe(otpRes);
    if (!otpRes.ok || !otpData?.ok) {
      showAuthError(otpData?.message ?? "Unable to send OTP email");
      return false;
    }

    setResendIn(30);
    void showPixoraToast({ title: "OTP sent to your email" });
    return true;
  };

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const sent = await requestOtp();
      if (!sent) return;
      setStep("otp");
    } catch {
      showAuthError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    if (resendIn > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await requestOtp();
    } catch {
      showAuthError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const dedupe = `verify-otp:${email.trim().toLowerCase()}:${otp}`;
      const verifyRes = await fetchWithRetry("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, intent: "login" }),
      }, { dedupeKey: dedupe, idempotencyKey: `${dedupe}` });
      const verifyData = await parseJsonSafe(verifyRes);
      if (!verifyRes.ok || !verifyData?.ok) {
        showAuthError(verifyData?.message ?? "Invalid or expired OTP");
        return;
      }
      const current = loadProfile();
      saveProfile({
        ...current,
        email: email.trim().toLowerCase(),
      });
      router.push(searchParams.get("next") || "/dashboard");
    } catch {
      showAuthError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      right={<AuthVisuals mode="darkGallery" />}
      bottom={
        step === "email" ? (
          <p>
            Don&apos;t have an account yet?{" "}
            <Link href="/signup" className="font-semibold text-[#7a3f13] hover:text-[#5b2b0c]">
              Sign up
            </Link>
          </p>
        ) : (
          <button className="font-semibold text-[#7a3f13] hover:text-[#5b2b0c]" onClick={() => setStep("email")}>
            Back
          </button>
        )
      }
    >
      {step === "email" ? (
        <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={onEmailSubmit} className="pix-card space-y-6 p-8 md:p-10">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pix-heading-xl">
            Log in
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[16px] text-[#666666]">
            Continue to your Pixora dashboard with a secure one-time code.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <label className="mb-2 block text-sm font-semibold text-[#111111]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className={`pix-input ${error ? "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" : ""}`}
            />
            {error ? <p className="mt-2 text-sm text-[#ef4444]">{error}</p> : null}
          </motion.div>
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="pix-btn pix-btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Sending..." : "Next"}
          </motion.button>
        </motion.form>
      ) : (
        <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={onOtpSubmit} className="pix-card space-y-6 p-8 md:p-10">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pix-heading-xl">
            Verify Code
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-base leading-relaxed text-[#666666]">
            Access code sent to <strong className="text-[#111111]">{email}</strong>.
          </motion.p>
          <OtpCodeInput value={otp} onChange={setOtp} />
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
          {error ? <p className="text-sm text-[#ef4444]">{error}</p> : null}
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="pix-btn pix-btn-primary w-full disabled:opacity-40"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Log in"}
          </motion.button>
        </motion.form>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
