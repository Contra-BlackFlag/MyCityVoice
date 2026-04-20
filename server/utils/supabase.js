const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server/.env");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
console.log("✅ Supabase connected");
module.exports = supabase;
