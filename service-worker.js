const CACHE_NAME = "iruluka-v5";

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // コアファイルだけ（軽い）
      await cache.addAll([
        "./",
        "./index.html",
        "./monsters_merged.json",
        "./manifest.json",
        "./icons/icon-192.png",
        "./icons/icon-512.png"
      ]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      // 古いキャッシュ削除
      const keys = await caches.keys();
      await Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)));
      await self.clients.claim();

      // ここで画像を少しずつバックグラウンドキャッシュ
      const cache = await caches.open(CACHE_NAME);
      const res = await cache.match("./monsters_merged.json");
      const monsters = await res.json();
      const images = monsters.map(m => m.icon).filter(Boolean);

      const BATCH_SIZE = 20;
      for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(img => cache.add(img).catch(() => {})));
      }
      console.log("画像キャッシュ完了:", images.length);
    })()
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      try {
        return await fetch(event.request);
      } catch (e) {
        // オフラインでキャッシュにもない場合
        // ナビゲーション（ページ遷移）ならindex.htmlを返す
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        // それ以外は空レスポンスで握りつぶす
        return new Response("", { status: 408, statusText: "Offline" });
      }
    })()
  );
});
