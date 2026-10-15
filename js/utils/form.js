export function show_message(el, text, type = "error") {
  el.textContent = text;
  el.className = `form_message is_${type}`;
  el.hidden = !text;
}

export function set_loading(button, loading, loading_text = "Aguarde...") {
  if (loading) {
    button.dataset.label = button.textContent;
    button.textContent = loading_text;
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
  button.disabled = loading;
}
