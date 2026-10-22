import { supabase } from "../supabaseClient.js";

export async function sell_item(inventory_id) {
  const { data, error } = await supabase.rpc("sell_item", {
    p_inventory_id: inventory_id,
  });
  if (error) throw error;
  return data;
}

export async function sell_items(inventory_ids) {
  const { data, error } = await supabase.rpc("sell_items", {
    p_inventory_ids: inventory_ids,
  });
  if (error) throw error;
  return data;
}

export async function list_inventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("id, obtained_at, items(id, name, rarity, img, price)")
    .order("obtained_at", { ascending: false });
  if (error) throw error;

  // achata para { inventory_id, obtained_at, id, name, rarity, img, price }
  return data.map((row) => ({
    inventory_id: row.id,
    obtained_at: row.obtained_at,
    ...row.items,
  }));
}
