const supabase = require("./supabase");
const BADGES = { 1:"🥇", 2:"🥈", 3:"🥉" };
async function recalculateRankings() {
  try {
    const { data: users } = await supabase.from("users").select("id,report_count,verified_count,total_upvotes").eq("role","user");
    if (!users?.length) return;
    await supabase.from("users").update({ badge: null }).neq("id","00000000-0000-0000-0000-000000000000");
    const scored = users.map(u=>({...u,score:u.verified_count*10+u.total_upvotes*2+u.report_count})).sort((a,b)=>b.score-a.score).slice(0,3);
    for (let i=0; i<scored.length; i++) {
      if (scored[i].score > 0) await supabase.from("users").update({ badge: BADGES[i+1] }).eq("id", scored[i].id);
    }
  } catch(e) { console.error("[Rankings]", e.message); }
}
module.exports = { recalculateRankings };
