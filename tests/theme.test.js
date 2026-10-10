'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');
var childProcess = require('node:child_process');

var root = path.join(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
var appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
var themeBootstrapMatch = html.match(/<script id="theme-bootstrap">([\s\S]*?)<\/script>/);
assert.ok(themeBootstrapMatch, 'theme bootstrap script not found');
var themeBootstrap = themeBootstrapMatch[1];

function makeRadio(value) {
  var listeners = {};
  return {
    value: value,
    checked: false,
    addEventListener: function (type, listener) {
      (listeners[type] || (listeners[type] = [])).push(listener);
    },
    dispatch: function (type) {
      (listeners[type] || []).forEach(function (listener) { listener.call(this); }, this);
    }
  };
}

function createHarness(savedTheme, options) {
  options = options || {};
  var values = {};
  var storageCalls = [];
  if (savedTheme !== undefined) values['mylittlebudget-theme'] = savedTheme;
  var rootAttributes = {};
  var themeColor = {
    content: '#0f172a',
    setAttribute: function (name, value) {
      if (name === 'content') this.content = value;
    }
  };
  var radios = ['dark', 'light', 'twilight'].map(makeRadio);
  var listeners = {};
  var warnings = [];
  var context = {
    Array: Array,
    console: { warn: function (message) { warnings.push(message); } },
    window: {
      localStorage: {
        getItem: function (key) {
          storageCalls.push({ method: 'getItem', key: key });
          if (options.failRead) throw new Error('storage unavailable');
          return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
        },
        setItem: function (key, value) {
          storageCalls.push({ method: 'setItem', key: key, value: value });
          if (options.failWrite) throw new Error('storage unavailable');
          values[key] = value;
        }
      }
    },
    document: {
      readyState: 'loading',
      documentElement: {
        setAttribute: function (name, value) { rootAttributes[name] = value; }
      },
      querySelector: function (selector) {
        return selector === 'meta[name="theme-color"]' ? themeColor : null;
      },
      querySelectorAll: function (selector) {
        return selector === 'input[name="app-theme"]' ? radios : [];
      },
      addEventListener: function (type, listener) { listeners[type] = listener; }
    }
  };
  vm.runInNewContext(themeBootstrap, context);
  return {
    radios: radios,
    values: values,
    storageCalls: storageCalls,
    rootAttributes: rootAttributes,
    themeColor: themeColor,
    listeners: listeners,
    warnings: warnings
  };
}

function initialize(harness) {
  harness.listeners.DOMContentLoaded();
}

test('theme defaults to dark before rendering without a saved preference', function () {
  var harness = createHarness(undefined);
  assert.equal(harness.rootAttributes['data-theme'], 'dark');
  assert.equal(harness.themeColor.content, '#0b1220');
  assert.deepEqual(harness.storageCalls, [{ method: 'getItem', key: 'mylittlebudget-theme' }]);
  assert.deepEqual(harness.warnings, []);
  initialize(harness);
  assert.equal(harness.radios[0].checked, true);
});

test('saved theme is applied before rendering and reflected in the control', function () {
  var harness = createHarness('twilight');
  assert.equal(harness.rootAttributes['data-theme'], 'twilight');
  assert.equal(harness.themeColor.content, '#17192b');
  initialize(harness);
  assert.equal(harness.radios[2].checked, true);
});

test('invalid saved values safely fall back to dark without reporting an error', function () {
  var harness = createHarness('unknown-theme');
  assert.equal(harness.rootAttributes['data-theme'], 'dark');
  assert.deepEqual(harness.warnings, []);
  initialize(harness);
  assert.equal(harness.radios[0].checked, true);
});

test('user choice updates the root attribute and persists only the theme key', function () {
  var harness = createHarness('dark');
  initialize(harness);
  harness.radios[1].checked = true;
  harness.radios[1].dispatch('change');

  assert.equal(harness.rootAttributes['data-theme'], 'light');
  assert.equal(harness.themeColor.content, '#e9eef3');
  assert.equal(harness.values['mylittlebudget-theme'], 'light');
  assert.deepEqual(harness.storageCalls, [
    { method: 'getItem', key: 'mylittlebudget-theme' },
    { method: 'setItem', key: 'mylittlebudget-theme', value: 'light' }
  ]);
});

test('theme control exposes labeled native radio options with values', function () {
  assert.match(html, /<fieldset id="themePreference"/);
  assert.match(html, /<legend>Tema dell’app<\/legend>/);
  [
    ['appThemeDark', 'dark', 'Scuro'],
    ['appThemeLight', 'light', 'Chiaro'],
    ['appThemeTwilight', 'twilight', 'Twilight']
  ].forEach(function (option) {
    var id = option[0];
    var value = option[1];
    var label = option[2];
    assert.match(html, new RegExp('<label[^>]*for="' + id + '"'));
    assert.match(html, new RegExp('<input id="' + id + '" type="radio" name="app-theme" value="' + value + '">'));
    assert.match(html, new RegExp('<span>' + label + '<\\/span>'));
  });
  assert.match(html, /<span class="theme-swatch [^"]+" aria-hidden="true"><\/span>/);
  assert.ok(html.indexOf('id="theme-bootstrap"') < html.indexOf('rel="stylesheet" href="app.css"'));
});

test('theme preference is isolated from financial data, backup, Drive, and PWA code', function () {
  assert.doesNotMatch(themeBootstrap, /userbudgetpwadata|appData|BudgetApp|backup|drive-sync|navigator\.serviceWorker/i);
  assert.match(themeBootstrap, /localStorage\.getItem\(storageKey\)/);
  assert.match(themeBootstrap, /localStorage\.setItem\(storageKey, theme\)/);
  assert.doesNotMatch(appSource, /var STORAGE_KEY = ['"]mylittlebudget-theme['"]/);
});

test('service worker, PWA update, Drive, and swipe files remain unchanged', function () {
  var changedProtectedFiles = childProcess.execFileSync('git', [
    'diff', '--name-only', 'HEAD', '--',
    'sw.js', 'pwa-update.js', 'manifest.webmanifest', 'drive-sync.js', 'swipe-navigation.js'
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(changedProtectedFiles.trim(), '');
});

test('all three themes define accessible surface, semantic, focus, and chart tokens', function () {
  ['dark', 'light', 'twilight'].forEach(function (theme) {
    var blockMatch = theme === 'dark'
      ? css.match(/:root\s*\{([^}]*)\}/)
      : css.match(new RegExp(':root\\[data-theme="' + theme + '"\\]\\s*\\{([^}]*)\\}'));
    assert.ok(blockMatch, theme + ' token block is missing');
    [
      '--canvas:',
      '--surface:',
      '--text-primary:',
      '--text-muted:',
      '--border:',
      '--accent:',
      '--positive:',
      '--negative:',
      '--focus-color:',
      '--chart-positive:',
      '--chart-track:'
    ].forEach(function (token) {
      assert.ok(blockMatch[1].includes(token), token + ' is missing from ' + theme);
    });
  });
  assert.match(appSource, /stroke="var\(--chart-track\)"/);
  assert.match(appSource, /stroke="var\(--chart-grid\)"/);
  assert.match(appSource, /color: 'var\(--chart-fixed\)'/);
});

test('quick expense categories use theme colors from first render and preserve selection', function () {
  var selectorStart = html.indexOf('<div class="grid grid-cols-5 gap-1.5" id="categorySelector">');
  var selectorEnd = html.indexOf('</div>', selectorStart);
  assert.notEqual(selectorStart, -1, 'quick expense category selector not found');
  var categoryMarkup = html.slice(selectorStart, selectorEnd);
  var initialButtons = Array.from(categoryMarkup.matchAll(/<button[^>]*data-cat="([^"]+)"[^>]*class="([^"]+)"/g));
  assert.equal(initialButtons.length, 5);
  initialButtons.forEach(function (button) {
    assert.equal(button[2], 'cat-btn', button[1] + ' initial class should not depend on interaction');
  });

  var categoryStyle = css.match(/#categorySelector \.cat-btn\s*\{([^}]*)\}/);
  var selectedStyle = css.match(/#categorySelector \.cat-btn\.active\s*\{([^}]*)\}/);
  assert.ok(categoryStyle);
  assert.ok(selectedStyle);
  assert.match(categoryStyle[1], /background:\s*var\(--surface-inset\)/);
  assert.match(categoryStyle[1], /color:\s*var\(--text-muted\)/);
  assert.match(categoryStyle[1], /border:\s*1px solid var\(--border-strong\)/);
  assert.match(selectedStyle[1], /background:\s*var\(--accent-soft\)/);
  assert.match(selectedStyle[1], /color:\s*var\(--accent\)/);
  assert.match(css, /#categorySelector \.cat-btn:hover:not\(\.active\)\s*\{[^}]*background:\s*var\(--surface-raised\)/);
  assert.match(css, /#categorySelector \.cat-btn:disabled\s*\{[^}]*cursor:\s*not-allowed/);
  assert.match(css, /button:not\(\.nav-btn\):focus-visible/);
  assert.match(css, /:focus-visible\s*\{\s*outline:\s*2px solid var\(--focus-color\)/);

  var categoryFunctionStart = appSource.indexOf('  function selectCategory(cat) {');
  var categoryFunctionEnd = appSource.indexOf('\n  function handleAddExpense(e)', categoryFunctionStart);
  assert.notEqual(categoryFunctionStart, -1);
  assert.notEqual(categoryFunctionEnd, -1);
  var categoryFunction = appSource.slice(categoryFunctionStart, categoryFunctionEnd);
  var selectedClasses = appSource.match(/var CAT_ON\s*=\s*'([^']*)';/);
  var unselectedClasses = appSource.match(/var CAT_OFF\s*=\s*'([^']*)';/);
  assert.ok(selectedClasses);
  assert.ok(unselectedClasses);
  [selectedClasses[1], unselectedClasses[1]].forEach(function (classes) {
    assert.doesNotMatch(classes, /\b(?:bg|text|border)-(?:slate|emerald|rose|amber|sky)-/);
  });

  var buttons = initialButtons.map(function (button) {
    return {
      category: button[1],
      className: button[2],
      getAttribute: function (name) { return name === 'data-cat' ? this.category : null; }
    };
  });
  var context = {
    CAT_ON: selectedClasses[1],
    CAT_OFF: unselectedClasses[1],
    appData: {},
    document: {
      querySelectorAll: function (selector) {
        return selector === '.cat-btn' ? buttons : [];
      }
    }
  };
  vm.runInNewContext(categoryFunction, context);

  buttons.forEach(function (button) { assert.equal(button.className, 'cat-btn'); });
  context.selectCategory('Spesa');
  assert.equal(context.appData.currentCategory, 'Spesa');
  assert.equal(buttons[0].className, selectedClasses[1]);
  buttons.slice(1).forEach(function (button) { assert.equal(button.className, unselectedClasses[1]); });
  context.selectCategory('Caffè');
  assert.equal(context.appData.currentCategory, 'Caffè');
  assert.equal(buttons[2].className, selectedClasses[1]);
  buttons.forEach(function (button, index) {
    if (index !== 2) assert.equal(button.className, unselectedClasses[1]);
  });
});
