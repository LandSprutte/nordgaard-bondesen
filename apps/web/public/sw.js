/*
 * Service worker for Tjansetogt. Keeps it simple and safe:
 * - Built files under /assets/ have a hash in their name, so they're cached
 *   forever once fetched (fast start, works on a flaky connection).
 * - Icons and the offline page are cached up front.
 * - Pages always come from the network, so nobody sees someone else's or
 *   stale family data. Without a connection, the offline page is shown.
 * - Server calls and everything else are never cached.
 */
const VERSION = "v1"
const STATIC = `tjansetogt-static-${VERSION}`
const ASSETS = `tjansetogt-assets-${VERSION}`
const PRECACHE = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC && k !== ASSETS)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")))
    return
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit ?? fetch(request))
    )
  }
})
