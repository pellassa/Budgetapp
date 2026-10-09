'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
var functionStart = appSource.indexOf('  function switchTab(tabId, swipeDirection) {');
var functionEnd = appSource.indexOf('\n  function getActiveTabId()', functionStart);
assert.notEqual(functionStart, -1, 'switchTab function not found');
assert.notEqual(functionEnd, -1, 'switchTab function end not found');
var switchTabSource = appSource.slice(functionStart, functionEnd).trim();

function createClassList(initialClasses) {
  var classes = new Set(initialClasses || []);
  return {
    add: function (className) { classes.add(className); },
    remove: function () {
      Array.prototype.forEach.call(arguments, function (className) { classes.delete(className); });
    },
    contains: function (className) { return classes.has(className); },
    values: function () { return Array.from(classes); }
  };
}

function createTab(id, initiallyVisible) {
  var listeners = {};
  return {
    id: 'tab-' + id,
    classList: createClassList(initiallyVisible ? [] : ['hidden']),
    addEventListener: function (type, listener) {
      (listeners[type] || (listeners[type] = [])).push(listener);
    },
    removeEventListener: function (type, listener) {
      listeners[type] = (listeners[type] || []).filter(function (entry) { return entry !== listener; });
    },
    dispatch: function (type, event) {
      (listeners[type] || []).slice().forEach(function (listener) { listener(event); });
    },
    listenerCount: function (type) { return (listeners[type] || []).length; }
  };
}

function createHarness(options) {
  options = options || {};
  var tabIds = ['pocket', 'monthly', 'trends', 'goals', 'condo', 'archive'];
  var tabs = {};
  tabIds.forEach(function (id) { tabs[id] = createTab(id, id === 'pocket'); });
  var buttons = tabIds.map(function (id) {
    return {
      className: '',
      attributes: { 'data-tab': id },
      getAttribute: function (name) { return this.attributes[name] || null; },
      setAttribute: function (name, value) { this.attributes[name] = value; },
      removeAttribute: function (name) { delete this.attributes[name]; }
    };
  });
  var context = {
    TABS: tabIds,
    MOBILE_SWIPE_MAX: 639,
    hasInitializedTab: false,
    activeTabTransitionCleanup: null,
    NAV_ON: 'active',
    NAV_OFF: 'inactive',
    window: {
      matchMedia: function (query) {
        return { matches: query.indexOf('max-width') >= 0
          ? (options.width || 390) <= 639
          : !!options.reducedMotion };
      },
      scrollTo: function () {}
    },
    document: {
      querySelectorAll: function () { return buttons; }
    },
    sessionStorage: { setItem: function () {} },
    appData: { achievementState: { trendVisitedAt: 1, trendTypes: ['all'] } },
    spendingTrendType: 'all',
    saveData: function () {},
    getActiveTabId: function () {
      for (var i = 0; i < tabIds.length; i++) {
        if (!tabs[tabIds[i]].classList.contains('hidden')) return tabIds[i];
      }
      return tabIds[0];
    },
    byId: function (id) { return tabs[id.replace(/^tab-/, '')] || null; }
  };
  vm.createContext(context);
  context.switchTab = vm.runInContext('(' + switchTabSource + ')', context);
  return { context: context, tabs: tabs };
}

function hasTransition(tab) {
  return tab.classList.contains('tab-enter');
}

test('first tab load and reselecting the active tab do not animate', function () {
  var harness = createHarness();
  harness.context.switchTab('monthly');
  assert.deepEqual(harness.tabs.monthly.classList.values(), []);

  harness.context.switchTab('monthly');
  assert.deepEqual(harness.tabs.monthly.classList.values(), []);
});

test('a navigation without swipe direction uses a neutral fade', function () {
  var harness = createHarness();
  harness.context.switchTab('pocket');
  harness.context.switchTab('monthly');
  assert.equal(hasTransition(harness.tabs.monthly), true);
  assert.equal(harness.tabs.monthly.classList.contains('tab-enter--neutral'), true);
  assert.equal(harness.tabs.monthly.classList.contains('tab-enter--from-left'), false);
  assert.equal(harness.tabs.monthly.classList.contains('tab-enter--from-right'), false);
});

test('next and previous swipe directions select opposite entry sides', function () {
  var harness = createHarness();
  harness.context.switchTab('pocket');
  harness.context.switchTab('monthly', 'next');
  assert.equal(harness.tabs.monthly.classList.contains('tab-enter--from-right'), true);

  harness.context.switchTab('trends', 'previous');
  assert.equal(harness.tabs.monthly.classList.contains('tab-enter--from-right'), false);
  assert.equal(harness.tabs.trends.classList.contains('tab-enter--from-left'), true);
});

test('rapid tab changes clear the old direction and animation listeners', function () {
  var harness = createHarness();
  harness.context.switchTab('pocket');
  harness.context.switchTab('monthly', 'next');
  var oldTab = harness.tabs.monthly;
  harness.context.switchTab('trends', 'previous');

  assert.equal(hasTransition(oldTab), false);
  assert.equal(oldTab.classList.contains('tab-enter--from-right'), false);
  assert.equal(oldTab.listenerCount('animationend'), 0);
  assert.equal(oldTab.listenerCount('animationcancel'), 0);
  assert.equal(harness.tabs.trends.classList.contains('tab-enter--from-left'), true);

  harness.tabs.trends.dispatch('animationcancel', {
    target: harness.tabs.trends,
    animationName: 'mobile-tab-enter'
  });
  assert.equal(hasTransition(harness.tabs.trends), false);
  assert.equal(harness.tabs.trends.classList.contains('tab-enter--from-left'), false);
});

test('reduced motion and desktop viewports do not start a transition', function () {
  var reduced = createHarness({ reducedMotion: true });
  reduced.context.switchTab('pocket');
  reduced.context.switchTab('monthly', 'next');
  assert.equal(hasTransition(reduced.tabs.monthly), false);

  var desktop = createHarness({ width: 640 });
  desktop.context.switchTab('pocket');
  desktop.context.switchTab('monthly', 'next');
  assert.equal(hasTransition(desktop.tabs.monthly), false);
});

test('mobile entry uses the requested duration, easing and directional offsets', function () {
  var css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');
  var enterRule = css.match(/main > \[id\^="tab-"\]\.tab-enter\s*\{([^}]*)\}/);
  assert.ok(enterRule);
  assert.match(enterRule[1], /mobile-tab-enter\s+320ms\s+cubic-bezier\(\.22,\s*\.61,\s*\.36,\s*1\)\s+both/);
  assert.match(css, /tab-enter--from-right\s*\{\s*--tab-enter-offset:\s*28px;/);
  assert.match(css, /tab-enter--from-left\s*\{\s*--tab-enter-offset:\s*-28px;/);
  assert.match(css, /tab-enter--neutral\s*\{\s*--tab-enter-offset:\s*0px;/);

  var keyframes = css.match(/@keyframes mobile-tab-enter\s*\{([\s\S]*?)\n\}/);
  assert.ok(keyframes);
  assert.match(keyframes[1], /opacity:\s*\.85/);
  assert.match(keyframes[1], /transform:\s*translateX/);
  assert.deepEqual(
    Array.from(keyframes[1].matchAll(/^\s*([a-z-]+)\s*:/gm), function (match) { return match[1]; }),
    ['opacity', 'transform', 'opacity', 'transform']
  );
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*main > \[id\^="tab-"\]\.tab-enter\s*\{\s*animation:\s*none !important;/);
});
