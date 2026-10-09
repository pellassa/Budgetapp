'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var SwipeNavigation = require('../swipe-navigation.js');

function FakeElement(tagName, options) {
  options = options || {};
  this.nodeType = 1;
  this.tagName = tagName.toUpperCase();
  this.id = options.id || '';
  this.className = options.className || '';
  this.attributes = options.attributes || {};
  this.parentElement = options.parentElement || null;
  this.scrollWidth = options.scrollWidth || 0;
  this.clientWidth = options.clientWidth || 0;
  this.overflowX = options.overflowX || 'visible';
}

FakeElement.prototype.getAttribute = function (name) {
  return Object.prototype.hasOwnProperty.call(this.attributes, name)
    ? this.attributes[name]
    : null;
};

FakeElement.prototype.matches = function (selector) {
  if (selector.charAt(0) === '#') return this.id === selector.slice(1);
  if (selector.charAt(0) === '.') {
    return this.className.split(/\s+/).indexOf(selector.slice(1)) >= 0;
  }
  if (selector.charAt(0) === '[') {
    var match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (!match) return false;
    var value = this.getAttribute(match[1]);
    return match[2] === undefined ? value !== null : value === match[2];
  }
  return this.tagName.toLowerCase() === selector.toLowerCase();
};

function FakeDocument() {
  this.nodeType = 9;
  this.listeners = {};
  this.documentElement = { clientWidth: 390 };
}

FakeDocument.prototype.addEventListener = function (type, listener, options) {
  (this.listeners[type] || (this.listeners[type] = [])).push({ listener: listener, options: options });
};

FakeDocument.prototype.removeEventListener = function (type, listener) {
  this.listeners[type] = (this.listeners[type] || []).filter(function (entry) {
    return entry.listener !== listener;
  });
};

FakeDocument.prototype.dispatch = function (type, event) {
  (this.listeners[type] || []).slice().forEach(function (entry) {
    entry.listener(event);
  });
};

function pathFrom(target) {
  var path = [];
  while (target) {
    path.push(target);
    target = target.parentElement;
  }
  return path;
}

function makeEvent(target, touches, changedTouches, timeStamp, useComposedPath) {
  var event = {
    target: target,
    touches: touches,
    changedTouches: changedTouches,
    timeStamp: timeStamp
  };
  if (useComposedPath !== false) {
    var path = pathFrom(target);
    event.composedPath = function () { return path; };
  }
  return event;
}

function createHarness(activeTab, width) {
  var currentTab = activeTab || 'pocket';
  var doc = new FakeDocument();
  var main = new FakeElement('main');
  var body = new FakeElement('body');
  main.parentElement = body;
  doc.documentElement.clientWidth = width || 390;
  var win = {
    innerWidth: width || 390,
    matchMedia: function () {
      return { matches: (width || 390) <= 639 };
    },
    getComputedStyle: function (element) {
      return { overflowX: element.overflowX };
    }
  };
  var switchedTabs = [];
  var switchedDirections = [];
  var navigation = SwipeNavigation.create({
    document: doc,
    window: win,
    surface: main,
    maxWidth: 639,
    tabs: ['pocket', 'monthly', 'trends', 'goals', 'condo', 'archive'],
    getActiveTabId: function () { return currentTab; },
    switchTab: function (tab, direction) {
      switchedTabs.push(tab);
      switchedDirections.push(direction);
      currentTab = tab;
    }
  });
  navigation.attach();
  return {
    doc: doc,
    main: main,
    switchedTabs: switchedTabs,
    switchedDirections: switchedDirections,
    currentTab: function () { return currentTab; },
    navigation: navigation
  };
}

function touch(identifier, clientX, clientY) {
  return { identifier: identifier, clientX: clientX, clientY: clientY };
}

function performGesture(harness, target, deltaX, deltaY, duration, endTarget, useComposedPath) {
  var startTouch = touch(1, 120, 180);
  harness.doc.dispatch('touchstart', makeEvent(target, [startTouch], [startTouch], 100, useComposedPath));
  var endTouch = touch(1, 120 + deltaX, 180 + deltaY);
  harness.doc.dispatch('touchend', makeEvent(endTarget || harness.doc, [], [endTouch], 100 + duration, useComposedPath));
}

function elementInMain(harness, tagName, options) {
  options = options || {};
  options.parentElement = options.parentElement || harness.main;
  return new FakeElement(tagName, options);
}

