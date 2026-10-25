import { require_auth } from "../utils/guard.js";
import { mount_navbar } from "../components/navbar.js";
import {
  list_market_items,
  list_price_history,
  list_item_cases,
} from "../services/marketService.js";
import { RARITIES } from "../utils/constants.js";
import { format_price } from "../utils/format.js";

const IMAGE_FALLBACK = "./img/placeholder.png";
const RARITY_ORDER = Object.keys(RARITIES); // do mais comum ao mais raro
const HISTORY_DAYS = 90;
const DAY = 86400;
const BAND = 0.2;

// preferência de movimento: o CSS desliga animações pela classe
const reduce_motion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
document.documentElement.classList.toggle("reduce_motion", reduce_motion);

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

const pct_fmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const idx_fmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const is_flat = (n) => n == null || Math.abs(n) < 0.005;
const tone = (n) => (is_flat(n) ? "is_flat" : n > 0 ? "is_up" : "is_down");

function signed_pct(n) {
  if (n == null) return "–";
  if (is_flat(n)) return "0,00%";
  return `${n > 0 ? "+" : "−"}${pct_fmt.format(Math.abs(n))}%`;
}

const fmt_day = (t) =>
  new Date(t * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmt_stamp = (t) =>
  new Date(t * 1000).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const css_var = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
  fallback;

function with_alpha(color, alpha) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function count_up(node, to, fmt) {
  if (reduce_motion) {
    node.textContent = fmt(to);
    return;
  }
  const from = to * 0.85;
  const start = performance.now();
  const duration = 700;

  const tick = (now) => {
    const k = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(from + (to - from) * eased);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function set_pressed(group, value) {
  group.querySelectorAll("button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.value === String(value)));
  });
}

function build_series(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const t = Math.floor(new Date(r.recorded_at).getTime() / 1000);
    const v = Number(r.price);
    const points = map.get(r.item_id) ?? [];
    const last = points.at(-1);
    if (last && last.t === t) last.v = v;
    else points.push({ t, v });
    map.set(r.item_id, points);
  });
  return map;
}

// índice: média de (preço / âncora) de todos os itens, em cada instante
function build_index(items, series_map) {
  const base = new Map(items.map((i) => [i.id, i.base_price]));
  const buckets = new Map();

  series_map.forEach((points, id) => {
    const b = base.get(id);
    if (!b) return;
    points.forEach((p) => {
      const entry = buckets.get(p.t) ?? { sum: 0, n: 0 };
      entry.sum += (p.v / b) * 100;
      entry.n += 1;
      buckets.set(p.t, entry);
    });
  });

  return [...buckets]
    .sort((a, b) => a[0] - b[0])
    .map(([t, e]) => ({ t, v: e.sum / e.n }));
}

// variação percentual do último ponto contra o de N dias antes
function change_over(points, days) {
  if (points.length < 2) return null;
  const last = points.at(-1);
  const target = last.t - days * DAY + 3600; // tolerância de 1h
  let ref = points[0];
  for (let i = points.length - 2; i >= 0; i--) {
    if (points[i].t <= target) {
      ref = points[i];
      break;
    }
  }
  return (last.v / ref.v - 1) * 100;
}

function slice_range(points, days) {
  if (points.length < 3) return points;
  const from = points.at(-1).t - days * DAY;
  const win = points.filter((p) => p.t >= from);
  return win.length >= 2 ? win : points.slice(-2);
}

