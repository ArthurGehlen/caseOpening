import { create_result_card } from "./ResultCard.js";
import { format_price } from "../utils/format.js";

export function create_result_modal() {
  const overlay = document.createElement("div");
  overlay.className = "result_overlay";
  overlay.hidden = true;

  const cards = document.createElement("div");
  cards.className = "result_cards";

  const feedback = document.createElement("figure");
  feedback.className = "result_feedback";
  feedback.hidden = true;

  const feedback_img = document.createElement("img");
  feedback_img.src = "./assets/result.jpeg";
  feedback_img.alt = "JOGUE NOVAMENTE";
  feedback_img.addEventListener("error", () => (feedback.hidden = true), {
    once: true,
  });

  const feedback_caption = document.createElement("figcaption");
  feedback_caption.textContent = "Não desista, jogue novamente :)";

  feedback.append(feedback_img, feedback_caption);

  const total_amount = document.createElement("p");
  total_amount.classList.add("total_amount");

  const close_btn = document.createElement("button");
  close_btn.type = "button";
  close_btn.className = "result_close";
  close_btn.textContent = "Fechar";

  const sell_all_btn = document.createElement("button");
  sell_all_btn.type = "button";
  sell_all_btn.className = "result_sell_all";

  const footer = document.createElement("div");
  footer.className = "result_footer";
  footer.append(sell_all_btn, close_btn);

  overlay.append(cards, feedback, footer);
  document.body.appendChild(overlay);

  let on_close_cb = null;

  function close() {
    overlay.hidden = true;
    cards.innerHTML = "";
    feedback.hidden = true;
    sell_all_btn.hidden = true;
    on_close_cb?.();
  }

  close_btn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  function open(items, { cost, on_sell, on_sell_all, on_close }) {
    on_close_cb = on_close;
    cards.innerHTML = "";

    const entries = items.map((item) => {
      const el = create_result_card(item, {
        on_sell: async (it) => {
          await on_sell(it);
          refresh_sell_all();
        },
        on_keep: () => refresh_sell_all(),
      });
      cards.appendChild(el);
      return { item, el };
    });

    const pending = () => entries.filter(({ el }) => el.is_pending());

    function refresh_sell_all() {
      const left = pending();

      // "Vender tudo" só faz sentido com 2 ou mais itens pendentes
      if (left.length < 2) {
        sell_all_btn.hidden = true;
        return;
      }

      const total = left.reduce((sum, { item }) => sum + Number(item.price), 0);
      sell_all_btn.textContent = `Vender tudo ${format_price(total)}`;
      sell_all_btn.hidden = false;
      sell_all_btn.disabled = false;
    }

    sell_all_btn.onclick = async () => {
      const left = pending();
      if (left.length < 2) return;

      sell_all_btn.disabled = true;
      try {
        await on_sell_all(left.map(({ item }) => item));
        left.forEach(({ el }) => el.mark_sold());
        refresh_sell_all();
      } catch (err) {
        console.error(err);
        sell_all_btn.textContent = "Erro ao vender";
        sell_all_btn.disabled = false;
      }
    };

    refresh_sell_all(); // já decide se mostra ou não

    const total_value = items.reduce((sum, w) => sum + Number(w.price), 0);
    feedback.hidden = !(total_value < cost);

    overlay.hidden = false;
  }

  return { open, close };
}
