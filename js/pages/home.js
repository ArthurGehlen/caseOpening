import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navbar.js";
import { list_cases } from "../services/caseService.js";
import { RARITIES, IMAGE_FALLBACK } from "../utils/constants.js";
import { format_price, format_percent } from "../utils/format.js";

const RARITY_ORDER = Object.keys(RARITIES); // do mais comum ao mais raro

const session = await require_auth();
if (!session) throw new Error("Sem sessão");

await mount_navbar();

const $ = (id) => document.getElementById(id);

function el(tag, class_name, text) {
  const node = document.createElement(tag);
  if (class_name) node.className = class_name;
  if (text !== undefined) node.textContent = text;
  return node;
}

function summarize(c) {
  const total = c.items.reduce((sum, i) => sum + i.weight, 0);
  const chance = (i) => (i.weight / total) * 100;

  return {
    best: Math.max(...c.items.map((i) => i.price)),
    profit: c.items
      .filter((i) => i.price >= c.price)
      .reduce((sum, i) => sum + chance(i), 0),
    shares: RARITY_ORDER.map((key) => ({
      key,
      share: c.items
        .filter((i) => i.rarity === key)
        .reduce((sum, i) => sum + chance(i), 0),
    })).filter((r) => r.share > 0),
  };
}
function create_tile(c) {
  const { best, profit, shares } = summarize(c);

  const li = el("li", "tile_item");
  const link = el("a", "tile");
  link.href = `case.html?id=${encodeURIComponent(c.id)}`;

  const figure = el("div", "tile_figure");
  const img = el("img", "tile_img");
  img.src = c.img || IMAGE_FALLBACK;
  img.alt = "";
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });
  figure.append(img);

  const head = el("div", "tile_head");
  head.append(
    el("h2", "tile_name", c.name),
    el("span", "tile_price", format_price(c.price)),
  );

  // barra de composição: o que a caixa costuma dar
  const bar = el("div", "composition");
  bar.setAttribute("aria-hidden", "true");
  shares.forEach(({ key, share }) => {
    const part = el("span", "composition_part");
    part.style.setProperty("--share", share);
    part.style.setProperty("--color", RARITIES[key].color);
    bar.append(part);
  });

  const stats = el("dl", "tile_stats");
  [
    ["Melhor prêmio", format_price(best)],
    ["Chance de lucro", format_percent(profit)],
  ].forEach(([label, value]) => {
    const row = el("div", "tile_stat");
    row.append(el("dt", "", label), el("dd", "", value));
    stats.append(row);
  });

  link.append(figure, head, bar, stats);
  li.append(link);
  return li;
}

const status = $("status");

try {
  const cases = (await list_cases()).filter((c) => c.items.length > 0);

  if (cases.length === 0) {
    status.textContent = "Nenhuma caixa disponível.";
  } else {
    status.hidden = true;
    $("home_sub").textContent =
      cases.length === 1
        ? "1 caixa disponível"
        : `${cases.length} caixas disponíveis`;
    $("cases_grid").replaceChildren(...cases.map(create_tile));
  }
} catch (err) {
  console.error(err);
  status.textContent = "Erro ao carregar as caixas.";
}
