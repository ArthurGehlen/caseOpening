import { create_result_card } from "./ResultCard.js";

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

  overlay.append(cards, total_amount, close_btn);
  document.body.appendChild(overlay);

  let on_close_cb = null;

  function close() {
    overlay.hidden = true;
    cards.innerHTML = "";
    feedback.hidden = true;
    on_close_cb?.();
  }

  close_btn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  function open(items, { cost, on_sell, on_close }) {
    on_close_cb = on_close;
    cards.innerHTML = "";

    items.forEach((item) => {
      cards.appendChild(
        create_result_card(item, { on_sell, on_keep: () => { } }),
      );
    });

    const total_value = items.reduce((sum, w) => sum + Number(w.price), 0);
    total_amount.textContent = `Lucro: R$ ${total_value}`;
    total_value < cost ? total_amount.classList.toggle("negative_amount") : total_amount.classList.toggle("positive_amount")
    feedback.hidden = !(total_value < cost);

    overlay.hidden = false;
  }

  return { open, close };
}
