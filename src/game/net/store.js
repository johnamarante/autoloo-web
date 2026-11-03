// Key-value storage with the Cloudflare Worker's API: GET /get?id=,
// POST /set { id, data }, DELETE /delete?id=. A missing key reads as null,
// as FriendpasteClient.GetDataAsync returns it.

export function createWorkerStore(baseUrl, { timeoutMs = 5000, fetchImpl = (...args) => fetch(...args) } = {}) {
  async function call(path, init = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    if (response.status === 404 && (init.method ?? "GET") === "GET") return null;
    if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed with status ${response.status}: ${body}`);
    return body ? JSON.parse(body) : null;
  }
  const id = (key) => encodeURIComponent(key);
  return {
    kind: "worker",
    get: (key) => call(`/get?id=${id(key)}`),
    async set(key, data) {
      await call("/set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: key, data }) });
    },
    async remove(key) {
      await call(`/delete?id=${id(key)}`, { method: "DELETE" });
    },
  };
}

/** Same interface, kept in this browser only. Storage can be unavailable, so every call is guarded. */
export function createLocalStore(prefix = "autoloo.kv.") {
  return {
    kind: "local",
    async get(key) {
      try {
        return JSON.parse(localStorage.getItem(prefix + key) ?? "null");
      } catch {
        return null;
      }
    },
    async set(key, data) {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(data));
      } catch {
        // Best effort.
      }
    },
    async remove(key) {
      try {
        localStorage.removeItem(prefix + key);
      } catch {
        // Nothing to remove.
      }
    },
  };
}
