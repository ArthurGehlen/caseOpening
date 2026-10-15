import { require_auth } from "../utils/guard.js";
import { sign_out } from "../services/authService.js";

// por hora só testando o logout e o guard
const session = await require_auth();

if (session) {
  document.getElementById("user_email").textContent = session.user.email;

  document.getElementById("logout_btn").addEventListener("click", async () => {
    await sign_out();
    location.replace("login.html");
  });
}
