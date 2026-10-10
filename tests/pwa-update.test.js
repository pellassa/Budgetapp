'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var PwaUpdate = require('../pwa-update.js');

var root = path.join(__dirname, '..');
var workerSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
var pageSource = fs.readFileSync(path.join(root, 'pwa-update.js'), 'utf8');
var htmlSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function createEventTarget() {
  var listeners = {};
  return {
    addEventListener: function (type, listener) {
      (listeners[type] || (listeners[type] = [])).push(listener);
    },
    dispatch: function (type, event) {
      (listeners[type] || []).slice().forEach(function (listener) {
        listener(event || {});
      });
    },
    listenerCount: function (type) { return (listeners[type] || []).length; }
  };
}

function createPageHarness(options) {
  options = options || {};
  var serviceWorker = createEventTarget();
  var document = createEventTarget();
  var window = createEventTarget();
  var notice = {
    visible: false,
    classList: {
      remove: function (name) {
        if (name === 'hidden') notice.visible = true;
      }
    }
  };
  var button = {
    disabled: false,
    listeners: {},
    addEventListener: function (type, listener) {
      this.listeners[type] = listener;
    },
    click: function () {
      if (this.listeners.click) this.listeners.click();
    }
  };
  var sentMessages = [];
  var updateChecks = 0;
  var reloads = 0;
  var interval;
  var intervalCount = 0;
  var activeEvents = 0;
  var registration = Object.assign(createEventTarget(), {
    waiting: {
      postMessage: function (message) { sentMessages.push(message); }
    },
    active: options.active || null,
    installing: null,
    update: function () {
      updateChecks += 1;
      return Promise.resolve();
    }
  });
  serviceWorker.controller = options.hasController === false ? null : {};
  serviceWorker.registerOptions = null;
  serviceWorker.register = function (url, options) {
    serviceWorker.registerOptions = { url: url, options: options };
    return Promise.resolve(registration);
  };
  document.visibilityState = 'visible';
  document.getElementById = function (id) {
    return id === 'appUpdateNotice' ? notice : button;
  };
  window.location = { reload: function () { reloads += 1; } };
  window.setInterval = function (callback, delay) {
    interval = { callback: callback, delay: delay };
    intervalCount += 1;
    return 1;
  };

  PwaUpdate.initialize({
    navigator: { serviceWorker: serviceWorker },
    window: window,
    document: document,
    onServiceWorkerActive: function () { activeEvents += 1; }
  });

  return {
    serviceWorker: serviceWorker,
    document: document,
    window: window,
    notice: notice,
    button: button,
    registration: registration,
    setWaiting: function (waiting) { registration.waiting = waiting; },
    sentMessages: sentMessages,
    updateChecks: function () { return updateChecks; },
    reloads: function () { return reloads; },
    interval: function () { return interval; },
    intervalCount: function () { return intervalCount; },
    activeEvents: function () { return activeEvents; }
  };
}

function createWorkerHarness() {
  var listeners = {};
  var entries = new Map();
  var deleted = [];
  var addAllRequests = [];
  var claims = 0;
  var skipWaitingCalls = 0;
  var cache = {
    addAll: function (requests) {
      addAllRequests = requests;
      requests.forEach(function (request) {
        entries.set(request.url, { offline: request.url });
      });
      return Promise.resolve();
    },
    match: function (request) {
      var key = request && request.url ? request.url : request;
      return Promise.resolve(entries.get(key));
    },
    put: function (request, response) {
      var key = request && request.url ? request.url : request;
      entries.set(key, response);
      return Promise.resolve();
    }
  };
  var context = {
    self: {
      registration: { scope: 'https://budget.test/' },
      location: { origin: 'https://budget.test' },
      clients: { claim: function () { claims += 1; return Promise.resolve(); } },
      skipWaiting: function () { skipWaitingCalls += 1; return Promise.resolve(); },
      addEventListener: function (type, listener) {
        listeners[type] = listener;
      }
    },
    caches: {
      open: function () { return Promise.resolve(cache); },
      keys: function () {
        return Promise.resolve([
          'mylittlebudget-shell-v3',
          'mylittlebudget-shell-unrelated',
          'user-data-cache'
        ]);
      },
      delete: function (name) {
        deleted.push(name);
        return Promise.resolve(true);
      }
    },
    URL: URL,
    Request: Request,
    Response: Response,
    Promise: Promise,
    console: { warn: function () {} },
    fetch: function (request) {
      if (context.offline) return Promise.reject(new Error('offline'));
      return Promise.resolve({
        ok: true,
        online: request.url,
        clone: function () { return this; }
      });
    },
    offline: false
  };
  vm.runInNewContext(workerSource, context, { filename: 'sw.js' });
  return {
    dispatch: function (type, event) { listeners[type](event); },
    entries: entries,
    deleted: deleted,
    addAllRequests: function () { return addAllRequests; },
    claims: function () { return claims; },
    skipWaitingCalls: function () { return skipWaitingCalls; },
    context: context
  };
}

