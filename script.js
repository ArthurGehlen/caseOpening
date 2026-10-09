import { ITEMS } from "./js/items.js";
import { TrackConstructor } from "./js/trackConstructor.js";
import { RARITIES } from "./utils/constants.js";

const main_viewport = document.getElementById("main_viewport");
const btn = document.getElementById("spin_btn");
const result = document.getElementById("result");
const cases_quantity_input = document.getElementById("cases_quantity");

let tracks = [];

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
  img.src = item.img;
  img.alt = item.name;

  card.append(img);
  return card;
}

function render_tracks() {
  const quantity = Number(cases_quantity_input.value);

  main_viewport.innerHTML = "";
  result.textContent = "";

  tracks = Array.from({ length: quantity }, () => {
    const track = new TrackConstructor({
      container: main_viewport,
      createCard: create_card,
      drawItem: draw_item,
    });
    track.build_track();
    track.generate_cards();
    return track;
  });
}

cases_quantity_input.addEventListener("change", render_tracks);

btn.addEventListener("click", async () => {
  btn.disabled = true;
  cases_quantity_input.disabled = true;
  result.textContent = "";

  const winners = tracks.map(() => draw_item());
  await Promise.all(tracks.map((t, i) => t.spin(winners[i])));

  result.textContent = winners
    .map((w) => `${w.name} (${RARITIES[w.rarity].label})`)
    .join(", ");

  btn.disabled = false;
  cases_quantity_input.disabled = false;
});

render_tracks();