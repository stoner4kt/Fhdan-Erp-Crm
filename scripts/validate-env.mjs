const requiredPublic = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_VAULT_BUCKET",
];

const requiredServer = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_FROM_NAME",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID_OPS",
  "TELEGRAM_CHAT_ID_SALES",
  "TELEGRAM_CHAT_ID_FINANCE",
  "CALLMEBOT_PHONE",
  "CALLMEBOT_APIKEY",
];

const missing = [...requiredPublic, ...requiredServer].filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("❌ Missing required environment variables:\n- " + missing.join("\n- "));
  process.exit(1);
}

console.log("✅ All required environment variables are present.");
