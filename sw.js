'use strict';

var CACHE_VERSION = 'mylittlebudget-shell-v4';
var CACHE_PREFIX = 'mylittlebudget-shell-';
var SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './pwa-update.js',
  './app.css',
  './desktop-layout.css',
  './swipe-navigation.js',
  './drive-sync.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
var SHELL_URLS = SHELL_ASSETS.map(function (path) {
  return new URL(path, self.registration.scope).href;
});
var INDEX_URL = new URL('./index.html', self.registration.scope).href;

function offlineResponse(request) {
  var isNavigation = request.mode === 'navigate';
  return new Response(isNavigation ? 'MyLittleBudget non è disponibile offline.' : '', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': isNavigation ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8' }
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_VERSION).then(function (cache) {
    return cache.addAll(SHELL_URLS.map(function (url) {
      return new Request(url, { cache: 'reload' });
    }));
  }));
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_VERSION;
    }).map(function (key) {
      return caches.delete(key);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var requestUrl = new URL(request.url);
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE_VERSION).then(function (cache) {
      function findOfflineDocument(response) {
        return cache.match(request).then(function (cached) {
          return cached || cache.match(INDEX_URL);
        }).then(function (cached) {
          return cached || response || offlineResponse(request);
        });
      }

      return fetch(request).then(function (response) {
        if (!response.ok) return findOfflineDocument(response);
        return Promise.all([
          cache.put(INDEX_URL, response.clone()),
          cache.put(request, response.clone())
        ]).then(function () {
          return response;
        }, function (error) {
          console.warn('Impossibile aggiornare la cache HTML della PWA.', error);
          return response;
        });
      }, function () { return findOfflineDocument(null); });
    }));
    return;
  }

  if (SHELL_URLS.indexOf(requestUrl.href) < 0) return;
  event.respondWith(caches.open(CACHE_VERSION).then(function (cache) {
    return fetch(request).then(function (response) {
      if (!response.ok) {
        return cache.match(request).then(function (cached) {
          return cached || response;
        });
      }
      return cache.put(request, response.clone()).then(function () {
        return response;
      }, function (error) {
        console.warn('Impossibile aggiornare un asset nella cache della PWA.', error);
        return response;
      });
    }, function () {
      return cache.match(request).then(function (cached) {
        return cached || offlineResponse(request);
      });
    });
  }));
});
