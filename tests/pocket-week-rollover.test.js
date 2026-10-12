'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var vm = require('node:vm');

var appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function extractFunction(source, startMarker, endMarker) {
  var start = source.indexOf(startMarker);
  var end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, startMarker + ' not found');
  assert.notEqual(end, -1, endMarker + ' not found');
  return source.slice(start, end);
}

function formatDate(date) {
  var months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return ('0' + date.getDate()).slice(-2) + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
}

function parseDate(value) {
  var match = String(value || '').match(/^(\d{1,2}) ([A-Za-zàù]{3}) (\d{4})$/);
  if (!match) return null;
  var months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return new Date(Number(match[3]), months.indexOf(match[2]), Number(match[1]));
}

function weekRange(now) {
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return [formatDate(start), formatDate(end)];
}

function makeHarness(currentWeek, now) {
  var appData = {
    currentWeek: currentWeek,
    weeklyTarget: 75,
    accumulatedSavingsFromLeftovers: 12,
    historicalWeeks: [],
    categoryLimits: {},
    achievementState: { weekClosures: [], targetChangedAt: 123 }
  };
  var saves = 0;
  var modalCloses = 0;
  var alerts = [];
  var fixedNow = now || new Date(2026, 0, 4, 12);
  function FixedDate() { return new Date(fixedNow.getTime()); }
  FixedDate.now = function () { return fixedNow.getTime(); };

  var functions = extractFunction(appSource, '  function archiveCurrentWeek() {', '\n  function confirmFullReset()');
  var context = {
    appData: appData,
    CATEGORIES: ['Spesa', 'Benzina', 'Caffè', 'Svago', 'Altro'],
    GOAL_HISTORY_MAX: 500,
    Date: FixedDate,
    sum: function (expenses) {
      return expenses.reduce(function (total, expense) { return total + (Number(expense.amount) || 0); }, 0);
    },
    round2: function (amount) { return Math.round(amount * 100) / 100; },
    eur: function (amount) { return Number(amount).toFixed(2); },
    parseItDate: parseDate,
    thisWeekRange: weekRange,
    nextWeekRange: function (date) {
      date = date || fixedNow;
      var range = weekRange(date);
      var start = parseDate(range[0]);
      start.setDate(start.getDate() + 7);
      var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      return [formatDate(start), formatDate(end)];
    },
    setGoalStatus: function () {},
    closeResetModal: function () { modalCloses++; },
    saveData: function () { saves++; },
    alert: function (message) { alerts.push(message); }
  };
  vm.runInNewContext(functions + '\nthis.api = { rolloverPocketWeek: rolloverPocketWeek, executeSundayReset: executeSundayReset };', context);
  return {
    appData: appData,
    api: context.api,
    saves: function () { return saves; },
    modalCloses: function () { return modalCloses; },
    alerts: alerts
  };
}

function sampleWeek(start, end, expenses, budget) {
  return { startDate: start, endDate: end, initialBudget: budget === undefined ? 60 : budget, expenses: expenses || [] };
}

test('an unchanged week is not modified', function () {
  var now = new Date(2026, 0, 5, 12);
  var week = sampleWeek('05 Gen 2026', '11 Gen 2026', [{ amount: 8 }]);
  var harness = makeHarness(week, now);
  var before = JSON.stringify(harness.appData);

  assert.equal(harness.api.rolloverPocketWeek(now), false);
  assert.equal(JSON.stringify(harness.appData), before);
  assert.equal(harness.saves(), 0);
});

test('Monday rollover archives the saved week and opens the current week at its target budget', function () {
  var now = new Date(2027, 0, 4, 12);
  var harness = makeHarness(sampleWeek('28 Dic 2026', '03 Gen 2027', [{ amount: 14 }, { amount: 6 }], 60), now);
  harness.appData.weeklyTarget = 80;

  assert.equal(harness.api.rolloverPocketWeek(now), true);
  assert.equal(JSON.stringify(harness.appData.historicalWeeks), JSON.stringify([{
    startDate: '28 Dic 2026', endDate: '03 Gen 2027',
    budget: 60, spent: 20, leftover: 40, status: 'Risparmiati'
  }]));
  assert.equal(harness.appData.accumulatedSavingsFromLeftovers, 52);
  assert.equal(JSON.stringify(harness.appData.achievementState.weekClosures.map(function (closure) {
    return { leftover: closure.leftover, targetChanged: closure.targetChanged };
  })), JSON.stringify([{ leftover: 40, targetChanged: true }]));
  assert.equal(JSON.stringify(harness.appData.currentWeek), JSON.stringify({
    startDate: '04 Gen 2027', endDate: '10 Gen 2027', initialBudget: 80, expenses: []
  }));
});

test('repeated rollover does not credit leftover or archive twice', function () {
  var now = new Date(2026, 0, 5, 12);
  var harness = makeHarness(sampleWeek('29 Dic 2025', '04 Gen 2026', [{ amount: 10 }], 60), now);

  assert.equal(harness.api.rolloverPocketWeek(now), true);
  var afterFirst = JSON.stringify(harness.appData);
  assert.equal(harness.api.rolloverPocketWeek(now), false);
  assert.equal(JSON.stringify(harness.appData), afterFirst);
  assert.equal(harness.appData.historicalWeeks.length, 1);
  assert.equal(harness.appData.accumulatedSavingsFromLeftovers, 62);
});

