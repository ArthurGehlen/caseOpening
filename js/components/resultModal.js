import { create_result_card } from "./ResultCard.js";
import { RARITIES } from "../utils/constants.js";
import { format_price } from "../utils/format.js";

const RARITY_ORDER = Object.keys(RARITIES); // do mais comum ao mais raro

function el(tag, class_name, text) {
  const node = document.createElement(tag);
  if (class_name) node.className = class_name;
  if (text !== undefined) node.textContent = text;
  return node;
}

// junta itens iguais: { ...item, count, inventory_ids }
function group_items(items) {
  const groups = new Map();

  items.forEach((item) => {
    const group = groups.get(item.id);
    if (group) {
      group.count += 1;
      group.inventory_ids.push(item.inventory_id);
    } else {
      groups.set(item.id, {
        ...item,
        price: Number(item.price),
        count: 1,
        inventory_ids: [item.inventory_id],
      });
    }
  });

  // mais raro primeiro; dentro da raridade, o mais caro primeiro
  return [...groups.values()].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
      b.price - a.price,
  );
}

export function create_result_modal() {
  const overlay = el("div", "result_overlay");
  overlay.hidden = true;

  const dialog = el("div", "result_dialog");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Resultado da abertura");

  const summary = el("p", "result_summary");
  const cards = el("div", "result_cards");

  const feedback = el("figure", "result_feedback");
  feedback.hidden = true;
  const feedback_img = el("img");
  feedback_img.src = "./assets/result.jpeg";
  feedback_img.alt = "Mineiro desistindo a poucos centímetros dos diamantes";
  feedback_img.addEventListener("error", () => (feedback.hidden = true), {
    once: true,
  });
  feedback.append(
    feedback_img,
    el("figcaption", "", "Não desista, jogue novamente :)"),
  );

  const sell_all_btn = el("button", "result_sell_all");
  sell_all_btn.type = "button";
  sell_all_btn.hidden = true;

  const close_btn = el("button", "result_close", "Fechar");
  close_btn.type = "button";

  const footer = el("div", "result_footer");
  footer.append(sell_all_btn, close_btn);

  dialog.append(summary, cards, feedback, footer);
  overlay.append(dialog);
  document.body.append(overlay);

  let on_close_cb = null;

  // ---------- abrir e fechar ----------
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    cards.replaceChildren();
    feedback.hidden = true;
    sell_all_btn.hidden = true;
    on_close_cb?.();
  }

  close_btn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  /**
   * @param {object[]} items  winners do servidor
   * @param {object} opts
   *   cost: custo total da abertura (para o feedback de derrota)
   *   on_sell(inventory_ids): Promise
   *   on_close(): void
   */
  function open(items, { cost, on_sell, on_close }) {
    on_close_cb = on_close;

    const groups = group_items(items);
    const total_value = items.reduce((sum, i) => sum + Number(i.price), 0);

    summary.textContent = `${items.length} ${items.length === 1 ? "prêmio" : "prêmios"} · ${format_price(total_value)}`;

    // ---------- cards ----------
    const entries = groups.map((group, index) => {
      const card = create_result_card(group, {
        on_sell,
        on_change: refresh_sell_all,
      });
      card.style.setProperty("--i", index); // atraso da animação de entrada
      return { group, card };
    });
    cards.replaceChildren(...entries.map((e) => e.card));

    // ---------- vender tudo ----------
    const pending = () => entries.filter(({ card }) => card.is_pending());

    function refresh_sell_all() {
      const left = pending();

      // só faz sentido com 2 ou mais cards pendentes
      if (left.length < 2) {
        sell_all_btn.hidden = true;
        return;
      }

      const total = left.reduce(
        (sum, { group }) => sum + group.price * group.count,
        0,
      );
      sell_all_btn.textContent = `Vender tudo ${format_price(total)}`;
      sell_all_btn.disabled = false;
      sell_all_btn.hidden = false;
    }

    sell_all_btn.onclick = async () => {
      const left = pending();
      if (left.length < 2) return;

      sell_all_btn.disabled = true;
      try {
        await on_sell(left.flatMap(({ group }) => group.inventory_ids));
        left.forEach(({ card }) => card.mark_sold());
      } catch (err) {
        console.error(err);
        sell_all_btn.textContent = "Erro ao vender";
        sell_all_btn.disabled = false;
      }
    };

    refresh_sell_all();

    feedback.hidden = !(total_value < cost);

    document.body.style.overflow = "hidden"; // trava o scroll da página atrás
    overlay.hidden = false;
    overlay.scrollTop = 0;
  }

  return { open, close };
}
