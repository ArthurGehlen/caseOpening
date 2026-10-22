import { RARITIES } from "../utils/constants.js";
import { format_price } from "../utils/format.js";

const IMAGE_FALLBACK = "./img/placeholder.png";

function create_el(tag, class_name, text) {
  const el = document.createElement(tag);
  if (class_name) el.className = class_name;
  if (text) el.textContent = text;
  return el;
}

/**
 * @param {object} item  { inventory_id, name, rarity, img, price }
 * @param {object} handlers
 *   on_sell(item): Promise  -> chama o servidor
 *   on_keep(item): void     -> só fecha o card
 */
export function create_result_card(item, { on_sell, on_keep }) {
  const rarity = RARITIES[item.rarity];

  const wrapper = create_el("article", "result_wrapper");
  wrapper.style.setProperty("--color", rarity?.color ?? "#888");

  const img = create_el("img", "result_img");
  img.src = item.img || IMAGE_FALLBACK;
  img.alt = item.name;
  img.title = item.name;
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });

  const rarity_label = create_el(
    "span",
    "result_rarity",
    rarity?.label ?? "Desconhecida",
  );
  const name = create_el("p", "result_name", item.name);
  const value = create_el("p", "result_value", format_price(item.price));
  const status = create_el("p", "result_status");

  const actions = create_el("div", "result_actions_wrapper");
  const keep_btn = create_el("button", "keep_skin_btn", "Guardar");
  const sell_btn = create_el(
    "button",
    "sell_skin_btn",
    `Vender ${format_price(item.price)}`,
  );
  keep_btn.type = "button";
  sell_btn.type = "button";
  actions.append(keep_btn, sell_btn);

  const set_busy = (busy) => {
    keep_btn.disabled = busy;
    sell_btn.disabled = busy;
  };

  keep_btn.addEventListener("click", () => {
    wrapper.classList.add("is_leaving");
    wrapper.addEventListener("animationend", () => wrapper.remove(), {
      once: true,
    });
    on_keep?.(item);
  });

  sell_btn.addEventListener("click", async () => {
    set_busy(true);
    try {
      await on_sell(item);
      wrapper.classList.add("is_sold");
      actions.remove();
      status.textContent = "Vendido!";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao vender.";
      set_busy(false);
    }
  });

  wrapper.append(img, rarity_label, name, value, status, actions);

  wrapper.mark_sold = () => {
    wrapper.classList.add("is_sold");
    actions.remove();
    status.textContent = "Vendido!";
  };

  wrapper.is_sold = () => wrapper.classList.contains("is_sold");

  return wrapper;
}
