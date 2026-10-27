import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "catherinesedan4@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { orderNumber, customerEmail, recipientName, occasion, receiptUrl, customerNote, slug } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to send email via Supabase auth admin API (resend)
    // If no email service is configured, we still record a notification log
    const subject = `New Payment Submission — Order ${orderNumber || slug}`;
    const body = `
A new GCash payment receipt has been submitted for verification.

Order Number: ${orderNumber || slug}
Customer Email: ${customerEmail || "Not provided"}
Recipient: ${recipientName || "—"}
Occasion: ${occasion || "—"}
Customer Note: ${customerNote || "None"}

Receipt: ${receiptUrl || "No receipt uploaded"}

Review this order in the admin dashboard.
`;

    // Send email using Resend if API key is available
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "LoveSurprise <onboarding@resend.dev>",
          to: [ADMIN_EMAIL],
          subject,
          text: body,
        }),
      });
      if (!emailResp.ok) {
        const errText = await emailResp.text();
        console.error("Email send failed:", errText);
      }
    } else {
      console.log("No RESEND_API_KEY set. Payment notification (would email):", body);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification processed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-payment error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
