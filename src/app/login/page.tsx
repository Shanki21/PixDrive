"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthShell from "@/components/auth/AuthShell";
import AuthVisuals from "@/components/auth/AuthVisuals";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import { loadProfile, saveProfile } from "@/lib/profile-storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const checkRes = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (!checkData.exists) {
        setError("Email address not found");
        return;
      }

      const otpRes = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok || !otpData.ok) {
        setError(otpData.message ?? "Unable to send OTP email");
        return;
      }
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.ok) {
        setError("Invalid or expired OTP");
        return;
      }
      const current = loadProfile();
      saveProfile({
        ...current,
        email: email.trim().toLowerCase(),
      });
      router.push("/dashboard");
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
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </p>
        ) : (
          <button className="underline" onClick={() => setStep("email")}>
            {"<-"} Back
          </button>
        )
      }
    >
      {step === "email" ? (
        <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={onEmailSubmit} className="space-y-6">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl font-semibold text-[#111320]">
            Login
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <label className="mb-2 block text-sm font-semibold text-[#151821]">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className={`h-12 w-full rounded-full border bg-white px-5 text-sm outline-none transition focus:-translate-y-0.5 focus:shadow-[0_0_0_4px_rgba(17,19,32,0.08)] ${
                error ? "border-red-400" : "border-[#d7d7d7]"
              }`}
            />
            {error ? <p className="mt-2 text-sm text-[#ef4444]">{error}</p> : null}
          </motion.div>
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="h-11 w-full rounded-full bg-[#101114] text-sm font-semibold text-white"
            disabled={loading}
          >
            {loading ? "Checking..." : "Next"}
          </motion.button>
        </motion.form>
      ) : (
        <motion.form initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} onSubmit={onOtpSubmit} className="space-y-6">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-5xl font-semibold text-[#111320]">
            Login
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-base leading-relaxed text-[#101218]">
            Access code sent to <strong>{email}</strong>.
          </motion.p>
          <OtpCodeInput value={otp} onChange={setOtp} />
          {error ? <p className="text-sm text-[#ef4444]">{error}</p> : null}
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="h-11 w-full rounded-full bg-[#101114] text-sm font-semibold text-white disabled:opacity-40"
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Log in"}
          </motion.button>
        </motion.form>
      )}
    </AuthShell>
  );
}
