import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navbar.js";
import {
  get_dashboard_stats,
  get_leaderboard,
  list_recent_openings,
} from "../services/statsService.js";
import { RARITIES } from "../utils/constants.js";
import { format_price, format_date } from "../utils/format.js";

const IMAGE_FALLBACK = "./img/placeholder.png";

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

const signed = (n) => `${n >= 0 ? "+" : "−"}${format_price(Math.abs(n))}`;

function render_summary(s) {
  const balance = Number(s.balance);
  const inventory = Number(s.inventory_value);
  const spent = Number(s.total_spent);
  const openings = Number(s.total_openings);

  $("net_worth").textContent = format_price(balance + inventory);
  $("balance").textContent = format_price(balance);
  $("inventory_value").textContent = format_price(inventory);

  $("split_balance").style.setProperty("--share", balance);
  $("split_inventory").style.setProperty("--share", inventory);

  $("stat_openings").textContent = openings;
  $("stat_spent").textContent = format_price(spent);
  $("stat_average").textContent = format_price(openings ? spent / openings : 0);
  $("stat_items").textContent = s.items_in_inventory;
}

function render_leaderboard(rows) {
  const list = $("leaderboard");
  list.replaceChildren();

  if (rows.length === 0) {
    list.append(el("li", "empty", "Ninguém no ranking ainda."));
    return;
  }

  const top = Math.max(...rows.map((r) => Number(r.balance)), 1);
  let previous = 0;

  rows.forEach((row) => {
    const rank = Number(row.rank_pos);

    if (previous && rank > previous + 1) list.append(el("li", "gap"));
    previous = rank;

    const li = el("li", "row rank_row");
    li.classList.toggle("is_me", row.is_me);
    li.style.setProperty("--pct", `${(Number(row.balance) / top) * 100}%`);

    li.append(
      el("span", "rank_pos", rank),
      el("span", "rank_name", row.username),
      el("span", "rank_value", format_price(row.balance)),
    );

    if (row.is_me)
      li.querySelector(".rank_name").append(el("small", "tag", "você"));
    list.append(li);
  });
}

function render_recent(rows) {
  const list = $("recent");
  list.replaceChildren();

  if (rows.length === 0) {
    list.append(el("li", "empty", "Você ainda não abriu nenhuma caixa."));
    return;
  }

  rows.forEach((row) => {
    const diff = Number(row.price) - Number(row.cost);

    const li = el("li", "row recent_row");
    li.style.setProperty("--color", RARITIES[row.rarity]?.color ?? "#888");

    const img = el("img", "recent_img");
    img.src = row.img || IMAGE_FALLBACK;
    img.alt = "";
    img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
      once: true,
    });

    const info = el("div", "recent_info");
    info.append(
      el("span", "recent_name", row.name),
      el(
        "small",
        "recent_meta",
        `${RARITIES[row.rarity]?.label ?? ""} · ${format_date(row.created_at)}`,
      ),
    );

    li.append(
      el("span", "recent_rail"),
      img,
      info,
      el(
        "span",
        `recent_diff ${diff >= 0 ? "is_gain" : "is_loss"}`,
        signed(diff),
      ),
    );
    list.append(li);
  });
}

try {
  const [stats, board, recent] = await Promise.all([
    get_dashboard_stats(),
    get_leaderboard(10),
    list_recent_openings(6),
  ]);

  render_summary(stats);
  render_leaderboard(board);
  render_recent(recent);
} catch (err) {
  console.error(err);
  const message = $("message");
  message.textContent = "Erro ao carregar o dashboard.";
  message.hidden = false;
}
