(function () {
  'use strict';

  var STORAGE_KEY = 'userbudgetpwadata';
  var TABS = ['pocket', 'monthly', 'condo', 'archive'];
  var CAT_ICONS = { 'Spesa': 'fa-cart-shopping', 'Benzina': 'fa-gas-pump', 'Caffè': 'fa-mug-hot', 'Svago': 'fa-utensils', 'Altro': 'fa-ellipsis' };
  var CATEGORIES = ['Spesa', 'Benzina', 'Caffè', 'Svago', 'Altro'];
  var CAT_ON  = 'cat-btn active bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 p-2 rounded-xl text-center flex flex-col items-center gap-1 transition';
  var CAT_OFF = 'cat-btn bg-slate-800 border border-slate-700 text-slate-400 p-2 rounded-xl text-center flex flex-col items-center gap-1 transition';
  var NAV_ON  = 'nav-btn active flex flex-col items-center py-1.5 px-2 rounded-xl text-emerald-400 transition';
  var NAV_OFF = 'nav-btn flex flex-col items-center py-1.5 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition';
  var MAX_BANK_POINTS = 800;
  var LEDGER_PAGE = 30;
  var BACKUP_REMIND_DAYS = 7;
  var MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  var DEFAULT_WEEKLY_TARGET = 0;
  var SRC = {
    opening: { label: 'Saldo iniziale', icon: 'fa-flag', del: false },
    pocket:  { label: 'Pocket', icon: 'fa-coins', del: false },
    fixed:   { label: 'Spesa fissa', icon: 'fa-file-invoice-dollar', del: true },
    extra:   { label: 'Spesa extra', icon: 'fa-plane', del: true },
    salary:  { label: 'Stipendio', icon: 'fa-money-bill-wave', del: true },
    manual:  { label: 'Movimento', icon: 'fa-right-left', del: true },
    adjust:  { label: 'Correzione', icon: 'fa-scale-balanced', del: false }
  };
  var bannerDismissed = false;
  var showAllLedger = false;
  var categoryLimitsReturnFocus = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function fmtDate(d) { return ('0' + d.getDate()).slice(-2) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function ymKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function dueDate(y, m, day) { return new Date(y, m, Math.min(Math.max(1, day), daysInMonth(y, m))); }

  function parseItDate(s) {
    var m = String(s || '').match(/(\d{1,2})\s+([A-Za-zàù]{3})\s+(\d{4})/);
    if (!m) return null;
    var mi = MONTHS.indexOf(m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase());
    if (mi < 0) return null;
    return new Date(Number(m[3]), mi, Number(m[1]));
  }

  /* data digitata dall'utente: gg/mm o gg/mm/aaaa. '' => null, non valida => false */
  function parseUserDate(str) {
    var s = String(str === null || str === undefined ? '' : str).trim();
    if (!s) return null;
    var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
    if (!m) return false;
    var day = Number(m[1]), mon = Number(m[2]) - 1;
    var year = m[3] ? Number(m[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    var d = new Date(year, mon, day);
    if (d.getFullYear() !== year || d.getMonth() !== mon || d.getDate() !== day) return false;
    return d;
  }
  function parseDay(str) {
    var s = String(str === null || str === undefined ? '' : str).trim();
    if (!s) return null;
    var n = parseInt(s, 10);
    if (isNaN(n) || n < 1 || n > 31) return false;
    return n;
  }
  function isoOf(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function fromIso(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  function fmtDM(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function fmtDMY(d) { return fmtDM(d) + '/' + d.getFullYear(); }

  function thisWeekRange(now) {
    var d = now || new Date();
    var back = (d.getDay() + 6) % 7;
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return [fmtDate(start), fmtDate(end)];
  }
  function nextWeekRange(now) {
    var d = now || new Date();
    var toMonday = ((8 - d.getDay()) % 7) || 7;
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + toMonday);
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return [fmtDate(start), fmtDate(end)];
  }

  function makeDefault() {
    var r = thisWeekRange();
    return {
      bankBalance: 0,
      bankHistory: [{ id: uid(), t: Date.now(), delta: 0, balance: 0, note: 'Saldo iniziale', src: 'opening', opening: true }],
      monthlyIncome: 0,
      salaryDay: null,
      salarySince: ymKey(new Date()),
      salaryPosted: [],
      accumulatedSavingsFromLeftovers: 0,
      weeklyTarget: DEFAULT_WEEKLY_TARGET,
      currentCategory: 'Spesa',
      lastBackup: null,
      currentWeek: { startDate: r[0], endDate: r[1], initialBudget: DEFAULT_WEEKLY_TARGET, expenses: [] },
      fixedExpenses: [],
      extraExpenses: [],
      historicalWeeks: [],
      categoryLimits: {}
    };
  }

  /* ---------- registro del conto: il saldo è sempre la somma dei movimenti ---------- */
  function recomputeBankOn(d) {
    var dec = d.bankHistory.map(function (e, i) { return { e: e, i: i }; });
    dec.sort(function (a, b) { return (a.e.t - b.e.t) || (a.i - b.i); });
    var run = 0;
    d.bankHistory = dec.map(function (x) {
      run = round2(run + (Number(x.e.delta) || 0));
      x.e.balance = run;
      return x.e;
    });
    d.bankBalance = run;
  }
  function inferSrc(e) {
    var n = String(e.note || '');
    if (e.opening || /^Saldo iniziale/.test(n)) return 'opening';
    if (/^Spesa:/.test(n)) return 'pocket';
    if (/^Annullata:|^Modifica manuale|^Correzione|^Settimana passata/.test(n)) return 'adjust';
    return 'manual';
  }
  function normBank(d) {
    if (!Array.isArray(d.bankHistory) || !d.bankHistory.length) {
      d.bankHistory = [{ id: uid(), t: Date.now(), delta: round2(parseFloat(d.bankBalance) || 0), balance: 0, note: 'Saldo iniziale', src: 'opening', opening: true }];
    } else {
      d.bankHistory.forEach(function (e) {
        if (!e.id) e.id = uid();
        if (typeof e.t !== 'number') e.t = Date.now();
        e.delta = Number(e.delta) || 0;
        if (!e.src) e.src = inferSrc(e);
      });
      if (!d.bankHistory.some(function (e) { return e.opening; })) {
        var first = d.bankHistory[0];
        first.opening = true; first.src = 'opening';
        first.delta = round2(Number(first.balance) || 0);
      }
    }
    recomputeBankOn(d);
  }

  function normalize(d) {
    var base = makeDefault();
    if (!d || typeof d !== 'object') return base;
    var nowKey = ymKey(new Date());
    for (var k in base) { if (k !== 'bankHistory' && (d[k] === undefined || d[k] === null) && k !== 'salaryDay' && k !== 'lastBackup') d[k] = base[k]; }
    if (!d.categoryLimits || typeof d.categoryLimits !== 'object' || Array.isArray(d.categoryLimits)) d.categoryLimits = {};
    if (d.salaryDay === undefined) d.salaryDay = null;
    if (d.lastBackup === undefined) d.lastBackup = null;
    if (!d.currentWeek || typeof d.currentWeek !== 'object') d.currentWeek = base.currentWeek;
    if (!Array.isArray(d.currentWeek.expenses)) d.currentWeek.expenses = [];
    if (typeof d.currentWeek.initialBudget !== 'number') d.currentWeek.initialBudget = d.weeklyTarget;
    ['fixedExpenses', 'extraExpenses', 'historicalWeeks', 'salaryPosted'].forEach(function (key) {
      if (!Array.isArray(d[key])) d[key] = [];
    });
    d.fixedExpenses.forEach(function (f) {
      if (f.day === undefined || f.day === '') f.day = null;
      if (!f.since) f.since = nowKey;
      if (!Array.isArray(f.posted)) f.posted = [];
    });
    d.extraExpenses.forEach(function (x) {
      if (x.date === undefined || x.date === '') x.date = null;
      if (x.posted === undefined) x.posted = false;
    });
    if (!d.salarySince) d.salarySince = nowKey;
    d.bankBalance = parseFloat(d.bankBalance) || 0;
    normBank(d);
    return d;
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) { return makeDefault(); }
  }

  var appData = loadData();

  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); } catch (e) {}
    renderAll();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function eur(n) { return Number(n || 0).toFixed(2).replace('.', ',') + ' €'; }
  function eurSigned(n) { return (n >= 0 ? '+' : '-') + eur(Math.abs(n)); }
  function sum(arr) { return arr.reduce(function (a, i) { return a + (Number(i.amount) || 0); }, 0); }
  function byId(id) { return document.getElementById(id); }
  function parseNum(v) { return parseFloat(String(v).replace(',', '.')); }
  function fmtShort(t) { return new Date(t).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }); }
  function fmtFull(t) {
    var d = new Date(t);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function pushBank(delta, note, opts) {
    opts = opts || {};
    appData.bankHistory.push({
      id: uid(), t: typeof opts.t === 'number' ? opts.t : Date.now(),
      delta: round2(delta), balance: 0, note: note, src: opts.src || 'manual',
      refId: opts.refId === undefined ? null : opts.refId
    });
    if (appData.bankHistory.length > MAX_BANK_POINTS) {
      var n = appData.bankHistory.length - MAX_BANK_POINTS + 1;
      recomputeBankOn(appData);
      var folded = appData.bankHistory.slice(0, n);
      var total = folded.reduce(function (a, e) { return a + e.delta; }, 0);
      var lastT = folded[folded.length - 1].t;
      appData.bankHistory = [{ id: uid(), t: lastT, delta: round2(total), balance: 0, note: 'Saldo iniziale (storico compattato)', src: 'opening', opening: true }]
        .concat(appData.bankHistory.slice(n));
    }
    recomputeBankOn(appData);
  }
  function adjustBank(delta, note, opts) { pushBank(delta, note, opts); }

  function setBankManually(newVal) {
    var old = parseFloat(appData.bankBalance) || 0;
    newVal = round2(newVal);
    var delta = round2(newVal - old);
    if (delta === 0) return;
    pushBank(delta, 'Correzione saldo (allineamento con la banca)', { src: 'adjust' });
    saveData();
  }

  function addBankMovement(sign) {
    var amount = parseNum(prompt(sign > 0 ? 'Importo entrata (€):' : 'Importo uscita (€):'));
    if (isNaN(amount) || amount <= 0) return;
    var note = prompt('Descrizione:', sign > 0 ? 'Entrata' : 'Uscita');
    if (note === null) return;
    var dRaw = prompt('Data (gg/mm o gg/mm/aaaa) — facoltativa, vuoto = oggi:', '');
    if (dRaw === null) return;
    var d = parseUserDate(dRaw);
    if (d === false) { alert('Data non valida. Usa il formato gg/mm o gg/mm/aaaa.'); return; }
    var t = Date.now();
    if (d) {
      var noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0).getTime();
      t = (isoOf(d) === isoOf(new Date())) ? Date.now() : noon;
    }
    adjustBank(sign * amount, note.trim() || (sign > 0 ? 'Entrata' : 'Uscita'), { src: 'manual', t: t });
    saveData();
  }

  function deleteBankEntry(id) {
    var e = appData.bankHistory.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    var meta = SRC[e.src] || SRC.manual;
    if (!meta.del) { alert('Questo movimento non si elimina da qui. Per le spese pocket usa la scheda Pocket; per sistemare il saldo usa la correzione.'); return; }
    if (!confirm('Eliminare il movimento "' + e.note + '" (' + eurSigned(e.delta) + ')?')) return;
    appData.bankHistory = appData.bankHistory.filter(function (x) { return x.id !== id; });
    recomputeBankOn(appData);
    saveData();
  }

  /* ---------- addebiti ricorrenti (spese fisse, stipendio, extra) ---------- */
  function monthsBetween(sinceKey, now) {
    var m = String(sinceKey || '').match(/^(\d{4})-(\d{2})$/);
    var y = m ? Number(m[1]) : now.getFullYear();
    var mo = m ? Number(m[2]) - 1 : now.getMonth();
    var out = [], guard = 0;
    while ((y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth())) && guard < 60) {
      out.push([y, mo]);
      mo++; if (mo > 11) { mo = 0; y++; }
      guard++;
    }
    return out;
  }

  function processRecurring(now) {
    now = now || new Date();
    var today = startOfDay(now).getTime(), nowT = now.getTime(), changed = false;

    appData.fixedExpenses.forEach(function (f) {
      if (!f.day) return;
      monthsBetween(f.since, now).forEach(function (ym) {
        var key = ym[0] + '-' + ('0' + (ym[1] + 1)).slice(-2);
        if (f.posted.indexOf(key) >= 0) return;
        var due = dueDate(ym[0], ym[1], f.day);
        if (due.getTime() <= today) {
          var t = Math.min(new Date(due.getFullYear(), due.getMonth(), due.getDate(), 12, 0).getTime(), nowT);
          pushBank(-f.amount, 'Spesa fissa: ' + f.name, { src: 'fixed', refId: f.id, t: t });
          f.posted.push(key); changed = true;
        }
      });
    });

    var inc = parseFloat(appData.monthlyIncome) || 0;
    if (appData.salaryDay && inc > 0) {
      monthsBetween(appData.salarySince, now).forEach(function (ym) {
        var key = ym[0] + '-' + ('0' + (ym[1] + 1)).slice(-2);
        if (appData.salaryPosted.indexOf(key) >= 0) return;
        var due = dueDate(ym[0], ym[1], appData.salaryDay);
        if (due.getTime() <= today) {
          var t = Math.min(new Date(due.getFullYear(), due.getMonth(), due.getDate(), 12, 0).getTime(), nowT);
          pushBank(inc, 'Stipendio', { src: 'salary', t: t });
          appData.salaryPosted.push(key); changed = true;
        }
      });
    }

    appData.extraExpenses.forEach(function (x) {
      if (x.posted || !x.date) return;
      var d = fromIso(x.date);
      if (d && d.getTime() <= today) {
        var t = Math.min(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0).getTime(), nowT);
        pushBank(-x.amount, 'Spesa extra: ' + x.name, { src: 'extra', refId: x.id, t: t });
        x.posted = true; changed = true;
      }
    });
    return changed;
  }

  function postFixedNow(id) {
    var f = appData.fixedExpenses.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    var key = ymKey(new Date());
    if (f.posted.indexOf(key) >= 0) return;
    pushBank(-f.amount, 'Spesa fissa: ' + f.name, { src: 'fixed', refId: f.id });
    f.posted.push(key);
    saveData();
  }
  function postExtraNow(id) {
    var x = appData.extraExpenses.filter(function (e) { return e.id === id; })[0];
    if (!x || x.posted) return;
    pushBank(-x.amount, 'Spesa extra: ' + x.name, { src: 'extra', refId: x.id });
    x.posted = true;
    saveData();
  }
  function postSalaryNow() {
    var inc = parseFloat(appData.monthlyIncome) || 0;
    var key = ymKey(new Date());
    if (inc <= 0 || appData.salaryPosted.indexOf(key) >= 0) return;
    pushBank(inc, 'Stipendio', { src: 'salary' });
    appData.salaryPosted.push(key);
    saveData();
  }

  function computeUpcoming(now) {
    now = now || new Date();
    var key = ymKey(now), today = startOfDay(now).getTime(), items = [];
    appData.fixedExpenses.forEach(function (f) {
      if (f.posted.indexOf(key) >= 0) return;
      var due = f.day ? dueDate(now.getFullYear(), now.getMonth(), f.day) : null;
      if (due && due.getTime() <= today) return;
      items.push({ kind: 'fixed', id: f.id, name: f.name, amount: -f.amount, date: due });
    });
    var inc = parseFloat(appData.monthlyIncome) || 0;
    if (inc > 0 && appData.salaryPosted.indexOf(key) < 0) {
      var sd = appData.salaryDay ? dueDate(now.getFullYear(), now.getMonth(), appData.salaryDay) : null;
      if (!(sd && sd.getTime() <= today)) items.push({ kind: 'salary', id: 'salary', name: 'Stipendio', amount: inc, date: sd });
    }
    appData.extraExpenses.forEach(function (x) {
      if (x.posted) return;
      var d = x.date ? fromIso(x.date) : null;
      if (d && d.getTime() <= today) return;
      if (d && ymKey(d) !== key) return;
      items.push({ kind: 'extra', id: x.id, name: x.name, amount: -x.amount, date: d });
    });
    items.sort(function (a, b) {
      var ta = a.date ? a.date.getTime() : Infinity, tb = b.date ? b.date.getTime() : Infinity;
      return ta - tb;
    });
    var delta = items.reduce(function (a, i) { return a + i.amount; }, 0);
    return { items: items, projected: round2((parseFloat(appData.bankBalance) || 0) + delta), delta: round2(delta) };
  }

  /* ---------- pocket mensile ---------- */
  function sundaysInMonth(y, m) {
    var count = 0, n = new Date(y, m + 1, 0).getDate();
    for (var d = 1; d <= n; d++) { if (new Date(y, m, d).getDay() === 0) count++; }
    return count;
  }
  function monthlyPocketForecast(now) {
    var n = now || new Date(), y = n.getFullYear(), m = n.getMonth();
    var closed = 0, closedSpent = 0;
    appData.historicalWeeks.forEach(function (h) {
      var end = parseItDate(h.endDate);
      if (end && end.getFullYear() === y && end.getMonth() === m) {
        closed++;
        closedSpent += Number(h.spent) || 0;
      }
    });
    var cw = appData.currentWeek;
    var cEnd = parseItDate(cw.endDate);
    var cwIn = !!(cEnd && cEnd.getFullYear() === y && cEnd.getMonth() === m);
    var curr = cwIn ? Math.max(Number(cw.initialBudget) || 0, sum(cw.expenses)) : 0;
    var totalWeeks = sundaysInMonth(y, m);
    var future = Math.max(0, totalWeeks - closed - (cwIn ? 1 : 0));
    var target = parseFloat(appData.weeklyTarget) || 0;
    var futureAmt = future * target;
    return {
      total: round2(closedSpent + curr + futureAmt),
      closed: closed, closedSpent: round2(closedSpent),
      cwIn: cwIn, curr: round2(curr),
      future: future, futureAmt: round2(futureAmt),
      totalWeeks: totalWeeks
    };
  }

  /* ---------- settimane chiuse ---------- */
  function editClosedWeek(idx) {
    var h = appData.historicalWeeks[idx];
    if (!h) return;
    var oldSpent = Number(h.spent) || 0;
    var oldLeft = Number(h.leftover) || 0;
    var oldBudget = (typeof h.budget === 'number') ? h.budget : round2(oldSpent + oldLeft);
    var label = h.startDate + ' - ' + h.endDate;

    var b = parseNum(prompt('Settimana ' + label + '\n\nBudget pocket money di quella settimana (€):', oldBudget));
    if (isNaN(b) || b < 0) return;
    var s = parseNum(prompt('Settimana ' + label + '\n\nSpeso reale in quella settimana (€):', oldSpent));
    if (isNaN(s) || s < 0) return;
    b = round2(b); s = round2(s);

    var newLeft = round2(b - s);
    var spentDiff = round2(s - oldSpent);
    var adjustAccount = false;
    if (spentDiff !== 0) {
      adjustAccount = confirm('Il speso cambia di ' + eurSigned(spentDiff) + '.\n\nAggiornare anche il saldo del conto (' + eurSigned(-spentDiff) + ')?\n\nOK = sì, aggiorna il conto\nAnnulla = no, solo la settimana');
    }
    if (!confirm('Confermi la correzione?\n\nBudget ' + eur(b) + '\nSpeso ' + eur(s) + '\nAvanzo ' + eur(newLeft))) return;

    h.budget = b;
    h.spent = s;
    h.leftover = newLeft;
    h.status = newLeft >= 0 ? 'Risparmiati' : 'Sforato';
    appData.accumulatedSavingsFromLeftovers = round2((parseFloat(appData.accumulatedSavingsFromLeftovers) || 0) + (newLeft - oldLeft));
    if (adjustAccount) adjustBank(-spentDiff, 'Correzione settimana ' + label, { src: 'adjust' });
    saveData();
  }

  function weekRangeBefore(nWeeksAgo) {
    var base = parseItDate(appData.currentWeek.startDate);
    if (!base) { base = parseItDate(thisWeekRange()[0]); }
    var start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 7 * nWeeksAgo);
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return [fmtDate(start), fmtDate(end)];
  }

  function addPastWeek() {
    var nRaw = prompt('Quale settimana vuoi aggiungere?\n\n1 = settimana scorsa\n2 = due settimane fa\n3 = tre settimane fa …', '1');
    if (nRaw === null) return;
    var n = parseInt(nRaw, 10);
    if (isNaN(n) || n < 1 || n > 52) { alert('Inserisci un numero da 1 a 52.'); return; }
    var r = weekRangeBefore(n);
    var label = r[0] + ' - ' + r[1];

    var exists = appData.historicalWeeks.some(function (h) { return h.startDate === r[0]; });
    if (exists) { alert('La settimana ' + label + ' è già nello storico: usa la matita per correggerla.'); return; }

    var b = parseNum(prompt('Settimana ' + label + '\n\nBudget pocket money di quella settimana (€):', appData.weeklyTarget));
    if (isNaN(b) || b < 0) return;
    var s = parseNum(prompt('Settimana ' + label + '\n\nSpeso reale in quella settimana (€):', 0));
    if (isNaN(s) || s < 0) return;
    b = round2(b); s = round2(s);
    var left = round2(b - s);

    var adjustAccount = false;
    if (s > 0) {
      adjustAccount = confirm('Scalare anche ' + eur(s) + ' dal saldo del conto?\n\nOK = sì\nAnnulla = no (il conto è già aggiornato)');
    }
    if (!confirm('Aggiungere la settimana ' + label + '?\n\nBudget ' + eur(b) + '\nSpeso ' + eur(s) + '\nAvanzo ' + eur(left))) return;

    appData.historicalWeeks.push({
      startDate: r[0], endDate: r[1],
      budget: b, spent: s, leftover: left,
      status: left >= 0 ? 'Risparmiati' : 'Sforato'
    });
    appData.historicalWeeks.sort(function (a, c) {
      var da = parseItDate(a.startDate), dc = parseItDate(c.startDate);
      return (dc ? dc.getTime() : 0) - (da ? da.getTime() : 0);
    });
    appData.accumulatedSavingsFromLeftovers = round2((parseFloat(appData.accumulatedSavingsFromLeftovers) || 0) + left);
    if (adjustAccount) {
      var end = parseItDate(r[1]);
      var t = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0).getTime() : Date.now();
      adjustBank(-s, 'Pocket settimana ' + label, { src: 'adjust', t: Math.min(t, Date.now()) });
    }
    saveData();
  }

  /* ---------- rendering conto ---------- */
  function renderBankChart() {
    var el = byId('bankChart');
    var pts = appData.bankHistory.slice(-40);
    if (pts.length < 2) {
      el.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">Il grafico apparirà dopo il primo movimento sul conto.</p>';
      byId('bankTrend').textContent = '';
      return;
    }
    var W = 300, H = 150, pl = 6, pr = 6, pt = 18, pb = 20;
    var vals = pts.map(function (p) { return p.balance; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max === min) { max += 1; min -= 1; }
    var m = (max - min) * 0.12; min -= m; max += m;
    var n = pts.length;
    function X(i) { return pl + i * (W - pl - pr) / (n - 1); }
    function Y(v) { return pt + (1 - (v - min) / (max - min)) * (H - pt - pb); }

    var first = vals[0], last = vals[n - 1];
    var col = last >= first ? '#34d399' : '#fb7185';

    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.balance).toFixed(1); }).join(' ');
    var area = line + ' L' + X(n - 1).toFixed(1) + ' ' + (H - pb) + ' L' + X(0).toFixed(1) + ' ' + (H - pb) + ' Z';

    var vmin = Math.min.apply(null, vals), vmax = Math.max.apply(null, vals);
    var iMin = vals.indexOf(vmin), iMax = vals.indexOf(vmax);
    function label(i, v, above) {
      var x = X(i), anchor = x < 60 ? 'start' : (x > W - 60 ? 'end' : 'middle');
      return '<text x="' + x.toFixed(1) + '" y="' + (Y(v) + (above ? -6 : 12)).toFixed(1) + '" text-anchor="' + anchor + '" fill="#94a3b8" font-size="8">' + Math.round(v) + ' €</text>';
    }
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.balance).toFixed(1) + '" r="' + (i === n - 1 ? 3.5 : 1.8) + '" fill="' + col + '"></circle>';
    }).join('');

    el.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full" style="height:auto">' +
        '<defs><linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + col + '" stop-opacity="0.35"></stop><stop offset="100%" stop-color="' + col + '" stop-opacity="0"></stop></linearGradient></defs>' +
        '<line x1="' + pl + '" y1="' + (H - pb) + '" x2="' + (W - pr) + '" y2="' + (H - pb) + '" stroke="#334155" stroke-width="0.6"></line>' +
        '<path d="' + area + '" fill="url(#bankGrad)"></path>' +
        '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>' +
        dots + label(iMax, vmax, true) + (iMin !== iMax ? label(iMin, vmin, false) : '') +
        '<text x="' + pl + '" y="' + (H - 6) + '" fill="#64748b" font-size="8">' + fmtShort(pts[0].t) + '</text>' +
        '<text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" fill="#64748b" font-size="8">' + fmtShort(pts[n - 1].t) + '</text>' +
      '</svg>';

    var diff = round2(last - first);
    var tr = byId('bankTrend');
    tr.textContent = eurSigned(diff);
    tr.className = 'text-11px font-semibold ' + (diff >= 0 ? 'text-emerald-400' : 'text-rose-400');
  }

  function renderBankMovements() {
    var el = byId('bankMovements');
    var all = appData.bankHistory.slice().reverse();
    var list = showAllLedger ? all : all.slice(0, LEDGER_PAGE);
    el.innerHTML = list.map(function (p) {
      var d = p.delta || 0;
      var meta = SRC[p.src] || SRC.manual;
      var cls = d > 0 ? 'text-emerald-400' : (d < 0 ? 'text-rose-400' : 'text-slate-400');
      return '<div class="glass-card rounded-xl px-3 py-2 flex items-center gap-3 border border-slate-800">' +
        '<div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs shrink-0"><i class="fa-solid ' + meta.icon + '"></i></div>' +
        '<div class="min-w-0 flex-1"><p class="text-xs font-medium text-slate-200 truncate">' + esc(p.note) + '</p>' +
        '<p class="text-10px text-slate-500">' + meta.label + ' · ' + fmtFull(p.t) + '</p></div>' +
        '<div class="text-right shrink-0"><p class="text-xs font-bold ' + cls + '">' + (d === 0 ? '—' : eurSigned(d)) + '</p>' +
        '<p class="text-10px text-slate-500">' + eur(p.balance) + '</p></div>' +
        (meta.del ? '<button type="button" data-del-bank="' + p.id + '" class="text-slate-600 hover:text-rose-400 text-xs p-1"><i class="fa-solid fa-trash"></i></button>' : '') +
        '</div>';
    }).join('');
    var tg = byId('ledgerToggle');
    if (all.length > LEDGER_PAGE) {
      tg.classList.remove('hidden');
      tg.textContent = showAllLedger ? 'Mostra solo gli ultimi ' + LEDGER_PAGE : 'Mostra tutti (' + all.length + ')';
    } else { tg.classList.add('hidden'); }
  }
  function toggleLedger() { showAllLedger = !showAllLedger; renderBankMovements(); }

  function renderUpcoming() {
    var u = computeUpcoming();
    var pl = byId('projectedLine');
    var neg = u.projected < 0;
    pl.innerHTML = 'Saldo previsto a fine mese: <strong class="' + (neg ? 'text-rose-400' : 'text-slate-200') + '">' + eur(u.projected) + '</strong>' +
      (u.items.length ? ' <span class="text-slate-500">(' + eurSigned(u.delta) + ' ancora da registrare)</span>' : '') +
      (neg ? '<br><span class="text-rose-400">Attenzione: a fine mese il conto andrebbe in rosso.</span>' : '');
    var el = byId('upcomingList');
    if (!u.items.length) {
      el.innerHTML = '<p class="text-11px text-slate-500 italic">Nessun movimento in programma per questo mese.</p>';
      return;
    }
    el.innerHTML = u.items.map(function (i) {
      var meta = SRC[i.kind];
      var attr = i.kind === 'fixed' ? 'data-post-fixed="' + i.id + '"' : (i.kind === 'extra' ? 'data-post-extra="' + i.id + '"' : 'data-post-salary="1"');
      var when = i.date ? fmtDM(i.date) : 'senza data';
      var btnLabel = i.kind === 'salary' ? 'Accredita' : 'Addebita';
      return '<div class="glass-card rounded-xl px-3 py-2 flex items-center gap-3 border border-slate-800">' +
        '<div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs shrink-0"><i class="fa-solid ' + meta.icon + '"></i></div>' +
        '<div class="min-w-0 flex-1"><p class="text-xs font-medium text-slate-200 truncate">' + esc(i.name) + '</p>' +
        '<p class="text-10px text-slate-500">' + meta.label + ' · ' + when + '</p></div>' +
        '<span class="text-xs font-bold ' + (i.amount >= 0 ? 'text-emerald-400' : 'text-rose-400') + '">' + eurSigned(i.amount) + '</span>' +
        '<button type="button" ' + attr + ' class="text-10px bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded-lg shrink-0">' + btnLabel + '</button></div>';
    }).join('');
  }

  function renderCondoTab() {
    var inp = byId('bankBalanceInput');
    if (document.activeElement !== inp) inp.value = round2(appData.bankBalance);
    renderUpcoming();
    renderBankChart();
    renderBankMovements();
  }

  function switchTab(tabId) {
    TABS.forEach(function (id) {
      var t = byId('tab-' + id), b = byId('nav-' + id);
      if (t) t.classList.add('hidden');
      if (b) b.className = NAV_OFF;
    });
    var tab = byId('tab-' + tabId), btn = byId('nav-' + tabId);
    if (tab) tab.classList.remove('hidden');
    if (btn) btn.className = NAV_ON;
    try { sessionStorage.setItem('activeTab', tabId); } catch (e) {}
    window.scrollTo(0, 0);
  }

  function selectCategory(cat) {
    appData.currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(function (b) {
      b.className = (b.getAttribute('data-cat') === cat) ? CAT_ON : CAT_OFF;
    });
  }

  function handleAddExpense(e) {
    e.preventDefault();
    var titleEl = byId('expenseTitle'), amountEl = byId('expenseAmount');
    var title = titleEl.value.trim();
    var amount = parseNum(amountEl.value);
    if (!title || isNaN(amount) || amount <= 0) return;
    var id = Date.now();
    appData.currentWeek.expenses.unshift({
      id: id, title: title, amount: amount,
      category: appData.currentCategory || 'Spesa',
      date: new Date().toLocaleDateString('it-IT')
    });
    adjustBank(-amount, 'Pocket: ' + title, { src: 'pocket', refId: id });
    titleEl.value = ''; amountEl.value = '';
    saveData();
  }

  function deleteWeeklyExpense(id) {
    var exp = appData.currentWeek.expenses.filter(function (x) { return x.id === id; })[0];
    if (!exp) return;
    appData.currentWeek.expenses = appData.currentWeek.expenses.filter(function (x) { return x.id !== id; });
    var linked = appData.bankHistory.filter(function (e) { return e.src === 'pocket' && e.refId === id; })[0];
    if (linked) {
      appData.bankHistory = appData.bankHistory.filter(function (e) { return e !== linked; });
      recomputeBankOn(appData);
    } else {
      adjustBank(exp.amount, 'Annullata: ' + exp.title, { src: 'adjust' });
    }
    saveData();
  }

  function editWeeklyTarget() {
    var v = parseNum(prompt('Nuovo pocket money settimanale (€):', appData.weeklyTarget));
    if (isNaN(v) || v < 0) return;
    v = round2(v);
    var spent = sum(appData.currentWeek.expenses);
    var applyNow = confirm('Impostare ' + eur(v) + ' anche per la settimana in corso?\n\nOK = sì, subito (spesi finora: ' + eur(spent) + ')\nAnnulla = solo dalla prossima settimana');
    appData.weeklyTarget = v;
    if (applyNow) appData.currentWeek.initialBudget = v;
    saveData();
  }

  function renderPocketTab() {
    var w = appData.currentWeek;
    var spent = sum(w.expenses);
    var remaining = w.initialBudget - spent;
    var pct = w.initialBudget > 0 ? Math.max(0, Math.min(100, (remaining / w.initialBudget) * 100)) : 0;

    byId('headerDateRange').textContent = 'Ciclo ' + w.startDate + ' - ' + w.endDate;
    byId('weeklyBudgetBadge').innerHTML = 'Target ' + eur(appData.weeklyTarget) + ' <i class="fa-solid fa-pen text-10px text-emerald-400 ml-1"></i>';

    var remEl = byId('pocketRemaining'), bar = byId('pocketProgressBar');
    remEl.textContent = eur(remaining);
    bar.style.width = pct + '%';
    var color = pct > 50 ? 'emerald' : (pct > 20 ? 'amber' : 'rose');
    if (w.initialBudget <= 0 && remaining >= 0) color = 'emerald';
    remEl.className = 'text-4xl font-extrabold tracking-tight ' + { emerald: 'text-emerald-400', amber: 'text-amber-400', rose: 'text-rose-500' }[color];
    bar.className = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' }[color] + ' h-full rounded-full transition-all duration-500 ease-out';

    byId('pocketSpent').textContent = eur(spent);
    byId('pocketInitial').textContent = eur(w.initialBudget);
    byId('expenseCount').textContent = w.expenses.length + (w.expenses.length === 1 ? ' transazione' : ' transazioni');
    renderCategoryLimits();

    var list = byId('weeklyTransactionsList');
    if (!w.expenses.length) {
      list.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Nessuna spesa registrata in questa settimana.</p>';
      return;
    }
    list.innerHTML = w.expenses.map(function (x) {
      var icon = CAT_ICONS[x.category] || 'fa-cart-shopping';
      return '<div class="glass-card rounded-xl p-3 flex items-center justify-between border border-slate-800">' +
        '<div class="flex items-center gap-3">' +
          '<div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs"><i class="fa-solid ' + icon + '"></i></div>' +
          '<div><p class="text-xs font-bold text-slate-200">' + esc(x.title) + '</p>' +
          '<p class="text-10px text-slate-400">' + esc(x.category) + ' • ' + esc(x.date) + '</p></div>' +
        '</div>' +
        '<div class="flex items-center gap-3">' +
          '<span class="text-xs font-black text-rose-400">-' + eur(x.amount) + '</span>' +
          '<button type="button" data-del-week="' + x.id + '" class="text-slate-500 hover:text-rose-400 text-xs p-1"><i class="fa-solid fa-xmark"></i></button>' +
        '</div></div>';
    }).join('');
  }

  function renderCategoryLimits() {
    var el = byId('categoryLimitsList');
    var active = CATEGORIES.filter(function (category) {
      return Number(appData.categoryLimits[category]) > 0;
    });
    if (!active.length) {
      el.innerHTML = '<p class="text-11px text-slate-500">Imposta un limite facoltativo per monitorare le spese della settimana.</p>';
      return;
    }
    el.innerHTML = active.map(function (category) {
      var limit = Number(appData.categoryLimits[category]);
      var spent = round2(appData.currentWeek.expenses.reduce(function (total, expense) {
        return expense.category === category ? total + (Number(expense.amount) || 0) : total;
      }, 0));
      var percentage = limit > 0 ? (spent / limit) * 100 : 0;
      var progress = Math.min(100, percentage);
      var color = percentage >= 100 ? 'rose' : (percentage >= 80 ? 'amber' : 'emerald');
      var fillClass = {
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500'
      }[color];
      return '<div>' +
        '<div class="flex items-center justify-between gap-3 mb-1.5">' +
          '<span class="text-xs font-medium text-slate-200"><i class="fa-solid ' + CAT_ICONS[category] + ' w-5 text-slate-400" aria-hidden="true"></i>' + category + '</span>' +
          '<span class="text-11px font-semibold text-slate-300">' + eur(spent) + ' / ' + eur(limit) + '</span>' +
        '</div>' +
        '<div class="category-limit-track" role="progressbar" aria-label="' + category + ': speso ' + eur(spent) + ' su ' + eur(limit) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.min(100, percentage).toFixed(0) + '">' +
          '<div class="category-limit-progress ' + fillClass + '" style="width:' + progress + '%"></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function openCategoryLimitsModal() {
    categoryLimitsReturnFocus = document.activeElement;
    CATEGORIES.forEach(function (category) {
      var input = byId('categoryLimit-' + category);
      input.value = Number(appData.categoryLimits[category]) > 0 ? appData.categoryLimits[category] : '';
      input.setCustomValidity('');
    });
    var modal = byId('categoryLimitsModal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    byId('categoryLimit-Spesa').focus();
  }

  function closeCategoryLimitsModal() {
    var modal = byId('categoryLimitsModal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (categoryLimitsReturnFocus && document.contains(categoryLimitsReturnFocus)) categoryLimitsReturnFocus.focus();
    categoryLimitsReturnFocus = null;
  }

  function saveCategoryLimits(e) {
    e.preventDefault();
    var limits = {};
    var invalidInput = null;
    CATEGORIES.forEach(function (category) {
      var input = byId('categoryLimit-' + category);
      input.setCustomValidity('');
      if (input.value === '') {
        if (!input.validity.valid) {
          input.setCustomValidity('Inserisci un importo valido e non negativo.');
          invalidInput = invalidInput || input;
        }
        return;
      }
      var value = parseNum(input.value);
      if (!input.validity.valid || !isFinite(value) || value < 0) {
        input.setCustomValidity('Inserisci un importo valido e non negativo.');
        invalidInput = invalidInput || input;
        return;
      }
      if (value > 0) limits[category] = round2(value);
    });
    if (invalidInput) {
      invalidInput.reportValidity();
      return;
    }
    appData.categoryLimits = limits;
    saveData();
    closeCategoryLimitsModal();
  }

  function handleCategoryLimitsModalKeydown(e) {
    var modal = byId('categoryLimitsModal');
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCategoryLimitsModal();
      return;
    }
    if (e.key !== 'Tab') return;
    var focusable = modal.querySelectorAll('button:not([disabled]), input:not([disabled])');
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function renderDonut(income, fixed, pocket, extra, net) {
    var svg = byId('donutSvg'), legend = byId('donutLegend');
    var segs = [
      { label: 'Spese fisse', val: fixed, color: '#38bdf8' },
      { label: 'Pocket money', val: Math.max(0, pocket), color: '#fbbf24' },
      { label: 'Extra', val: extra, color: '#fb7185' },
      { label: 'Risparmio', val: Math.max(0, net), color: '#34d399' }
    ];
    var total = segs.reduce(function (a, s) { return a + s.val; }, 0);
    var r = 40, C = 2 * Math.PI * r, offset = 0;
    var html = '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="#1e293b" stroke-width="14"></circle>';
    if (total > 0) {
      segs.forEach(function (s) {
        if (s.val <= 0) return;
        var len = (s.val / total) * C;
        html += '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="14" ' +
          'stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"></circle>';
        offset += len;
      });
    }
    svg.innerHTML = html;
    byId('donutCenterValue').textContent = (income > 0 ? Math.round((net / income) * 100) : 0) + '%';
    legend.innerHTML = segs.map(function (s) {
      var p = total > 0 ? Math.round((s.val / total) * 100) : 0;
      return '<div class="flex items-center justify-between gap-2"><span class="flex items-center gap-1.5 text-slate-300">' +
        '<span class="inline-block w-2.5 h-2.5 rounded-full" style="background:' + s.color + '"></span>' + s.label + '</span>' +
        '<span class="text-slate-400">' + p + '% · ' + eur(s.val) + '</span></div>';
    }).join('') + (net < 0 ? '<p class="text-10px text-rose-400 pt-1">Attenzione: le uscite superano lo stipendio di ' + eur(-net) + '</p>' : '');
  }

  function renderMonthlyTab() {
    var inp = byId('monthlyIncomeInput');
    if (document.activeElement !== inp) inp.value = appData.monthlyIncome;
    var sdi = byId('salaryDayInput');
    if (document.activeElement !== sdi) sdi.value = appData.salaryDay || '';

    var key = ymKey(new Date());
    var fixedEl = byId('fixedExpensesList');
    if (!appData.fixedExpenses.length) {
      fixedEl.innerHTML = '<p class="text-11px text-slate-500 italic">Nessuna spesa fissa inserita.</p>';
    } else {
      fixedEl.innerHTML = appData.fixedExpenses.map(function (x) {
        var posted = x.posted.indexOf(key) >= 0;
        var sub = (x.day ? 'ogni mese il ' + x.day : 'senza data') + (posted ? ' · ✓ addebitata questo mese' : '');
        return '<div class="glass-card rounded-xl px-3 py-2 flex items-center justify-between border border-slate-800">' +
          '<div class="min-w-0"><p class="text-xs font-medium text-slate-300 truncate">' + esc(x.name) + '</p>' +
          '<p class="text-10px text-slate-500">' + sub + '</p></div>' +
          '<div class="flex items-center gap-2 shrink-0"><span class="text-xs font-bold text-sky-300">-' + eur(x.amount) + '</span>' +
          '<button type="button" data-edit-fixed="' + x.id + '" class="text-slate-500 hover:text-emerald-400 text-xs"><i class="fa-solid fa-calendar-day"></i></button>' +
          '<button type="button" data-del-fixed="' + x.id + '" class="text-slate-500 hover:text-rose-400 text-xs"><i class="fa-solid fa-trash"></i></button></div></div>';
      }).join('');
    }

    var extraEl = byId('extraExpensesList');
    if (!appData.extraExpenses.length) {
      extraEl.innerHTML = '<p class="text-11px text-slate-500 italic">Nessuna spesa extra mensile programmata.</p>';
    } else {
      extraEl.innerHTML = appData.extraExpenses.map(function (x) {
        var d = x.date ? fromIso(x.date) : null;
        var sub = (d ? fmtDMY(d) : 'senza data') + (x.posted ? ' · ✓ addebitata' : '');
        return '<div class="glass-card rounded-xl px-3 py-2 flex items-center justify-between border border-slate-800">' +
          '<div class="min-w-0"><p class="text-xs font-medium text-amber-200 truncate">' + esc(x.name) + '</p>' +
          '<p class="text-10px text-slate-500">' + sub + '</p></div>' +
          '<div class="flex items-center gap-2 shrink-0"><span class="text-xs font-bold text-rose-400">-' + eur(x.amount) + '</span>' +
          '<button type="button" data-del-extra="' + x.id + '" class="text-slate-500 hover:text-rose-400 text-xs"><i class="fa-solid fa-trash"></i></button></div></div>';
      }).join('');
    }

    var income = parseFloat(appData.monthlyIncome) || 0;
    var fixed = sum(appData.fixedExpenses);
    var extra = sum(appData.extraExpenses);
    var f = monthlyPocketForecast();
    var pocket = f.total;
    var net = income - fixed - pocket - extra;
    var rate = income > 0 ? ((net / income) * 100).toFixed(1) : '0';

    byId('summaryIncome').textContent = eur(income);
    byId('summaryFixed').textContent = '-' + eur(fixed);
    byId('summaryPocket').textContent = '-' + eur(pocket);

    var parts = [];
    if (f.closed) parts.push(f.closed + (f.closed === 1 ? ' sett. chiusa' : ' sett. chiuse') + ' (spesi ' + eur(f.closedSpent) + ')');
    if (f.cwIn) parts.push('in corso ' + eur(f.curr));
    if (f.future) parts.push(f.future + (f.future === 1 ? ' sett. futura' : ' sett. future') + ' × ' + eur(appData.weeklyTarget) + ' = ' + eur(f.futureAmt));
    byId('summaryPocketDetail').textContent = parts.join(' + ');

    byId('summaryExtra').textContent = '-' + eur(extra);
    var s = byId('summarySavings');
    s.textContent = eur(net);
    s.className = 'text-2xl font-black ' + (net >= 0 ? 'text-emerald-400' : 'text-rose-500');
    byId('summarySavingsRate').textContent = 'Quota risparmio ' + rate + '%';

    renderDonut(income, fixed, pocket, extra, net);
  }

  function promptAddFixedExpense() {
    var name = prompt('Nome spesa fissa:');
    if (!name) return;
    var amount = parseNum(prompt('Importo (€):'));
    if (isNaN(amount) || amount <= 0) return;
    var dayRaw = prompt('Giorno del mese in cui viene addebitata (1-31).\nFacoltativo: lascia vuoto se non vuoi indicarlo.', '');
    if (dayRaw === null) return;
    var day = parseDay(dayRaw);
    if (day === false) { alert('Giorno non valido: inserisci un numero da 1 a 31, oppure lascia vuoto.'); return; }
    var now = new Date(), key = ymKey(now);
    var item = { id: Date.now(), name: name.trim(), amount: amount, day: day, since: key, posted: [] };
    if (day && dueDate(now.getFullYear(), now.getMonth(), day).getTime() <= startOfDay(now).getTime()) {
      if (!confirm('Il giorno ' + day + ' di questo mese è già passato.\n\nAddebitare "' + item.name + '" anche per questo mese?\n\nOK = sì, addebita ora\nAnnulla = no, parte dal mese prossimo')) {
        item.posted.push(key);
      }
    }
    appData.fixedExpenses.push(item);
    processRecurring();
    saveData();
  }

  function editFixedDay(id) {
    var f = appData.fixedExpenses.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    var dayRaw = prompt('Giorno del mese di addebito per "' + f.name + '" (1-31).\nVuoto = nessuna data.', f.day || '');
    if (dayRaw === null) return;
    var day = parseDay(dayRaw);
    if (day === false) { alert('Giorno non valido: inserisci un numero da 1 a 31, oppure lascia vuoto.'); return; }
    var now = new Date(), key = ymKey(now);
    f.day = day;
    if (day && f.posted.indexOf(key) < 0 && dueDate(now.getFullYear(), now.getMonth(), day).getTime() <= startOfDay(now).getTime()) {
      if (!confirm('Il giorno ' + day + ' è già passato: addebitarla anche per questo mese?\n\nOK = sì\nAnnulla = no, parte dal mese prossimo')) {
        f.posted.push(key);
      }
    }
    processRecurring();
    saveData();
  }

  function promptAddExtraExpense() {
    var name = prompt('Descrizione spesa extra:');
    if (!name) return;
    var amount = parseNum(prompt('Importo (€):'));
    if (isNaN(amount) || amount <= 0) return;
    var dRaw = prompt('Data di addebito (gg/mm o gg/mm/aaaa).\nFacoltativa: lascia vuoto per addebitarla tu quando serve.', '');
    if (dRaw === null) return;
    var d = parseUserDate(dRaw);
    if (d === false) { alert('Data non valida. Usa il formato gg/mm o gg/mm/aaaa.'); return; }
    appData.extraExpenses.push({ id: Date.now(), name: name.trim(), amount: amount, date: d ? isoOf(d) : null, posted: false });
    processRecurring();
    saveData();
  }

  function setSalaryDay(raw) {
    var day = parseDay(raw);
    if (day === false) { alert('Giorno non valido: inserisci un numero da 1 a 31, oppure lascia vuoto.'); renderAll(); return; }
    var now = new Date(), key = ymKey(now);
    appData.salaryDay = day;
    if (day) {
      appData.salarySince = key;
      if (appData.salaryPosted.indexOf(key) < 0 && dueDate(now.getFullYear(), now.getMonth(), day).getTime() <= startOfDay(now).getTime()) {
        if (!confirm('Il giorno ' + day + ' è già passato: accreditare lo stipendio anche per questo mese?\n\nOK = sì, accredita ora\nAnnulla = no, parte dal mese prossimo')) {
          appData.salaryPosted.push(key);
        }
      }
    }
    processRecurring();
    saveData();
  }

  function renderWeeksChart() {
    var el = byId('weeksChart');
    var weeks = appData.historicalWeeks.slice(0, 8).reverse();
    if (!weeks.length) {
      el.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Nessun dato da mostrare.</p>';
      return;
    }
    var max = Math.max.apply(null, weeks.map(function (w) { return w.spent + Math.max(0, w.leftover); }).concat([1]));
    var H = 110;
    var cols = weeks.map(function (w) {
      var over = w.leftover < 0;
      var spentH = Math.round((w.spent / max) * H);
      var leftH = over ? 0 : Math.round((w.leftover / max) * H);
      return '<div class="flex-1 flex flex-col items-center gap-1 min-w-0">' +
        '<div class="w-full flex flex-col justify-end items-center" style="height:' + H + 'px">' +
          (leftH ? '<div class="w-4/5 rounded-t-md bg-emerald-500/30 border border-emerald-500/40" style="height:' + leftH + 'px"></div>' : '') +
          '<div class="w-4/5 ' + (leftH ? '' : 'rounded-t-md ') + (over ? 'bg-rose-500' : 'bg-emerald-500') + '" style="height:' + Math.max(spentH, 2) + 'px"></div>' +
        '</div>' +
        '<span class="text-10px font-bold ' + (over ? 'text-rose-400' : 'text-emerald-400') + '">' + (over ? '' : '+') + w.leftover.toFixed(0) + '</span>' +
        '<span class="text-10px text-slate-500 truncate w-full text-center">' + esc(String(w.startDate).slice(0, 6)) + '</span>' +
      '</div>';
    }).join('');
    el.innerHTML = '<div class="flex items-end gap-1.5">' + cols + '</div>' +
      '<div class="flex gap-4 justify-center mt-3 text-10px text-slate-400">' +
        '<span class="flex items-center gap-1"><span class="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>Speso</span>' +
        '<span class="flex items-center gap-1"><span class="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/40"></span>Avanzo</span>' +
        '<span class="flex items-center gap-1"><span class="inline-block w-2.5 h-2.5 rounded-sm bg-rose-500"></span>Sforato</span>' +
      '</div>';
  }

  function renderArchiveTab() {
    byId('accumulatedSavings').textContent = eur(appData.accumulatedSavingsFromLeftovers);
    renderWeeksChart();
    var el = byId('historicalWeeksList');
    if (!appData.historicalWeeks.length) {
      el.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Nessun ciclo archiviato ancora.</p>';
    } else {
      el.innerHTML = appData.historicalWeeks.map(function (h, idx) {
        var neg = h.leftover < 0;
        var budget = (typeof h.budget === 'number') ? h.budget : round2((Number(h.spent) || 0) + (Number(h.leftover) || 0));
        return '<div class="glass-card rounded-xl p-3 flex justify-between items-center border border-slate-800">' +
          '<div><p class="text-xs font-bold text-slate-200">' + esc(h.startDate) + ' - ' + esc(h.endDate) + '</p>' +
          '<p class="text-10px text-slate-400">Budget ' + eur(budget) + ' · spesi ' + eur(h.spent) + '</p></div>' +
          '<div class="flex items-center gap-2"><div class="text-right"><span class="text-xs font-extrabold ' + (neg ? 'text-rose-400' : 'text-emerald-400') + '">' + eur(h.leftover) + '</span>' +
          '<p class="text-10px text-slate-500">' + esc(h.status) + '</p></div>' +
          '<button type="button" data-edit-week="' + idx + '" class="text-slate-400 hover:text-emerald-400 text-xs p-1.5 bg-slate-800 border border-slate-700 rounded-lg"><i class="fa-solid fa-pen"></i></button></div></div>';
      }).join('');
    }
    byId('lastBackupText').textContent = appData.lastBackup
      ? 'Ultimo backup: ' + fmtFull(appData.lastBackup)
      : 'Nessun backup eseguito.';
  }

  function hasUserData() {
    return appData.bankHistory.length > 1 || appData.historicalWeeks.length > 0 ||
      appData.fixedExpenses.length > 0 || appData.extraExpenses.length > 0 ||
      appData.currentWeek.expenses.length > 0 || (parseFloat(appData.monthlyIncome) || 0) > 0;
  }

  function renderBackupBanner() {
    var banner = byId('backupBanner');
    var show = false, msg = '';
    if (hasUserData() && !bannerDismissed) {
      if (!appData.lastBackup) {
        show = true; msg = 'Non hai ancora fatto nessun backup dei tuoi dati.';
      } else {
        var days = Math.floor((Date.now() - appData.lastBackup) / 86400000);
        if (days >= BACKUP_REMIND_DAYS) { show = true; msg = 'Ultimo backup ' + days + ' giorni fa.'; }
      }
    }
    byId('backupBannerText').textContent = msg;
    if (show) banner.classList.remove('hidden'); else banner.classList.add('hidden');
  }
  function dismissBackupBanner() { bannerDismissed = true; renderBackupBanner(); }

  function backupFileName(ext) {
    return 'budget_backup_' + new Date().toISOString().slice(0, 10) + '.' + ext;
  }
  function backupPayload() {
    var data = clone(appData);
    data.lastBackup = Date.now();
    return { data: data, json: JSON.stringify(data, null, 2) };
  }
  function markBackup(ts) {
    appData.lastBackup = ts;
    saveData();
  }

  function downloadBlob(content, mime, filename) {
    var a = document.createElement('a');
    a.setAttribute('href', 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(content));
    a.setAttribute('download', filename);
    document.body.appendChild(a); a.click(); a.remove();
  }

  function exportDataJSON() {
    var p = backupPayload();
    downloadBlob(p.json, 'application/json', backupFileName('json'));
    markBackup(p.data.lastBackup);
  }

  function shareBackup() {
    var p = backupPayload();
    var name = backupFileName('json');
    var types = ['application/json', 'text/plain'];
    var candidate = null;
    try {
      if (typeof File !== 'undefined' && navigator.canShare) {
        for (var i = 0; i < types.length; i++) {
          var f = new File([p.json], name, { type: types[i] });
          if (navigator.canShare({ files: [f] })) { candidate = f; break; }
        }
      }
    } catch (e) { candidate = null; }

    if (candidate && navigator.share) {
      return navigator.share({ files: [candidate], title: 'Backup Budget', text: 'Backup del ' + new Date().toLocaleDateString('it-IT') })
        .then(function () { markBackup(p.data.lastBackup); })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          exportDataJSON();
        });
    }
    exportDataJSON();
    return Promise.resolve();
  }

  function csvCell(v) {
    var s = String(v === undefined || v === null ? '' : v);
    if (/[;"\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function csvNum(n) { return String(round2(Number(n) || 0)).replace('.', ','); }
  function isoDay(t) {
    var d = new Date(t);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function buildCSV() {
    var rows = [['Tipo', 'Data', 'Descrizione', 'Categoria', 'Importo', 'Saldo conto']];
    appData.bankHistory.forEach(function (p) {
      rows.push(['Conto', isoDay(p.t), p.note, (SRC[p.src] || SRC.manual).label, csvNum(p.delta), csvNum(p.balance)]);
    });
    appData.currentWeek.expenses.forEach(function (x) {
      rows.push(['Pocket (settimana corrente)', x.date, x.title, x.category, csvNum(-x.amount), '']);
    });
    appData.historicalWeeks.forEach(function (h) {
      rows.push(['Settimana chiusa', h.startDate + ' - ' + h.endDate, h.status + ' (speso ' + csvNum(h.spent) + ')', '', csvNum(h.leftover), '']);
    });
    appData.fixedExpenses.forEach(function (x) { rows.push(['Spesa fissa mensile', x.day ? 'giorno ' + x.day : '', x.name, '', csvNum(-x.amount), '']); });
    appData.extraExpenses.forEach(function (x) { rows.push(['Spesa extra mensile', x.date || '', x.name, '', csvNum(-x.amount), '']); });
    rows.push(['Impostazione', appData.salaryDay ? 'giorno ' + appData.salaryDay : '', 'Stipendio netto mensile', '', csvNum(appData.monthlyIncome), '']);
    rows.push(['Impostazione', '', 'Pocket money settimanale', '', csvNum(appData.weeklyTarget), '']);
    rows.push(['Impostazione', '', 'Risparmi accumulati', '', csvNum(appData.accumulatedSavingsFromLeftovers), '']);
    return '\uFEFF' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
  }

  function exportCSV() {
    downloadBlob(buildCSV(), 'text/csv', backupFileName('csv'));
  }

  function importDataJSON(ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var parsed = JSON.parse(e.target.result);
        if (!parsed.currentWeek || !Array.isArray(parsed.fixedExpenses)) throw new Error('struttura non valida');
        if (!confirm('Importare il backup? Sostituirà i dati presenti su questo dispositivo.')) { ev.target.value = ''; return; }
        appData = normalize(parsed);
        processRecurring();
        saveData();
        alert('Dati importati con successo!');
      } catch (err) { alert("Errore durante l'importazione del file JSON."); }
      ev.target.value = '';
    };
    reader.readAsText(file);
  }

  function openResetModal() {
    var spent = sum(appData.currentWeek.expenses);
    var left = appData.currentWeek.initialBudget - spent;
    byId('modalInitial').textContent = eur(appData.currentWeek.initialBudget);
    byId('modalSpent').textContent = eur(spent);
    byId('modalLeftover').textContent = eur(left);
    byId('resetModal').classList.remove('hidden');
  }
  function closeResetModal() { byId('resetModal').classList.add('hidden'); }

  function executeSundayReset() {
    var spent = sum(appData.currentWeek.expenses);
    var budget = appData.currentWeek.initialBudget;
    var left = round2(budget - spent);
    appData.historicalWeeks.unshift({
      startDate: appData.currentWeek.startDate, endDate: appData.currentWeek.endDate,
      budget: round2(budget), spent: round2(spent), leftover: left, status: left >= 0 ? 'Risparmiati' : 'Sforato'
    });
    appData.accumulatedSavingsFromLeftovers = round2((parseFloat(appData.accumulatedSavingsFromLeftovers) || 0) + left);
    var r = nextWeekRange();
    appData.currentWeek = { startDate: r[0], endDate: r[1], initialBudget: appData.weeklyTarget, expenses: [] };
    closeResetModal();
    saveData();
    alert('Ciclo resettato con successo! Budget ripristinato a ' + eur(appData.weeklyTarget) + '.');
  }

  function confirmFullReset() {
    if (confirm('Cancellare TUTTI i dati (saldo, spese, storico) e ripartire da zero?\n\nConsiglio: fai prima un backup.')) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      appData = makeDefault();
      saveData();
      switchTab('pocket');
    }
  }

  function renderAll() {
    renderPocketTab();
    renderMonthlyTab();
    renderCondoTab();
    renderArchiveTab();
    renderBackupBanner();
    selectCategory(appData.currentCategory || 'Spesa');
  }

  window.openResetModal = openResetModal;
  window.closeResetModal = closeResetModal;
  window.executeSundayReset = executeSundayReset;
  window.exportDataJSON = exportDataJSON;
  window.exportCSV = exportCSV;
  window.shareBackup = shareBackup;
  window.dismissBackupBanner = dismissBackupBanner;
  window.confirmFullReset = confirmFullReset;
  window.promptAddFixedExpense = promptAddFixedExpense;
  window.promptAddExtraExpense = promptAddExtraExpense;
  window.addBankMovement = addBankMovement;
  window.editWeeklyTarget = editWeeklyTarget;
  window.addPastWeek = addPastWeek;
  window.toggleLedger = toggleLedger;

  function init() {
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
    });
    document.querySelectorAll('.cat-btn').forEach(function (b) {
      b.addEventListener('click', function () { selectCategory(b.getAttribute('data-cat')); });
    });
    byId('addExpenseForm').addEventListener('submit', handleAddExpense);
    byId('manageCategoryLimitsBtn').addEventListener('click', openCategoryLimitsModal);
    byId('cancelCategoryLimitsBtn').addEventListener('click', closeCategoryLimitsModal);
    byId('categoryLimitsForm').addEventListener('submit', saveCategoryLimits);
    byId('categoryLimitsModal').addEventListener('click', function (e) {
      if (e.target === this) closeCategoryLimitsModal();
    });
    document.addEventListener('keydown', handleCategoryLimitsModalKeydown);
    byId('importFileInput').addEventListener('change', importDataJSON);
    byId('monthlyIncomeInput').addEventListener('change', function () { appData.monthlyIncome = parseNum(this.value) || 0; processRecurring(); saveData(); });
    byId('salaryDayInput').addEventListener('change', function () { setSalaryDay(this.value); });
    byId('bankBalanceInput').addEventListener('change', function () {
      var v = parseNum(this.value);
      if (isNaN(v)) { this.value = round2(appData.bankBalance); return; }
      setBankManually(v);
    });

    document.body.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var id;
      if (btn.hasAttribute('data-del-week')) {
        deleteWeeklyExpense(Number(btn.getAttribute('data-del-week')));
      } else if (btn.hasAttribute('data-edit-week')) {
        editClosedWeek(Number(btn.getAttribute('data-edit-week')));
      } else if (btn.hasAttribute('data-del-bank')) {
        deleteBankEntry(btn.getAttribute('data-del-bank'));
      } else if (btn.hasAttribute('data-post-fixed')) {
        postFixedNow(Number(btn.getAttribute('data-post-fixed')));
      } else if (btn.hasAttribute('data-post-extra')) {
        postExtraNow(Number(btn.getAttribute('data-post-extra')));
      } else if (btn.hasAttribute('data-post-salary')) {
        postSalaryNow();
      } else if (btn.hasAttribute('data-edit-fixed')) {
        editFixedDay(Number(btn.getAttribute('data-edit-fixed')));
      } else if (btn.hasAttribute('data-del-fixed')) {
        id = Number(btn.getAttribute('data-del-fixed'));
        appData.fixedExpenses = appData.fixedExpenses.filter(function (x) { return x.id !== id; });
        saveData();
      } else if (btn.hasAttribute('data-del-extra')) {
        id = Number(btn.getAttribute('data-del-extra'));
        appData.extraExpenses = appData.extraExpenses.filter(function (x) { return x.id !== id; });
        saveData();
      }
    });

    if (typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && processRecurring()) saveData();
      });
    }

    if (processRecurring()) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); } catch (e) {}
    }
    renderAll();
    var start = 'pocket';
    try { start = sessionStorage.getItem('activeTab') || 'pocket'; } catch (e) {}
    switchTab(TABS.indexOf(start) >= 0 ? start : 'pocket');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
    /*
   * API pubblica minima per il backup Google Drive.
   * Non contiene dati: permette al file drive-sync.js di leggere
   * o ripristinare i dati del browser solo dopo un'azione dell'utente.
   */
  window.BudgetApp = {
    getData: function () {
      return clone(appData);
    },

    replaceData: function (data) {
      appData = normalize(data);
      processRecurring();

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      } catch (e) {}

      renderAll();
      return clone(appData);
    },

    hasData: function () {
      return hasUserData();
    }
  };
})();
