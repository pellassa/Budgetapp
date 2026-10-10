'use strict';

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PwaUpdate = api;
}(typeof self !== 'undefined' ? self : globalThis, function () {
  function initialize(options) {
    var serviceWorker = options.navigator.serviceWorker;
    if (!serviceWorker) return null;

    var notice = options.document.getElementById('appUpdateNotice');
    var updateButton = options.document.getElementById('appUpdateButton');
    var registration = null;
    var activationRequested = false;
    var reloadStarted = false;
    var controllerChanged = false;
    var hadController = !!serviceWorker.controller;
    var serviceWorkerActiveRecorded = false;

    function showUpdateNotice() {
      if (notice) notice.classList.remove('hidden');
    }

    function reloadOnce() {
      if (reloadStarted) return;
      reloadStarted = true;
      options.window.location.reload();
    }

    function checkForUpdate() {
      if (!registration || typeof registration.update !== 'function') return;
      try {
        registration.update().catch(function (error) {
          root.console.warn('Controllo aggiornamento PWA non riuscito.', error);
        });
      } catch (error) {
        root.console.warn('Controllo aggiornamento PWA non riuscito.', error);
      }
    }

    function checkWaitingWorker() {
      if (registration && registration.waiting && serviceWorker.controller) showUpdateNotice();
    }

    function recordActiveServiceWorker() {
      if (serviceWorkerActiveRecorded || !registration || !registration.active ||
          registration.active.state !== 'activated') return;
      serviceWorkerActiveRecorded = true;
      if (typeof options.onServiceWorkerActive === 'function') options.onServiceWorkerActive();
    }

    serviceWorker.addEventListener('controllerchange', function () {
      if (activationRequested) {
        reloadOnce();
      } else if (hadController) {
        controllerChanged = true;
        showUpdateNotice();
      }
      hadController = true;
    });

    if (updateButton) {
      updateButton.addEventListener('click', function () {
        if (!registration || activationRequested) return;
        if (!registration.waiting && !controllerChanged) return;
        activationRequested = true;
        updateButton.disabled = true;
        if (!registration.waiting) {
          if (typeof options.onUpdateApplied === 'function') options.onUpdateApplied();
          reloadOnce();
          return;
        }
        try {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          if (typeof options.onUpdateApplied === 'function') options.onUpdateApplied();
        } catch (error) {
          activationRequested = false;
          updateButton.disabled = false;
          root.console.error('Impossibile attivare l’aggiornamento PWA.', error);
        }
      });
    }

    serviceWorker.register('./sw.js', {
      scope: './',
      updateViaCache: 'none'
    }).then(function (reg) {
      registration = reg;
      recordActiveServiceWorker();
      checkWaitingWorker();
      checkForUpdate();
      reg.addEventListener('updatefound', function () {
        var installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed') checkWaitingWorker();
        });
      });
    }).catch(function (error) {
      root.console.warn('Service worker non disponibile; l’app continua in modalità normale.', error);
    });

    options.document.addEventListener('visibilitychange', function () {
      if (options.document.visibilityState === 'visible') checkForUpdate();
    });
    options.window.addEventListener('focus', checkForUpdate);
    options.window.setInterval(checkForUpdate, 60 * 60 * 1000);

    return {
      checkForUpdate: checkForUpdate
    };
  }

  return {
    initialize: initialize
  };
}));
