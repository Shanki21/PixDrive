type SendOtpParams = {
  to: string;
  otp: string;
};

type SendOtpResult =
  | { ok: true; provider: "resend" | "smtp" }
  | { ok: false; message: string; reason: string };

function buildOtpHtml(otp: string) {
  return `
    <div style="font-family:Arial,sans-serif;color:#111">
      <h2 style="margin:0 0 12px;">Your pixora access code</h2>
      <p style="margin:0 0 12px;">Use this one-time password to continue:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:0 0 12px;">${otp}</p>
      <p style="margin:0;color:#666;">This code expires in 5 minutes.</p>
    </div>
  `;
}

async function sendWithResend({ to, otp }: SendOtpParams): Promise<SendOtpResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      ok: false,
      reason: "missing_resend_env",
      message: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your pixora OTP code",
        html: buildOtpHtml(otp),
      }),
    });

    if (res.ok) {
      return { ok: true, provider: "resend" };
    }

    const body = await res.text().catch(() => "");
    return {
      ok: false,
      reason: "resend_request_failed",
      message: body || `Resend request failed with status ${res.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "resend_network_error",
      message: error instanceof Error ? error.message : "Unable to reach Resend.",
    };
  }
}

async function sendWithSmtp({ to, otp }: SendOtpParams): Promise<SendOtpResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL;
  if (!host || !port || !user || !pass || !from) {
    return {
      ok: false,
      reason: "missing_smtp_env",
      message: "Missing SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, or SMTP_FROM_EMAIL.",
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject: "Your pixora OTP code",
      html: buildOtpHtml(otp),
    });

    return { ok: true, provider: "smtp" };
  } catch (error) {
    return {
      ok: false,
      reason: "smtp_send_failed",
      message: error instanceof Error ? error.message : "SMTP send failed.",
    };
  }
}

export async function sendOtpEmail(params: SendOtpParams): Promise<SendOtpResult> {
  const resendResult = await sendWithResend(params);
  if (resendResult.ok) {
    return resendResult;
  }

  const smtpResult = await sendWithSmtp(params);
  if (smtpResult.ok) {
    return smtpResult;
  }

  if (
    resendResult.reason === "missing_resend_env" &&
    smtpResult.reason === "missing_smtp_env"
  ) {
    return {
      ok: false,
      reason: "no_email_provider_configured",
      message:
        "No email provider is configured on the server. In Vercel, add RESEND_API_KEY and RESEND_FROM_EMAIL, or add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL.",
    };
  }

  return {
    ok: false,
    reason: `${resendResult.reason}|${smtpResult.reason}`,
    message: resendResult.message,
  };
}
