import { supabase } from "../supabaseClient.js";

export async function get_dashboard_stats() {
  const { data, error } = await supabase
    .from("dashboard_stats")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function get_leaderboard(limit = 10) {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}

export async function list_recent_openings(limit = 5) {
  const { data, error } = await supabase
    .from("openings")
    .select("id, cost, created_at, items(name, rarity, img, price)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => ({
    ...row.items,
    cost: row.cost,
    created_at: row.created_at,
    id: row.id,
  }));
}
