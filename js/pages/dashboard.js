import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navbar.js";
import {
  get_dashboard_stats,
  get_leaderboard,
  list_recent_openings,
} from "../services/statsService.js";
import { RARITIES } from "../utils/constants.js";
import { format_price, format_date } from "../utils/format.js";

const session = await require_auth();
if (!session) throw new Error("Sem sessão");

const stats_grid = document.getElementById("stats_grid");
const leaderboard_el = document.getElementById("leaderboard");
const recent_el = document.getElementById("recent");
const message = document.getElementById("message");

await mount_navbar();

function create_el(tag, class_name, text) {
  const el = document.createElement(tag);
  if (class_name) el.className = class_name;
  if (text !== undefined) el.textContent = text;
  return el;
}

function render_stats(s) {
  const spent = Number(s.total_spent);
  const inventory_value = Number(s.inventory_value);

  const cards = [
    { icon: "fa-wallet", label: "Saldo", value: format_price(s.balance) },
    { icon: "fa-box-open", label: "Caixas abertas", value: s.total_openings },
    { icon: "fa-coins", label: "Total gasto", value: format_price(spent) },
    {
      icon: "fa-backpack",
      label: "Itens no inventário",
      value: s.items_in_inventory,
    },
    {
      icon: "fa-gem",
      label: "Valor do inventário",
      value: format_price(inventory_value),
    },
  ];

  stats_grid.innerHTML = "";
  cards.forEach(({ label, value }) => {
    const card = create_el("article", "stat_card");
    card.append(
      create_el("span", "stat_label", label),
      create_el("strong", "stat_value", value),
    );
    stats_grid.appendChild(card);
  });
}

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

function render_leaderboard(rows) {
  leaderboard_el.innerHTML = "";

  if (rows.length === 0) {
    leaderboard_el.appendChild(
      create_el("li", "empty", "Ninguém no ranking ainda."),
    );
    return;
  }

  let previous = 0;
  rows.forEach((row) => {
    const position = Number(row.rank_pos);

    if (previous && position > previous + 1) {
      leaderboard_el.appendChild(create_el("li", "lb_gap", "⋯"));
    }
    previous = position;

    const li = create_el("li", "lb_row");
    if (row.is_me) li.classList.add("is_me");

    li.append(
      create_el("span", "lb_pos", MEDALS[position] ?? `${position}º`),
      create_el(
        "span",
        "lb_name",
        row.is_me ? `${row.username} (você)` : row.username,
      ),
      create_el("span", "lb_balance", format_price(row.balance)),
    );
    leaderboard_el.appendChild(li);
  });
}

function render_recent(rows) {
  recent_el.innerHTML = "";

  if (rows.length === 0) {
    recent_el.appendChild(
      create_el("li", "empty", "Você ainda não abriu nenhuma caixa."),
    );
    return;
  }

  rows.forEach((row) => {
    const rarity = RARITIES[row.rarity];
    const li = create_el("li", "recent_row");
    li.style.setProperty("--color", rarity?.color ?? "#888");

    const img = create_el("img");
    img.src = row.img || "./img/placeholder.png";
    img.alt = row.name;
    img.addEventListener("error", () => (img.src = "./img/placeholder.png"), {
      once: true,
    });

    const info = create_el("div", "recent_info");
    info.append(
      create_el("span", "recent_name", row.name),
      create_el("small", "recent_date", format_date(row.created_at)),
    );

    // lucro ou prejuízo da abertura: valor do item - custo da caixa
    const diff = Number(row.price) - Number(row.cost);
    const result = create_el(
      "span",
      `recent_diff ${diff >= 0 ? "is_gain" : "is_loss"}`,
      `${diff >= 0 ? "+" : "−"}${format_price(Math.abs(diff))}`,
    );

    li.append(img, info, result);
    recent_el.appendChild(li);
  });
}

try {
  const [stats, board, recent] = await Promise.all([
    get_dashboard_stats(),
    get_leaderboard(10),
    list_recent_openings(5),
  ]);

  render_stats(stats);
  render_leaderboard(board);
  render_recent(recent);
} catch (err) {
  console.error(err);
  message.textContent = "Erro ao carregar o dashboard";
  message.hidden = false;
}
