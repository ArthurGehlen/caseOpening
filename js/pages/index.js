import { get_session } from "../services/authService.js";

const session = await get_session();
location.replace(session ? "/pages/home.html" : "/pages/login.html");
