// Auth0 login from the game's own form, the way the Unity build logs in: the
// email and password go straight to Auth0's token endpoint (the password-realm
// grant, against the same Username-Password-Authentication database), and
// sign-up and password resets use Auth0's database endpoints. No Auth0 page is
// shown. The game only needs to know who the player is (the ID token's user id
// and email), so no access token is kept, and the session lasts until the
// player logs out.
import { AUTH0 } from "./auth-config.js";

const SESSION_KEY = "autoloo.auth.v1";
const PASSWORD_REALM = "http://auth0.com/oauth/grant-type/password-realm";

export const authConfigured = () => Boolean(AUTH0.domain && AUTH0.clientId);

export function currentSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    return session?.userId ? session : null;
  } catch {
    return null;
  }
}

/** Logs in; throws an Error carrying Auth0's own message when it refuses. */
export async function loginWithPassword(email, password) {
  const tokens = await post("/oauth/token", {
    grant_type: PASSWORD_REALM,
    client_id: AUTH0.clientId,
    realm: AUTH0.connection,
    username: email.trim(),
    password,
    scope: "openid email",
  });
  const claims = decodeJwt(tokens.id_token);
  if (claims.aud !== AUTH0.clientId || claims.iss !== `https://${AUTH0.domain}/`) {
    throw new Error("The login response was not for this game.");
  }
  const session = { userId: claims.sub, email: claims.email ?? email.trim() };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Without storage the player stays logged in until the page closes.
  }
  return session;
}

/** Creates the account (as Unity's RegisterUser does), then logs in. */
export async function signUp(email, password) {
  await post("/dbconnections/signup", {
    client_id: AUTH0.clientId,
    connection: AUTH0.connection,
    email: email.trim(),
    password,
  });
  return loginWithPassword(email, password);
}

/** Sends Auth0's password reset email; returns its confirmation text. */
export async function resetPassword(email) {
  const reply = await post("/dbconnections/change_password", {
    client_id: AUTH0.clientId,
    connection: AUTH0.connection,
    email: email.trim(),
  });
  return typeof reply === "string" ? reply : "Password reset instructions sent to that email address.";
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
}

async function post(path, body) {
  let response;
  try {
    response = await fetch(`https://${AUTH0.domain}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the login server. Check your connection and try again.");
  }
  const text = await response.text();
  let reply;
  try {
    reply = JSON.parse(text);
  } catch {
    reply = text;
  }
  if (!response.ok) throw new Error(auth0Message(reply, response.status));
  return reply;
}

/** Auth0's own wording: error_description from /oauth/token, description from the database endpoints. */
function auth0Message(reply, status) {
  if (typeof reply === "string" && reply) return reply;
  if (reply?.error_description) return reply.error_description;
  const description = reply?.description;
  if (typeof description === "string") return description;
  // A password that fails the database's password policy comes back as a list of rules.
  if (description?.rules) {
    const unmet = description.rules.filter((rule) => !rule.verified);
    const lines = unmet.map((rule) => rule.message.replace(/%d/g, () => rule.format?.shift?.() ?? ""));
    return `Password is too weak. ${lines.join(" ")}`.trim();
  }
  return reply?.message ?? reply?.error ?? `The login server answered with status ${status}.`;
}

/** The token comes straight from Auth0's token endpoint over HTTPS, so its claims are read without checking the signature. */
function decodeJwt(token) {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent([...atob(payload)].map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  return JSON.parse(json);
}
