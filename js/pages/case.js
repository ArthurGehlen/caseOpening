import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navBar.js";
import { TrackConstructor } from "../components/TrackConstructor.js";
import { create_result_modal } from "../components/resultModal.js";
import {
  get_case,
  list_case_items,
  open_cases,
} from "../services/caseService.js";
import { sell_item } from "../services/inventoryService.js";
import { RARITIES, MAX_CASES, IMAGE_FALLBACK } from "../utils/constants.js";
import { format_price } from "../utils/format.js";

const session = await require_auth();
if (!session) throw new Error("Sem sessão");

const tracks_container = document.getElementById("main_viewport");
const spin_btn = document.getElementById("spin_btn");
const quantity_input = document.getElementById("cases_quantity");
const title = document.getElementById("case_title");
const cost_label = document.getElementById("cost_label");
const message = document.getElementById("message");

const navbar = await mount_navbar();
const modal = create_result_modal();

const case_id = new URLSearchParams(location.search).get("id");
let current_case;
let case_items;
let tracks = [];

// fita decorativa
function draw_decor_item() {
  const total = Object.values(RARITIES).reduce((s, r) => s + r.chance, 0);
  let roll = Math.random() * total;
  let chosen = "industrial";

  for (const [key, r] of Object.entries(RARITIES)) {
    roll -= r.chance;
    if (roll < 0) {
      chosen = key;
      break;
    }
  }

  const pool = case_items.filter((i) => i.rarity === chosen);
  const source = pool.length ? pool : case_items;
  return source[Math.floor(Math.random() * source.length)];
}

function create_card(item) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.setProperty("--color", RARITIES[item.rarity]?.color ?? "#888");

  const img = document.createElement("img");
  img.src = item.img || IMAGE_FALLBACK;
  img.alt = item.name;
  img.title = item.name;
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });

  card.appendChild(img);
  return card;
}

function get_quantity() {
  let q = Math.floor(Number(quantity_input.value));
  if (!Number.isFinite(q) || q < 1) q = 1;
  if (q > MAX_CASES) q = MAX_CASES;
  quantity_input.value = q;
  return q;
}

function update_cost() {
  cost_label.textContent = `Custo: ${format_price(current_case.price * get_quantity())}`;
}

function render_tracks() {
  const quantity = get_quantity();
  tracks_container.innerHTML = "";

  tracks = Array.from({ length: quantity }, () => {
    const track = new TrackConstructor({
      container: tracks_container,
      createCard: create_card,
      drawItem: draw_decor_item,
    });
    track.build_track();
    return track;
  });

  update_cost();
}

function show_message(text) {
  message.textContent = text;
  message.hidden = !text;
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
    // servidor debita, sorteia e grava
    const { items: winners, balance } = await open_cases(
      current_case.id,
      tracks.length,
    );
    navbar.set_balance(balance);

    // anima
    await Promise.all(tracks.map((t, i) => t.spin(winners[i])));

    // resultado
    fire_confetti(winners);

    modal.open(winners, {
      cost: current_case.price * winners.length,
      on_sell: async (item) => {
        const new_balance = await sell_item(item.inventory_id);
        navbar.set_balance(new_balance);
      },
      on_close: () => set_busy(false),
    });
  } catch (err) {
    console.error(err);
    show_message(err.message || "Erro ao abrir a caixa.");
    set_busy(false);
  }
}

// init
try {
  if (!case_id) throw new Error("Caixa não informada");

  [current_case, case_items] = await Promise.all([
    get_case(case_id),
    list_case_items(case_id),
  ]);

  title.textContent = current_case.name;
  document.title = current_case.name;
  render_tracks();

  quantity_input.addEventListener("change", render_tracks);
  spin_btn.addEventListener("click", handle_spin);
} catch (err) {
  console.error(err);
  show_message("Caixa não encontrada.");
  set_busy(true);
}
