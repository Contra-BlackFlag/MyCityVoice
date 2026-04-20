require("dotenv").config();
const supabase = require("./utils/supabase");

async function checkUser() {
  const email = "testuser@example.com";
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === (email.toLowerCase()));
  console.log("Auth User ID:", authUser ? authUser.id : "Not found");

  if (authUser) {
    const { data: publicUser, error: publicErr } = await supabase.from("users").select("*").eq("id", authUser.id).single();
    console.log("Public User Record Found:", publicUser ? "Yes" : "No");
    if (publicUser) {
        console.log("Username:", publicUser.username);
    }
    if (publicErr) console.log("Public Error:", publicErr.message);
  }
}

checkUser();