function sparkline(points, days) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 32");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("class", "spark");
  svg.setAttribute("aria-hidden", "true");

  const win = slice_range(points, days);
  if (win.length < 2) return svg;

  const values = win.map((p) => p.v);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;

  const d = win
    .map((p, i) => {
      const x = (i / (win.length - 1)) * 100;
      const y = 30 - ((p.v - min) / span) * 28;
      return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(path);
  return svg;
}

const state = {
  selected: null,
  range: 30,
  period: 1,
  query: "",
  rarity: "all",
  sort: "gain",
};

let items = [];
let items_by_id = new Map();
let index_series = [];
let item_cases = new Map();
let chart_pts = [];

async function load() {
  const [raw_items, history, cases] = await Promise.all([
    list_market_items(),
    list_price_history(HISTORY_DAYS),
    list_item_cases().catch(() => new Map()),
  ]);

  const now = Math.floor(Date.now() / 1000);
  const series = build_series(history);

  items = raw_items.map((i) => {
    const points = series.get(i.id) ?? [];
    if (points.length === 0 || points.at(-1).v !== i.price)
      points.push({ t: now, v: i.price });
    series.set(i.id, points);
    return { ...i, series: points, change: null };
  });

  items_by_id = new Map(items.map((i) => [i.id, i]));
  item_cases = cases;
  index_series = build_index(items, series);

  if (index_series.length === 0) {
    const avg =
      items.reduce((s, i) => s + (i.price / i.base_price) * 100, 0) /
      (items.length || 1);
    index_series = [{ t: now, v: avg }];
  }
}

function recompute_changes() {
  items.forEach((i) => {
    i.change = change_over(i.series, state.period);
  });
}

function render_hero() {
  const last = index_series.at(-1);
  const change = change_over(index_series, 1);

  count_up($("index_value"), last.v, (v) => idx_fmt.format(v));

  const sub = $("index_sub");
  sub.replaceChildren(
    el("span", tone(change), `${signed_pct(change)} em 24h`),
    document.createTextNode(
      ` · ${items.length} itens · atualizado em ${fmt_stamp(last.t)}`,
    ),
  );

  const daily = items.map((i) => change_over(i.series, 1));
  const up = daily.filter((c) => !is_flat(c) && c > 0).length;
  const down = daily.filter((c) => !is_flat(c) && c < 0).length;
  const flat = daily.length - up - down;

  const bar = $("breadth");
  const legend = $("breadth_legend");
  bar.replaceChildren();
  legend.replaceChildren();

  [
    ["Em alta", up, "var(--success)"],
    ["Estável", flat, "var(--muted)"],
    ["Em queda", down, "var(--danger)"],
  ].forEach(([label, count, color]) => {
    if (count > 0) {
      const part = el("span", "composition_part");
      part.style.setProperty("--share", count);
      part.style.setProperty("--color", color);
      bar.append(part);
    }
    const entry = el("div", "legend_item");
    entry.style.setProperty("--tone", color);
    entry.append(el("dt", "", label), el("dd", "", count));
    legend.append(entry);
  });
}

function create_stat(label, value, { note, tone_class } = {}) {
  const box = el("div", "stat");
  const dd = el("dd", tone_class ?? "", value);
  box.append(el("dt", "", label), dd);
  if (note) box.append(el("small", "stat_note", note));
  return box;
}

function render_movers() {
  const withdata = items
    .map((i) => ({ item: i, change: change_over(i.series, 1) }))
    .filter((r) => r.change != null);

  const best = withdata.reduce(
    (a, b) => (b.change > (a?.change ?? -Infinity) ? b : a),
    null,
  );
  const worst = withdata.reduce(
    (a, b) => (b.change < (a?.change ?? Infinity) ? b : a),
    null,
  );
  const priciest = items.reduce(
    (a, b) => (b.price > (a?.price ?? -Infinity) ? b : a),
    null,
  );
  const average = withdata.length
    ? withdata.reduce((s, r) => s + r.change, 0) / withdata.length
    : null;

  $("movers").replaceChildren(
    create_stat("Maior alta · 24h", best ? signed_pct(best.change) : "–", {
      note: best?.item.name,
      tone_class: best ? tone(best.change) : "",
    }),
    create_stat("Maior queda · 24h", worst ? signed_pct(worst.change) : "–", {
      note: worst?.item.name,
      tone_class: worst ? tone(worst.change) : "",
    }),
    create_stat(
      "Item mais caro",
      priciest ? format_price(priciest.price) : "–",
      {
        note: priciest?.name,
      },
    ),
    create_stat("Variação média · 24h", signed_pct(average), {
      tone_class: tone(average),
    }),
  );
}

let chart = null;
let area = null;
let base_line = null;

function init_chart() {
  const lib = window.LightweightCharts;
  const holder = $("chart");

  if (!lib) {
    holder.textContent = "Gráfico indisponível: a biblioteca não carregou.";
    return;
  }

  const muted = css_var("--muted", "#9aa3b5");
  const grid = with_alpha(css_var("--text", "#ffffff"), 0.08);

  chart = lib.createChart(holder, {
    autoSize: true,
    layout: {
      background: { type: "solid", color: "transparent" },
      textColor: muted,
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: 12,
    },
    grid: { vertLines: { visible: false }, horzLines: { color: grid } },
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.14, bottom: 0.08 },
    },
    timeScale: {
      borderVisible: false,
      timeVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
    },
    crosshair: {
      mode: lib.CrosshairMode.Magnet,
      vertLine: { color: with_alpha(muted, 0.6), labelVisible: false },
      horzLine: { visible: false, labelVisible: false },
    },
    // a página continua rolando normalmente no celular
    handleScroll: false,
    handleScale: false,
    localization: { locale: "pt-BR" },
  });

  area = chart.addAreaSeries({
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerRadius: 4,
  });

  chart.subscribeCrosshairMove((param) => {
    const point =
      param.time !== undefined ? param.seriesData.get(area) : undefined;
    if (!point) {
      show_latest();
      return;
    }
    set_readout(point.value, param.time);
  });
}

