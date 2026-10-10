(function () {
  'use strict';

  var STORAGE_KEY = 'userbudgetpwadata';
  var TABS = ['pocket', 'monthly', 'trends', 'goals', 'condo', 'archive'];
  var MOBILE_SWIPE_MAX = 639;
  var hasInitializedTab = false;
  var activeTabTransitionCleanup = null;
  var CAT_ICONS = { 'Spesa': 'fa-cart-shopping', 'Benzina': 'fa-gas-pump', 'Caffè': 'fa-mug-hot', 'Svago': 'fa-utensils', 'Altro': 'fa-ellipsis' };
  var CATEGORIES = ['Spesa', 'Benzina', 'Caffè', 'Svago', 'Altro'];
  var CAT_ON  = 'cat-btn active p-2 rounded-xl text-center flex flex-col items-center gap-1 transition';
  var CAT_OFF = 'cat-btn p-2 rounded-xl text-center flex flex-col items-center gap-1 transition';
  var NAV_ON  = 'nav-btn active flex flex-col items-center py-1.5 px-2 rounded-xl text-emerald-400 transition';
  var NAV_OFF = 'nav-btn flex flex-col items-center py-1.5 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition';
  var MAX_BANK_POINTS = 800;
  var LEDGER_PAGE = 30;
  var BACKUP_REMIND_DAYS = 7;
  var MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  var DEFAULT_WEEKLY_TARGET = 0;
  var GOAL_THEMES = [
    { id: 'teal', label: 'Teal', icon: 'fa-leaf', classes: 'goal-theme-teal' },
    { id: 'slate', label: 'Ardesia', icon: 'fa-mountain-sun', classes: 'goal-theme-slate' },
    { id: 'blue', label: 'Blu', icon: 'fa-compass', classes: 'goal-theme-blue' },
    { id: 'amber', label: 'Ambra', icon: 'fa-bookmark', classes: 'goal-theme-amber' }
  ];
  var GOAL_MAX_COUNT = 100;
  var GOAL_HISTORY_MAX = 500;
  var ACHIEVEMENTS = [
    ['first-goal', 'Primo passo', 'Hai creato il tuo primo obiettivo.', 'Obiettivi e risparmio', 'fa-bullseye'],
    ['first-deposit', 'Moneta dopo moneta', 'Hai registrato il primo versamento.', 'Obiettivi e risparmio', 'fa-coins'],
    ['goal-halfway', 'A metà strada', 'Un obiettivo ha raggiunto almeno il 50%.', 'Obiettivi e risparmio', 'fa-road'],
    ['goal-near', 'Quasi lì', 'Un obiettivo ha raggiunto almeno il 90%.', 'Obiettivi e risparmio', 'fa-flag-checkered'],
    ['goal-complete', 'Traguardo centrato', 'Hai completato il primo obiettivo.', 'Obiettivi e risparmio', 'fa-check'],
    ['three-goals-complete', 'Collezionista di traguardi', 'Hai completato tre obiettivi.', 'Obiettivi e risparmio', 'fa-medal'],
    ['three-active-goals', 'Piano chiaro', 'Hai tre obiettivi attivi insieme.', 'Obiettivi e risparmio', 'fa-list-check'],
    ['long-term-goal', 'Visione a lungo termine', 'Hai pianificato un obiettivo con almeno un anno di anticipo.', 'Obiettivi e risparmio', 'fa-calendar-days'],
    ['goal-sprint', 'Partenza sprint', 'Un obiettivo ha raggiunto il 25% nella prima settimana.', 'Obiettivi e risparmio', 'fa-gauge-high'],
    ['goal-patience', 'Pazienza premiata', 'Un obiettivo è attivo da almeno 90 giorni.', 'Obiettivi e risparmio', 'fa-hourglass-half'],
    ['saved-500', 'Fondo solido', 'Gli importi accantonati hanno raggiunto 500 €.', 'Obiettivi e risparmio', 'fa-piggy-bank'],
    ['saved-1000', 'Cassaforte', 'Gli importi accantonati hanno raggiunto 1.000 €.', 'Obiettivi e risparmio', 'fa-vault'],
    ['goal-rebalance', 'Riequilibrio', 'Hai ricostituito il massimo storico dopo un prelievo.', 'Obiettivi e risparmio', 'fa-scale-balanced'],
    ['goal-no-deadline-complete', 'Obiettivo libero', 'Hai completato un obiettivo senza scadenza.', 'Obiettivi e risparmio', 'fa-infinity'],
    ['first-positive-week', 'Primo avanzo', 'Hai chiuso una settimana con avanzo positivo.', 'Pocket e costanza', 'fa-arrow-trend-up'],
    ['first-balanced-week', 'Settimana in equilibrio', 'Hai chiuso una settimana senza sforare.', 'Pocket e costanza', 'fa-scale-balanced'],
    ['four-balanced-weeks', 'Ritmo costante', 'Quattro settimane chiuse senza sforare.', 'Pocket e costanza', 'fa-calendar-check'],
    ['four-nonnegative-weeks', 'Mese ordinato', 'Quattro settimane consecutive con avanzo non negativo.', 'Pocket e costanza', 'fa-calendar-days'],
    ['three-positive-weeks', 'Custode del fondo', 'Tre settimane chiuse con avanzo positivo.', 'Pocket e costanza', 'fa-shield-halved'],
    ['category-limit-set', 'Sotto controllo', 'Hai configurato almeno un limite per categoria.', 'Pocket e costanza', 'fa-sliders'],
    ['limits-respected', 'Conti in ordine', 'Una settimana chiusa entro tutti i limiti impostati.', 'Pocket e costanza', 'fa-list-check'],
    ['recovery-week', 'Recupero intelligente', 'Una settimana senza sforare dopo una settimana in rosso.', 'Pocket e costanza', 'fa-arrow-rotate-right'],
    ['ten-pocket-expenses', 'Registro impeccabile', 'Hai registrato almeno dieci spese Pocket.', 'Pocket e costanza', 'fa-receipt'],
    ['three-pocket-categories', 'Variazione consapevole', 'Hai usato tre categorie Pocket tra quelle ancora documentate.', 'Pocket e costanza', 'fa-tags'],
    ['flexible-budget', 'Budget flessibile', 'Hai aggiornato il target e poi chiuso una settimana.', 'Pocket e costanza', 'fa-sliders'],
    ['first-week-cycle', 'Primo ciclo', 'Hai completato un reset settimanale.', 'Pocket e costanza', 'fa-arrows-rotate'],
    ['monthly-plan', 'Primo piano mensile', 'Hai impostato stipendio e almeno una spesa fissa.', 'Pianificazione e consapevolezza', 'fa-file-invoice-dollar'],
    ['calendar-complete', 'Agenda completa', 'Hai programmato almeno tre addebiti fissi o extra con data.', 'Pianificazione e consapevolezza', 'fa-calendar-check'],
    ['trends-visited', 'Visione d’insieme', 'Hai consultato Andamento spese.', 'Pianificazione e consapevolezza', 'fa-chart-column'],
    ['three-trend-types', 'Esploratore dei dati', 'Hai consultato tre tipologie nell’Andamento.', 'Pianificazione e consapevolezza', 'fa-filter'],
    ['pocket-filter-used', 'Occhio al dettaglio', 'Hai usato una ricerca o un filtro Pocket.', 'Pianificazione e consapevolezza', 'fa-magnifying-glass'],
    ['previous-month-viewed', 'Mese confrontato', 'Hai selezionato un mese precedente nell’Andamento.', 'Pianificazione e consapevolezza', 'fa-calendar-arrow-down'],
    ['all-spending-types', 'Tutto sotto controllo', 'Sono presenti dati Pocket, fissi ed extra.', 'Pianificazione e consapevolezza', 'fa-table-cells-large'],
    ['two-spending-months', 'Primo bilancio', 'Esistono uscite effettive in almeno due mesi.', 'Pianificazione e consapevolezza', 'fa-chart-line'],
    ['week-corrected', 'Capo contabile', 'Hai corretto una settimana archiviata.', 'Pianificazione e consapevolezza', 'fa-pen-to-square'],
    ['balance-aligned', 'Conto allineato', 'Hai registrato una correzione del saldo.', 'Pianificazione e consapevolezza', 'fa-scale-balanced'],
    ['pocket-filters-reset', 'Vista pulita', 'Hai applicato e poi azzerato i filtri Pocket.', 'Pianificazione e consapevolezza', 'fa-broom'],
    ['first-backup', 'Archivista affidabile', 'Hai eseguito il primo backup.', 'Cura dati e PWA', 'fa-box-archive'],
    ['three-backup-days', 'Doppia copia', 'Hai eseguito backup in tre giorni diversi.', 'Cura dati e PWA', 'fa-copy'],
    ['json-exported', 'Salvagente', 'Hai esportato un backup JSON.', 'Cura dati e PWA', 'fa-file-arrow-down'],
    ['valid-import', 'Nuovo inizio sicuro', 'Hai importato un backup valido.', 'Cura dati e PWA', 'fa-file-import'],
    ['drive-backup', 'Cloud personale', 'Hai completato un backup su Google Drive.', 'Cura dati e PWA', 'fa-cloud-arrow-up'],
    ['backup-after-week', 'Continuità', 'Hai eseguito un backup dopo aver chiuso una settimana.', 'Cura dati e PWA', 'fa-calendar-plus'],
    ['recent-backup', 'Dati protetti', 'Hai un backup degli ultimi sette giorni.', 'Cura dati e PWA', 'fa-shield'],
    ['goal-data-imported', 'Trasloco riuscito', 'Hai importato più volte un backup con obiettivi.', 'Cura dati e PWA', 'fa-truck-fast'],
    ['offline-ready', 'Offline pronto', 'Il service worker è attivo in questo browser.', 'Cura dati e PWA', 'fa-wifi'],
    ['pwa-updated', 'Primo aggiornamento', 'Hai scelto di installare un aggiornamento PWA.', 'Cura dati e PWA', 'fa-rotate']
  ].map(function (entry) {
    return { id: entry[0], title: entry[1], description: entry[2], family: entry[3], icon: entry[4] };
  });
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
  var weeklyExpenseSearch = '';
  var weeklyExpenseCategory = 'all';
  var spendingTrendMonth = ymKey(new Date());
  var spendingTrendType = 'all';
  var goalModalReturnFocus = null;
  var goalModalReturnGoalId = null;
  var goalModalReturnAction = null;
  var editingGoalId = null;
  var goalOperation = null;
  var goalOperationId = null;
  var goalModalOpen = null;
  var achievementFilter = 'all';
  var goalStatusFilter = 'all';
  var pendingAchievementAnnouncements = [];
  var dataLoadWarning = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function fmtDate(d) { return ('0' + d.getDate()).slice(-2) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function ymKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function monthFromKey(key) {
    var match = String(key || '').match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    var date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 ? date : null;
  }
  function monthLabel(key) {
    var date = monthFromKey(key);
    if (!date) return key;
    var label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    return label.charAt(0).toLocaleUpperCase('it') + label.slice(1);
  }
  function monthKeyFromTimestamp(timestamp) {
    if (typeof timestamp !== 'number' || !isFinite(timestamp)) return null;
    var date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : ymKey(date);
  }
  function monthKeyFromExpenseDate(value) {
    var text = String(value || '').trim();
    var isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      var isoDate = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      if (isoDate.getFullYear() === Number(isoMatch[1]) && isoDate.getMonth() === Number(isoMatch[2]) - 1 && isoDate.getDate() === Number(isoMatch[3])) return ymKey(isoDate);
      return null;
    }
    var localMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!localMatch) return null;
    var localDate = new Date(Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1]));
    if (localDate.getFullYear() !== Number(localMatch[3]) || localDate.getMonth() !== Number(localMatch[2]) - 1 || localDate.getDate() !== Number(localMatch[1])) return null;
    return ymKey(localDate);
  }
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
      categoryLimits: {},
      goals: [],
      achievementState: {}
    };
  }

  function emptyAchievementState() {
    return {
      unlocked: {},
      weekClosures: [],
      backupDates: [],
      backupEvents: [],
      importEvents: [],
      trendTypes: [],
      trendVisitedAt: null,
      pocketFilterApplied: false,
      pocketFilterReset: false,
      targetChangedAt: null,
      firstGoalCreatedAt: null,
      completedGoalIds: [],
      previousMonthViewedAt: null,
      weekCorrectedAt: null,
      jsonExportedAt: null,
      driveBackupAt: null,
      serviceWorkerActiveAt: null,
      pwaUpdatedAt: null,
      lastCompletedGoalId: null,
      trackingStartedAt: Date.now()
    };
  }

  function validIsoDate(value) {
    if (value === null || value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2];
  }

  function normalizeGoal(goal) {
    if (!goal || typeof goal !== 'object' || Array.isArray(goal) ||
        (typeof goal.id !== 'string' && typeof goal.id !== 'number') ||
        typeof goal.name !== 'string' || !goal.name.trim() || goal.name.length > 80 ||
        typeof goal.target !== 'number' || !isFinite(goal.target) || goal.target <= 0 ||
        typeof goal.saved !== 'number' || !isFinite(goal.saved) || goal.saved < 0 ||
        !validIsoDate(goal.deadline === undefined ? null : goal.deadline) ||
        ['active', 'completed', 'archived'].indexOf(goal.status || 'active') < 0 ||
        (goal.theme && !GOAL_THEMES.some(function (theme) { return theme.id === goal.theme; })) ||
        (goal.createdAt !== undefined && (typeof goal.createdAt !== 'number' || !isFinite(goal.createdAt))) ||
        (goal.maxSaved !== undefined && (typeof goal.maxSaved !== 'number' || !isFinite(goal.maxSaved) || goal.maxSaved < goal.saved)) ||
        (goal.history !== undefined && (!Array.isArray(goal.history) || goal.history.length > GOAL_HISTORY_MAX))) {
      throw new Error('Un obiettivo contiene dati non validi.');
    }
    var now = Date.now();
    goal.name = goal.name.trim();
    goal.deadline = goal.deadline || null;
    goal.theme = goal.theme || GOAL_THEMES[0].id;
    goal.status = goal.status || 'active';
    if (goal.status === 'completed' && goal.saved < goal.target) {
      throw new Error('Un obiettivo completato non ha raggiunto il target.');
    }
    goal.createdAt = typeof goal.createdAt === 'number' && isFinite(goal.createdAt) ? goal.createdAt : now;
    goal.maxSaved = typeof goal.maxSaved === 'number' && isFinite(goal.maxSaved) && goal.maxSaved >= goal.saved
      ? goal.maxSaved : goal.saved;
    goal.history = goal.history || [];
    var operationIds = {};
    goal.history.forEach(function (operation) {
      if (!operation || typeof operation !== 'object' || Array.isArray(operation) ||
          (typeof operation.id !== 'string' && typeof operation.id !== 'number') ||
          ['deposit', 'withdrawal'].indexOf(operation.type) < 0 ||
          typeof operation.amount !== 'number' || !isFinite(operation.amount) || operation.amount <= 0 ||
          typeof operation.at !== 'number' || !isFinite(operation.at) ||
          (operation.note !== undefined && (typeof operation.note !== 'string' || operation.note.length > 240)) ||
          (operation.balanceBefore !== undefined && (typeof operation.balanceBefore !== 'number' || !isFinite(operation.balanceBefore) || operation.balanceBefore < 0)) ||
          (operation.balanceAfter !== undefined && (typeof operation.balanceAfter !== 'number' || !isFinite(operation.balanceAfter) || operation.balanceAfter < 0))) {
        throw new Error('Lo storico di un obiettivo contiene dati non validi.');
      }
      var operationId = String(operation.id);
      if (operationIds[operationId]) throw new Error('Lo storico contiene identificativi operazione duplicati.');
      operationIds[operationId] = true;
      if (operation.balanceBefore !== undefined && operation.balanceAfter !== undefined) {
        var expectedBalance = round2(operation.balanceBefore + (operation.type === 'deposit' ? operation.amount : -operation.amount));
        if (expectedBalance < 0 || expectedBalance !== round2(operation.balanceAfter)) {
          throw new Error('Lo storico di un obiettivo non è coerente con il saldo accantonato.');
        }
        if (operation.type === 'deposit') goal.maxSaved = Math.max(goal.maxSaved, operation.balanceAfter);
      }
    });
    return goal;
  }

  function normalizeAchievementState(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new Error('Lo stato dei traguardi contiene dati non validi.');
    }
    var defaults = emptyAchievementState();
    Object.keys(defaults).forEach(function (key) {
      if (state[key] === undefined || state[key] === null) state[key] = defaults[key];
    });
    if (!state.unlocked || typeof state.unlocked !== 'object' || Array.isArray(state.unlocked) ||
        !Array.isArray(state.weekClosures) || state.weekClosures.length > GOAL_HISTORY_MAX ||
        !Array.isArray(state.backupDates) || state.backupDates.length > 400 ||
        !Array.isArray(state.backupEvents) || state.backupEvents.length > 500 ||
        !Array.isArray(state.importEvents) || state.importEvents.length > 100 ||
        !Array.isArray(state.trendTypes) || state.trendTypes.length > 4 ||
        !Array.isArray(state.completedGoalIds) ||
        typeof state.pocketFilterApplied !== 'boolean' || typeof state.pocketFilterReset !== 'boolean') {
      throw new Error('Lo stato dei traguardi contiene dati non validi.');
    }
    if (!state.backupDates.every(validIsoDate) ||
        !state.backupEvents.every(function (event) { return event && typeof event.at === 'number' && isFinite(event.at); }) ||
        !state.weekClosures.every(function (week) {
          return week && typeof week.at === 'number' && isFinite(week.at) &&
            typeof week.leftover === 'number' && isFinite(week.leftover) &&
            typeof week.withinLimits === 'boolean' && typeof week.targetChanged === 'boolean';
        }) ||
        !state.importEvents.every(function (event) {
          return event && typeof event.at === 'number' && isFinite(event.at) && typeof event.hasGoals === 'boolean';
        }) ||
        !state.trendTypes.every(function (type) { return ['all', 'pocket', 'fixed', 'extra'].indexOf(type) >= 0; }) ||
        state.completedGoalIds.length > GOAL_HISTORY_MAX ||
        !state.completedGoalIds.every(function (id, index) {
          return typeof id === 'string' && state.completedGoalIds.indexOf(id) === index;
        })) {
      throw new Error('Lo stato dei traguardi contiene eventi non validi.');
    }
    ['trackingStartedAt', 'firstGoalCreatedAt', 'trendVisitedAt', 'targetChangedAt',
      'previousMonthViewedAt', 'weekCorrectedAt', 'jsonExportedAt', 'driveBackupAt',
      'serviceWorkerActiveAt', 'pwaUpdatedAt', 'lastCompletedGoalId'].forEach(function (key) {
      if (state[key] !== null && state[key] !== undefined &&
          ((key === 'lastCompletedGoalId' && typeof state[key] !== 'string') ||
           (key !== 'lastCompletedGoalId' && (typeof state[key] !== 'number' || !isFinite(state[key]))))) {
        throw new Error('Lo stato dei traguardi contiene una data o un identificativo non valido.');
      }
    });
    if (!state.trackingStartedAt || !state.trendTypes.every(function (type, index) {
      return state.trendTypes.indexOf(type) === index;
    })) throw new Error('Lo stato dei traguardi contiene dati non validi.');
    Object.keys(state.unlocked).forEach(function (id) {
      if (!ACHIEVEMENTS.some(function (item) { return item.id === id; }) ||
          typeof state.unlocked[id] !== 'number' || !isFinite(state.unlocked[id])) {
        throw new Error('La data di sblocco di un traguardo non è valida.');
      }
    });
    return state;
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
  function recomputeBankChartReset(reset) {
    var run = reset.balance;
    reset.movements.forEach(function (movement) {
      run = round2(run + movement.delta);
      movement.balance = run;
    });
  }
  function syncBankChartAfterDelete(id, previousBalance) {
    var reset = appData.bankChartReset;
    if (!reset) return;
    var index = reset.movements.map(function (movement) { return movement.id; }).indexOf(id);
    if (index >= 0) reset.movements.splice(index, 1);
    else reset.balance = round2(reset.balance + appData.bankBalance - previousBalance);
    recomputeBankChartReset(reset);
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
    if (d.bankChartReset !== undefined && d.bankChartReset !== null) {
      var reset = d.bankChartReset;
      if (!reset || typeof reset !== 'object' || Array.isArray(reset) ||
          typeof reset.at !== 'number' || !isFinite(reset.at) ||
          typeof reset.balance !== 'number' || !isFinite(reset.balance) ||
          !Array.isArray(reset.movements) || reset.movements.length > MAX_BANK_POINTS ||
          !reset.movements.every(function (movement) {
            return movement && typeof movement === 'object' && !Array.isArray(movement) &&
              (typeof movement.id === 'string' || typeof movement.id === 'number') &&
              typeof movement.t === 'number' && isFinite(movement.t) &&
              typeof movement.delta === 'number' && isFinite(movement.delta) &&
              typeof movement.balance === 'number' && isFinite(movement.balance);
          })) {
        throw new Error('Lo storico grafico del conto non è valido.');
      }
      recomputeBankChartReset(reset);
    }
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
    if (d.goals === undefined || d.goals === null) d.goals = [];
    if (!Array.isArray(d.goals) || d.goals.length > GOAL_MAX_COUNT) throw new Error('La lista degli obiettivi non è valida o supera il limite consentito.');
    d.goals.forEach(normalizeGoal);
    var normalizedGoalIds = {};
    d.goals.forEach(function (goal) {
      var id = String(goal.id);
      if (normalizedGoalIds[id]) throw new Error('La lista degli obiettivi contiene identificativi duplicati.');
      normalizedGoalIds[id] = true;
    });
    if (d.achievementState === undefined || d.achievementState === null) d.achievementState = emptyAchievementState();
    normalizeAchievementState(d.achievementState);
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
    } catch (e) {
      dataLoadWarning = 'I dati locali non sono leggibili completamente. Non sono stati sovrascritti; esporta o verifica il backup prima di continuare.';
      console.error('Impossibile normalizzare i dati locali.', e);
      return makeDefault();
    }
  }

  var appData = loadData();

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
      if (byId('goalsStatus')) setGoalStatus('Le modifiche sono visibili in questa sessione ma non è stato possibile salvarle localmente. Libera spazio ed esporta un backup.', true);
    }
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
    var movement = {
      id: uid(), t: typeof opts.t === 'number' ? opts.t : Date.now(),
      delta: round2(delta), balance: 0, note: note, src: opts.src || 'manual',
      refId: opts.refId === undefined ? null : opts.refId
    };
    appData.bankHistory.push(movement);
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
    if (appData.bankChartReset) {
      var previousChartPoint = appData.bankChartReset.movements[appData.bankChartReset.movements.length - 1];
      appData.bankChartReset.movements.push({
        id: movement.id,
        t: Math.max(Date.now(), movement.t, previousChartPoint ? previousChartPoint.t : appData.bankChartReset.at),
        delta: movement.delta,
        balance: 0
      });
      if (appData.bankChartReset.movements.length > MAX_BANK_POINTS) {
        var excess = appData.bankChartReset.movements.length - MAX_BANK_POINTS;
        var foldedChartPoints = appData.bankChartReset.movements.splice(0, excess);
        var lastFoldedPoint = foldedChartPoints[foldedChartPoints.length - 1];
        appData.bankChartReset.balance = lastFoldedPoint.balance;
        appData.bankChartReset.at = lastFoldedPoint.t;
      }
      recomputeBankChartReset(appData.bankChartReset);
    }
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

  function resetBankHistory() {
    appData.bankChartReset = { at: Date.now(), balance: appData.bankBalance, movements: [] };
    saveData();
    return true;
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
    var previousBalance = appData.bankBalance;
    appData.bankHistory = appData.bankHistory.filter(function (x) { return x.id !== id; });
    recomputeBankOn(appData);
    syncBankChartAfterDelete(e.id, previousBalance);
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
    appData.achievementState.weekCorrectedAt = Date.now();
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
    var pts = appData.bankChartReset
      ? [{ t: appData.bankChartReset.at, balance: appData.bankChartReset.balance }].concat(appData.bankChartReset.movements.slice(-39))
      : appData.bankHistory.slice(-40);
    if (pts.length < 2) {
      el.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">' +
        (appData.bankChartReset ? 'Storico azzerato. Il grafico ripartirà dal saldo attuale al prossimo movimento.' : 'Il grafico apparirà dopo il primo movimento sul conto.') +
        '</p>';
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
    var col = last >= first ? 'var(--chart-positive)' : 'var(--chart-negative)';

    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.balance).toFixed(1); }).join(' ');
    var area = line + ' L' + X(n - 1).toFixed(1) + ' ' + (H - pb) + ' L' + X(0).toFixed(1) + ' ' + (H - pb) + ' Z';

    var vmin = Math.min.apply(null, vals), vmax = Math.max.apply(null, vals);
    var iMin = vals.indexOf(vmin), iMax = vals.indexOf(vmax);
    function label(i, v, above) {
      var x = X(i), anchor = x < 60 ? 'start' : (x > W - 60 ? 'end' : 'middle');
      return '<text x="' + x.toFixed(1) + '" y="' + (Y(v) + (above ? -6 : 12)).toFixed(1) + '" text-anchor="' + anchor + '" fill="var(--chart-label)" font-size="8">' + Math.round(v) + ' €</text>';
    }
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.balance).toFixed(1) + '" r="' + (i === n - 1 ? 3.5 : 1.8) + '" fill="' + col + '"></circle>';
    }).join('');

    el.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full" style="height:auto">' +
        '<defs><linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + col + '" stop-opacity="0.35"></stop><stop offset="100%" stop-color="' + col + '" stop-opacity="0"></stop></linearGradient></defs>' +
        '<line x1="' + pl + '" y1="' + (H - pb) + '" x2="' + (W - pr) + '" y2="' + (H - pb) + '" stroke="var(--chart-grid)" stroke-width="0.6"></line>' +
        '<path d="' + area + '" fill="url(#bankGrad)"></path>' +
        '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>' +
        dots + label(iMax, vmax, true) + (iMin !== iMax ? label(iMin, vmin, false) : '') +
        '<text x="' + pl + '" y="' + (H - 6) + '" fill="var(--chart-label)" font-size="8">' + fmtShort(pts[0].t) + '</text>' +
        '<text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" fill="var(--chart-label)" font-size="8">' + fmtShort(pts[n - 1].t) + '</text>' +
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

  function switchTab(tabId, swipeDirection) {
    var previousTabId = getActiveTabId();
    if (tabId === 'account') tabId = 'condo';
    var navButtons = document.querySelectorAll('[data-tab]');
    if (TABS.indexOf(tabId) < 0 || !byId('tab-' + tabId)) tabId = 'pocket';
    var shouldAnimate = hasInitializedTab && previousTabId !== tabId &&
      window.matchMedia &&
      window.matchMedia('(max-width: ' + MOBILE_SWIPE_MAX + 'px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (previousTabId !== tabId) {
      if (activeTabTransitionCleanup) {
        activeTabTransitionCleanup();
        activeTabTransitionCleanup = null;
      }
      TABS.forEach(function (id) {
        var tab = byId('tab-' + id);
        if (tab) {
          tab.classList.remove('tab-enter', 'tab-enter--from-right', 'tab-enter--from-left', 'tab-enter--neutral');
        }
      });
    }
    TABS.forEach(function (id) {
      var t = byId('tab-' + id);
      if (t) t.classList.add('hidden');
    });
    Array.prototype.forEach.call(navButtons, function (btn) {
      var active = btn.getAttribute('data-tab') === tabId;
      btn.className = active ? NAV_ON : NAV_OFF;
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    var activeTab = byId('tab-' + tabId);
    activeTab.classList.remove('hidden');
    if (shouldAnimate) {
      var directionClass = swipeDirection === 'next'
        ? 'tab-enter--from-right'
        : swipeDirection === 'previous'
          ? 'tab-enter--from-left'
          : 'tab-enter--neutral';
      var transitionClasses = ['tab-enter', 'tab-enter--from-right', 'tab-enter--from-left', 'tab-enter--neutral'];
      var onAnimationFinished = function (event) {
        if (event.target !== activeTab || event.animationName !== 'mobile-tab-enter') return;
        activeTab.removeEventListener('animationend', onAnimationFinished);
        activeTab.removeEventListener('animationcancel', onAnimationFinished);
        transitionClasses.forEach(function (className) { activeTab.classList.remove(className); });
        if (activeTabTransitionCleanup === clearTransition) activeTabTransitionCleanup = null;
      };
      var clearTransition = function () {
        activeTab.removeEventListener('animationend', onAnimationFinished);
        activeTab.removeEventListener('animationcancel', onAnimationFinished);
        transitionClasses.forEach(function (className) { activeTab.classList.remove(className); });
      };
      activeTab.addEventListener('animationend', onAnimationFinished);
      activeTab.addEventListener('animationcancel', onAnimationFinished);
      activeTab.classList.add(directionClass);
      void activeTab.offsetWidth;
      activeTab.classList.add('tab-enter');
      activeTabTransitionCleanup = clearTransition;
    }
    hasInitializedTab = true;
    try { sessionStorage.setItem('activeTab', tabId); } catch (e) {}
    if (tabId === 'trends') {
      var newTrendVisit = !appData.achievementState.trendVisitedAt;
      var newTrendType = appData.achievementState.trendTypes.indexOf(spendingTrendType) < 0;
      if (newTrendVisit) appData.achievementState.trendVisitedAt = Date.now();
      if (newTrendType && appData.achievementState.trendTypes.length < 4) appData.achievementState.trendTypes.push(spendingTrendType);
      if (newTrendVisit || newTrendType) saveData();
    }
    window.scrollTo(0, 0);
  }

  function getActiveTabId() {
    var active = document.querySelector('main > [id^="tab-"]:not(.hidden)');
    return active ? active.id.replace(/^tab-/, '') : TABS[0];
  }

  function attachSwipeNavigation() {
    var swipeSurface = document.querySelector('main');
    if (!swipeSurface) throw new Error('Contenitore principale non trovato per la navigazione swipe.');
    if (!window.SwipeNavigation) throw new Error('Modulo navigazione swipe non caricato.');
    window.SwipeNavigation.create({
      document: document,
      window: window,
      surface: swipeSurface,
      maxWidth: MOBILE_SWIPE_MAX,
      tabs: TABS,
      getActiveTabId: getActiveTabId,
      switchTab: switchTab
    }).attach();
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
    var previousBalance = appData.bankBalance;
    appData.currentWeek.expenses = appData.currentWeek.expenses.filter(function (x) { return x.id !== id; });
    var linked = appData.bankHistory.filter(function (e) { return e.src === 'pocket' && e.refId === id; })[0];
    if (linked) {
      appData.bankHistory = appData.bankHistory.filter(function (e) { return e !== linked; });
      recomputeBankOn(appData);
      syncBankChartAfterDelete(linked.id, previousBalance);
    } else {
      adjustBank(exp.amount, 'Annullata: ' + exp.title, { src: 'adjust' });
    }
    saveData();
  }

  function editWeeklyTarget() {
    var previousTarget = appData.weeklyTarget;
    var v = parseNum(prompt('Nuovo pocket money settimanale (€):', appData.weeklyTarget));
    if (isNaN(v) || v < 0) return;
    v = round2(v);
    var spent = sum(appData.currentWeek.expenses);
    var applyNow = confirm('Impostare ' + eur(v) + ' anche per la settimana in corso?\n\nOK = sì, subito (spesi finora: ' + eur(spent) + ')\nAnnulla = solo dalla prossima settimana');
    appData.weeklyTarget = v;
    if (applyNow) appData.currentWeek.initialBudget = v;
    if (v !== previousTarget) appData.achievementState.targetChangedAt = Date.now();
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
    renderCategoryLimits();

    renderWeeklyTransactions();
  }

  function renderWeeklyTransactions() {
    var expenses = appData.currentWeek.expenses;
    var list = byId('weeklyTransactionsList');
    var search = weeklyExpenseSearch.trim().toLocaleLowerCase('it');
    var hasFilters = !!search || weeklyExpenseCategory !== 'all';
    byId('resetWeeklyExpenseFiltersBtn').classList.toggle('hidden', !hasFilters);
    if (!expenses.length) {
      byId('expenseCount').textContent = '0 transazioni';
      list.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Nessuna spesa registrata in questa settimana.</p>';
      return;
    }
    var visibleExpenses = expenses.filter(function (expense) {
      var matchesSearch = !search || String(expense.title || '').toLocaleLowerCase('it').indexOf(search) >= 0;
      var matchesCategory = weeklyExpenseCategory === 'all' || expense.category === weeklyExpenseCategory;
      return matchesSearch && matchesCategory;
    });
    byId('expenseCount').textContent = hasFilters
      ? visibleExpenses.length + ' di ' + expenses.length + ' movimenti'
      : expenses.length + (expenses.length === 1 ? ' transazione' : ' transazioni');
    if (!visibleExpenses.length) {
      list.innerHTML = '<div class="text-center py-4">' +
        '<p class="text-xs text-slate-500 mb-2">Nessun movimento trovato</p>' +
        '<button type="button" data-reset-week-filters class="text-11px bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition">Azzera filtri</button>' +
        '</div>';
      return;
    }
    list.innerHTML = visibleExpenses.map(function (x) {
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

  function resetWeeklyExpenseFilters() {
    if (appData.achievementState.pocketFilterApplied && !appData.achievementState.pocketFilterReset) {
      appData.achievementState.pocketFilterReset = true;
      saveData();
    }
    weeklyExpenseSearch = '';
    weeklyExpenseCategory = 'all';
    byId('weeklyExpenseSearch').value = '';
    byId('weeklyExpenseCategory').value = 'all';
    renderWeeklyTransactions();
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
      { label: 'Spese fisse', val: fixed, color: 'var(--chart-fixed)' },
      { label: 'Pocket money', val: Math.max(0, pocket), color: 'var(--chart-pocket)' },
      { label: 'Extra', val: extra, color: 'var(--chart-extra)' },
      { label: 'Risparmio', val: Math.max(0, net), color: 'var(--chart-positive)' }
    ];
    var total = segs.reduce(function (a, s) { return a + s.val; }, 0);
    var r = 40, C = 2 * Math.PI * r, offset = 0;
    var html = '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--chart-track)" stroke-width="14"></circle>';
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

  function spendingOutflows() {
    var events = [];
    var currentExpenseIds = {};
    var fixedById = {};
    var extraById = {};
    (Array.isArray(appData.fixedExpenses) ? appData.fixedExpenses : []).forEach(function (expense) {
      fixedById[String(expense.id)] = expense.name;
    });
    (Array.isArray(appData.extraExpenses) ? appData.extraExpenses : []).forEach(function (expense) {
      extraById[String(expense.id)] = expense.name;
    });
    var expenses = appData.currentWeek && Array.isArray(appData.currentWeek.expenses) ? appData.currentWeek.expenses : [];
    expenses.forEach(function (expense) {
      if (expense.id !== undefined && expense.id !== null) currentExpenseIds[String(expense.id)] = true;
      var dateKey = monthKeyFromExpenseDate(expense.date);
      if (!dateKey) {
        var linked = appData.bankHistory.filter(function (entry) {
          return entry.src === 'pocket' && entry.refId !== undefined && String(entry.refId) === String(expense.id);
        })[0];
        dateKey = linked ? monthKeyFromTimestamp(linked.t) : null;
      }
      var amount = Number(expense.amount);
      if (dateKey && isFinite(amount) && amount > 0) {
        events.push({ month: dateKey, type: 'pocket', amount: amount, category: CATEGORIES.indexOf(expense.category) >= 0 ? expense.category : null });
      }
    });

    appData.bankHistory.forEach(function (entry) {
      if (entry.src === 'pocket') {
        if (entry.refId !== undefined && entry.refId !== null && currentExpenseIds[String(entry.refId)]) return;
        var pocketMonth = monthKeyFromTimestamp(entry.t);
        var pocketAmount = Number(entry.delta);
        if (pocketMonth && isFinite(pocketAmount) && pocketAmount < 0) {
          events.push({ month: pocketMonth, type: 'pocket', amount: Math.abs(pocketAmount), category: null });
        }
        return;
      }
      if (entry.src !== 'fixed' && entry.src !== 'extra') return;
      var month = monthKeyFromTimestamp(entry.t);
      var delta = Number(entry.delta);
      if (!month || !isFinite(delta) || delta >= 0) return;
      events.push({
        month: month,
        type: entry.src,
        amount: Math.abs(delta),
        refId: entry.refId,
        timestamp: entry.t,
        name: entry.refId !== undefined && entry.refId !== null
          ? (entry.src === 'fixed' ? fixedById[String(entry.refId)] : extraById[String(entry.refId)]) || ''
          : ''
      });
    });
    return events;
  }

  function goalSavedTotal(data) {
    return round2(data.goals.reduce(function (total, goal) {
      return total + (Number(goal.saved) || 0);
    }, 0));
  }

  function pocketExpenseCount(data) {
    var seen = {};
    var count = 0;
    var expenses = data.currentWeek && Array.isArray(data.currentWeek.expenses) ? data.currentWeek.expenses : [];
    expenses.forEach(function (expense) {
      var key = expense.id === undefined || expense.id === null ? 'current-' + count : String(expense.id);
      seen[key] = true;
      count++;
    });
    (data.bankHistory || []).forEach(function (movement) {
      if (movement.src !== 'pocket') return;
      var key = movement.refId === undefined || movement.refId === null ? 'bank-' + movement.id : String(movement.refId);
      if (seen[key]) return;
      seen[key] = true;
      count++;
    });
    return count;
  }

  function evaluateAchievements(data) {
    data = data || appData;
    var state = data.achievementState;
    var now = Date.now();
    var weeks = state.weekClosures.slice().sort(function (a, b) { return a.at - b.at; });
    var activeGoals = data.goals.filter(function (goal) { return goal.status === 'active'; });
    var totalSaved = goalSavedTotal(data);
    var allOperations = data.goals.reduce(function (operations, goal) {
      return operations.concat(goal.history.map(function (entry) { return { goal: goal, entry: entry }; }));
    }, []);
    var pocketExpenses = data.currentWeek.expenses || [];
    var categoriesUsed = {};
    pocketExpenses.forEach(function (expense) {
      if (CATEGORIES.indexOf(expense.category) >= 0) categoriesUsed[expense.category] = true;
    });
    var plannedWithDate = data.fixedExpenses.filter(function (expense) { return !!expense.day; }).length +
      data.extraExpenses.filter(function (expense) { return !!expense.date; }).length;
    var outflows;
    if (data === appData) {
      outflows = spendingOutflows();
    } else {
      outflows = [];
      (data.currentWeek.expenses || []).forEach(function (expense) {
        var month = monthKeyFromExpenseDate(expense.date);
        if (month && Number(expense.amount) > 0) outflows.push({ month: month });
      });
      (data.bankHistory || []).forEach(function (entry) {
        if ((entry.src === 'fixed' || entry.src === 'extra' || entry.src === 'pocket') &&
            Number(entry.delta) < 0 && monthKeyFromTimestamp(entry.t)) outflows.push({ month: monthKeyFromTimestamp(entry.t) });
      });
    }
    var monthsWithOutflows = {};
    outflows.forEach(function (event) { monthsWithOutflows[event.month] = true; });
    var closureTail = weeks.slice(-4);
    var everyTailBalanced = closureTail.length >= 4 && closureTail.every(function (week) { return week.leftover >= 0; });
    var everyTailNonnegative = everyTailBalanced;
    var hasRecovery = weeks.some(function (week, index) {
      return week.leftover < 0 && weeks[index + 1] && weeks[index + 1].leftover >= 0;
    });
    var completedIds = state.completedGoalIds || [];
    var completedCount = Math.max(completedIds.length, data.goals.filter(function (goal) { return goal.status === 'completed'; }).length);
    var importedGoalData = state.importEvents.filter(function (event) { return event.hasGoals; }).length;
    var backupEvents = state.backupEvents.slice();
    var backupDates = state.backupDates.slice();
    if (data.lastBackup && isFinite(data.lastBackup) && backupDates.indexOf(new Date(data.lastBackup).toISOString().slice(0, 10)) < 0) {
      backupDates.push(new Date(data.lastBackup).toISOString().slice(0, 10));
    }
    var latestClosure = weeks.length ? weeks[weeks.length - 1].at : 0;
    var recentBackup = data.lastBackup && now - data.lastBackup <= 7 * 86400000 && data.lastBackup <= now + 60000;
    var criteria = {
      'first-goal': data.goals.length > 0 || !!state.firstGoalCreatedAt,
      'first-deposit': allOperations.some(function (item) { return item.entry.type === 'deposit'; }),
      'goal-halfway': data.goals.some(function (goal) { return Math.max(goal.saved, goal.maxSaved || 0) >= goal.target * 0.5; }),
      'goal-near': data.goals.some(function (goal) { return Math.max(goal.saved, goal.maxSaved || 0) >= goal.target * 0.9; }),
      'goal-complete': completedCount >= 1,
      'three-goals-complete': completedCount >= 3,
      'three-active-goals': activeGoals.length >= 3,
      'long-term-goal': data.goals.some(function (goal) {
        return goal.deadline && goal.createdAt && new Date(goal.deadline + 'T00:00:00').getTime() >= addMonths(new Date(goal.createdAt), 12).getTime();
      }),
      'goal-sprint': data.goals.some(function (goal) {
        return goal.history.some(function (operation) {
          return operation.type === 'deposit' && operation.at <= goal.createdAt + 7 * 86400000 &&
            Number(operation.balanceAfter) >= goal.target * 0.25;
        });
      }),
      'goal-patience': activeGoals.some(function (goal) { return now - goal.createdAt >= 90 * 86400000; }),
      'saved-500': totalSaved >= 500,
      'saved-1000': totalSaved >= 1000,
      'goal-rebalance': allOperations.some(function (item) {
        return item.entry.type === 'withdrawal' && item.goal.history.some(function (entry) {
          return entry.type === 'deposit' && entry.at > item.entry.at && entry.balanceAfter >= item.goal.maxSaved;
        });
      }),
      'goal-no-deadline-complete': data.goals.some(function (goal) { return goal.status === 'completed' && !goal.deadline; }),
      'first-positive-week': weeks.some(function (week) { return week.leftover > 0; }),
      'first-balanced-week': weeks.some(function (week) { return week.leftover >= 0; }),
      'four-balanced-weeks': everyTailBalanced,
      'four-nonnegative-weeks': everyTailNonnegative,
      'three-positive-weeks': weeks.filter(function (week) { return week.leftover > 0; }).length >= 3,
      'category-limit-set': CATEGORIES.some(function (category) { return Number(data.categoryLimits[category]) > 0; }),
      'limits-respected': weeks.some(function (week) { return week.withinLimits === true; }),
      'recovery-week': hasRecovery,
      'ten-pocket-expenses': pocketExpenseCount(data) >= 10,
      'three-pocket-categories': Object.keys(categoriesUsed).length >= 3,
      'flexible-budget': weeks.some(function (week) { return week.targetChanged === true; }),
      'first-week-cycle': weeks.length > 0,
      'monthly-plan': Number(data.monthlyIncome) > 0 && data.fixedExpenses.length > 0,
      'calendar-complete': plannedWithDate >= 3,
      'trends-visited': !!state.trendVisitedAt,
      'three-trend-types': state.trendTypes.length >= 3,
      'pocket-filter-used': !!state.pocketFilterApplied,
      'previous-month-viewed': !!state.previousMonthViewedAt,
      'all-spending-types': pocketExpenseCount(data) > 0 &&
        data.bankHistory.some(function (entry) { return entry.src === 'fixed' && Number(entry.delta) < 0; }) &&
        data.bankHistory.some(function (entry) { return entry.src === 'extra' && Number(entry.delta) < 0; }),
      'two-spending-months': Object.keys(monthsWithOutflows).length >= 2,
      'week-corrected': !!state.weekCorrectedAt,
      'balance-aligned': (data.bankHistory || []).some(function (entry) { return /^Correzione saldo/.test(String(entry.note || '')); }),
      'pocket-filters-reset': !!state.pocketFilterReset,
      'first-backup': !!data.lastBackup || backupDates.length > 0,
      'three-backup-days': Object.keys(backupEvents.reduce(function (days, event) {
        days[new Date(event.at).toISOString().slice(0, 10)] = true;
        return days;
      }, {})).length >= 3,
      'json-exported': !!state.jsonExportedAt,
      'valid-import': state.importEvents.length > 0,
      'drive-backup': !!state.driveBackupAt,
      'backup-after-week': backupEvents.some(function (event) { return event.at >= latestClosure && latestClosure > 0; }),
      'recent-backup': !!recentBackup,
      'goal-data-imported': importedGoalData >= 2,
      'offline-ready': !!state.serviceWorkerActiveAt,
      'pwa-updated': !!state.pwaUpdatedAt
    };
    var newlyUnlocked = [];
    ACHIEVEMENTS.forEach(function (achievement) {
      if (criteria[achievement.id] && !state.unlocked[achievement.id]) {
        state.unlocked[achievement.id] = now;
        newlyUnlocked.push(achievement);
      }
    });
    if (data === appData && newlyUnlocked.length) {
      pendingAchievementAnnouncements = pendingAchievementAnnouncements.concat(newlyUnlocked.map(function (item) { return item.title; }));
    }
    return newlyUnlocked;
  }

  function addMonths(date, count) {
    var result = new Date(date.getTime());
    var day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + count);
    result.setDate(Math.min(day, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
    return result;
  }

  function goalTheme(themeId) {
    return GOAL_THEMES.filter(function (item) { return item.id === themeId; })[0] || GOAL_THEMES[0];
  }

  function goalMonthlySuggestion(goal, now) {
    if (!goal.deadline || goal.saved >= goal.target) return null;
    var today = now || new Date();
    var deadline = new Date(goal.deadline + 'T00:00:00');
    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var days = Math.ceil((deadline.getTime() - todayStart.getTime()) / 86400000);
    if (!isFinite(days) || days <= 0) return null;
    var months = Math.max(1, Math.ceil(days / 30.4375));
    return round2(Math.max(0, goal.target - goal.saved) / months);
  }

  function createGoalRecord(fields, now) {
    var createdAt = now || Date.now();
    var name = String(fields.name || '').trim();
    var target = Number(fields.target);
    var theme = fields.theme || GOAL_THEMES[0].id;
    if (!name || name.length > 80 || !isFinite(target) || target <= 0 ||
        !validIsoDate(fields.deadline || null) ||
        !GOAL_THEMES.some(function (item) { return item.id === theme; })) {
      throw new Error('Nome, target, scadenza o tema dell’obiettivo non validi.');
    }
    return {
      id: uid(), name: name, target: round2(target), saved: 0, deadline: fields.deadline || null,
      theme: theme, status: 'active', createdAt: createdAt, maxSaved: 0, history: []
    };
  }

  function updateGoalRecord(data, id, fields) {
    var goal = data.goals.filter(function (item) { return String(item.id) === String(id); })[0];
    if (!goal) throw new Error('Obiettivo non trovato.');
    var name = String(fields.name || '').trim();
    var target = Number(fields.target);
    var theme = fields.theme || goal.theme;
    if (!name || name.length > 80 || !isFinite(target) || target <= 0 ||
        !validIsoDate(fields.deadline || null) ||
        !GOAL_THEMES.some(function (item) { return item.id === theme; })) {
      throw new Error('Nome, target, scadenza o tema dell’obiettivo non validi.');
    }
    goal.name = name;
    goal.target = round2(target);
    if (goal.status === 'completed' && goal.target > goal.saved) goal.status = 'active';
    goal.deadline = fields.deadline || null;
    goal.theme = theme;
  }

  function applyGoalOperation(data, id, type, amount, note, at) {
    var goal = data.goals.filter(function (item) { return String(item.id) === String(id); })[0];
    amount = Number(amount);
    note = String(note || '').trim();
    if (!goal || goal.status !== 'active') throw new Error('L’obiettivo non è attivo.');
    if (['deposit', 'withdrawal'].indexOf(type) < 0 || !isFinite(amount) || amount <= 0) {
      throw new Error('Inserisci un importo positivo e un’operazione valida.');
    }
    if (note.length > 240) throw new Error('La nota può contenere al massimo 240 caratteri.');
    if (goal.history.length >= GOAL_HISTORY_MAX) throw new Error('Lo storico ha raggiunto 500 operazioni.');
    if (type === 'withdrawal' && amount > goal.saved) throw new Error('Il prelievo non può superare l’importo accantonato.');
    var before = goal.saved;
    var after = round2(before + (type === 'deposit' ? amount : -amount));
    if (after < 0) throw new Error('Il prelievo porterebbe il totale sotto zero.');
    goal.saved = after;
    if (type === 'deposit') goal.maxSaved = Math.max(goal.maxSaved, after);
    goal.history.push({
      id: uid(), type: type, amount: round2(amount), at: at || Date.now(),
      note: note, balanceBefore: before, balanceAfter: after
    });
    return goal;
  }

  function applyGoalStatus(data, id, action) {
    var goal = data.goals.filter(function (item) { return String(item.id) === String(id); })[0];
    if (!goal) throw new Error('Obiettivo non trovato.');
    if (action === 'complete') {
      if (goal.saved < goal.target) throw new Error('Per completare l’obiettivo occorre aver raggiunto il target.');
      goal.status = 'completed';
      data.achievementState.completedGoalIds = data.achievementState.completedGoalIds || [];
      if (data.achievementState.completedGoalIds.indexOf(String(goal.id)) < 0) {
        data.achievementState.completedGoalIds.push(String(goal.id));
      }
    } else if (action === 'archive') {
      goal.status = 'archived';
    } else if (action === 'activate') {
      goal.status = 'active';
    } else {
      throw new Error('Stato obiettivo non valido.');
    }
    return goal;
  }

  function goalDeadlineState(goal, now) {
    if (!goal.deadline) return 'none';
    var due = new Date(goal.deadline + 'T23:59:59');
    var today = now || new Date();
    return due.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() ? 'past' : 'future';
  }

  function setGoalStatus(message, isError) {
    var status = byId('goalsStatus');
    if (!status) return;
    status.textContent = message;
    status.className = isError ? 'text-xs text-rose-300' : 'text-xs text-emerald-200';
  }

  function persistGoalMutation(mutator, failureMessage) {
    var candidate = clone(appData);
    var newlyUnlocked;
    try {
      mutator(candidate);
      candidate.goals.forEach(normalizeGoal);
      normalizeAchievementState(candidate.achievementState);
      newlyUnlocked = evaluateAchievements(candidate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
    } catch (error) {
      setGoalStatus(failureMessage || 'Modifica non salvata. Controlla i dati e lo spazio disponibile sul dispositivo.', true);
      return false;
    }
    appData = candidate;
    if (newlyUnlocked.length) {
      pendingAchievementAnnouncements = pendingAchievementAnnouncements.concat(newlyUnlocked.map(function (item) { return item.title; }));
    }
    setGoalStatus('Obiettivo aggiornato. Queste ripartizioni non modificano gli altri saldi.');
    renderAll();
    return true;
  }

  function goalProgress(goal) {
    return goal.target > 0 ? Math.max(0, Math.min(100, (goal.saved / goal.target) * 100)) : 0;
  }

  function accessibleProgress(goal, prefix) {
    var actual = round2(goal.saved / goal.target * 100);
    var clipped = goalProgress(goal);
    return '<div class="goal-progress-track" role="progressbar" aria-label="' + esc(prefix + ' ' + goal.name) +
      '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + clipped.toFixed(0) +
      '" aria-valuetext="' + esc(eur(goal.saved) + ' accantonati su ' + eur(goal.target) + '; ' + actual.toFixed(0) + '% del target') + '">' +
      '<div class="goal-progress-fill" style="width:' + clipped + '%"></div></div>' +
      '<p class="goal-progress-label">' + actual.toFixed(0) + '% del target · ' + esc(eur(goal.saved)) + ' / ' + esc(eur(goal.target)) + '</p>';
  }

  function renderNextGoal() {
    var container = byId('nextGoalContent');
    var candidates = appData.goals.filter(function (goal) {
      return goal.status === 'active' && goal.saved < goal.target;
    }).sort(function (a, b) {
      return (b.saved / b.target) - (a.saved / a.target);
    });
    if (!candidates.length) {
      container.innerHTML = '<div class="goal-empty"><p class="text-xs text-slate-400">' +
        (appData.goals.length ? 'Non ci sono obiettivi attivi ancora da completare.' : 'Crea il tuo primo obiettivo per definire un traguardo personale.') +
        '</p><button type="button" data-add-goal class="mt-3 text-xs text-emerald-200 font-semibold">Crea un obiettivo <span aria-hidden="true">→</span></button></div>';
      return;
    }
    var goal = candidates[0], theme = goalTheme(goal.theme), monthly = goalMonthlySuggestion(goal);
    var details = [];
    if (goal.deadline) details.push('Scadenza ' + new Date(goal.deadline + 'T00:00:00').toLocaleDateString('it-IT'));
    if (monthly !== null) details.push('Quota mensile suggerita ' + eur(monthly));
    container.innerHTML = '<div class="goal-next-card ' + theme.classes + '">' +
      '<div class="flex items-start gap-3 min-w-0"><span class="goal-icon"><i class="fa-solid ' + theme.icon + '" aria-hidden="true"></i></span>' +
      '<div class="min-w-0 flex-1"><p class="font-semibold text-white truncate">' + esc(goal.name) + '</p>' +
      '<p class="text-11px text-slate-300 mt-1">' + esc(eur(goal.saved)) + ' accantonati · target ' + esc(eur(goal.target)) + '</p></div></div>' +
      '<div class="mt-4">' + accessibleProgress(goal, 'Prossimo traguardo') + '</div>' +
      (details.length ? '<p class="text-10px text-slate-400 mt-3">' + details.map(esc).join(' · ') + '</p>' : '') +
      '<button type="button" data-goal-action="deposit" data-goal-id="' + esc(String(goal.id)) + '" class="mt-3 text-xs font-semibold text-emerald-200">Registra un versamento</button>' +
      '</div>';
  }

  function goalOperationLabel(operation) {
    return operation.type === 'deposit' ? 'Versamento' : 'Prelievo';
  }

  function renderGoalCard(goal) {
    var theme = goalTheme(goal.theme);
    var monthly = goalMonthlySuggestion(goal);
    var deadlineState = goalDeadlineState(goal);
    var statusLabels = { active: 'Attivo', completed: 'Completato', archived: 'Archiviato' };
    var deadlineText = !goal.deadline ? 'Nessuna scadenza' :
      (deadlineState === 'past' ? 'Scadenza superata · ' : 'Scadenza ') + new Date(goal.deadline + 'T00:00:00').toLocaleDateString('it-IT');
    var goalPercent = goalProgress(goal);
    var actionButtons = goal.status === 'active'
      ? '<button type="button" data-goal-action="deposit" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action-primary">Versa</button>' +
        '<button type="button" data-goal-action="withdrawal" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action">Preleva</button>' +
        '<button type="button" data-goal-action="edit" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action" aria-label="Modifica ' + esc(goal.name) + '">Modifica</button>' +
        (goal.saved >= goal.target ? '<button type="button" data-goal-action="complete" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action">Completa</button>' : '') +
        '<button type="button" data-goal-action="archive" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action">Archivia</button>' +
        '<button type="button" data-goal-action="delete" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action-danger">Elimina</button>'
      : '<button type="button" data-goal-action="edit" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action" aria-label="Modifica ' + esc(goal.name) + '">Modifica</button>' +
        (goal.status === 'archived' ? '<button type="button" data-goal-action="activate" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action">Riattiva</button>' : '') +
        (goal.status === 'completed' ? '<button type="button" data-goal-action="archive" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action">Archivia</button>' : '') +
        '<button type="button" data-goal-action="delete" data-goal-id="' + esc(String(goal.id)) + '" class="goal-action-danger">Elimina</button>';
    var history = goal.history.length
      ? '<details class="goal-history"><summary>Storico operazioni (' + goal.history.length + ')</summary><ul>' +
        goal.history.slice().reverse().map(function (operation) {
          return '<li><span>' + esc(goalOperationLabel(operation)) + ' · ' + esc(fmtFull(operation.at)) +
            (operation.note ? ' · ' + esc(operation.note) : '') + '</span><strong>' +
            (operation.type === 'deposit' ? '+' : '−') + esc(eur(operation.amount)) + '</strong></li>';
        }).join('') + '</ul></details>'
      : '<p class="text-10px text-slate-500 mt-3">Nessuna operazione registrata.</p>';
    return '<article class="goal-card goal-card--compact ' + theme.classes + '" data-goal-card="' + esc(String(goal.id)) + '" tabindex="-1">' +
      '<div class="goal-head"><span class="goal-icon"><i class="fa-solid ' + theme.icon + '" aria-hidden="true"></i></span>' +
      '<div class="min-w-0 flex-1"><div class="goal-title-row"><h4 class="font-semibold text-white break-words">' + esc(goal.name) + '</h4>' +
      '<span class="goal-status">' + statusLabels[goal.status] + '</span></div>' +
      '<div class="goal-summary-row"><span>' + esc(eur(goal.saved)) + ' · target ' + esc(eur(goal.target)) + '</span><span>' + goalPercent.toFixed(0) + '%</span></div></div></div>' +
      '<div class="goal-progress-wrap">' + accessibleProgress(goal, 'Avanzamento obiettivo') + '</div>' +
      '<div class="goal-meta"><span>' + esc(deadlineText) + '</span>' +
      (monthly !== null ? '<span>Quota mensile ' + esc(eur(monthly)) + '</span>' : '') + '</div>' +
      '<div class="goal-actions">' + actionButtons + '</div>' + history + '</article>';
  }

  function achievementFamilyLabel(family) {
    var labels = {
      'Obiettivi e risparmio': 'Obiettivi e risparmio',
      'Pocket e costanza': 'Pocket e costanza',
      'Pianificazione e consapevolezza': 'Pianificazione',
      'Cura dati e PWA': 'Cura dei dati'
    };
    return labels[family] || 'Pianificazione';
  }

  function isAchievementUnlocked(unlocked, id) {
    return Object.prototype.hasOwnProperty.call(unlocked, id);
  }

  function filterAchievements(achievements, unlocked, filter) {
    return achievements.filter(function (item) {
      var isUnlocked = isAchievementUnlocked(unlocked, item.id);
      return filter === 'all' || (filter === 'unlocked' ? isUnlocked : !isUnlocked);
    });
  }

  function renderAchievementCard(achievement, unlockedAt) {
    var isUnlocked = isAchievementUnlocked(appData.achievementState.unlocked, achievement.id);
    var family = achievementFamilyLabel(achievement.family);
    var title = isUnlocked ? achievement.title : 'Traguardo da scoprire';
    var description = isUnlocked
      ? achievement.description
      : 'Continua a pianificare e a registrare le tue attività.';
    var icon = isUnlocked ? achievement.icon : 'fa-lock';
    return '<article class="achievement-card ' + (isUnlocked ? 'is-unlocked' : 'is-locked') + '">' +
      '<span class="achievement-icon"><i class="fa-solid ' + icon + '" aria-hidden="true"></i></span>' +
      '<div class="min-w-0"><p class="achievement-family">' + esc(family) + '</p>' +
      '<h4 class="text-xs font-semibold text-slate-100 mt-1">' + esc(title) + '</h4>' +
      '<p class="text-10px text-slate-400 mt-1">' + esc(description) + '</p>' +
      (isUnlocked ? '<p class="text-10px text-emerald-200 mt-2">Sbloccato ' + esc(fmtFull(unlockedAt)) + '</p>' : '') +
      '</div></article>';
  }

  function renderGoalsTab() {
    var total = goalSavedTotal(appData);
    var accumulated = Number(appData.accumulatedSavingsFromLeftovers) || 0;
    var active = appData.goals.filter(function (goal) { return goal.status === 'active'; });
    byId('goalsTotalSaved').textContent = eur(total);
    byId('goalsActiveCount').textContent = String(active.length);
    byId('goalsUnallocated').textContent = eur(Math.max(0, accumulated - total));
    byId('goalsAllocationNotice').classList.toggle('hidden', total <= accumulated);
    renderNextGoal();

    var goals = appData.goals.filter(function (goal) { return goalStatusFilter === 'all' || goal.status === goalStatusFilter; });
    var list = byId('goalsList');
    list.innerHTML = goals.length
      ? goals.map(renderGoalCard).join('')
      : '<p class="goal-empty">' + (appData.goals.length ? 'Nessun obiettivo corrisponde a questo filtro.' : 'Non hai ancora creato obiettivi. La pianificazione è facoltativa.') + '</p>';

    var unlocked = appData.achievementState.unlocked;
    var unlockedCount = ACHIEVEMENTS.filter(function (item) {
      return isAchievementUnlocked(unlocked, item.id);
    }).length;
    byId('achievementCount').textContent = unlockedCount + ' di ' + ACHIEVEMENTS.length + ' traguardi sbloccati';
    var achievements = filterAchievements(ACHIEVEMENTS, unlocked, achievementFilter);
    byId('achievementsList').innerHTML = achievements.map(function (item) {
      return renderAchievementCard(item, unlocked[item.id]);
    }).join('');
    if (pendingAchievementAnnouncements.length) {
      byId('achievementAnnouncement').textContent = 'Nuovi traguardi sbloccati: ' + pendingAchievementAnnouncements.join(', ') + '.';
      pendingAchievementAnnouncements = [];
    }
  }

  function clearGoalFormErrors() {
    ['goalNameError', 'goalTargetError', 'goalDeadlineError', 'goalFormError', 'goalOperationAmountError', 'goalOperationError'].forEach(function (id) {
      var element = byId(id);
      if (element) element.textContent = '';
    });
  }

  function openGoalModal(goal) {
    goalModalReturnFocus = document.activeElement;
    goalModalReturnGoalId = goal ? String(goal.id) : null;
    goalModalReturnAction = goal ? 'edit' : null;
    editingGoalId = goal ? goal.id : null;
    clearGoalFormErrors();
    byId('goalModalTitle').textContent = goal ? 'Modifica obiettivo' : 'Nuovo obiettivo';
    byId('goalName').value = goal ? goal.name : '';
    byId('goalTarget').value = goal ? goal.target : '';
    byId('goalDeadline').value = goal ? (goal.deadline || '') : '';
    byId('goalThemeOptions').innerHTML = GOAL_THEMES.map(function (theme) {
      var selected = (goal ? goal.theme : GOAL_THEMES[0].id) === theme.id;
      return '<button type="button" class="goal-theme-choice ' + theme.classes + (selected ? ' selected' : '') +
        '" data-goal-theme="' + theme.id + '" aria-pressed="' + selected + '" aria-label="Tema ' + theme.label + '">' +
        '<i class="fa-solid ' + theme.icon + '" aria-hidden="true"></i><span>' + theme.label + '</span></button>';
    }).join('');
    var modal = byId('goalModal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    byId('goalName').focus();
  }

  function closeGoalModal() {
    var modal = byId('goalModal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    restoreGoalModalFocus();
    editingGoalId = null;
  }

  function restoreGoalModalFocus() {
    if (goalModalReturnFocus && document.contains(goalModalReturnFocus)) {
      goalModalReturnFocus.focus();
    } else if (goalModalReturnGoalId !== null) {
      var buttons = byId('goalsList').querySelectorAll('[data-goal-id]');
      var replacement = Array.prototype.filter.call(buttons, function (button) {
        return button.getAttribute('data-goal-id') === goalModalReturnGoalId &&
          button.getAttribute('data-goal-action') === goalModalReturnAction;
      })[0];
      var cards = byId('goalsList').querySelectorAll('[data-goal-card]');
      var card = replacement || Array.prototype.filter.call(cards, function (item) {
        return item.getAttribute('data-goal-card') === goalModalReturnGoalId;
      })[0];
      if (card) card.focus();
      else byId('addGoalBtn').focus();
    } else {
      byId('addGoalBtn').focus();
    }
    goalModalReturnFocus = null;
    goalModalReturnGoalId = null;
    goalModalReturnAction = null;
  }

  function submitGoalForm(event) {
    event.preventDefault();
    clearGoalFormErrors();
    var name = byId('goalName').value.trim();
    var target = parseNum(byId('goalTarget').value);
    var deadline = byId('goalDeadline').value;
    var themeButton = byId('goalThemeOptions').querySelector('[aria-pressed="true"]');
    var valid = true;
    if (!name || name.length > 80) {
      byId('goalNameError').textContent = 'Inserisci un nome di massimo 80 caratteri.';
      valid = false;
    }
    if (!byId('goalTarget').validity.valid || !isFinite(target) || target <= 0) {
      byId('goalTargetError').textContent = 'L’importo obiettivo deve essere un numero maggiore di zero.';
      valid = false;
    }
    if (deadline && !validIsoDate(deadline)) {
      byId('goalDeadlineError').textContent = 'Inserisci una data di scadenza valida.';
      valid = false;
    }
    if (!valid) return;
    var selectedTheme = themeButton ? themeButton.getAttribute('data-goal-theme') : GOAL_THEMES[0].id;
    var original = editingGoalId === null ? null : appData.goals.filter(function (goal) { return String(goal.id) === String(editingGoalId); })[0];
    if (editingGoalId !== null && !original) {
      byId('goalFormError').textContent = 'Questo obiettivo non è più disponibile.';
      return;
    }
    if (!original && appData.goals.length >= GOAL_MAX_COUNT) {
      byId('goalFormError').textContent = 'Hai raggiunto il limite di 100 obiettivi. Archivia o elimina un obiettivo prima di crearne un altro.';
      return;
    }
    var ok = persistGoalMutation(function (candidate) {
      var existing = original && candidate.goals.filter(function (goal) { return String(goal.id) === String(editingGoalId); })[0];
      if (existing) {
        updateGoalRecord(candidate, existing.id, { name: name, target: target, deadline: deadline, theme: selectedTheme });
      } else {
        var created = createGoalRecord({ name: name, target: target, deadline: deadline, theme: selectedTheme });
        candidate.goals.push(created);
        candidate.achievementState.firstGoalCreatedAt = candidate.achievementState.firstGoalCreatedAt || created.createdAt;
      }
    }, 'Impossibile salvare l’obiettivo. Verifica i dati e lo spazio disponibile sul dispositivo.');
    if (ok) closeGoalModal();
    else byId('goalFormError').textContent = byId('goalsStatus').textContent;
  }

  function openGoalOperationModal(goal, type) {
    goalModalReturnFocus = document.activeElement;
    goalModalReturnGoalId = String(goal.id);
    goalModalReturnAction = type;
    goalOperation = type;
    goalOperationId = goal.id;
    clearGoalFormErrors();
    byId('goalOperationTitle').textContent = type === 'deposit' ? 'Versamento' : 'Prelievo';
    byId('goalOperationDescription').textContent = goal.name + ' · disponibile ' + eur(goal.saved) + '. Questa operazione non modifica i saldi dell’app.';
    byId('saveGoalOperationBtn').textContent = type === 'deposit' ? 'Registra versamento' : 'Registra prelievo';
    byId('goalOperationAmount').value = '';
    byId('goalOperationNote').value = '';
    var modal = byId('goalOperationModal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    byId('goalOperationAmount').focus();
  }

  function closeGoalOperationModal() {
    var modal = byId('goalOperationModal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    restoreGoalModalFocus();
    goalOperation = null;
    goalOperationId = null;
  }

  function submitGoalOperation(event) {
    event.preventDefault();
    clearGoalFormErrors();
    var amount = parseNum(byId('goalOperationAmount').value);
    var note = byId('goalOperationNote').value.trim();
    if (!byId('goalOperationAmount').validity.valid || !isFinite(amount) || amount <= 0) {
      byId('goalOperationAmountError').textContent = 'Inserisci un importo maggiore di zero.';
      return;
    }
    if (note.length > 240) {
      byId('goalOperationError').textContent = 'La nota può contenere al massimo 240 caratteri.';
      return;
    }
    var operationType = goalOperation;
    var targetId = goalOperationId;
    var goal = appData.goals.filter(function (item) { return String(item.id) === String(targetId); })[0];
    if (!goal || goal.status !== 'active') {
      byId('goalOperationError').textContent = 'L’obiettivo non è più attivo.';
      return;
    }
    if (goal.history.length >= GOAL_HISTORY_MAX) {
      byId('goalOperationError').textContent = 'Lo storico ha raggiunto 500 operazioni. Esporta un backup prima di continuare; lo storico non verrà eliminato.';
      return;
    }
    if (operationType === 'withdrawal' && amount > goal.saved) {
      byId('goalOperationAmountError').textContent = 'Il prelievo non può superare l’importo accantonato (' + eur(goal.saved) + ').';
      return;
    }
    var ok = persistGoalMutation(function (candidate) {
      applyGoalOperation(candidate, targetId, operationType, amount, note);
    }, 'Operazione non salvata. Verifica lo spazio disponibile sul dispositivo.');
    if (ok) closeGoalOperationModal();
    else byId('goalOperationError').textContent = byId('goalsStatus').textContent;
  }

  function performGoalAction(goal, action) {
    if (action === 'edit') { openGoalModal(goal); return; }
    if (action === 'deposit' || action === 'withdrawal') { openGoalOperationModal(goal, action); return; }
    if (action === 'delete') {
      if (!confirm('Eliminare “' + goal.name + '” e il relativo storico di versamenti e prelievi? Questa azione non può essere annullata.')) return;
      persistGoalMutation(function (candidate) {
        candidate.goals = candidate.goals.filter(function (item) { return String(item.id) !== String(goal.id); });
      }, 'Eliminazione non salvata. Lo spazio disponibile sul dispositivo potrebbe essere esaurito.');
      return;
    }
    if (action === 'complete' && goal.saved < goal.target) {
      setGoalStatus('Per completare l’obiettivo occorre aver accantonato almeno il target.', true);
      return;
    }
    if (action === 'complete' || action === 'archive' || action === 'activate') {
      persistGoalMutation(function (candidate) {
        if (action === 'complete') {
          applyGoalStatus(candidate, goal.id, 'complete');
        } else if (action === 'archive') {
          applyGoalStatus(candidate, goal.id, 'archive');
        } else if (candidate.goals.filter(function (item) { return item.status === 'active'; }).length >= GOAL_MAX_COUNT) {
          throw new Error('Non è possibile riattivare più di 100 obiettivi.');
        } else {
          applyGoalStatus(candidate, goal.id, 'activate');
        }
      }, 'Modifica non salvata. Controlla lo spazio disponibile sul dispositivo.');
    }
  }

  function handleGoalDialogKeydown(event) {
    var modal = event.target.closest('#goalModal, #goalOperationModal');
    if (!modal || modal.classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (modal.id === 'goalModal') closeGoalModal(); else closeGoalOperationModal();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = modal.querySelectorAll('button:not([disabled]), input:not([disabled])');
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function sixMonthKeys(endMonth) {
    var end = monthFromKey(endMonth);
    if (!end) return [];
    var keys = [];
    for (var offset = 5; offset >= 0; offset--) {
      keys.push(ymKey(new Date(end.getFullYear(), end.getMonth() - offset, 1)));
    }
    return keys;
  }

  function renderSpendingTrends() {
    var events = spendingOutflows();
    var availableMonths = {};
    events.forEach(function (event) { availableMonths[event.month] = true; });
    availableMonths[ymKey(new Date())] = true;
    availableMonths[spendingTrendMonth] = true;
    var monthSelect = byId('spendingTrendMonth');
    var months = Object.keys(availableMonths).sort().reverse();
    monthSelect.innerHTML = months.map(function (month) {
      return '<option value="' + month + '">' + esc(monthLabel(month)) + '</option>';
    }).join('');
    if (months.indexOf(spendingTrendMonth) < 0) spendingTrendMonth = ymKey(new Date());
    monthSelect.value = spendingTrendMonth;
    byId('spendingTrendType').value = spendingTrendType;

    var filteredEvents = events.filter(function (event) {
      return spendingTrendType === 'all' || event.type === spendingTrendType;
    });
    var selectedTotal = round2(filteredEvents.reduce(function (total, event) {
      return total + (event.month === spendingTrendMonth ? event.amount : 0);
    }, 0));
    var previousDate = monthFromKey(spendingTrendMonth);
    var previousMonth = ymKey(new Date(previousDate.getFullYear(), previousDate.getMonth() - 1, 1));
    var previousTotal = round2(filteredEvents.reduce(function (total, event) {
      return total + (event.month === previousMonth ? event.amount : 0);
    }, 0));
    var difference = round2(selectedTotal - previousTotal);

    byId('spendingTrendSelectedMonth').textContent = monthLabel(spendingTrendMonth);
    byId('spendingTrendTotal').textContent = eur(selectedTotal);
    byId('spendingTrendComparison').textContent = 'Differenza assoluta rispetto a ' + monthLabel(previousMonth) + ': ' + eurSigned(difference);
    byId('spendingTrendComparisonNote').textContent = previousTotal > 0
      ? 'Mese precedente: ' + eur(previousTotal) + ' · variazione: ' + (difference > 0 ? '+' : '') + ((difference / previousTotal) * 100).toFixed(1).replace('.', ',') + '%'
      : 'Mese precedente: 0,00 € · variazione percentuale non calcolabile perché il totale precedente è zero.';

    var chartMonths = sixMonthKeys(spendingTrendMonth);
    var totals = chartMonths.map(function (month) {
      return round2(filteredEvents.reduce(function (total, event) {
        return total + (event.month === month ? event.amount : 0);
      }, 0));
    });
    var maxTotal = Math.max.apply(null, totals.concat([0]));
    var hasChartData = totals.some(function (total) { return total > 0; });
    byId('spendingTrendChart').innerHTML = hasChartData
      ? '<div class="space-y-3">' + chartMonths.map(function (month, index) {
          var width = maxTotal > 0 ? Math.max(totals[index] > 0 ? 2 : 0, (totals[index] / maxTotal) * 100) : 0;
          return '<div class="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-2">' +
            '<span class="text-10px text-slate-400 truncate">' + esc(monthLabel(month)) + '</span>' +
            '<div class="spending-trend-track" aria-hidden="true"><div class="spending-trend-bar" style="width:' + width + '%"></div></div>' +
            '<span class="text-10px text-right font-semibold text-slate-200">' + eur(totals[index]) + '</span>' +
          '</div>';
        }).join('') + '</div>'
      : '<p class="text-xs text-slate-500 text-center py-5">Nessuna uscita effettiva disponibile per questa tipologia negli ultimi sei mesi.</p>';

    byId('spendingTrendMonthsTable').innerHTML = chartMonths.map(function (month, index) {
      return '<tr class="border-b border-slate-800 last:border-0">' +
        '<th scope="row" class="py-2 pr-3 font-medium text-slate-300">' + esc(monthLabel(month)) + '</th>' +
        '<td class="py-2 text-right text-slate-200">' + eur(totals[index]) + '</td>' +
      '</tr>';
    }).join('');

    var monthlyDebits = filteredEvents.filter(function (event) {
      return event.month === spendingTrendMonth && (event.type === 'fixed' || event.type === 'extra');
    }).sort(function (a, b) { return a.timestamp - b.timestamp; });
    byId('spendingTrendDebitsTable').innerHTML = monthlyDebits.length
      ? monthlyDebits.map(function (event) {
          var typeLabel = event.type === 'fixed' ? 'Spesa fissa' : 'Spesa extra';
          var name = event.name ? typeLabel + ' · ' + event.name : typeLabel + ' · voce non più disponibile';
          return '<tr class="border-b border-slate-800 last:border-0">' +
            '<td class="py-2 pr-3 text-slate-400">' + fmtFull(event.timestamp) + '</td>' +
            '<th scope="row" class="py-2 pr-3 font-medium text-slate-300">' + esc(name) + '</th>' +
            '<td class="py-2 text-right text-slate-200">' + eur(event.amount) + '</td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="3" class="py-2 text-11px text-slate-500">Nessun addebito fisso o extra corrispondente ai filtri nel mese selezionato.</td></tr>';

    var categoryTotals = {};
    filteredEvents.forEach(function (event) {
      if (event.type !== 'pocket' || event.month !== spendingTrendMonth || !event.category) return;
      categoryTotals[event.category] = (categoryTotals[event.category] || 0) + event.amount;
    });
    var categories = CATEGORIES.filter(function (category) { return categoryTotals[category] > 0; });
    byId('spendingTrendCategoryNote').textContent = spendingTrendType === 'fixed' || spendingTrendType === 'extra'
      ? 'Gli addebiti fissi ed extra non registrano una categoria di spesa.'
      : 'Mostra solo le spese Pocket del mese selezionato per cui è disponibile una categoria salvata.';
    byId('spendingTrendCategories').innerHTML = categories.length
      ? categories.map(function (category) {
          return '<div class="flex items-center justify-between gap-3 text-xs"><span class="text-slate-300">' + esc(category) + '</span><span class="font-semibold text-slate-200">' + eur(round2(categoryTotals[category])) + '</span></div>';
        }).join('')
      : '<p class="text-11px text-slate-500">Nessun dettaglio categorizzato disponibile per questo mese.</p>';
  }

  function hasUserData() {
    return appData.bankHistory.length > 1 || appData.historicalWeeks.length > 0 ||
      appData.fixedExpenses.length > 0 || appData.extraExpenses.length > 0 ||
      appData.currentWeek.expenses.length > 0 || appData.goals.length > 0 ||
      (parseFloat(appData.monthlyIncome) || 0) > 0;
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function validateBackupData(data) {
    if (!isRecord(data) || !isRecord(data.currentWeek) ||
        !Array.isArray(data.currentWeek.expenses) || !Array.isArray(data.fixedExpenses)) {
      throw new Error('Il file non contiene una struttura di backup riconosciuta.');
    }

    var arrayPaths = [
      { value: data.currentWeek.expenses, name: 'spese Pocket' },
      { value: data.fixedExpenses, name: 'spese fisse' },
      { value: data.extraExpenses, name: 'spese extra' },
      { value: data.historicalWeeks, name: 'settimane archiviate' },
      { value: data.bankHistory, name: 'movimenti del conto' }
    ];
    arrayPaths.forEach(function (entry) {
      if (entry.value === undefined) return;
      if (!Array.isArray(entry.value) || !entry.value.every(isRecord)) {
        throw new Error('La struttura di ' + entry.name + ' non è valida.');
      }
    });
    if (data.salaryPosted !== undefined &&
        (!Array.isArray(data.salaryPosted) || !data.salaryPosted.every(function (key) { return typeof key === 'string'; }))) {
      throw new Error('Lo storico degli stipendi non è valido.');
    }

    function checkNumber(value, name, allowNegative) {
      if (value === undefined || value === null) return;
      if (typeof value !== 'number' || !isFinite(value) || (!allowNegative && value < 0)) {
        throw new Error('Il valore di ' + name + ' non è valido.');
      }
    }

    checkNumber(data.bankBalance, 'saldo conto', true);
    checkNumber(data.monthlyIncome, 'entrata mensile', true);
    checkNumber(data.accumulatedSavingsFromLeftovers, 'risparmi accumulati', true);
    checkNumber(data.weeklyTarget, 'budget settimanale', false);
    checkNumber(data.currentWeek.initialBudget, 'budget Pocket', false);
    if (data.lastBackup !== undefined && data.lastBackup !== null) checkNumber(data.lastBackup, 'data del backup', false);
    if (data.salaryDay !== undefined && data.salaryDay !== null && data.salaryDay !== '' &&
        (typeof data.salaryDay !== 'number' || !isFinite(data.salaryDay) || data.salaryDay < 1 || data.salaryDay > 31)) {
      throw new Error('Il giorno di accredito dello stipendio non è valido.');
    }
    if (data.currentWeek.startDate !== undefined && typeof data.currentWeek.startDate !== 'string') {
      throw new Error('La data della settimana corrente non è valida.');
    }
    if (data.currentWeek.endDate !== undefined && typeof data.currentWeek.endDate !== 'string') {
      throw new Error('La data della settimana corrente non è valida.');
    }

    function validateExpense(expense, requireTitle, label) {
      if (requireTitle && typeof expense.title !== 'string') throw new Error('Una spesa Pocket non contiene un titolo valido.');
      if (!requireTitle && typeof expense.name !== 'string') throw new Error('Una spesa ricorrente non contiene un nome valido.');
      if (!Object.prototype.hasOwnProperty.call(expense, 'amount')) {
        throw new Error('Una voce di ' + label + ' non contiene un importo.');
      }
      if (typeof expense.amount !== 'number') throw new Error('L’importo di ' + label + ' non è valido.');
      checkNumber(expense.amount, 'importo di ' + label, false);
      ['title', 'name', 'category', 'date'].forEach(function (key) {
        if (expense[key] !== undefined && expense[key] !== null && typeof expense[key] !== 'string') {
          throw new Error('Un campo descrittivo di una spesa non è valido.');
        }
      });
      if (expense.id !== undefined && typeof expense.id !== 'number' && typeof expense.id !== 'string') {
        throw new Error('L’identificativo di una spesa non è valido.');
      }
    }
    data.currentWeek.expenses.forEach(function (expense) { validateExpense(expense, true, 'spese Pocket'); });
    data.fixedExpenses.forEach(function (expense) { validateExpense(expense, false, 'spese fisse'); });
    (data.extraExpenses || []).forEach(function (expense) { validateExpense(expense, false, 'spese extra'); });

    data.fixedExpenses.forEach(function (expense) {
      if (expense.day !== undefined && expense.day !== null && expense.day !== '' &&
          (typeof expense.day !== 'number' || !isFinite(expense.day) || expense.day < 1 || expense.day > 31)) {
        throw new Error('Il giorno di addebito di una spesa fissa non è valido.');
      }
      if (expense.posted !== undefined && expense.posted !== null && !Array.isArray(expense.posted)) {
        throw new Error('Lo storico degli addebiti fissi non è valido.');
      }
      if (Array.isArray(expense.posted) && !expense.posted.every(function (key) { return typeof key === 'string'; })) {
        throw new Error('Lo storico degli addebiti fissi non è valido.');
      }
    });
    (data.extraExpenses || []).forEach(function (expense) {
      if (expense.posted !== undefined && expense.posted !== null && typeof expense.posted !== 'boolean') {
        throw new Error('Lo stato di addebito di una spesa extra non è valido.');
      }
    });

    (data.historicalWeeks || []).forEach(function (week) {
      ['budget', 'spent', 'leftover'].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(week, key)) checkNumber(week[key], 'riepilogo di una settimana', key === 'leftover');
      });
    });
    (data.bankHistory || []).forEach(function (movement) {
      ['t', 'delta', 'balance'].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(movement, key)) checkNumber(movement[key], 'movimento del conto', true);
      });
      ['note', 'src'].forEach(function (key) {
        if (movement[key] !== undefined && movement[key] !== null && typeof movement[key] !== 'string') {
          throw new Error('Un movimento del conto contiene un campo non valido.');
        }
      });
    });
    if (data.bankChartReset !== undefined && data.bankChartReset !== null) {
      var chartReset = data.bankChartReset;
      if (!isRecord(chartReset) || typeof chartReset.at !== 'number' || !isFinite(chartReset.at) ||
          typeof chartReset.balance !== 'number' || !isFinite(chartReset.balance) ||
          !Array.isArray(chartReset.movements) || chartReset.movements.length > MAX_BANK_POINTS ||
          !chartReset.movements.every(function (movement) {
            return isRecord(movement) &&
              (typeof movement.id === 'string' || typeof movement.id === 'number') &&
              typeof movement.t === 'number' && isFinite(movement.t) &&
              typeof movement.delta === 'number' && isFinite(movement.delta) &&
              typeof movement.balance === 'number' && isFinite(movement.balance);
          })) {
        throw new Error('Lo storico grafico del conto non è valido.');
      }
    }

    if (data.categoryLimits !== undefined && data.categoryLimits !== null &&
        (!isRecord(data.categoryLimits) || Object.keys(data.categoryLimits).some(function (category) {
          var limit = data.categoryLimits[category];
          return typeof limit !== 'number' || !isFinite(limit) || limit < 0;
        }))) {
      throw new Error('La struttura dei limiti per categoria non è valida.');
    }
    if (data.goals !== undefined && data.goals !== null) {
      if (!Array.isArray(data.goals) || data.goals.length > GOAL_MAX_COUNT) {
        throw new Error('La lista degli obiettivi non è valida o supera il limite di 100.');
      }
      var goalIds = {};
      data.goals.forEach(function (goal) {
        if (!isRecord(goal) || (typeof goal.id !== 'string' && typeof goal.id !== 'number') ||
            typeof goal.name !== 'string' || !goal.name.trim() || goal.name.length > 80 ||
            typeof goal.target !== 'number' || !isFinite(goal.target) || goal.target <= 0 ||
            typeof goal.saved !== 'number' || !isFinite(goal.saved) || goal.saved < 0 ||
            !validIsoDate(goal.deadline === undefined ? null : goal.deadline) ||
            (goal.theme !== undefined && !GOAL_THEMES.some(function (theme) { return theme.id === goal.theme; })) ||
            (goal.status !== undefined && ['active', 'completed', 'archived'].indexOf(goal.status) < 0) ||
            (goal.history !== undefined && (!Array.isArray(goal.history) || goal.history.length > GOAL_HISTORY_MAX))) {
          throw new Error('Un obiettivo del backup contiene dati non validi.');
        }
        var id = String(goal.id);
        if (goalIds[id]) throw new Error('Il backup contiene identificativi obiettivo duplicati.');
        goalIds[id] = true;
        if (goal.status === 'completed' && goal.saved < goal.target) {
          throw new Error('Un obiettivo completato non ha raggiunto il target.');
        }
        var operationIds = {};
        (goal.history || []).forEach(function (operation) {
          if (!isRecord(operation) || (typeof operation.id !== 'string' && typeof operation.id !== 'number') ||
              ['deposit', 'withdrawal'].indexOf(operation.type) < 0 ||
              typeof operation.amount !== 'number' || !isFinite(operation.amount) || operation.amount <= 0 ||
              typeof operation.at !== 'number' || !isFinite(operation.at) ||
              (operation.note !== undefined && (typeof operation.note !== 'string' || operation.note.length > 240)) ||
              (operation.balanceBefore !== undefined && (typeof operation.balanceBefore !== 'number' || !isFinite(operation.balanceBefore) || operation.balanceBefore < 0)) ||
              (operation.balanceAfter !== undefined && (typeof operation.balanceAfter !== 'number' || !isFinite(operation.balanceAfter) || operation.balanceAfter < 0))) {
            throw new Error('Lo storico operazioni di un obiettivo non è valido.');
          }
          var operationId = String(operation.id);
          if (operationIds[operationId]) throw new Error('Lo storico di un obiettivo contiene identificativi duplicati.');
          operationIds[operationId] = true;
          if (operation.balanceBefore !== undefined && operation.balanceAfter !== undefined) {
            var expectedBalance = round2(operation.balanceBefore + (operation.type === 'deposit' ? operation.amount : -operation.amount));
            if (expectedBalance < 0 || expectedBalance !== round2(operation.balanceAfter)) {
              throw new Error('Lo storico operazioni non corrisponde ai saldi riportati.');
            }
          }
        });
      });
    }
    if (data.achievementState !== undefined && data.achievementState !== null) {
      normalizeAchievementState(clone(data.achievementState));
    }
  }

  function prepareImportedData(data) {
    validateBackupData(data);
    return normalize(clone(data));
  }

  function backupImportSummary(data) {
    var lastBackupText = data.lastBackup && isFinite(data.lastBackup)
      ? fmtFull(data.lastBackup)
      : 'non indicata';
    return 'Riepilogo del backup validato:\n' +
      '• Spese Pocket correnti: ' + data.currentWeek.expenses.length + '\n' +
      '• Spese fisse: ' + data.fixedExpenses.length + '\n' +
      '• Spese extra: ' + data.extraExpenses.length + '\n' +
      '• Settimane archiviate: ' + data.historicalWeeks.length + '\n' +
      '• Ultimo backup: ' + lastBackupText;
  }

  function recordImportedBackup(candidate, importedPayload, previousEvents) {
    var state = candidate.achievementState;
    (previousEvents || []).forEach(function (event) {
      var exists = state.importEvents.some(function (saved) { return saved.at === event.at && saved.hasGoals === event.hasGoals; });
      if (!exists && state.importEvents.length < 100) state.importEvents.push(event);
    });
    if (state.importEvents.length >= 100) {
      setGoalStatus('Importazione riuscita, ma lo storico locale degli import per i traguardi è pieno.', true);
      return;
    }
    state.importEvents.push({
      at: Date.now(),
      hasGoals: !!importedPayload && (
        Object.prototype.hasOwnProperty.call(importedPayload, 'goals') ||
        Object.prototype.hasOwnProperty.call(importedPayload, 'achievementState')
      )
    });
  }

  function replacePreparedData(data) {
    var previousData = appData;
    appData = data;
    try {
      processRecurring();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (err) {
      appData = previousData;
      throw new Error('Importazione non completata: impossibile salvare i dati su questo dispositivo.');
    }
    renderAll();
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

  function recordAchievementEvent(eventName) {
    var fields = {
      driveBackup: 'driveBackupAt',
      serviceWorkerActive: 'serviceWorkerActiveAt',
      pwaUpdated: 'pwaUpdatedAt'
    };
    var field = fields[eventName];
    if (!field || appData.achievementState[field]) return;
    appData.achievementState[field] = Date.now();
    saveData();
  }

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
    var state = appData.achievementState;
    var day = new Date(ts).toISOString().slice(0, 10);
    if (state.backupDates.indexOf(day) < 0) {
      if (state.backupDates.length < 400) state.backupDates.push(day);
      else setGoalStatus('Limite dello storico backup dei traguardi raggiunto; la data dell’ultimo backup resta aggiornata.', true);
    }
    if (state.backupEvents.length < 500) {
      state.backupEvents.push({ at: ts });
    } else {
      setGoalStatus('Limite dello storico backup dei traguardi raggiunto; la data dell’ultimo backup resta aggiornata.', true);
    }
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
    appData.achievementState.jsonExportedAt = p.data.lastBackup;
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
      return navigator.share({ files: [candidate], title: 'MyLittleBudget', text: 'Backup del ' + new Date().toLocaleDateString('it-IT') })
        .then(function () {
          appData.achievementState.jsonExportedAt = p.data.lastBackup;
          markBackup(p.data.lastBackup);
        })
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
    if (file.size > 10 * 1024 * 1024) {
      alert("Il file supera il limite di 10 MB e non è stato importato.");
      ev.target.value = '';
      return;
    }
    if (file.size === 0) {
      alert("Il file è vuoto e non è stato importato.");
      ev.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var parsed = JSON.parse(e.target.result);
        var candidate = prepareImportedData(parsed);
        var summary = backupImportSummary(candidate) + '\n\n' +
          'Importare il backup? Sostituirà i dati presenti su questo dispositivo.';
        if (!confirm(summary)) { ev.target.value = ''; return; }
        recordImportedBackup(candidate, parsed, appData.achievementState.importEvents);
        replacePreparedData(candidate);
        alert('Dati importati con successo!');
      } catch (err) {
        alert("Errore durante l'importazione: " + (err && err.message ? err.message : 'file JSON non valido.'));
      }
      ev.target.value = '';
    };
    reader.onerror = function () {
      alert("Impossibile leggere il file di backup.");
      ev.target.value = '';
    };
    try {
      reader.readAsText(file);
    } catch (err) {
      alert("Impossibile leggere il file di backup.");
      ev.target.value = '';
    }
  }

  var bankChartResetReturnFocus = null;

  function openBankChartResetModal() {
    bankChartResetReturnFocus = document.activeElement;
    var modal = byId('bankChartResetModal');
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    byId('cancelBankChartResetBtn').focus();
  }

  function closeBankChartResetModal() {
    var modal = byId('bankChartResetModal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    if (bankChartResetReturnFocus && document.contains(bankChartResetReturnFocus)) {
      bankChartResetReturnFocus.focus();
    }
    bankChartResetReturnFocus = null;
  }

  function confirmBankChartReset() {
    if (byId('bankChartResetModal').classList.contains('hidden')) return;
    resetBankHistory();
    closeBankChartResetModal();
  }

  function handleBankChartResetModalKeydown(event) {
    var modal = byId('bankChartResetModal');
    if (modal.classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBankChartResetModal();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = modal.querySelectorAll('button:not([disabled])');
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (!modal.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
    var activeLimits = CATEGORIES.filter(function (category) { return Number(appData.categoryLimits[category]) > 0; });
    var withinLimits = activeLimits.length > 0 && activeLimits.every(function (category) {
      var categoryTotal = appData.currentWeek.expenses.reduce(function (total, expense) {
        return expense.category === category ? total + (Number(expense.amount) || 0) : total;
      }, 0);
      return categoryTotal <= Number(appData.categoryLimits[category]);
    });
    if (appData.achievementState.weekClosures.length < GOAL_HISTORY_MAX) {
      appData.achievementState.weekClosures.push({
        at: Date.now(), leftover: left, withinLimits: withinLimits,
        targetChanged: !!appData.achievementState.targetChangedAt
      });
    } else {
      setGoalStatus('Storico traguardi pieno: la chiusura è stata registrata nell’Archivio, ma non nel conteggio dei traguardi.', true);
    }
    appData.achievementState.targetChangedAt = null;
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
    var newlyUnlocked = evaluateAchievements();
    if (newlyUnlocked.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      } catch (e) {
        if (byId('goalsStatus')) setGoalStatus('Un traguardo è stato rilevato, ma non è stato possibile salvarlo localmente. Libera spazio ed esporta un backup.', true);
      }
    }
    renderPocketTab();
    renderMonthlyTab();
    renderSpendingTrends();
    renderCondoTab();
    renderArchiveTab();
    renderGoalsTab();
    renderBackupBanner();
    selectCategory(appData.currentCategory || 'Spesa');
    var storageWarning = byId('dataStorageWarning');
    if (storageWarning) {
      storageWarning.textContent = dataLoadWarning || '';
      storageWarning.classList.toggle('hidden', !dataLoadWarning);
    }
  }

  window.openResetModal = openResetModal;
  window.closeResetModal = closeResetModal;
  window.executeSundayReset = executeSundayReset;
  window.resetBankHistory = resetBankHistory;
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
    attachSwipeNavigation();
    document.querySelectorAll('.cat-btn').forEach(function (b) {
      b.addEventListener('click', function () { selectCategory(b.getAttribute('data-cat')); });
    });
    byId('addExpenseForm').addEventListener('submit', handleAddExpense);
    byId('weeklyExpenseSearch').addEventListener('input', function () {
      weeklyExpenseSearch = this.value;
      if ((weeklyExpenseSearch.trim() || weeklyExpenseCategory !== 'all') && !appData.achievementState.pocketFilterApplied) {
        appData.achievementState.pocketFilterApplied = true;
        saveData();
      }
      renderWeeklyTransactions();
    });
    byId('weeklyExpenseCategory').addEventListener('change', function () {
      weeklyExpenseCategory = this.value;
      if (weeklyExpenseCategory !== 'all' && !appData.achievementState.pocketFilterApplied) {
        appData.achievementState.pocketFilterApplied = true;
        saveData();
      }
      renderWeeklyTransactions();
    });
    byId('resetWeeklyExpenseFiltersBtn').addEventListener('click', resetWeeklyExpenseFilters);
    byId('resetBankHistoryBtn').addEventListener('click', openBankChartResetModal);
    byId('cancelBankChartResetBtn').addEventListener('click', closeBankChartResetModal);
    byId('confirmBankChartResetBtn').addEventListener('click', confirmBankChartReset);
    byId('bankChartResetModal').addEventListener('click', function (event) {
      if (event.target === this) closeBankChartResetModal();
    });
    document.addEventListener('keydown', handleBankChartResetModalKeydown);
    byId('manageCategoryLimitsBtn').addEventListener('click', openCategoryLimitsModal);
    byId('cancelCategoryLimitsBtn').addEventListener('click', closeCategoryLimitsModal);
    byId('categoryLimitsForm').addEventListener('submit', saveCategoryLimits);
    byId('categoryLimitsModal').addEventListener('click', function (e) {
      if (e.target === this) closeCategoryLimitsModal();
    });
    document.addEventListener('keydown', handleCategoryLimitsModalKeydown);
    document.addEventListener('keydown', handleGoalDialogKeydown);
    byId('importFileInput').addEventListener('change', importDataJSON);
    byId('addGoalBtn').addEventListener('click', function () { openGoalModal(null); });
    byId('cancelGoalBtn').addEventListener('click', closeGoalModal);
    byId('goalForm').addEventListener('submit', submitGoalForm);
    byId('goalModal').addEventListener('click', function (event) {
      if (event.target === this) closeGoalModal();
    });
    byId('cancelGoalOperationBtn').addEventListener('click', closeGoalOperationModal);
    byId('goalOperationForm').addEventListener('submit', submitGoalOperation);
    byId('goalOperationModal').addEventListener('click', function (event) {
      if (event.target === this) closeGoalOperationModal();
    });
    byId('goalThemeOptions').addEventListener('click', function (event) {
      var button = event.target.closest('[data-goal-theme]');
      if (!button) return;
      this.querySelectorAll('[data-goal-theme]').forEach(function (option) {
        var selected = option === button;
        option.classList.toggle('selected', selected);
        option.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
    });
    byId('goalStatusFilter').addEventListener('change', function () {
      goalStatusFilter = this.value;
      renderGoalsTab();
    });
    byId('achievementFilter').addEventListener('change', function () {
      achievementFilter = this.value;
      renderGoalsTab();
    });
    byId('spendingTrendType').addEventListener('change', function () {
      spendingTrendType = this.value;
      if (appData.achievementState.trendTypes.indexOf(spendingTrendType) < 0 && appData.achievementState.trendTypes.length < 4) {
        appData.achievementState.trendTypes.push(spendingTrendType);
        saveData();
      } else {
        renderSpendingTrends();
      }
    });
    byId('spendingTrendMonth').addEventListener('change', function () {
      spendingTrendMonth = this.value;
      var previous = ymKey(new Date());
      if (monthFromKey(spendingTrendMonth) < monthFromKey(previous) && !appData.achievementState.previousMonthViewedAt) {
        appData.achievementState.previousMonthViewedAt = Date.now();
        saveData();
      } else {
        renderSpendingTrends();
      }
    });
    initServiceWorker();
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
      if (btn.hasAttribute('data-add-goal')) {
        openGoalModal(null);
      } else if (btn.hasAttribute('data-goal-action')) {
        var goalId = btn.getAttribute('data-goal-id');
        var goal = appData.goals.filter(function (item) { return String(item.id) === String(goalId); })[0];
        if (goal) performGoalAction(goal, btn.getAttribute('data-goal-action'));
      } else if (btn.hasAttribute('data-reset-week-filters')) {
        resetWeeklyExpenseFilters();
      } else if (btn.hasAttribute('data-del-week')) {
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
    switchTab(start);
  }

  function initServiceWorker() {
    if (!window.PwaUpdate) {
      console.warn('Gestore aggiornamenti PWA non disponibile.');
      return;
    }
    window.PwaUpdate.initialize({
      navigator: navigator,
      window: window,
      document: document,
      onServiceWorkerActive: function () {
        recordAchievementEvent('serviceWorkerActive');
      },
      onUpdateApplied: function () {
        recordAchievementEvent('pwaUpdated');
      }
    });
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

    prepareData: function (data) {
      var candidate = prepareImportedData(data);
      return { data: candidate, summary: backupImportSummary(candidate) };
    },

    replaceData: function (data) {
      var candidate = prepareImportedData(data);
      recordImportedBackup(candidate, data, appData.achievementState.importEvents);
      replacePreparedData(candidate);
      return clone(appData);
    },

    recordAchievementEvent: recordAchievementEvent,

    hasData: function () {
      return hasUserData();
    }
  };
})();
