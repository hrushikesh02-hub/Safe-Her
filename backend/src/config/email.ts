import axios from "axios";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.EMAIL_USER ||
    "safeher.alerts@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "SafeHer Emergency System";

  if (!brevoApiKey) {
    console.warn("\n⚠ [Brevo] BREVO_API_KEY is not set in backend/.env.");
    console.log(`======================================================`);
    console.log(`📧 [BREVO SIMULATOR] Add BREVO_API_KEY in backend/.env to send real emails.`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Sender: ${senderName} <${senderEmail}>`);
    console.log(`======================================================\n`);
    return { simulated: true, to, subject };
  }

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: to,
          },
        ],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log(`✅ [Brevo API] Email successfully sent to ${to} (MessageId: ${response.data?.messageId || "OK"})`);
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data?.message || error.response?.data || error.message;
    console.error(`❌ [Brevo API Error] Failed to send email to ${to}:`, errorDetails);
    throw error;
  }
}