function draw_chart(item) {
  if (!chart) return;

  const up = chart_pts.length < 2 || chart_pts.at(-1).v >= chart_pts[0].v;
  const color = up
    ? css_var("--success", "#3ba55d")
    : css_var("--danger", "#f26767");

  area.applyOptions({
    lineColor: color,
    topColor: with_alpha(color, 0.28),
    bottomColor: with_alpha(color, 0),
    priceFormat: item
      ? { type: "custom", formatter: (v) => format_price(v), minMove: 0.01 }
      : { type: "custom", formatter: (v) => idx_fmt.format(v), minMove: 0.1 },
  });

  area.setData(chart_pts.map((p) => ({ time: p.t, value: p.v })));

  if (base_line) area.removePriceLine(base_line);
  base_line = area.createPriceLine({
    price: item ? item.base_price : 100,
    color: with_alpha(css_var("--muted", "#9aa3b5"), 0.8),
    lineWidth: 1,
    lineStyle: window.LightweightCharts.LineStyle.Dashed,
    axisLabelVisible: false,
    title: item ? "âncora" : "base",
  });

  chart.timeScale().fitContent();
}

function set_readout(value, t) {
  const start = chart_pts[0]?.v;
  const change = start ? (value / start - 1) * 100 : null;

  $("readout_value").textContent = state.selected
    ? format_price(value)
    : idx_fmt.format(value);
  $("readout_date").textContent = fmt_day(t);

  const node = $("readout_change");
  node.textContent = change == null ? "" : `${signed_pct(change)} no período`;
  node.className = `readout_change ${tone(change)}`;
}

function show_latest() {
  const last = chart_pts.at(-1);
  if (last) set_readout(last.v, last.t);
}

function render_detail_stats(item) {
  const values = chart_pts.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const label = (text) => `${text} · ${state.range}d`;

  const stats = item
    ? [
        create_stat("Preço atual", format_price(item.price)),
        create_stat("Âncora", format_price(item.base_price)),
        create_stat(label("Mínimo"), format_price(min)),
        create_stat(label("Máximo"), format_price(max)),
      ]
    : [
        create_stat("Índice atual", idx_fmt.format(index_series.at(-1).v)),
        create_stat(label("Mínimo"), idx_fmt.format(min)),
        create_stat(label("Máximo"), idx_fmt.format(max)),
      ];

  $("detail_stats").replaceChildren(...stats);
}

function render_gauge(item) {
  $("gauge_wrap").hidden = !item;
  if (!item) return;

  const ratio = item.price / item.base_price;
  const distance = (ratio - 1) * 100;
  const pos = Math.max(0, Math.min(1, (ratio - (1 - BAND)) / (2 * BAND))) * 100;

  $("gauge_marker").style.setProperty("--pos", pos.toFixed(1));

  const label = $("gauge_label");
  label.textContent = `${signed_pct(distance)} da âncora`;
  label.className = tone(distance);
}

function render_cases(item) {
  const list = item ? (item_cases.get(item.id) ?? []) : [];
  $("cases_wrap").hidden = list.length === 0;

  $("detail_cases").replaceChildren(
    ...list.map((c) => {
      const li = el("li");
      const link = el("a", "", c.name);
      link.href = `case.html?id=${encodeURIComponent(c.id)}`;
      li.append(link);
      return li;
    }),
  );
}

function update_detail() {
  const item = state.selected ? items_by_id.get(state.selected) : null;
  const rarity = item ? RARITIES[item.rarity] : null;

  $("detail_title").textContent = item ? item.name : "Índice do mercado";

  const kicker = $("detail_kicker");
  kicker.textContent = item
    ? (rarity?.label ?? "Item")
    : "Todos os itens · base 100";
  kicker.style.color = rarity?.color ?? "";

  const img = $("detail_img");
  img.hidden = !item;
  if (item) {
    img.src = item.img || IMAGE_FALLBACK;
    img.alt = item.name;
  }
  $("detail_reset").hidden = !item;

  chart_pts = slice_range(item ? item.series : index_series, state.range);
  draw_chart(item);
  show_latest();
  render_detail_stats(item);
  render_gauge(item);
  render_cases(item);
}

function select(id, { scroll = false } = {}) {
  state.selected = id;

  $("list")
    .querySelectorAll(".mk_row")
    .forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.id === id));
    });

  update_detail();

  try {
    const url = id
      ? `#${encodeURIComponent(id)}`
      : location.pathname + location.search;
    history.replaceState(null, "", url);
  } catch {}

  if (scroll) {
    const rect = $("detail").getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight) {
      $("detail").scrollIntoView({
        behavior: reduce_motion ? "auto" : "smooth",
        block: "start",
      });
    }
  }
}

