import { sign_up } from "../services/authService.js";
import { redirect_if_logged_in } from "../utils/guard.js";
import { show_message, set_loading } from "../utils/form.js";

await redirect_if_logged_in();

const form = document.getElementById("signup_form");
const message = document.getElementById("form_message");
const submit_btn = document.getElementById("submit_btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  show_message(message, "");

  const data = new FormData(form);
  const username = data.get("username").trim();
  const email = data.get("email").trim();
  const password = data.get("password");
  const confirm = data.get("confirm_password");

  if (password !== confirm) {
    show_message(message, "As senhas não coincidem.");
    return;
  }

  set_loading(submit_btn, true, "Criando conta...");

  try {
    const result = await sign_up({ email, password, username });

    if (result.session) {
      location.replace("home.html");
    } else {
      // confirmação de e-mail ligada no Supabase
      show_message(
        message,
        "Conta criada! Confira seu e-mail para confirmar o cadastro.",
        "success",
      );
      form.reset();
      set_loading(submit_btn, false);
    }
  } catch (err) {
    show_message(message, err.message);
    set_loading(submit_btn, false);
  }
});
