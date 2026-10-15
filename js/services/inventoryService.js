import { supabase } from "../supabaseClient.js";

export async function sell_item(inventory_id) {
  const { data, error } = await supabase.rpc("sell_item", {
    p_inventory_id: inventory_id,
  });
  if (error) throw error;
  return data;
}
