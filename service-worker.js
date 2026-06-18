const CACHE_NAME = "iruluka-v2"; // バージョン上げる（古いキャッシュ一掃）

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // コアファイルを先にキャッシュ
      await cache.addAll([
        "./",
        "./index.html",
        "./monsters_merged.json",
        "./manifest.json",
        "./icons/icon-192.png",
        "./icons/icon-512.png"
      ]);

      // 画像は1枚失敗してもクラッシュしないよう個別に
      try {
        const res = await cache.match("./monsters_merged.json");
        const monsters = await res.json();
        const images = monsters.map(m => m.icon).filter(Boolean);

        await Promise.allSettled( // addAllではなくallSettled
          images.map(img => cache.add(img).catch(() => {}))
        );
      } catch (e) {
        console.error("画像キャッシュ失敗:", e);
      }

      await self.skipWaiting(); // ← async内の最後に移動！
    })()
  );
});
