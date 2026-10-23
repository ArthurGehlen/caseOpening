import { get_profile, claim_bonus } from "../services/profileService.js";
import { sign_out } from "../services/authService.js";
import { format_price } from "../utils/format.js";

const NAV_LINKS = [
  { href: "home.html", label: "Caixas" },
  { href: "inventory.html", label: "Inventário" },
  { href: "dashboard.html", label: "Dashboard" },
];

const BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BONUS_SYNC_KEY = "navbar:bonus-claimed";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function read_last_bonus_at(profile) {
  if (!profile) return null;
  const raw =
    profile.last_bonus_at ??
    profile.last_bonus ??
    profile.bonus_claimed_at ??
    profile.last_claim ??
    null;
  if (!raw) return null;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "number") return raw;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

function is_bonus_available(profile) {
  const last = read_last_bonus_at(profile);
  if (last === null) return true;
  return Date.now() - last >= BONUS_COOLDOWN_MS;
}

function initial_of(username) {
  return (username || "?").trim().charAt(0).toUpperCase();
}

export async function mount_navbar() {
  const profile = await get_profile();
  const current = location.pathname.split("/").pop() || "home.html";

  const nav = el("nav", "navbar");

  const inner = el("div", "navbar__inner");

  const brand = el("a", "navbar__brand");
  brand.href = "home.html";
  brand.innerHTML = `<span class="navbar__brand-text">Case Opening Simulator</span>`;

  const links = el("div", "navbar__links");
  NAV_LINKS.forEach(({ href, label }) => {
    const link = el("a", "navbar__link", label);
    link.href = href;
    if (href === current) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
    links.appendChild(link);
  });

  const actions = el("div", "navbar__actions");

  const bonus_btn = el("button", "navbar__bonus");
  bonus_btn.type = "button";
  bonus_btn.innerHTML = `
    <span class="navbar__bonus-dot" aria-hidden="true"></span>
    <span class="navbar__bonus-label">Bônus</span>
  `;
  const bonus_label = bonus_btn.querySelector(".navbar__bonus-label");

  const balance = el("div", "navbar__balance");
  balance.innerHTML = `
    <span class="navbar__balance-label">Saldo</span>
    <span class="navbar__balance-value"></span>
  `;
  const balance_value = balance.querySelector(".navbar__balance-value");
  balance_value.textContent = format_price(profile.balance);

  const user = el("div", "navbar__user");
  user.title = profile.username;
  user.append(
    el("span", "navbar__avatar", initial_of(profile.username)),
    el("span", "navbar__username", profile.username),
  );

  const logout_btn = el("button", "navbar__logout");
  logout_btn.type = "button";
  logout_btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"
         fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  `;

  actions.append(bonus_btn, balance, user, logout_btn);
  inner.append(brand, links, actions);
  nav.appendChild(inner);
  document.body.prepend(nav);

  apply_bonus_state(is_bonus_available(profile));

  function apply_bonus_state(available) {
    bonus_btn.hidden = !available;
    bonus_btn.disabled = false;
    bonus_btn.classList.remove("is-claimed");
    bonus_label.textContent = "Bônus";
  }

  bonus_btn.addEventListener("click", async () => {
    if (bonus_btn.disabled) return;
    bonus_btn.disabled = true;
    bonus_label.textContent = "Resgatando…";

    try {
      const result = await claim_bonus();

      const new_balance =
        typeof result === "number"
          ? result
          : (result?.balance ?? result?.profile?.balance);
      if (typeof new_balance === "number") set_balance(new_balance);

      bonus_btn.classList.add("is-claimed");
      bonus_label.textContent = "Resgatado";

      try {
        localStorage.setItem(
          BONUS_SYNC_KEY,
          JSON.stringify({ at: Date.now() }),
        );
      } catch {}

      setTimeout(() => {
        bonus_btn.hidden = true;
      }, 900);
    } catch (err) {
      console.error("[navbar] claim_bonus falhou:", err);
      bonus_btn.disabled = false;
      bonus_label.textContent = "Indisponível";

      // Revalida com o servidor: talvez o bônus já tenha sido resgatado
      // em outra sessão/aba e o botão não deveria mais aparecer
      try {
        const fresh = await get_profile();
        apply_bonus_state(is_bonus_available(fresh));
        if (typeof fresh?.balance === "number") set_balance(fresh.balance);
      } catch {}
    }
  });

  logout_btn.addEventListener("click", async () => {
    await sign_out();
    location.replace("login.html");
  });

  window.addEventListener("storage", (e) => {
    if (e.key !== BONUS_SYNC_KEY) return;
    // outra aba resgatou, esconde o botão aqui também
    apply_bonus_state(false);
    setTimeout(() => {
      bonus_btn.hidden = true;
    }, 0);
    get_profile()
      .then((p) => {
        if (typeof p?.balance === "number") set_balance(p.balance);
      })
      .catch(() => {});
  });

  function set_balance(value) {
    balance_value.textContent = format_price(value);
    balance_value.classList.remove("is-updated");
    void balance_value.offsetWidth;
    balance_value.classList.add("is-updated");
  }

  return { profile, set_balance };
}
