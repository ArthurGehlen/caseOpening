import { ITEMS } from "./js/items.js";

// TODO: criar uma classe para os itens

const RARITIES = {
  industrial: { label: "Industrial Grade", color: "#5e98d9", chance: 65 },
  milspec: { label: "Mil-Spec Grade", color: "#5169f7", chance: 25 },
  restricted: { label: "Restricted", color: "#a574ff", chance: 7 },
  classified: { label: "Classified", color: "#e050f0", chance: 2.5 },
  covert: { label: "Covert", color: "#f26767", chance: 0.5 },
};

const track = document.getElementById("track");
const viewport = document.getElementById("viewport");
const btn = document.getElementById("spin-btn");
const result = document.getElementById("result");

const TOTAL_CARDS = 55;
const WINNER_INDEX = 45;
const SPIN_TIME = "6s";

let spinning = false;

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

  const name = document.createElement("p");
  name.textContent = item.name;

  card.append(img, name);
  return card;
}

function generate_cards(winner = null) {
  track.innerHTML = "";

  for (let i = 0; i < TOTAL_CARDS; i++) {
    const item = winner && i === WINNER_INDEX ? winner : draw_item();
    track.appendChild(create_card(item));
  }
}

function spin() {
  if (spinning) return;
  spinning = true;
  btn.disabled = true;
  result.textContent = "";

  const winner = draw_item();

  track.style.transition = "none";
  track.style.transform = "translateX(0)";
  generate_cards(winner);

  const winner_element = track.children[WINNER_INDEX];

  track.offsetWidth;

  const winner_center =
    winner_element.offsetLeft + winner_element.offsetWidth / 2;
  const viewport_center = viewport.offsetWidth / 2;
  const jitter = (Math.random() - 0.5) * winner_element.offsetWidth * 0.8;
  const distance = winner_center - viewport_center + jitter;

  track.style.transition = `transform ${SPIN_TIME} cubic-bezier(0.15, 0, 0.10, 1)`;
  track.style.transform = `translateX(${-distance}px)`;

  track.addEventListener(
    "transitionend",
    () => {
      result.textContent = `Você ganhou: ${winner.name} (${RARITIES[winner.rarity].label})`;
      spinning = false;
      btn.disabled = false;
    },
    { once: true },
  );
}

document.addEventListener("DOMContentLoaded", () => generate_cards());

btn.addEventListener("click", spin);
