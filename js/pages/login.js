import { sign_in } from "../services/authService.js";
import { redirect_if_logged_in } from "../utils/guard.js";
import { show_message, set_loading } from "../utils/form.js";

await redirect_if_logged_in();

const form = document.getElementById("login_form");
const message = document.getElementById("form_message");
const submit_btn = document.getElementById("submit_btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  show_message(message, "");
  set_loading(submit_btn, true, "Entrando...");

  const data = new FormData(form);

  try {
    await sign_in({
      email: data.get("email").trim(),
      password: data.get("password"),
    });
    location.replace("home.html");
  } catch (err) {
    show_message(message, err.message);
    set_loading(submit_btn, false);
  }
});
