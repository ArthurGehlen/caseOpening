import { supabase } from "../supabaseClient.js";

export async function list_cases() {
  const { data, error } = await supabase
    .from("cases")
    .select("id, name, img, price")
    .order("price", { ascending: true });
  if (error) throw error;
  return data;
}

export async function get_case(id) {
  const { data, error } = await supabase
    .from("cases")
    .select("id, name, img, price")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// para a próxima etapa (tela da caixa)
export async function open_cases(case_id, quantity) {
  const { data, error } = await supabase.rpc("open_cases", {
    p_case_id: case_id,
    p_quantity: quantity,
  });
  if (error) throw error;
  return data;
}

// itens que pertencem a uma caixa (para a fita decorativa)
export async function list_case_items(case_id) {
  const { data, error } = await supabase
    .from("case_items")
    .select("items(id, name, rarity, img, price)")
    .eq("case_id", case_id);
  if (error) throw error;
  return data.map((row) => row.items);
}
