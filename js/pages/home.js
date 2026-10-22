import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navbar.js";
import { list_cases } from "../services/caseService.js";
import { format_price } from "../utils/format.js";
import { IMAGE_FALLBACK } from "../utils/constants.js";

const session = await require_auth();

if (session) {
  const grid = document.getElementById("cases_grid");
  const status = document.getElementById("status");

  try {
    await mount_navbar();
    const cases = await list_cases();

    status.hidden = true;

    if (cases.length === 0) {
      status.textContent = "Nenhuma caixa disponível.";
      status.hidden = false;
    }

    cases.forEach((c) => grid.appendChild(create_case_card(c)));
  } catch (err) {
    console.error(err);
    status.textContent = "Erro ao carregar as caixas.";
    status.hidden = false;
  }
}

function create_case_card(c) {
  const card = document.createElement("a");
  card.className = "case_card";
  card.href = `case.html?id=${encodeURIComponent(c.id)}`;

  const img = document.createElement("img");
  img.src = c.img || IMAGE_FALLBACK;
  img.alt = c.name;
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });

  const name = document.createElement("h2");
  name.textContent = c.name;

  const price = document.createElement("span");
  price.className = "case_price";
  price.textContent = format_price(c.price);

  card.append(img, name, price);
  return card;
}
