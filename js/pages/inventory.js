import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navBar.js";
import {
  list_inventory,
  sell_item,
  sell_items,
} from "../services/inventoryService.js";
import { RARITIES } from "../utils/constants.js";
import { format_price, format_date } from "../utils/format.js";

const IMAGE_FALLBACK = "./img/placeholder.png";
const RARITY_ORDER = Object.keys(RARITIES);

const session = await require_auth();
if (!session) throw new Error("Sem sessão");

const grid = document.getElementById("inv_grid");
const status = document.getElementById("status");
const message = document.getElementById("message");
const stat_count = document.getElementById("stat_count");
const stat_value = document.getElementById("stat_value");
const filter_rarity = document.getElementById("filter_rarity");
const sort_by = document.getElementById("sort_by");
const select_all = document.getElementById("select_all");
const sell_selected_btn = document.getElementById("sell_selected_btn");

const navbar = await mount_navbar();

let inventory = [];
const selected = new Set(); // inventory_ids marcados

function show_message(text) {
  message.textContent = text;
  message.hidden = !text;
}

function sum_prices(items) {
  return items.reduce((sum, i) => sum + Number(i.price), 0);
}

function get_visible() {
  let list = inventory;

  if (filter_rarity.value !== "all") {
    list = list.filter((i) => i.rarity === filter_rarity.value);
  }

  const sorters = {
    recent: (a, b) => new Date(b.obtained_at) - new Date(a.obtained_at),
    price_desc: (a, b) => b.price - a.price,
    price_asc: (a, b) => a.price - b.price,
    rarity: (a, b) =>
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
  };

  return [...list].sort(sorters[sort_by.value]);
}

function create_item_card(item) {
  const rarity = RARITIES[item.rarity];

  const card = document.createElement("article");
  card.className = "inv_card";
  card.dataset.id = item.inventory_id;
  card.style.setProperty("--color", rarity?.color ?? "#888");
  card.classList.toggle("is_selected", selected.has(item.inventory_id));

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "inv_check";
  check.checked = selected.has(item.inventory_id);
  check.setAttribute("aria-label", `Selecionar ${item.name}`);
  check.addEventListener("change", () => {
    if (check.checked) selected.add(item.inventory_id);
    else selected.delete(item.inventory_id);
    card.classList.toggle("is_selected", check.checked);
    update_toolbar();
  });

  const img = document.createElement("img");
  img.src = item.img || IMAGE_FALLBACK;
  img.alt = item.name;
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });

  const label = document.createElement("span");
  label.className = "inv_rarity";
  label.textContent = rarity?.label ?? "Desconhecida";

  const name = document.createElement("p");
  name.className = "inv_name";
  name.textContent = item.name;

  const date = document.createElement("small");
  date.className = "inv_date";
  date.textContent = format_date(item.obtained_at);

  const sell_btn = document.createElement("button");
  sell_btn.type = "button";
  sell_btn.className = "inv_sell";
  sell_btn.textContent = `Vender ${format_price(item.price)}`;
  sell_btn.addEventListener("click", () => handle_sell_one(item, sell_btn));

  card.append(check, img, label, name, date, sell_btn);
  return card;
}

function render() {
  const visible = get_visible();
  grid.innerHTML = "";

  if (visible.length === 0) {
    status.textContent =
      inventory.length === 0
        ? "Seu inventário está vazio. Abra algumas caixas!"
        : "Nenhum item com esse filtro.";
    status.hidden = false;
  } else {
    status.hidden = true;
    visible.forEach((item) => grid.appendChild(create_item_card(item)));
  }

  update_toolbar();
}

function update_toolbar() {
  stat_count.textContent = inventory.length;
  stat_value.textContent = format_price(sum_prices(inventory));

  const visible = get_visible();
  const selected_items = inventory.filter((i) => selected.has(i.inventory_id));

  sell_selected_btn.disabled = selected_items.length === 0;
  sell_selected_btn.textContent =
    selected_items.length > 0
      ? `Vender selecionados (${selected_items.length}) ${format_price(sum_prices(selected_items))}`
      : "Vender selecionados";

  const all_visible_selected =
    visible.length > 0 && visible.every((i) => selected.has(i.inventory_id));
  select_all.checked = all_visible_selected;
  select_all.disabled = visible.length === 0;
}

function remove_from_state(ids) {
  const set = new Set(ids);
  inventory = inventory.filter((i) => !set.has(i.inventory_id));
  ids.forEach((id) => selected.delete(id));
}

async function handle_sell_one(item, btn) {
  show_message("");
  btn.disabled = true;
  try {
    const new_balance = await sell_item(item.inventory_id);
    navbar.set_balance(new_balance);
    remove_from_state([item.inventory_id]);
    render();
  } catch (err) {
    console.error(err);
    show_message("Não foi possível vender o item.");
    btn.disabled = false;
  }
}

async function handle_sell_selected() {
  const ids = [...selected].filter((id) =>
    inventory.some((i) => i.inventory_id === id),
  );
  if (ids.length === 0) return;

  const total = sum_prices(
    inventory.filter((i) => ids.includes(i.inventory_id)),
  );
  const ok = confirm(
    `Vender ${ids.length} item(ns) por ${format_price(total)}?`,
  );
  if (!ok) return;

  show_message("");
  sell_selected_btn.disabled = true;

  try {
    const new_balance = await sell_items(ids);
    navbar.set_balance(new_balance);
    remove_from_state(ids);
    render();
  } catch (err) {
    console.error(err);
    show_message("Não foi possível vender os itens selecionados.");
    update_toolbar();
  }
}

filter_rarity.addEventListener("change", render);
sort_by.addEventListener("change", render);

select_all.addEventListener("change", () => {
  const visible = get_visible();
  visible.forEach((i) => {
    if (select_all.checked) selected.add(i.inventory_id);
    else selected.delete(i.inventory_id);
  });
  render();
});

sell_selected_btn.addEventListener("click", handle_sell_selected);

function fill_rarity_filter() {
  Object.entries(RARITIES).forEach(([key, r]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = r.label;
    filter_rarity.appendChild(opt);
  });
}

try {
  fill_rarity_filter();
  inventory = await list_inventory();
  render();
} catch (err) {
  console.error(err);
  status.textContent = "Erro ao carregar o inventário.";
}
