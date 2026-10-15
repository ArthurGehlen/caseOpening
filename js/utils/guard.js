import { get_session } from "../services/authService.js";

export async function require_auth(redirect_to = "login.html") {
  const session = await get_session();
  if (!session) {
    location.replace(redirect_to);
    return null;
  }
  return session;
}

export async function redirect_if_logged_in(redirect_to = "home.html") {
  const session = await get_session();
  if (session) location.replace(redirect_to);
  return session;
}