const SORTERS = {
  gain: (a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity),
  loss: (a, b) => (a.change ?? Infinity) - (b.change ?? Infinity),
  price_desc: (a, b) => b.price - a.price,
  price_asc: (a, b) => a.price - b.price,
  rarity: (a, b) =>
    RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
    b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
};

function get_visible() {
  const query = state.query.trim().toLowerCase();
  return items
    .filter(
      (i) =>
        (state.rarity === "all" || i.rarity === state.rarity) &&
        (!query || i.name.toLowerCase().includes(query)),
    )
    .sort(SORTERS[state.sort]);
}

function create_row(item, index, animate) {
  const rarity = RARITIES[item.rarity];

  const li = el("li", "mk_item");
  if (animate) {
    li.classList.add("is_enter");
    li.style.setProperty("--i", index);
  }

  const button = el("button", "mk_row");
  button.type = "button";
  button.dataset.id = item.id;
  button.style.setProperty("--color", rarity?.color ?? "#888");
  button.setAttribute("aria-pressed", String(item.id === state.selected));

  const img = el("img", "mk_img");
  img.src = item.img || IMAGE_FALLBACK;
  img.alt = "";
  img.loading = "lazy";
  img.addEventListener("error", () => (img.src = IMAGE_FALLBACK), {
    once: true,
  });

  const info = el("span", "mk_info");
  info.append(
    el("span", "mk_name", item.name),
    el(
      "small",
      "mk_meta",
      `${rarity?.label ?? ""} · âncora ${format_price(item.base_price)}`,
    ),
  );

  const spark = el("span", `mk_spark ${tone(item.change)}`);
  spark.append(sparkline(item.series, state.period === 1 ? 7 : state.period));

  const figures = el("span", "mk_figures");
  figures.append(
    el("strong", "mk_price", format_price(item.price)),
    el("small", `mk_change ${tone(item.change)}`, signed_pct(item.change)),
  );

  button.append(el("span", "mk_rail"), img, info, spark, figures);
  button.addEventListener("click", () =>
    select(state.selected === item.id ? null : item.id, { scroll: true }),
  );

  li.append(button);
  return li;
}

function render_list(animate = false) {
  const visible = get_visible();
  $("list").replaceChildren(
    ...visible.map((item, i) => create_row(item, i, animate)),
  );

  const status = $("status");
  status.hidden = visible.length > 0;
  status.textContent = "Nenhum item encontrado.";
}

function render_chips() {
  const chips = $("chips");
  chips.replaceChildren();

  const options = [
    { key: "all", label: "Todos", color: null, count: items.length },
    ...RARITY_ORDER.map((key) => ({
      key,
      label: RARITIES[key].label,
      color: RARITIES[key].color,
      count: items.filter((i) => i.rarity === key).length,
    })),
  ].filter((o) => o.key === "all" || o.count > 0);

  options.forEach(({ key, label, color, count }) => {
    const chip = el("button", "chip");
    chip.type = "button";
    chip.setAttribute("aria-pressed", String(key === state.rarity));
    if (color) chip.style.setProperty("--color", color);
    chip.append(el("span", "", label), el("small", "chip_count", count));
    chip.addEventListener("click", () => {
      state.rarity = key;
      render_chips();
      render_list();
    });
    chips.append(chip);
  });
}

$("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  render_list();
});

$("sort_by").addEventListener("change", (e) => {
  state.sort = e.target.value;
  render_list();
});

$("periods").addEventListener("click", (e) => {
  const button = e.target.closest("button[data-value]");
  if (!button) return;
  state.period = Number(button.dataset.value);
  set_pressed($("periods"), state.period);
  recompute_changes();
  render_list();
});

$("ranges").addEventListener("click", (e) => {
  const button = e.target.closest("button[data-value]");
  if (!button) return;
  state.range = Number(button.dataset.value);
  set_pressed($("ranges"), state.range);
  update_detail();
});

$("detail_reset").addEventListener("click", () => select(null));

try {
  await load();
  recompute_changes();

  init_chart();
  render_hero();
  render_movers();
  render_chips();
  render_list(true);

  try {
    const initial = decodeURIComponent(location.hash.slice(1));
    if (items_by_id.has(initial)) state.selected = initial;
  } catch {}

  select(state.selected);
} catch (err) {
  console.error(err);
  $("message").textContent = "Erro ao carregar o mercado.";
  $("message").hidden = false;
}
