import { supabase } from "../supabaseClient.js";

const ERROR_MESSAGES = {
  invalid_credentials: "E-mail ou senha incorretos.",
  user_already_exists: "Já existe uma conta com esse e-mail.",
  email_exists: "Já existe uma conta com esse e-mail.",
  weak_password: "Senha fraca. Use pelo menos 6 caracteres.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  over_request_rate_limit: "Muitas tentativas. Aguarde um pouco.",
  over_email_send_rate_limit: "Muitos e-mails enviados. Aguarde um pouco.",
  validation_failed: "Dados inválidos. Confira os campos.",
};

// Converte o erro do Supabase em uma mensagem amigável
function friendly(error) {
  const message =
    ERROR_MESSAGES[error.code] ?? "Algo deu errado. Tente novamente.";
  const err = new Error(message);
  err.original = error;
  return err;
}

export async function sign_up({ email, password, username }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw friendly(error);
  return data;
}

export async function sign_in({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw friendly(error);
  return data;
}

export async function sign_out() {
  const { error } = await supabase.auth.signOut();
  if (error) throw friendly(error);
}

export async function get_session() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
