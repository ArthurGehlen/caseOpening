import { RARITIES, IMAGE_FALLBACK } from "../utils/constants.js";
import { format_price } from "../utils/format.js";

function el(tag, class_name, text) {
  const node = document.createElement(tag);
  if (class_name) node.className = class_name;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {object} group  { id, name, rarity, img, price, count, inventory_ids }
 * @param {object} handlers
 *   on_sell(inventory_ids): Promise  -> vende no servidor
 *   on_change(): void                -> avisa o modal que o estado mudou
 */
export function create_result_card(group, { on_sell, on_change }) {
  const rarity = RARITIES[group.rarity];
  const total = group.price * group.count;

  const card = el("article", "result_card");
  card.style.setProperty("--color", rarity?.color ?? "#888");

  // imagem e contador na mesma célula do grid (sem position:absolute)
  const figure = el("div", "result_figure");
  const img = el("img", "result_img");
  img.src = group.img || IMAGE_FALLBACK;
  img.alt = group.name;
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });
  figure.append(img);
  if (group.count > 1)
    figure.append(el("span", "result_count", `×${group.count}`));

  const info = el("div", "result_info");
  info.append(
    el("span", "result_rarity", rarity?.label ?? "Desconhecida"),
    el("span", "result_name", group.name),
    el("span", "result_value", format_price(total)),
  );
  if (group.count > 1) {
    info.append(
      el("small", "result_each", `${format_price(group.price)} cada`),
    );
  }

  const status = el("p", "result_status");

  const keep_btn = el("button", "result_btn", "Guardar");
  const sell_btn = el(
    "button",
    "result_btn is_sell",
    `Vender ${format_price(total)}`,
  );
  keep_btn.type = "button";
  sell_btn.type = "button";

  const actions = el("div", "result_actions");
  actions.append(keep_btn, sell_btn);

  const set_busy = (busy) => {
    keep_btn.disabled = busy;
    sell_btn.disabled = busy;
  };

  function settle(class_name, text) {
    card.classList.add(class_name);
    actions.remove();
    status.textContent = text;
    on_change?.();
  }

  keep_btn.addEventListener("click", () => settle("is_kept", "No inventário"));

  sell_btn.addEventListener("click", async () => {
    set_busy(true);
    try {
      await on_sell(group.inventory_ids);
      settle("is_sold", "Vendido");
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao vender.";
      set_busy(false);
    }
  });

  card.append(figure, info, status, actions);

  // usados pelo modal no "Vender tudo"
  card.is_pending = () =>
    !card.classList.contains("is_sold") && !card.classList.contains("is_kept");
  card.mark_sold = () => settle("is_sold", "Vendido");

  return card;
}