test('versioned install precaches all app shell files with HTTP cache bypass', async function () {
  var worker = createWorkerHarness();
  var installWork;
  worker.dispatch('install', { waitUntil: function (promise) { installWork = promise; } });
  await installWork;
  assert.equal(worker.skipWaitingCalls(), 0);

  var urls = worker.addAllRequests().map(function (request) {
    assert.equal(request.cache, 'reload');
    return request.url;
  });
  assert.ok(worker.entries.has('https://budget.test/'));
  assert.ok(urls.includes('https://budget.test/index.html'));
  assert.ok(urls.includes('https://budget.test/app.js'));
  assert.ok(urls.includes('https://budget.test/pwa-update.js'));
  assert.ok(urls.includes('https://budget.test/app.css'));
  assert.ok(urls.includes('https://budget.test/desktop-layout.css'));
  assert.ok(urls.includes('https://budget.test/swipe-navigation.js'));
  assert.ok(urls.includes('https://budget.test/drive-sync.js'));
  assert.ok(urls.includes('https://budget.test/manifest.webmanifest'));
  assert.ok(urls.includes('https://budget.test/icons/icon-192.png'));
  assert.ok(urls.includes('https://budget.test/icons/icon-512.png'));
  assert.match(workerSource, /mylittlebudget-shell-v4/);
});

test('activate deletes only obsolete app shell caches and claims clients', async function () {
  var worker = createWorkerHarness();
  var activateWork;
  worker.dispatch('activate', { waitUntil: function (promise) { activateWork = promise; } });
  await activateWork;

  assert.deepEqual(worker.deleted, ['mylittlebudget-shell-v3', 'mylittlebudget-shell-unrelated']);
  assert.equal(worker.claims(), 1);
});

test('network-first requests refresh shell assets and fall back to precache offline', async function () {
  var worker = createWorkerHarness();
  var installWork;
  worker.dispatch('install', { waitUntil: function (promise) { installWork = promise; } });
  await installWork;

  var responseWork;
  worker.dispatch('fetch', {
    request: {
      method: 'GET',
      url: 'https://budget.test/app.js',
      mode: 'no-cors'
    },
    respondWith: function (promise) { responseWork = promise; }
  });
  var onlineResponse = await responseWork;
  assert.equal(onlineResponse.online, 'https://budget.test/app.js');

  worker.context.offline = true;
  worker.dispatch('fetch', {
    request: {
      method: 'GET',
      url: 'https://budget.test/app.js',
      mode: 'no-cors'
    },
    respondWith: function (promise) { responseWork = promise; }
  });
  assert.equal((await responseWork).online, 'https://budget.test/app.js');

  worker.dispatch('fetch', {
    request: {
      method: 'GET',
      url: 'https://budget.test/monthly',
      mode: 'navigate'
    },
    respondWith: function (promise) { responseWork = promise; }
  });
  assert.deepEqual(await responseWork, { offline: 'https://budget.test/index.html' });

  worker.entries.clear();
  worker.dispatch('fetch', {
    request: {
      method: 'GET',
      url: 'https://budget.test/app.css',
      mode: 'no-cors'
    },
    respondWith: function (promise) { responseWork = promise; }
  });
  assert.equal((await responseWork).status, 503);

  worker.dispatch('fetch', {
    request: {
      method: 'GET',
      url: 'https://budget.test/',
      mode: 'navigate'
    },
    respondWith: function (promise) { responseWork = promise; }
  });
  assert.equal((await responseWork).status, 503);
});

