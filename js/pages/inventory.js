import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navbar.js";
import {
  list_inventory,
  sell_item,
  sell_items,
} from "../services/inventoryService.js";
import { RARITIES, IMAGE_FALLBACK } from "../utils/constants.js";
import { format_price, format_date } from "../utils/format.js";

const RARITY_ORDER = Object.keys(RARITIES); // do mais comum ao mais raro

const session = await require_auth();
if (!session) throw new Error("Sem sessão");

const navbar = await mount_navbar();

const $ = (id) => document.getElementById(id);

function el(tag, class_name, text) {
  const node = document.createElement(tag);
  if (class_name) node.className = class_name;
  if (text !== undefined) node.textContent = text;
  return node;
}

const sum_prices = (items) =>
  items.reduce((sum, i) => sum + Number(i.price), 0);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

let inventory = [];
let rarity_filter = "all";
const selected = new Set(); // inventory_ids marcados

const SORTERS = {
  recent: (a, b) => new Date(b.obtained_at) - new Date(a.obtained_at),
  price_desc: (a, b) => b.price - a.price,
  price_asc: (a, b) => a.price - b.price,
  rarity: (a, b) =>
    RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
};

function get_visible() {
  const list =
    rarity_filter === "all"
      ? inventory
      : inventory.filter((i) => i.rarity === rarity_filter);
  return [...list].sort(SORTERS[$("sort_by").value]);
}

const get_selected_items = () =>
  inventory.filter((i) => selected.has(i.inventory_id));

function show_message(text) {
  $("message").textContent = text;
  $("message").hidden = !text;
}

function render_summary() {
  $("total_value").textContent = format_price(sum_prices(inventory));
  $("total_count").textContent = plural(inventory.length, "item", "itens");

  // segmentos proporcionais ao valor de cada raridade
  const bar = $("composition");
  bar.replaceChildren();

  RARITY_ORDER.slice()
    .reverse()
    .forEach((key) => {
      const value = sum_prices(inventory.filter((i) => i.rarity === key));
      if (value === 0) return;
      const part = el("span", "composition_part");
      part.style.setProperty("--share", value);
      part.style.setProperty("--color", RARITIES[key].color);
      part.title = `${RARITIES[key].label}: ${format_price(value)}`;
      bar.append(part);
    });
}

function render_chips() {
  const chips = $("chips");
  chips.replaceChildren();

  const options = [
    { key: "all", label: "Todos", color: null, count: inventory.length },
    ...RARITY_ORDER.map((key) => ({
      key,
      label: RARITIES[key].label,
      color: RARITIES[key].color,
      count: inventory.filter((i) => i.rarity === key).length,
    })),
  ];

  options.forEach(({ key, label, color, count }) => {
    // raridades vazias não aparecem, exceto a que está filtrada
    if (key !== "all" && count === 0 && key !== rarity_filter) return;

    const chip = el("button", "chip");
    chip.type = "button";
    chip.setAttribute("aria-pressed", String(key === rarity_filter));
    if (color) chip.style.setProperty("--color", color);

    chip.append(
      el("span", "chip_label", label),
      el("small", "chip_count", count),
    );
    chip.addEventListener("click", () => {
      rarity_filter = key;
      render();
    });
    chips.append(chip);
  });
}

