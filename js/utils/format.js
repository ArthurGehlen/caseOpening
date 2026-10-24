export const format_price = (value) =>
  Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export const format_date = (iso) =>
  new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

export const format_percent = (value) =>
  `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
