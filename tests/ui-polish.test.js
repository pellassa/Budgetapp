'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var childProcess = require('node:child_process');
var vm = require('node:vm');

var root = path.join(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function extractFunction(source, startMarker, endMarker) {
  var start = source.indexOf(startMarker);
  var end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, startMarker + ' not found');
  assert.notEqual(end, -1, endMarker + ' not found');
  return source.slice(start, end).trim();
}

function createElement() {
  var classes = new Set();
  return {
    textContent: '',
    innerHTML: '',
    classList: {
      toggle: function (name, force) {
        var shouldAdd = force === undefined ? !classes.has(name) : force;
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
        return shouldAdd;
      },
      contains: function (name) { return classes.has(name); }
    }
  };
}

function createGoalsHarness(goals) {
  var elements = {};
  [
    'goalsTotalSaved', 'goalsActiveCount', 'goalsUnallocated', 'goalsAllocationNotice',
    'goalsEmptyState', 'addGoalBtn', 'nextGoalSection', 'goalListSection',
    'nextGoalContent', 'goalsList', 'achievementCount', 'achievementsList',
    'achievementAnnouncement'
  ].forEach(function (id) { elements[id] = createElement(); });
  var nextGoalRenderCount = 0;
  var context = {
    appData: {
      goals: goals,
      accumulatedSavingsFromLeftovers: 125,
      achievementState: { unlocked: {} }
    },
    goalStatusFilter: 'all',
    achievementFilter: 'all',
    pendingAchievementAnnouncements: [],
    ACHIEVEMENTS: [],
    byId: function (id) { return elements[id]; },
    goalSavedTotal: function (data) {
      return data.goals.reduce(function (total, goal) { return total + goal.saved; }, 0);
    },
    eur: function (amount) { return amount.toFixed(2); },
    renderNextGoal: function () { nextGoalRenderCount++; },
    renderGoalCard: function () { return '<article class="goal-card">obiettivo</article>'; },
    isAchievementUnlocked: function () { return false; },
    filterAchievements: function () { return []; },
    renderAchievementCard: function () { return ''; }
  };
  return { elements: elements, context: context, nextGoalRenderCount: function () { return nextGoalRenderCount; } };
}