test('reopening after multiple missed weeks archives only the saved week without creating gaps', function () {
  var now = new Date(2026, 5, 15, 12);
  var harness = makeHarness(sampleWeek('04 Gen 2026', '10 Gen 2026', [{ amount: 25 }], 60), now);

  assert.equal(harness.api.rolloverPocketWeek(now), true);
  assert.equal(harness.appData.historicalWeeks.length, 1);
  assert.equal(harness.appData.historicalWeeks[0].startDate, '04 Gen 2026');
  assert.equal(harness.appData.currentWeek.startDate, '15 Giu 2026');
  assert.equal(harness.appData.currentWeek.endDate, '21 Giu 2026');
  assert.equal(harness.appData.currentWeek.expenses.length, 0);
});

test('a week without expenses is archived with its full budget as leftover', function () {
  var now = new Date(2026, 0, 5, 12);
  var harness = makeHarness(sampleWeek('29 Dic 2025', '04 Gen 2026', [], 60), now);

  harness.api.rolloverPocketWeek(now);

  assert.equal(harness.appData.historicalWeeks[0].spent, 0);
  assert.equal(harness.appData.historicalWeeks[0].leftover, 60);
  assert.equal(harness.appData.accumulatedSavingsFromLeftovers, 72);
  assert.equal(harness.appData.achievementState.weekClosures.length, 1);
});

test('manual reset closes the active week once and ignores duplicate or future resets', function () {
  var now = new Date(2026, 0, 4, 12);
  var harness = makeHarness(sampleWeek('29 Dic 2025', '04 Gen 2026', [{ amount: 10 }], 60), now);

  harness.api.executeSundayReset();
  assert.equal(harness.appData.historicalWeeks.length, 1);
  assert.equal(harness.appData.currentWeek.startDate, '05 Gen 2026');
  assert.equal(harness.appData.currentWeek.initialBudget, 75);
  assert.equal(harness.saves(), 1);
  assert.equal(harness.modalCloses(), 1);
  assert.equal(harness.alerts.length, 1);

  var afterFirst = JSON.stringify(harness.appData);
  harness.api.executeSundayReset();
  assert.equal(JSON.stringify(harness.appData), afterFirst);
  assert.equal(harness.appData.historicalWeeks.length, 1);
  assert.equal(harness.saves(), 1);
  assert.equal(harness.modalCloses(), 2);
});

test('manual reset does not replace a week that is already archived', function () {
  var now = new Date(2026, 0, 4, 12);
  var harness = makeHarness(sampleWeek('29 Dic 2025', '04 Gen 2026', [{ amount: 10 }], 60), now);
  harness.appData.historicalWeeks.push({
    startDate: '29 Dic 2025', endDate: '04 Gen 2026',
    budget: 60, spent: 10, leftover: 50, status: 'Risparmiati'
  });
  var before = JSON.stringify(harness.appData);

  harness.api.executeSundayReset();

  assert.equal(JSON.stringify(harness.appData), before);
  assert.equal(harness.saves(), 0);
  assert.equal(harness.alerts.length, 0);
});

test('manual reset before Sunday leaves the current week and savings unchanged', function () {
  var now = new Date(2026, 0, 5, 12);
  var week = sampleWeek('05 Gen 2026', '11 Gen 2026', [{ amount: 10 }], 60);
  var harness = makeHarness(week, now);
  var beforeWeek = JSON.stringify(harness.appData.currentWeek);
  var beforeHistory = JSON.stringify(harness.appData.historicalWeeks);
  var beforeSavings = harness.appData.accumulatedSavingsFromLeftovers;

  harness.api.executeSundayReset();

  assert.equal(JSON.stringify(harness.appData.currentWeek), beforeWeek);
  assert.equal(JSON.stringify(harness.appData.historicalWeeks), beforeHistory);
  assert.equal(harness.appData.accumulatedSavingsFromLeftovers, beforeSavings);
  assert.equal(harness.saves(), 0);
  assert.equal(harness.alerts.length, 1);
  assert.match(harness.alerts[0], /solo la domenica/);
});

test('manual reset rolls an earlier saved week directly to the current week', function () {
  var now = new Date(2026, 0, 5, 12);
  var harness = makeHarness(sampleWeek('29 Dic 2025', '04 Gen 2026', [{ amount: 10 }], 60), now);

  harness.api.executeSundayReset();

  assert.equal(harness.appData.historicalWeeks.length, 1);
  assert.equal(harness.appData.currentWeek.startDate, '05 Gen 2026');
  assert.equal(harness.appData.currentWeek.initialBudget, 75);
  assert.equal(harness.appData.accumulatedSavingsFromLeftovers, 62);
  assert.equal(harness.saves(), 1);
  assert.equal(harness.alerts.length, 0);
});
