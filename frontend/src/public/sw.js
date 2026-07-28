// 莲花导航 Service Worker
// 静态资源 cache-first；/api、/images 走 network-first（数据要新鲜）
const CACHE_VERSION = 'lotus-nav-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// 打开页面时立即控制的导航请求离线兜底
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isApiOrImages(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/images/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 导航请求：network-first，断网回退离线页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/', copy));
          return resp;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || caches.match(OFFLINE_URL))
    );
    return;
  }

  // /api、/images：network-first，失败回缓存
  if (isApiOrImages(url)) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 其余静态资源（/assets、图标等）：cache-first，后台更新缓存
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