test('registers passive capture Touch Events on document', function () {
  var harness = createHarness();
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (type) {
    var listener = harness.doc.listeners[type][0];
    assert.ok(listener);
    assert.equal(listener.options.passive, true);
    assert.equal(listener.options.capture, true);
  });
  harness.navigation.detach();
});

test('swipes from empty content and static cards including decorative SVG', function () {
  var harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -60, 0, 300);
  assert.deepEqual(harness.switchedTabs, ['monthly']);
  assert.deepEqual(harness.switchedDirections, ['next']);

  harness = createHarness();
  var card = elementInMain(harness, 'article', { className: 'glass-card' });
  performGesture(harness, elementInMain(harness, 'svg', { parentElement: card }), -60, 0, 300);
  assert.deepEqual(harness.switchedTabs, ['monthly']);
});

test('passes previous direction for a rightward swipe', function () {
  var harness = createHarness('monthly');
  performGesture(harness, elementInMain(harness, 'div'), 60, 0, 300);
  assert.deepEqual(harness.switchedTabs, ['pocket']);
  assert.deepEqual(harness.switchedDirections, ['previous']);
});

test('touchend on document completes a start received inside main', function () {
  var harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -60, 0, 300, harness.doc);
  assert.deepEqual(harness.switchedTabs, ['monthly']);
});

test('normalizes text-node targets and supports the ancestor fallback path', function () {
  var harness = createHarness();
  var paragraph = elementInMain(harness, 'p');
  var textNode = { nodeType: 3, parentElement: paragraph };
  performGesture(harness, textNode, -60, 0, 300, harness.doc, false);
  assert.deepEqual(harness.switchedTabs, ['monthly']);
});

test('excludes controls, navigation, modals, charts, and real horizontal scrollers', function () {
  [
    ['input'], ['textarea'], ['select'], ['button'], ['a'], ['label'],
    ['div', { attributes: { contenteditable: 'true' } }],
    ['div', { attributes: { 'aria-modal': 'true' } }],
    ['div', { attributes: { role: 'dialog' } }],
    ['div', { id: 'bankChart' }],
    ['div', { id: 'spendingTrendChart' }],
    ['canvas'],
    ['div', { className: 'goal-progress-track' }],
    ['div', { className: 'category-limit-track' }],
    ['div', { scrollWidth: 500, clientWidth: 200, overflowX: 'auto' }]
  ].forEach(function (definition) {
    var harness = createHarness();
    performGesture(harness, elementInMain(harness, definition[0], definition[1]), -60, 0, 300);
    assert.deepEqual(harness.switchedTabs, [], definition[0] + ' target should be excluded');
  });

  var harness = createHarness();
  var nav = new FakeElement('nav');
  var navButton = new FakeElement('button', {
    attributes: { 'data-tab': 'goals' },
    parentElement: nav
  });
  performGesture(harness, navButton, -60, 0, 300);
  assert.deepEqual(harness.switchedTabs, []);
});

test('applies the 48px threshold and horizontal-to-vertical ratio', function () {
  var harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), 47, 0, 300);
  assert.deepEqual(harness.switchedTabs, []);

  harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -48, 0, 300);
  assert.deepEqual(harness.switchedTabs, ['monthly']);

  harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -50, 40, 300);
  assert.deepEqual(harness.switchedTabs, ['monthly']);

  harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -48, 39, 300);
  assert.deepEqual(harness.switchedTabs, []);

  harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -100, 101, 300);
  assert.deepEqual(harness.switchedTabs, []);
});

test('rejects gestures longer than 800ms and accepts the boundary', function () {
  var harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -60, 0, 801);
  assert.deepEqual(harness.switchedTabs, []);

  harness = createHarness();
  performGesture(harness, elementInMain(harness, 'div'), -60, 0, 800);
  assert.deepEqual(harness.switchedTabs, ['monthly']);
});

test('touchcancel and multi-touch invalidate the pending gesture', function () {
  var harness = createHarness();
  var first = touch(1, 120, 180);
  harness.doc.dispatch('touchstart', makeEvent(elementInMain(harness, 'div'), [first], [first], 100));
  harness.doc.dispatch('touchcancel', makeEvent(harness.doc, [], [first], 150));
  harness.doc.dispatch('touchend', makeEvent(harness.doc, [], [touch(1, 40, 180)], 300));
  assert.deepEqual(harness.switchedTabs, []);

  harness = createHarness();
  first = touch(1, 120, 180);
  harness.doc.dispatch('touchstart', makeEvent(elementInMain(harness, 'div'), [first], [first], 100));
  var second = touch(2, 130, 180);
  harness.doc.dispatch('touchstart', makeEvent(elementInMain(harness, 'div'), [first, second], [second], 120));
  harness.doc.dispatch('touchmove', makeEvent(harness.doc, [first, second], [second], 180));
  harness.doc.dispatch('touchend', makeEvent(harness.doc, [], [first], 300));
  assert.deepEqual(harness.switchedTabs, []);
});

