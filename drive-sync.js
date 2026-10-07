(function () {
  'use strict';

  var CLIENT_ID = '796178418115-63ocolcudoufut7k42l6k6herp2m859a.apps.googleusercontent.com';
  var SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  var FILE_NAME = 'budgetapp-backup.json';
  var tokenClient = null;
  var busy = false;

  function byId(id) { return document.getElementById(id); }

  function fmt(ts) {
    try {
      return new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(ts); }
  }

  function setStatus(text, isError) {
    var el = byId('driveStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'text-10px mb-3 ' + (isError ? 'text-rose-400' : 'text-slate-500');
  }

  function setBusy(v) {
    busy = v;
    ['driveSaveBtn', 'driveRestoreBtn'].forEach(function (id) {
      var b = byId(id);
      if (b) { b.disabled = v; b.style.opacity = v ? '0.5' : '1'; }
    });
  }

  function loadGis() {
    return new Promise(function (resolve, reject) {
      if (window.google && google.accounts && google.accounts.oauth2) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Impossibile caricare la libreria Google. Controlla la connessione.')); };
      document.head.appendChild(s);
    });
  }

  function getToken() {
    return loadGis().then(function () {
      return new Promise(function (resolve, reject) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          callback: function (resp) {
            if (resp.error) { reject(new Error('Accesso Google non riuscito: ' + resp.error)); return; }
            var granted = String(resp.scope || '');
            if (granted.indexOf('drive.appdata') < 0) {
              reject(new Error('Permesso Drive non concesso: riprova e spunta la richiesta di accesso ai dati dell\u2019app.'));
              return;
            }
            resolve(resp.access_token);
          },
          error_callback: function (err) {
            reject(new Error('Accesso Google annullato o bloccato' + (err && err.type ? ' (' + err.type + ')' : '') + '.'));
          }
        });
        tokenClient.requestAccessToken();
      });
    });
  }

  function api(token, path, options) {
    options = options || {};
    options.headers = Object.assign({ Authorization: 'Bearer ' + token }, options.headers || {});
    return fetch('https://www.googleapis.com' + path, options).then(function (r) {
      if (r.ok) return r;
      return r.text().then(function (body) {
        var msg = body;
        try { var p = JSON.parse(body); if (p.error && p.error.message) msg = p.error.message; } catch (e) {}
        throw new Error('Drive ' + r.status + ': ' + msg);
      });
    });
  }

  function findBackup(token) {
    var q = encodeURIComponent("name = '" + FILE_NAME + "'");
    return api(token, '/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&q=' + q)
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.files && d.files.length ? d.files[0] : null; });
  }

  function readBackup(token, id) {
    return api(token, '/drive/v3/files/' + id + '?alt=media')
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        var parsed = JSON.parse(txt);
        if (!parsed || !parsed.data || !parsed.data.currentWeek || !Array.isArray(parsed.data.fixedExpenses)) {
          throw new Error('Il file su Drive non ha un formato valido.');
        }
        return parsed;
      });
  }

  function writeBackup(token, existing, payload) {
    var body = JSON.stringify(payload);
    var create = existing ? Promise.resolve(existing.id) :
      api(token, '/drive/v3/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })
      }).then(function (r) { return r.json(); }).then(function (f) { return f.id; });
    return create.then(function (id) {
      return api(token, '/upload/drive/v3/files/' + id + '?uploadType=media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
    });
  }

  function saveToDrive() {
    if (busy) return;
    if (!window.BudgetApp) { setStatus('App non pronta: ricarica la pagina.', true); return; }
    if (!window.BudgetApp.hasData() &&
        !confirm('Su questo dispositivo non ci sono dati. Salvare comunque su Drive?\n\nAttenzione: potresti sostituire un backup esistente con dati vuoti.')) return;
    setBusy(true);
    setStatus('Accesso a Google\u2026');
    var token;
    getToken().then(function (t) {
      token = t;
      setStatus('Controllo il backup esistente\u2026');
      return findBackup(token);
    }).then(function (existing) {
      if (!existing) return { existing: null, ok: true };
      return readBackup(token, existing.id).then(function (remote) {
        var ok = confirm('Su Drive esiste gi\u00e0 un backup del ' + fmt(remote.updatedAt || existing.modifiedTime) +
          '.\n\nSostituirlo con i dati di questo dispositivo?');
        return { existing: existing, ok: ok };
      }).catch(function (err) {
        if (/formato valido|JSON/i.test(err.message)) {
          var ok = confirm('Il backup su Drive non \u00e8 leggibile. Sostituirlo con i dati di questo dispositivo?');
          return { existing: existing, ok: ok };
        }
        throw err;
      });
    }).then(function (res) {
      if (!res.ok) { setStatus('Salvataggio annullato. Nessuna modifica su Drive.'); return; }
      setStatus('Salvataggio in corso\u2026');
      var payload = { app: 'budgetapp', schemaVersion: 1, updatedAt: Date.now(), data: window.BudgetApp.getData() };
      return writeBackup(token, res.existing, payload).then(function () {
        setStatus('Backup salvato su Drive il ' + fmt(payload.updatedAt) + '.');
      });
    }).catch(function (err) {
      setStatus('Errore: ' + err.message, true);
    }).then(function () { setBusy(false); });
  }

  function restoreFromDrive() {
    if (busy) return;
    if (!window.BudgetApp) { setStatus('App non pronta: ricarica la pagina.', true); return; }
    setBusy(true);
    setStatus('Accesso a Google\u2026');
    var token;
    getToken().then(function (t) {
      token = t;
      setStatus('Cerco il backup su Drive\u2026');
      return findBackup(token);
    }).then(function (existing) {
      if (!existing) { setStatus('Nessun backup trovato su Drive.'); return; }
      return readBackup(token, existing.id).then(function (remote) {
        var warn = window.BudgetApp.hasData()
          ? '\n\nI dati attuali di questo dispositivo verranno SOSTITUITI. Ti consiglio prima un backup JSON da Archivio.'
          : '';
        if (!confirm('Ripristinare il backup salvato il ' + fmt(remote.updatedAt || existing.modifiedTime) + '?' + warn)) {
          setStatus('Ripristino annullato. Nessuna modifica ai dati.');
          return;
        }
        window.BudgetApp.replaceData(remote.data);
        setStatus('Dati ripristinati dal backup del ' + fmt(remote.updatedAt || existing.modifiedTime) + '.');
      });
    }).catch(function (err) {
      setStatus('Errore: ' + err.message, true);
    }).then(function () { setBusy(false); });
  }

  function buildCard() {
    var card = document.createElement('div');
    card.id = 'driveCard';
    card.className = 'glass rounded-2xl p-4 shadow-lg';
    card.innerHTML =
      '<h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-2"><i class="fa-brands fa-google-drive text-sky-400"></i> Google Drive</h3>' +
      '<p id="driveStatus" class="text-10px text-slate-500 mb-3">Backup manuale nel tuo Drive privato. Nessun salvataggio automatico.</p>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<button type="button" id="driveSaveBtn" class="bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"><i class="fa-solid fa-cloud-arrow-up"></i> Salva su Drive</button>' +
      '<button type="button" id="driveRestoreBtn" class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"><i class="fa-solid fa-cloud-arrow-down"></i> Ripristina</button>' +
      '</div>' +
      '<p class="text-10px text-slate-500 mt-3 leading-snug">Il file resta in una cartella nascosta del tuo account Google, visibile solo a questa app. Prima di sostituire dati ti viene sempre chiesta conferma.</p>';
    return card;
  }

  function mount() {
    if (byId('driveCard')) return;
    var tab = byId('tab-archive');
    if (!tab) return;
    var card = buildCard();
    var heading = Array.prototype.filter.call(tab.querySelectorAll('h3'), function (h) {
      return /Backup e trasferimento/i.test(h.textContent);
    })[0];
    if (heading && heading.parentElement && heading.parentElement.parentElement === tab) {
      tab.insertBefore(card, heading.parentElement);
    } else {
      tab.appendChild(card);
    }
    byId('driveSaveBtn').addEventListener('click', saveToDrive);
    byId('driveRestoreBtn').addEventListener('click', restoreFromDrive);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
