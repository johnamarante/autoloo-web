// Auth0 login through its hosted login page: the authorization code flow with
// PKCE, which is what a browser app without a secret uses. The game only needs
// to know who the player is (the ID token's user id and email), so no access
// token is kept, and the session lasts until the player logs out.
import { AUTH0 } from "./auth-config.js";

const SESSION_KEY = "autoloo.auth.v1";
const PENDING_KEY = "autoloo.auth.pending";

export const authConfigured = () => Boolean(AUTH0.domain && AUTH0.clientId);

/** The page Auth0 sends the player back to; it must be in the app's allowed callback and logout URLs. */
export const callbackUrl = (location = window.location) => `${location.origin}${location.pathname}`;

export function currentSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    return session?.userId ? session : null;
  } catch {
    return null;
  }
}

/** Sends the player to Auth0's login page (or its sign-up page). */
export async function login({ signup = false } = {}) {
  const verifier = randomString(32);
  const state = randomString(16);
  const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const redirectUri = callbackUrl();
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state, redirectUri, search: window.location.search }));
  const params = new URLSearchParams({
    response_type: "code",
    client_id: AUTH0.clientId,
    redirect_uri: redirectUri,
    scope: "openid email",
    connection: AUTH0.connection,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  if (signup) params.set("screen_hint", "signup");
  window.location.assign(`https://${AUTH0.domain}/authorize?${params}`);
}

/**
 * On the way back from Auth0: swaps the code for an ID token and starts the
 * session. Returns { session } or { error }, or null when this page load is
 * not a login callback.
 */
export async function handleLoginRedirect() {
  const query = new URLSearchParams(window.location.search);
  if (!query.has("state") || !(query.has("code") || query.has("error"))) return null;

  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Treated as an unexpected callback below.
  }
  // Put the address back as it was before the login, without the code.
  window.history.replaceState(null, "", `${window.location.pathname}${pending?.search ?? ""}`);

  if (query.has("error")) return { error: query.get("error_description") || query.get("error") };
  if (!pending || pending.state !== query.get("state")) return { error: "The login could not be completed. Please try again." };

  try {
    const response = await fetch(`https://${AUTH0.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: AUTH0.clientId,
        code_verifier: pending.verifier,
        code: query.get("code"),
        redirect_uri: pending.redirectUri,
      }),
    });
    const tokens = await response.json();
    if (!response.ok) return { error: tokens.error_description || "The login could not be completed." };
    const claims = decodeJwt(tokens.id_token);
    if (claims.aud !== AUTH0.clientId || claims.iss !== `https://${AUTH0.domain}/`) return { error: "The login response was not for this game." };
    const session = { userId: claims.sub, email: claims.email ?? "" };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { session };
  } catch (err) {
    console.warn("Login failed.", err);
    return { error: "Could not reach the login server." };
  }
}

/** Ends the session here and at Auth0, then comes back to this page. */
export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
  const params = new URLSearchParams({ client_id: AUTH0.clientId, returnTo: callbackUrl() });
  window.location.assign(`https://${AUTH0.domain}/v2/logout?${params}`);
}

function randomString(bytes) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function base64url(buffer) {
  const text = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The token comes straight from Auth0's token endpoint over HTTPS, so its claims are read without checking the signature. */
function decodeJwt(token) {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent([...atob(payload)].map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  return JSON.parse(json);
}
