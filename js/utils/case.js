import { ITEMS } from "./js/items.js";
import { TrackConstructor } from "./js/components/TrackConstructor.js";
import { RARITIES, IMAGE_FALLBACK, MAX_CASES } from "./js/utils/constants.js";
import { create_result_card } from "./js/components/ResultCard.js";

const main_viewport = document.getElementById("main_viewport");
const btn = document.getElementById("spin_btn");
const cases_quantity_input = document.getElementById("cases_quantity");
const confirmation_modal_wrapper = document.getElementById(
  "confirmation_modal_wrapper",
);
const modal_container = document.getElementById("modal_container");

let tracks = [];

function fire_confetti(winners) {
  const rare = winners.some((w) => ["classified", "covert"].includes(w.rarity));
  confetti({
    particleCount: rare ? 200 : 80,
    spread: rare ? 100 : 70,
    origin: { y: 0.6 },
  });
}

function show_results(winners) {
  modal_container.innerHTML = "";

  winners.forEach((item) => {
    const card = create_result_card(item, {
      on_sell: async (it) => {
        const new_balance = await sell_item(it.inventory_id);
        update_balance(new_balance); // atualiza a navbar
      },
    });
    modal_container.appendChild(card);
  });

  fire_confetti(winners);
}

function draw_item() {
  const total = Object.values(RARITIES).reduce(
    (sum, current) => sum + current.chance,
    0,
  );
  let roll = Math.random() * total;

  let chosen = "industrial";
  for (const [key, r] of Object.entries(RARITIES)) {
    roll -= r.chance;
    if (roll < 0) {
      chosen = key;
      break;
    }
  }

  const pool = ITEMS.filter((i) => i.rarity === chosen);
  if (pool.length === 0) {
    throw new Error(`Nenhum item com a raridade "${chosen}" em items.js`);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function create_card(item) {
  const rarity = RARITIES[item.rarity];
  if (!rarity) {
    throw new Error(`Raridade inválida no item "${item.name}": ${item.rarity}`);
  }

  const card = document.createElement("div");
  card.className = "card";
  card.style.setProperty("--color", rarity.color);

  const img = document.createElement("img");
  img.src = item.img || IMAGE_FALLBACK;
  img.alt = item.name;
  img.title = item.name;

  card.append(img);
  return card;
}

function render_tracks() {
  const quantity = cases_quantity_input.value;

  // verificação básica pra n virar varzea :)
  if (quantity > MAX_CASES) quantity = MAX_CASES;

  main_viewport.innerHTML = "";

  tracks = Array.from({ length: quantity }, () => {
    const track = new TrackConstructor({
      container: main_viewport,
      createCard: create_card,
      drawItem: draw_item,
    });
    track.build_track();
    return track;
  });
}

cases_quantity_input.addEventListener("change", render_tracks);

btn.addEventListener("click", async () => {
  btn.disabled = true;
  cases_quantity_input.disabled = true;

  try {
    const winners = tracks.map(() => draw_item());
    await Promise.all(tracks.map((t, i) => t.spin(winners[i])));

    confirmation_modal_wrapper.style.display = "flex";

    show_results(winners);
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    cases_quantity_input.disabled = false;
  }
});

render_tracks();
