(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SwipeNavigation = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var EXCLUDED_SELECTORS = [
    'input', 'textarea', 'select', 'button', 'a', 'label', '[contenteditable]',
    '[role="dialog"]', '[aria-modal="true"]', '[data-tab]', 'nav', '[role="menu"]',
    '[data-menu-open="true"]', '[data-overlay-open="true"]', 'canvas', '[data-chart]',
    '.chart', '[role="progressbar"]', '[draggable="true"]', '[aria-grabbed="true"]',
    '[data-drag]', '[data-gesture]', '.goal-progress-track', '.category-limit-track',
    '.spending-trend-track', '#bankChart', '#spendingTrendChart', '#donutSvg',
    '#resetModal', '#bankChartResetModal', '#categoryLimitsModal', '#goalModal',
    '#goalOperationModal'
  ];

  function create(config) {
    if (!config || !config.document || !config.window || !config.surface ||
        typeof config.maxWidth !== 'number' ||
        !Array.isArray(config.tabs) || typeof config.getActiveTabId !== 'function' ||
        typeof config.switchTab !== 'function') {
      throw new TypeError('Configurazione non valida per la navigazione swipe.');
    }

    var doc = config.document;
    var win = config.window;
    var surface = config.surface;
    var tabs = config.tabs;
    var swipeState = null;
    var attached = false;
    var listenerOptions = { passive: true, capture: true };

    function isMobileViewport() {
      if (typeof win.matchMedia === 'function') {
        return win.matchMedia('(max-width: ' + config.maxWidth + 'px)').matches;
      }
      var width = typeof win.innerWidth === 'number'
        ? win.innerWidth
        : (doc.documentElement ? doc.documentElement.clientWidth : 0);
      return width <= config.maxWidth;
    }

    function swipePath(event) {
      var path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      var surfaceIndex = path.indexOf(surface);
      if (surfaceIndex >= 0) return path.slice(0, surfaceIndex + 1);

      var target = event.target;
      if (target && target.nodeType !== 1) target = target.parentElement;
      path = [];
      while (target) {
        path.push(target);
        if (target === surface) return path;
        target = target.parentElement;
      }
      return [];
    }

    function isExcluded(path) {
      for (var i = 0; i < path.length; i++) {
        var element = path[i];
        if (!element || element.nodeType !== 1 || typeof element.matches !== 'function') continue;
        for (var j = 0; j < EXCLUDED_SELECTORS.length; j++) {
          var selector = EXCLUDED_SELECTORS[j];
          if (selector === '[contenteditable]' &&
              element.getAttribute('contenteditable') === 'false') continue;
          if (element.matches(selector)) return true;
        }
        if (element.scrollWidth > element.clientWidth && typeof win.getComputedStyle === 'function') {
          var overflowX = win.getComputedStyle(element).overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') return true;
        }
      }
      return false;
    }

    function findTouch(touches, identifier) {
      if (!touches) return null;
      for (var i = 0; i < touches.length; i++) {
        if (touches[i].identifier === identifier) return touches[i];
      }
      return null;
    }

    function handleTouchStart(event) {
      swipeState = null;
      if (!isMobileViewport() || !event.touches || event.touches.length !== 1 ||
          !event.changedTouches || event.changedTouches.length !== 1) return;

      var path = swipePath(event);
      if (!path.length || isExcluded(path)) return;

      var touch = event.changedTouches[0];
      var tab = config.getActiveTabId();
      if (tabs.indexOf(tab) < 0) return;
      swipeState = {
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startedAt: event.timeStamp,
        tab: tab
      };
    }

    function handleTouchMove(event) {
      if (!swipeState) return;
      if (!event.touches || event.touches.length !== 1 ||
          !findTouch(event.touches, swipeState.identifier)) swipeState = null;
    }

    function handleTouchEnd(event) {
      var state = swipeState;
      swipeState = null;
      if (!state || !isMobileViewport() || !event.changedTouches ||
          event.changedTouches.length !== 1 || !event.touches || event.touches.length !== 0) return;

      var touch = findTouch(event.changedTouches, state.identifier);
      if (!touch) return;

      var duration = event.timeStamp - state.startedAt;
      var deltaX = touch.clientX - state.x;
      var deltaY = touch.clientY - state.y;
      var horizontalDistance = Math.abs(deltaX);
      var verticalDistance = Math.abs(deltaY);
      if (duration < 0 || duration > 800 || horizontalDistance < 48 ||
          (verticalDistance > 0 && horizontalDistance / verticalDistance < 1.25 - 1e-12) ||
          config.getActiveTabId() !== state.tab) return;

      var currentIndex = tabs.indexOf(state.tab);
      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        config.switchTab(tabs[currentIndex + 1], 'next');
      } else if (deltaX > 0 && currentIndex > 0) {
        config.switchTab(tabs[currentIndex - 1], 'previous');
      }
    }

    function handleTouchCancel() {
      swipeState = null;
    }

    function attach() {
      if (attached) return;
      doc.addEventListener('touchstart', handleTouchStart, listenerOptions);
      doc.addEventListener('touchmove', handleTouchMove, listenerOptions);
      doc.addEventListener('touchend', handleTouchEnd, listenerOptions);
      doc.addEventListener('touchcancel', handleTouchCancel, listenerOptions);
      attached = true;
    }

    function detach() {
      if (!attached) return;
      doc.removeEventListener('touchstart', handleTouchStart, listenerOptions);
      doc.removeEventListener('touchmove', handleTouchMove, listenerOptions);
      doc.removeEventListener('touchend', handleTouchEnd, listenerOptions);
      doc.removeEventListener('touchcancel', handleTouchCancel, listenerOptions);
      swipeState = null;
      attached = false;
    }

    return { attach: attach, detach: detach };
  }

  return { create: create };
});
