type SendOtpParams = {
  to: string;
  otp: string;
};

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

async function sendWithResend({ to, otp }: SendOtpParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return false;

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

  return res.ok;
}

async function sendWithSmtp({ to, otp }: SendOtpParams) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_EMAIL;
  if (!host || !port || !user || !pass || !from) return false;

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

    return true;
  } catch {
    return false;
  }
}

export async function sendOtpEmail(params: SendOtpParams) {
  if (await sendWithResend(params)) {
    return { ok: true as const, provider: "resend" as const };
  }

  if (await sendWithSmtp(params)) {
    return { ok: true as const, provider: "smtp" as const };
  }

  return {
    ok: false as const,
    message:
      "No email provider configured. Set RESEND_API_KEY+RESEND_FROM_EMAIL or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM_EMAIL.",
  };
}



