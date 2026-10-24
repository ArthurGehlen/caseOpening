import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navbar.js";
import { TrackConstructor } from "../components/TrackConstructor.js";
import { create_result_modal } from "../components/resultModal.js";
import {
  get_case,
  list_case_items,
  open_cases,
} from "../services/caseService.js";
import { sell_items } from "../services/inventoryService.js";
import { RARITIES, MAX_CASES } from "../utils/constants.js";
import { format_price, format_percent } from "../utils/format.js";

const IMAGE_FALLBACK = "./img/placeholder.png";
const MAX_TRACKS = 3;
const RARITY_ORDER = Object.keys(RARITIES);

const session = await require_auth();
if (!session) throw new Error("Sem sessão");

const navbar = await mount_navbar();
const modal = create_result_modal();

const $ = (id) => document.getElementById(id);

function el(tag, class_name, text) {
  const node = document.createElement(tag);
  if (class_name) node.className = class_name;
  if (text !== undefined) node.textContent = text;
  return node;
}

const tracks_container = $("main_viewport");
const spin_btn = $("spin_btn");
const quantity_input = $("cases_quantity");
quantity_input.max = MAX_CASES;

const case_id = new URLSearchParams(location.search).get("id");
let current_case;
let case_items = [];
let total_weight = 0;
let tracks = [];

const chance_of = (item) => (item.weight / total_weight) * 100;
const get_quantity = () => Number(quantity_input.value);

function show_message(text) {
  $("message").textContent = text;
  $("message").hidden = !text;
}

function draw_decor_item() {
  let roll = Math.random() * total_weight;
  for (const item of case_items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return case_items[case_items.length - 1];
}

function create_card(item) {
  const card = el("div", "card");
  card.style.setProperty("--color", RARITIES[item.rarity]?.color ?? "#888");

  const img = el("img");
  img.src = item.img || IMAGE_FALLBACK;
  img.alt = item.name;
  img.title = item.name;
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });

  card.append(img);
  return card;
}

function render_tracks(count) {
  tracks_container.replaceChildren();

  tracks = Array.from({ length: count }, () => {
    const track = new TrackConstructor({
      container: tracks_container,
      createCard: create_card,
      drawItem: draw_decor_item,
    });
    track.build_track();
    return track;
  });
}

function render_header() {
  const best = Math.max(...case_items.map((i) => i.price));
  const profit = case_items
    .filter((i) => i.price >= current_case.price)
    .reduce((sum, i) => sum + chance_of(i), 0);

  $("case_title").textContent = current_case.name;
  document.title = current_case.name;
  $("stat_price").textContent = format_price(current_case.price);
  $("stat_best").textContent = format_price(best);
  $("stat_profit").textContent = format_percent(profit);
  $("stat_items").textContent = case_items.length;
}

function render_odds() {
  // barra e legenda por raridade
  const composition = $("composition");
  const legend = $("legend");
  composition.replaceChildren();
  legend.replaceChildren();

  RARITY_ORDER.forEach((key) => {
    const share = case_items
      .filter((i) => i.rarity === key)
      .reduce((sum, i) => sum + chance_of(i), 0);
    if (share === 0) return;

    const part = el("span", "composition_part");
    part.style.setProperty("--share", share);
    part.style.setProperty("--color", RARITIES[key].color);
    composition.append(part);

    const entry = el("div", "legend_item");
    entry.style.setProperty("--tone", RARITIES[key].color);
    entry.append(
      el("dt", "", RARITIES[key].label),
      el("dd", "", format_percent(share)),
    );
    legend.append(entry);
  });

  const sorted = [...case_items].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
      b.price - a.price,
  );
  const top = Math.max(...case_items.map((i) => i.weight));

  $("odds_list").replaceChildren(
    ...sorted.map((item) => {
      const rarity = RARITIES[item.rarity];

      const li = el("li", "row odds_row");
      li.style.setProperty("--color", rarity?.color ?? "#888");
      li.style.setProperty("--pct", `${(item.weight / top) * 100}%`);

      const img = el("img", "odds_img");
      img.src = item.img || IMAGE_FALLBACK;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
        once: true,
      });

      const info = el("div", "odds_info");
      info.append(
        el("span", "odds_name", item.name),
        el(
          "small",
          "odds_meta",
          `${rarity?.label ?? ""} · ${format_price(item.price)}`,
        ),
      );

      li.append(
        el("span", "odds_rail"),
        img,
        info,
        el("span", "odds_chance", format_percent(chance_of(item))),
      );
      return li;
    }),
  );
}

function sync_controls() {
  const quantity = get_quantity();

  $("qty_output").textContent = quantity;
  $("cost_label").textContent = format_price(current_case.price * quantity);
  spin_btn.textContent =
    quantity === 1 ? "Abrir caixa" : `Abrir ${quantity} caixas`;

  // só recria as fitas quando o número delas muda
  const needed = Math.min(quantity, MAX_TRACKS);
  if (needed !== tracks.length) render_tracks(needed);

  const note = $("tracks_note");
  note.hidden = quantity <= MAX_TRACKS;
  note.textContent = `As fitas mostram os ${MAX_TRACKS} melhores prêmios. Todos aparecem no resultado.`;
}

function set_busy(busy) {
  spin_btn.disabled = busy;
  quantity_input.disabled = busy;
}

function fire_confetti(winners) {
  if (typeof confetti !== "function") return;
  const rare = winners.some((w) => ["classified", "covert"].includes(w.rarity));
  confetti({
    particleCount: rare ? 200 : 80,
    spread: rare ? 100 : 70,
    origin: { y: 0.6 },
  });
}

async function handle_spin() {
  show_message("");
  set_busy(true);

  try {
    const { items: winners, balance } = await open_cases(
      current_case.id,
      get_quantity(),
    );

    navbar.set_balance(balance);

    const featured = [...winners]
      .sort((a, b) => b.price - a.price)
      .slice(0, tracks.length);
    await Promise.all(tracks.map((t, i) => t.spin(featured[i])));

    fire_confetti(winners);
    modal.open(winners, {
      cost: current_case.price * winners.length,
      on_sell: async (ids) => {
        navbar.set_balance(await sell_items(ids));
      },
      on_close: () => set_busy(false),
    });
  } catch (err) {
    console.error(err);
    show_message(err.message || "Erro ao abrir a caixa.");
    set_busy(false);
  }
}

try {
  if (!case_id) throw new Error("Caixa não informada");

  [current_case, case_items] = await Promise.all([
    get_case(case_id),
    list_case_items(case_id),
  ]);
  if (case_items.length === 0) throw new Error("Caixa sem itens");

  total_weight = case_items.reduce((sum, i) => sum + i.weight, 0);

  render_header();
  render_odds();
  sync_controls();

  quantity_input.addEventListener("input", sync_controls);
  spin_btn.addEventListener("click", handle_spin);
} catch (err) {
  console.error(err);
  show_message("Caixa não encontrada.");
  set_busy(true);
}
