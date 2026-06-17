const CACHE_NAME = "iruluka-v1";

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll([
        "./",
        "./iruluka.html",
        "./monsters_merged.json",
        "./manifest.json",
        "./icons/icon-192.png",
        "./icons/icon-512.png"
      ]);

      try {
        const res = await fetch("./monsters_merged.json");
        const monsters = await res.json();

        const images = monsters
          .map(m => m.icon)
          .filter(Boolean);

        await cache.addAll(images);

        console.log("cached images:", images.length);
      } catch (e) {
        console.error(e);
      }
    })()
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request);
    })
  );
});