test('a waiting worker is announced, but skipWaiting requires the explicit button', async function () {
  var page = createPageHarness();
  await new Promise(setImmediate);

  assert.equal(page.notice.visible, true);
  assert.match(htmlSource, /È disponibile un aggiornamento\. Ricarica/);
  assert.match(htmlSource, />Ricarica<\/button>/);
  assert.deepEqual(page.sentMessages, []);
  assert.equal(page.reloads(), 0);
  assert.deepEqual(page.serviceWorker.registerOptions, {
    url: './sw.js',
    options: { scope: './', updateViaCache: 'none' }
  });

  page.button.click();
  assert.deepEqual(page.sentMessages, [{ type: 'SKIP_WAITING' }]);
  assert.equal(page.reloads(), 0);
});

test('a missing service worker is a harmless fallback and active event is recorded once', async function () {
  assert.equal(PwaUpdate.initialize({
    navigator: {},
    window: {},
    document: {}
  }), null);

  var page = createPageHarness({ active: { state: 'activated' } });
  await new Promise(setImmediate);
  assert.equal(page.activeEvents(), 1);
});

test('installed workers do not show the update notice without an existing controller', async function () {
  var page = createPageHarness({ hasController: false });
  page.setWaiting(null);
  await new Promise(setImmediate);
  var installing = Object.assign(createEventTarget(), { state: 'installed' });
  page.registration.installing = installing;
  page.setWaiting({ postMessage: function () {} });
  page.registration.dispatch('updatefound');
  installing.dispatch('statechange');
  assert.equal(page.notice.visible, false);
});

test('updatefound announces the new worker after it reaches installed and waiting', async function () {
  var page = createPageHarness();
  page.setWaiting(null);
  await new Promise(setImmediate);
  assert.equal(page.notice.visible, false);

  var installing = Object.assign(createEventTarget(), { state: 'installed' });
  page.registration.installing = installing;
  page.setWaiting({
    postMessage: function (message) { page.sentMessages.push(message); }
  });
  page.registration.dispatch('updatefound');
  installing.dispatch('statechange');
  assert.equal(page.notice.visible, true);
  assert.deepEqual(page.sentMessages, []);
});

test('an update activated by another page is announced and reloads only on explicit action', async function () {
  var page = createPageHarness();
  page.setWaiting(null);
  await new Promise(setImmediate);

  page.serviceWorker.dispatch('controllerchange');
  assert.equal(page.notice.visible, true);
  assert.equal(page.reloads(), 0);

  page.button.click();
  assert.equal(page.sentMessages.length, 0);
  assert.equal(page.reloads(), 1);
});

test('controllerchange reloads once only after user action; polling never reloads', async function () {
  var page = createPageHarness();
  await new Promise(setImmediate);

  page.serviceWorker.dispatch('controllerchange');
  page.interval().callback();
  assert.equal(page.reloads(), 0);
  assert.ok(page.updateChecks() >= 2);
  assert.equal(page.interval().delay, 60 * 60 * 1000);
  assert.equal(page.intervalCount(), 1);
  assert.equal(page.serviceWorker.listenerCount('controllerchange'), 1);
  assert.equal(page.document.listenerCount('visibilitychange'), 1);
  assert.equal(page.window.listenerCount('focus'), 1);
  assert.equal(page.registration.listenerCount('updatefound'), 1);
  assert.equal(page.button.listeners.click ? 1 : 0, 1);

  page.button.click();
  page.serviceWorker.dispatch('controllerchange');
  page.serviceWorker.dispatch('controllerchange');
  assert.equal(page.reloads(), 1);
});

test('page checks updates on visibility/focus and does not clear user data', async function () {
  var page = createPageHarness();
  await new Promise(setImmediate);

  var before = page.updateChecks();
  page.document.dispatch('visibilitychange');
  page.window.dispatch('focus');
  assert.equal(page.updateChecks(), before + 2);
  assert.doesNotMatch(pageSource + workerSource, /localStorage\.clear|indexedDB\.deleteDatabase/);
  assert.match(workerSource, /key\.indexOf\(CACHE_PREFIX\) === 0/);
});
