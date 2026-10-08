'use strict';

var CACHE_VERSION = 'mylittlebudget-shell-v2';
var CACHE_PREFIX = 'mylittlebudget-shell-';
var SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './app.css',
  './desktop-layout.css',
  './drive-sync.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
var SHELL_URLS = SHELL_ASSETS.map(function (path) {
  return new URL(path, self.registration.scope).href;
});
var INDEX_URL = new URL('./index.html', self.registration.scope).href;
var APP_VERSION_MARKER = '<meta name="app-shell-version" content="2">';

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_VERSION).then(function (cache) {
    return cache.addAll(SHELL_URLS);
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
    event.respondWith(fetch(request).then(function (response) {
      if (!response.ok) throw new Error('Navigation request failed');
      return response.clone().text().then(function (html) {
        if (html.indexOf(APP_VERSION_MARKER) < 0) {
          return caches.open(CACHE_VERSION).then(function (cache) {
            return cache.match(INDEX_URL).then(function (cached) { return cached || response; });
          });
        }
        return caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(INDEX_URL, response.clone());
          return response;
        });
      });
    }).catch(function () {
      return caches.open(CACHE_VERSION).then(function (cache) {
        return cache.match(request).then(function (cached) { return cached || cache.match(INDEX_URL); });
      });
    }));
    return;
  }

  if (SHELL_URLS.indexOf(requestUrl.href) < 0) return;
  event.respondWith(caches.open(CACHE_VERSION).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
    });
  }));
});