test('six-month exact values start closed behind an accessible toggle', function () {
  var toggleMatch = html.match(/<button\b[^>]*id="spendingTrendValuesToggle"[^>]*>([\s\S]*?)<\/button>/);
  var panelMatch = html.match(/<div\b[^>]*id="spendingTrendExactValues"[^>]*>/);
  assert.ok(toggleMatch, 'six-month values toggle exists');
  assert.ok(panelMatch, 'six-month values panel exists');
  assert.match(toggleMatch[0], /type="button"/);
  assert.match(toggleMatch[0], /aria-expanded="false"/);
  assert.match(toggleMatch[0], /aria-controls="spendingTrendExactValues"/);
  assert.match(toggleMatch[0], /Mostra valori esatti \(6 mesi\)/);
  assert.match(toggleMatch[0], /focus-visible:/);
  assert.match(panelMatch[0], /class="hidden/);
  assert.match(html, /id="spendingTrendChart" aria-describedby="spendingTrendChartDescription"/);
  assert.match(html, /<tbody id="spendingTrendMonthsTable"><\/tbody>/);
  var panelStart = html.indexOf('id="spendingTrendExactValues"');
  var panelEnd = html.indexOf('</div>\n      </div>\n      <div class="mt-4">', panelStart);
  assert.notEqual(panelEnd, -1, 'exact values panel closes before the existing debits section');
  assert.ok(html.indexOf('id="spendingTrendDebitsTable"') > panelEnd);
});

test('disclosure controls update panel visibility and aria state without moving focus', function () {
  var buttons = ['salaryCompositionToggle', 'spendingTrendValuesToggle'].map(function (id) {
    var attributes = {
      'aria-controls': id === 'salaryCompositionToggle' ? 'salaryCompositionDetails' : 'spendingTrendExactValues',
      'aria-expanded': 'false'
    };
    if (id === 'spendingTrendValuesToggle') {
      attributes['data-disclosure-collapsed'] = 'Mostra valori esatti (6 mesi)';
      attributes['data-disclosure-expanded'] = 'Nascondi valori esatti';
    }
    return {
      id: id,
      textContent: id === 'salaryCompositionToggle' ? 'Composizione dello stipendio' : attributes['data-disclosure-collapsed'],
      getAttribute: function (name) { return attributes[name] || null; },
      setAttribute: function (name, value) { attributes[name] = value; },
      addEventListener: function (type, listener) { this.listener = listener; },
      click: function () { this.listener.call(this); }
    };
  });
  var panels = {
    salaryCompositionDetails: createElement(),
    spendingTrendExactValues: createElement()
  };
  panels.salaryCompositionDetails.classList.toggle('hidden', true);
  panels.spendingTrendExactValues.classList.toggle('hidden', true);
  var document = { activeElement: buttons[0], querySelectorAll: function () { return buttons; } };
  var initialize = vm.runInNewContext('(' + extractFunction(
    appSource,
    '  function initializeDisclosureControls() {',
    '\n\n  window.openResetModal'
  ) + ')', {
    document: document,
    byId: function (id) { return panels[id]; },
    Error: Error
  });
  initialize();

  buttons[0].click();
  assert.equal(buttons[0].getAttribute('aria-expanded'), 'true');
  assert.equal(panels.salaryCompositionDetails.classList.contains('hidden'), false);
  assert.equal(buttons[0].textContent, 'Composizione dello stipendio');
  assert.equal(document.activeElement, buttons[0]);

  buttons[1].click();
  assert.equal(buttons[1].getAttribute('aria-expanded'), 'true');
  assert.equal(buttons[1].textContent, 'Nascondi valori esatti');
  assert.equal(panels.spendingTrendExactValues.classList.contains('hidden'), false);
  buttons[1].click();
  assert.equal(buttons[1].getAttribute('aria-expanded'), 'false');
  assert.equal(buttons[1].textContent, 'Mostra valori esatti (6 mesi)');
  assert.equal(panels.spendingTrendExactValues.classList.contains('hidden'), true);
});

test('salary donut and legend start closed but remain in the controlled panel', function () {
  var toggleMatch = html.match(/<button\b[^>]*id="salaryCompositionToggle"[^>]*>([\s\S]*?)<\/button>/);
  var panelStart = html.indexOf('<div id="salaryCompositionDetails"');
  var panelEnd = html.indexOf('</div>\n    </div>', panelStart);
  assert.ok(toggleMatch, 'salary composition toggle exists');
  assert.match(toggleMatch[0], /type="button"/);
  assert.match(toggleMatch[0], /aria-expanded="false"/);
  assert.match(toggleMatch[0], /aria-controls="salaryCompositionDetails"/);
  assert.match(toggleMatch[0], /Composizione dello stipendio/);
  assert.match(html.slice(panelStart, panelEnd), /id="donutSvg"/);
  assert.match(html.slice(panelStart, panelEnd), /id="donutLegend"/);
  assert.match(html.slice(panelStart, panelEnd), /id="donutCenterValue"/);
  assert.match(html.slice(panelStart, panelStart + 100), /class="hidden/);
});

test('goals empty state replaces goal cards only when there are no goals', function () {
  var renderGoals = extractFunction(appSource, '  function renderGoalsTab() {', '\n  function clearGoalFormErrors()');
  var empty = createGoalsHarness([]);
  vm.runInNewContext('(' + renderGoals + ')', empty.context)();
  assert.equal(empty.elements.goalsEmptyState.classList.contains('hidden'), false);
  assert.equal(empty.elements.addGoalBtn.classList.contains('hidden'), true);
  assert.equal(empty.elements.nextGoalSection.classList.contains('hidden'), true);
  assert.equal(empty.elements.goalListSection.classList.contains('hidden'), true);
  assert.equal(empty.elements.goalsTotalSaved.textContent, '0.00');
  assert.equal(empty.elements.goalsActiveCount.textContent, '0');
  assert.equal(empty.elements.goalsUnallocated.textContent, '125.00');
  assert.equal(empty.elements.goalsList.innerHTML, '');
  assert.equal(empty.nextGoalRenderCount(), 0);
  assert.match(html, /data-add-goal class="[^"]*">Crea il primo obiettivo<\/button>/);

  var populated = createGoalsHarness([{ id: 1, status: 'active', saved: 40, target: 100 }]);
  vm.runInNewContext('(' + renderGoals + ')', populated.context)();
  assert.equal(populated.elements.goalsEmptyState.classList.contains('hidden'), true);
  assert.equal(populated.elements.addGoalBtn.classList.contains('hidden'), false);
  assert.equal(populated.elements.nextGoalSection.classList.contains('hidden'), false);
  assert.equal(populated.elements.goalListSection.classList.contains('hidden'), false);
  assert.match(populated.elements.goalsList.innerHTML, /goal-card/);
  assert.equal(populated.nextGoalRenderCount(), 1);
});

test('Pocket hint is removed and account balance explanation uses the approved copy', function () {
  assert.doesNotMatch(html, /La spesa viene sottratta automaticamente dal saldo del conto\./);
  assert.match(html, /Pocket e movimenti programmati aggiornano il conto\. Se il saldo differisce dalla banca, correggilo qui\./);
});

test('archive sections are labeled and disclosure state is not persisted as financial data', function () {
  assert.match(html, />Risparmi e settimane<\/h2>/);
  assert.match(html, />Dati e backup<\/h2>/);
  assert.match(html, />Aspetto<\/h2>/);
  var disclosure = extractFunction(appSource, '  function initializeDisclosureControls() {', '\n\n  window.openResetModal');
  assert.doesNotMatch(disclosure, /appData|saveData|localStorage|BudgetApp/);
});

test('financial schema, normalization, and backup/import/export code are unchanged', function () {
  var baseline = childProcess.execFileSync('git', ['show', 'HEAD:app.js'], {
    cwd: root,
    encoding: 'utf8'
  });
  [
    ['  function makeDefault() {', '\n  function normalizeGoal('],
    ['  function normalize(d) {', '\n  function loadData()'],
    ['  function validateBackupData(data) {', '\n  function confirmFullReset()']
  ].forEach(function (range) {
    assert.equal(
      extractFunction(appSource, range[0], range[1]),
      extractFunction(baseline, range[0], range[1]),
      range[0] + ' must remain unchanged'
    );
  });
});