test('does not change tabs outside the mobile breakpoint or wrap at either end', function () {
  var tablet = createHarness('pocket', 640);
  performGesture(tablet, elementInMain(tablet, 'div'), -80, 0, 300);
  assert.deepEqual(tablet.switchedTabs, []);

  var pocket = createHarness('pocket');
  performGesture(pocket, elementInMain(pocket, 'div'), 80, 0, 300);
  assert.deepEqual(pocket.switchedTabs, []);

  var archive = createHarness('archive');
  performGesture(archive, elementInMain(archive, 'div'), -80, 0, 300);
  assert.deepEqual(archive.switchedTabs, []);
});

test('one completed gesture calls switchTab at most once', function () {
  var harness = createHarness();
  var start = touch(1, 120, 180);
  harness.doc.dispatch('touchstart', makeEvent(elementInMain(harness, 'div'), [start], [start], 100));
  harness.doc.dispatch('touchend', makeEvent(harness.doc, [], [touch(1, 40, 180)], 300));
  harness.doc.dispatch('touchend', makeEvent(harness.doc, [], [touch(1, 40, 180)], 320));
  assert.deepEqual(harness.switchedTabs, ['monthly']);
  assert.deepEqual(harness.switchedDirections, ['next']);
});

test('runtime achievement cards are direct children of the scroll-region selector', function () {
  var indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  var appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(indexHtml, /id="achievementsList" class="achievement-grid"/);
  assert.match(appJs, /return '<article class="achievement-card /);
  assert.match(appJs, /byId\('achievementsList'\)\.innerHTML = achievements\.map/);
});

function cssRule(css, selector, startAt) {
  var start = css.indexOf(selector, startAt || 0);
  assert.notEqual(start, -1, 'missing CSS selector: ' + selector);
  var open = css.indexOf('{', start);
  var depth = 0;
  for (var i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('Unclosed CSS rule: ' + selector);
}

test('achievement badges use a grid and bounded scroll frames at each layout breakpoint', function () {
  var appCss = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8');
  var desktopCss = fs.readFileSync(path.join(__dirname, '..', 'desktop-layout.css'), 'utf8');
  var firstGridSelector = appCss.indexOf('.achievement-grid {');
  var grid = cssRule(appCss, '.achievement-grid {', firstGridSelector + 1);
  assert.match(grid, /display:\s*grid/);
  assert.match(grid, /gap:\s*\.7rem/);

  var phone = appCss.slice(appCss.indexOf('@media (max-width: 639px)'));
  var phoneList = cssRule(phone, '#achievementsList');
  assert.match(phoneList, /max-height:\s*min\(45vh,\s*26rem\)/);
  assert.match(phoneList, /max-height:\s*min\(45svh,\s*26rem\)/);
  assert.match(phoneList, /overflow-y:\s*auto/);
  assert.match(phoneList, /overscroll-behavior-y:\s*contain/);
  assert.match(phoneList, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(phoneList, /padding:[^;]*1\.25rem/);

  var tablet = appCss.slice(appCss.indexOf('@media (min-width: 640px) and (max-width: 1023px)'));
  var tabletList = cssRule(tablet, '#achievementsList');
  assert.match(tabletList, /max-height:\s*min\(58vh,\s*36rem\)/);
  assert.match(tabletList, /max-height:\s*min\(58svh,\s*36rem\)/);
  assert.match(tabletList, /min-height:\s*0/);
  assert.match(tabletList, /overflow-y:\s*auto/);

  var desktop = desktopCss.slice(desktopCss.indexOf('@media (min-width: 1024px)'));
  var desktopList = cssRule(desktop, '#achievementsList');
  assert.match(desktopList, /max-height:\s*min\(70vh,\s*48rem\)/);
  assert.match(desktopList, /max-height:\s*min\(70svh,\s*48rem\)/);
  assert.match(desktopList, /min-height:\s*0/);
  assert.match(desktopList, /overflow-y:\s*auto/);
});
