"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthShell from "@/components/auth/AuthShell";
import AuthVisuals from "@/components/auth/AuthVisuals";
import OtpCodeInput from "@/components/auth/OtpCodeInput";
import { loadProfile, saveProfile } from "@/lib/profile-storage";

type AuthJson = {
  ok?: boolean;
  exists?: boolean;
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

      const checkData = await parseJsonSafe(checkRes);
      const canSkipCheckUser =
        (!checkRes.ok && checkRes.status === 404) || (!checkRes.ok && checkRes.status === 503);

      if (checkRes.ok && checkData?.exists === false) {
        setError("Email address not found");
        return;
      }

      if (!checkRes.ok && !canSkipCheckUser) {
        setError(checkData?.message ?? "Unable to validate your email right now");
        return;
      }

      const otpRes = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const otpData = await parseJsonSafe(otpRes);
      if (!otpRes.ok || !otpData?.ok) {
        setError(otpData?.message ?? "Unable to send OTP email");
        return;
      }
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
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
      const verifyData = await parseJsonSafe(verifyRes);
      if (!verifyRes.ok || !verifyData?.ok) {
        setError(verifyData?.message ?? "Invalid or expired OTP");
        return;
      }
      const current = loadProfile();
      saveProfile({
        ...current,
        email: email.trim().toLowerCase(),
      });
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
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
            <Link href="/signup" className="font-semibold text-[#0f766e] hover:text-[#115e59]">
              Sign up
            </Link>
          </p>
        ) : (
          <button className="font-semibold text-[#0f766e] hover:text-[#115e59]" onClick={() => setStep("email")}>
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
            {loading ? "Checking..." : "Next"}
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
