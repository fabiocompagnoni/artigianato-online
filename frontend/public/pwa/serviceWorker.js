const CACHE_NAME = 'app-cache-v1.0.1';
const urlsToCache = (() => {
    const baseUrl = self.location.origin;
    const urls = [
        '/',
        '/prodotti',
        '/artigiani',
        '/accedi',
        '/registrati',
        '/carrello',
        '/clienti/area-riservata',
        '/artigiani/area-riservata',
        '/admin/area-riservata',
        '/src/js/modules/cart.js',
        '/src/js/modules/fetchWorkerModule.js',
        '/src/js/modules/loadImageModule.js',
        '/src/js/modules/productQuantitySelector.js',
        '/src/js/worker/jsonResolver.js',
        '/src/js/worker/mediaServiceWorker.js',
        '/src/js/artisans.js',
        '/src/js/cartFrontEnd.js',
        '/src/js/home.js',
        '/src/js/login.js',
        '/src/js/product.js',
        '/src/js/products.js',
        '/src/components/index.js',
        '/src/components/navbar.js',
        '/src/components/footer.js',
        '/src/css/root.css',
        '/src/css/home.css',
        '/src/css/artigiani.css',
        '/src/css/carrello.css',
        '/src/css/login.css',
        '/src/css/navbar.css',
        '/src/css/prodotti.css',
        '/src/css/prodotto.css',
        '/src/img/logo_orizzontale.png',
        '/src/img/logo.png'
    ];
    return urls.map(url => new URL(url, baseUrl).href);
})();

//installazione dell'app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        cache.addAll(urlsToCache);
      })
  );
});
//fetch per tutte le risorse non cachate
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});