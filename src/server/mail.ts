/**
 * Outgoing email. "console" prints messages to the server log (development only).
 * "resend" sends through the Resend HTTP API (requires an account and a verified domain).
 */
export type Mail = { to: string; subject: string; text: string };

export async function sendMail(mail: Mail) {
  const driver = process.env.MAIL_DRIVER || "console";
  if (driver === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) throw new Error(`Mail send failed: ${res.status}`);
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("[mail] MAIL_DRIVER=console in production: email was not sent");
    return;
  }
  console.info(`\n[mail:console] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
}

export function mailConfigured() {
  return process.env.MAIL_DRIVER === "resend" && !!process.env.RESEND_API_KEY;
}
