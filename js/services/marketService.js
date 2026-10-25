import { supabase } from "../supabaseClient.js";

const PAGE = 1000; // limite de linhas por consulta no Supabase

export async function list_market_items() {
  const { data, error } = await supabase
    .from("items")
    .select("id, name, rarity, img, price, base_price");
  if (error) throw error;

  return data.map((i) => ({
    ...i,
    price: Number(i.price),
    base_price: Number(i.base_price),
  }));
}

// histórico dos últimos N dias, paginado (19+ itens x 90 dias passa de 1000 linhas)
export async function list_price_history(days = 90) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("price_history")
      .select("item_id, price, recorded_at")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true })
      .order("item_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;

    rows.push(...data);
    if (data.length < PAGE) break;
  }

  return rows;
}

// em quais caixas cada item aparece: Map(item_id -> [{ id, name }])
export async function list_item_cases() {
  const { data, error } = await supabase
    .from("case_items")
    .select("item_id, cases(id, name)")
    .gt("weight", 0);
  if (error) throw error;

  const map = new Map();
  data.forEach((row) => {
    if (!row.cases) return;
    const list = map.get(row.item_id) ?? [];
    list.push({ id: row.cases.id, name: row.cases.name });
    map.set(row.item_id, list);
  });
  return map;
}