function create_item(item) {
  const rarity = RARITIES[item.rarity];
  const is_selected = selected.has(item.inventory_id);

  const li = el("li", "item");
  li.style.setProperty("--color", rarity?.color ?? "#888");
  li.classList.toggle("is_selected", is_selected);

  const label = el("label", "item_select");

  const check = el("input", "item_check");
  check.type = "checkbox";
  check.checked = is_selected;
  check.setAttribute("aria-label", `Selecionar ${item.name}`);
  check.addEventListener("change", () => {
    if (check.checked) selected.add(item.inventory_id);
    else selected.delete(item.inventory_id);
    li.classList.toggle("is_selected", check.checked);
    render_actionbar();
  });

  const figure = el("div", "item_figure");
  const img = el("img", "item_img");
  img.src = item.img || IMAGE_FALLBACK;
  img.alt = item.name;
  img.loading = "lazy";
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });
  figure.append(img);

  const info = el("div", "item_info");
  info.append(
    el("span", "item_rarity", rarity?.label ?? "Desconhecida"),
    el("span", "item_name", item.name),
    el("small", "item_date", format_date(item.obtained_at)),
  );

  label.append(check, figure, info);

  const footer = el("div", "item_footer");
  const price = el("span", "item_price", format_price(item.price));
  const sell = el("button", "item_sell", "Vender");
  sell.type = "button";
  sell.addEventListener("click", () => handle_sell_one(item, sell));
  footer.append(price, sell);

  li.append(label, footer);
  return li;
}

function render_grid() {
  const grid = $("grid");
  const status = $("status");
  const visible = get_visible();

  grid.replaceChildren(...visible.map(create_item));

  status.hidden = visible.length > 0;
  if (visible.length === 0) {
    status.textContent =
      inventory.length === 0
        ? "Seu inventário está vazio. Abra algumas caixas."
        : "Nenhum item nesta raridade.";
  }
}

function render_actionbar() {
  const items = get_selected_items();
  const visible = get_visible();
  const bar = $("actionbar");

  bar.hidden = inventory.length === 0;

  const all_selected =
    visible.length > 0 && visible.every((i) => selected.has(i.inventory_id));
  $("select_all").checked = all_selected;
  $("select_all").disabled = visible.length === 0;

  $("selection_info").textContent =
    items.length > 0
      ? `${plural(items.length, "selecionado", "selecionados")} · ${format_price(sum_prices(items))}`
      : "Nenhum item selecionado";

  $("sell_selected_btn").disabled = items.length === 0;
  $("sell_selected_btn").textContent =
    items.length > 0 ? `Vender ${format_price(sum_prices(items))}` : "Vender";
}

function render() {
  render_summary();
  render_chips();
  render_grid();
  render_actionbar();
}

function remove_from_state(ids) {
  const set = new Set(ids);
  inventory = inventory.filter((i) => !set.has(i.inventory_id));
  ids.forEach((id) => selected.delete(id));

  // se a raridade filtrada esvaziou, volta para "Todos"
  if (
    rarity_filter !== "all" &&
    !inventory.some((i) => i.rarity === rarity_filter)
  ) {
    rarity_filter = "all";
  }
}

async function handle_sell_one(item, button) {
  show_message("");
  button.disabled = true;
  try {
    navbar.set_balance(await sell_item(item.inventory_id));
    remove_from_state([item.inventory_id]);
    render();
  } catch (err) {
    console.error(err);
    show_message("Não foi possível vender o item.");
    button.disabled = false;
  }
}

async function handle_sell_selected() {
  const items = get_selected_items();
  if (items.length === 0) return;

  const ok = confirm(
    `Vender ${plural(items.length, "item", "itens")} por ${format_price(sum_prices(items))}?`,
  );
  if (!ok) return;

  show_message("");
  $("sell_selected_btn").disabled = true;

  try {
    const ids = items.map((i) => i.inventory_id);
    navbar.set_balance(await sell_items(ids));
    remove_from_state(ids);
    render();
  } catch (err) {
    console.error(err);
    show_message("Não foi possível vender os itens selecionados.");
    render_actionbar();
  }
}

$("sort_by").addEventListener("change", render_grid);

$("select_all").addEventListener("change", (e) => {
  get_visible().forEach((i) => {
    if (e.target.checked) selected.add(i.inventory_id);
    else selected.delete(i.inventory_id);
  });
  render_grid();
  render_actionbar();
});

$("sell_selected_btn").addEventListener("click", handle_sell_selected);

try {
  inventory = await list_inventory();
  render();
} catch (err) {
  console.error(err);
  $("status").textContent = "Erro ao carregar o inventário.";
  $("status").hidden = false;
}
