import { supabase } from "../supabaseClient.js";

export async function get_profile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, balance, last_bonus_at")
    .single();
  if (error) throw error;
  return data;
}

// devolve o novo saldo
export async function claim_bonus() {
  const { data, error } = await supabase.rpc("claim_bonus");
  if (error) throw error;
  return data;
}
