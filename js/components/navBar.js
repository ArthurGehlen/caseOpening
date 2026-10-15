import { get_profile, claim_bonus } from "../services/profileService.js";
import { sign_out } from "../services/authService.js";
import { format_price } from "../utils/format.js";

const LINKS = [
  { href: "home.html", label: "Caixas" },
  { href: "inventory.html", label: "Inventário" },
  { href: "dashboard.html", label: "Dashboard" },
];

function create_el(tag, class_name, text) {
  const el = document.createElement(tag);
  if (class_name) el.className = class_name;
  if (text !== undefined) el.textContent = text;
  return el;
}

function bonus_available(last_bonus_at) {
  if (!last_bonus_at) return true;
  return Date.now() - new Date(last_bonus_at).getTime() >= 24 * 60 * 60 * 1000;
}

export async function mount_navbar() {
  const profile = await get_profile();

  const nav = create_el("nav", "navbar");
  const inner = create_el("div", "navbar_inner");

  const brand = create_el("a", "navbar_brand", "Case Opening Simulator");
  brand.href = "home.html";

  const links = create_el("div", "navbar_links");
  const current = location.pathname.split("/").pop() || "home.html";
  LINKS.forEach(({ href, label }) => {
    const a = create_el("a", "navbar_link", label);
    a.href = href;
    if (href === current) a.classList.add("is_active");
    links.appendChild(a);
  });

  // lado direito: bônus, saldo, usuário, sair
  const right = create_el("div", "navbar_right");

  const bonus_btn = create_el("button", "navbar_bonus", "Bônus diário");
  bonus_btn.type = "button";
  bonus_btn.hidden = !bonus_available(profile.last_bonus_at);

  const balance = create_el("span", "navbar_balance");
  balance.title = "Seu saldo";

  const balance_icon = create_el("i", "fa-solid fa-wallet");
  balance_icon.setAttribute("aria-hidden", "true");

  const balance_value = create_el(
    "span",
    "navbar_balance_value",
    format_price(profile.balance),
  );
  balance.append(balance_icon, balance_value);

  const user = create_el("span", "navbar_user", profile.username);

  const logout_btn = create_el("button", "navbar_logout");
  logout_btn.type = "button";
  logout_btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Sair';

  right.append(bonus_btn, balance, user, logout_btn);
  inner.append(brand, links, right);
  nav.appendChild(inner);
  document.body.prepend(nav);

  // ações
  bonus_btn.addEventListener("click", async () => {
    bonus_btn.disabled = true;
    try {
      const new_balance = await claim_bonus();
      set_balance(new_balance);
      bonus_btn.hidden = true;
    } catch (err) {
      console.error(err);
      bonus_btn.textContent = "Indisponível";
    }
  });

  logout_btn.addEventListener("click", async () => {
    await sign_out();
    location.replace("login.html");
  });

  function set_balance(value) {
    balance_value.textContent = format_price(value);
    balance.classList.remove("is_pulsing");
    void balance.offsetWidth; // reinicia a animação
    balance.classList.add("is_pulsing");
  }

  return { profile, set_balance };
}
