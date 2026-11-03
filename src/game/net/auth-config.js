// Auth0 settings for browser login. These are public values (they appear in
// every login URL); the browser app has no client secret.
//
// clientId belongs to an Auth0 application of type "Single Page Application",
// separate from the Unity one (set up as in docs/AUTH0_SETUP.md). Without it
// the game offers guest play only. The connection is the database Unity logs in against, so user
// ids, and therefore player records, are shared between the two clients.
export const AUTH0 = {
  domain: "dev-shghx702iga4r13k.us.auth0.com",
  clientId: "7qG4uoseU0fRWwYNlVs1TD8VlEKaQpBa", // "Autoloo Browser" application
  connection: "Username-Password-Authentication",
};
