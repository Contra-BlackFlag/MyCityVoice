require("dotenv").config({ path: "./server/.env" });
const supabase = require("./server/utils/supabase");

async function checkUser() {
  const email = "testuser@example.com";
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find(u => u.email === (email.toLowerCase()));
  console.log("Auth User:", authUser ? authUser.id : "Not found");

  if (authUser) {
    const { data: publicUser, error: publicErr } = await supabase.from("users").select("*").eq("id", authUser.id).single();
    console.log("Public User:", publicUser ? publicUser.username : "Not found");
    if (publicErr) console.log("Public Error:", publicErr.message);
  }
}

checkUser();
