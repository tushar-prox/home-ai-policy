(function () {
  'use strict';

  var STORAGE_KEY = 'familyScreenTimeTracker_v1';

  function uid() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function todayISODate() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function clampMinutes(n) {
    var x = parseInt(n, 10);
    if (isNaN(x) || x < 0) return 0;
    if (x > 24 * 60) return 24 * 60;
    return x;
  }

  function emptyState() {
    return {
      v: 1,
      people: [{ id: uid(), name: 'Family member 1' }],
      days: []
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !Array.isArray(data.people) || !Array.isArray(data.days)) {
        return emptyState();
      }
      if (data.people.length === 0) {
        data.people = emptyState().people;
      }
      return data;
    } catch (e) {
      return emptyState();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getDayRecord(data, date) {
    for (var i = 0; i < data.days.length; i++) {
      if (data.days[i].date === date) return data.days[i];
    }
    return null;
  }

  function upsertDay(data, date, minutesById) {
    var rec = getDayRecord(data, date);
    if (!rec) {
      rec = { date: date, minutes: {} };
      data.days.push(rec);
    }
    rec.minutes = minutesById;
    data.days.sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
  }

  function totalMinutesForDay(rec) {
    var t = 0;
    if (!rec || !rec.minutes) return 0;
    for (var k in rec.minutes) {
      if (Object.prototype.hasOwnProperty.call(rec.minutes, k)) {
        t += clampMinutes(rec.minutes[k]);
      }
    }
    return t;
  }

  function lastNDates(n) {
    var out = [];
    var d = new Date();
    for (var i = 0; i < n; i++) {
      var c = new Date(d);
      c.setDate(c.getDate() - i);
      var y = c.getFullYear();
      var m = String(c.getMonth() + 1).padStart(2, '0');
      var day = String(c.getDate()).padStart(2, '0');
      out.push(y + '-' + m + '-' + day);
    }
    return out;
  }

  var el = {
    status: null,
    peopleList: null,
    addPersonBtn: null,
    logDate: null,
    logFields: null,
    saveLogBtn: null,
    weekBars: null,
    exportBtn: null,
    importInput: null,
    resetBtn: null
  };

  var state = load();

  function setStatus(msg, isError) {
    if (!el.status) return;
    el.status.textContent = msg || '';
    el.status.classList.toggle('st-tracker-status--error', !!isError);
  }

  function renderPeople() {
    if (!el.peopleList) return;
    el.peopleList.innerHTML = '';
    state.people.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'st-tracker-person';
      row.setAttribute('data-id', p.id);
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'st-tracker-input';
      inp.value = p.name;
      inp.setAttribute('aria-label', 'Name for family member');
      inp.addEventListener('change', function () {
        p.name = inp.value.trim() || 'Member';
        save(state);
        setStatus('Name saved.');
        renderLogFields();
        renderHistoryTable();
        renderWeekBars();
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'st-tracker-btn st-tracker-btn--ghost';
      del.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i><span class="visually-hidden">Remove</span>';
      del.disabled = state.people.length <= 1;
      del.addEventListener('click', function () {
        if (state.people.length <= 1) return;
        if (!window.confirm('Remove this person? Their past minutes stay in history under this ID until you edit those days.')) return;
        state.people = state.people.filter(function (x) {
          return x.id !== p.id;
        });
        save(state);
        renderPeople();
        renderLogFields();
        renderHistoryTable();
        renderWeekBars();
        setStatus('Person removed.');
      });
      row.appendChild(inp);
      row.appendChild(del);
      el.peopleList.appendChild(row);
    });
  }

  function renderLogFields() {
    if (!el.logFields) return;
    el.logFields.innerHTML = '';
    var date = el.logDate && el.logDate.value ? el.logDate.value : todayISODate();
    var rec = getDayRecord(state, date);
    state.people.forEach(function (p) {
      var wrap = document.createElement('div');
      wrap.className = 'st-tracker-log-row';
      var lab = document.createElement('label');
      lab.className = 'st-tracker-log-label';
      lab.setAttribute('for', 'min-' + p.id);
      lab.textContent = p.name;
      var input = document.createElement('input');
      input.id = 'min-' + p.id;
      input.type = 'number';
      input.min = '0';
      input.max = '1440';
      input.step = '5';
      input.className = 'st-tracker-input st-tracker-input--num';
      input.value =
        rec && rec.minutes && rec.minutes[p.id] != null ? String(clampMinutes(rec.minutes[p.id])) : '0';
      input.setAttribute('aria-label', 'Minutes for ' + p.name);
      wrap.appendChild(lab);
      wrap.appendChild(input);
      el.logFields.appendChild(wrap);
    });
  }

  function renderHistoryTable() {
    var thead = document.getElementById('st-history-thead');
    var tbody = document.getElementById('st-history-body');
    if (!thead || !tbody) return;
    thead.innerHTML = '';
    var trh = document.createElement('tr');
    var thDate = document.createElement('th');
    thDate.textContent = 'Date';
    trh.appendChild(thDate);
    state.people.forEach(function (p) {
      var th = document.createElement('th');
      th.textContent = p.name;
      trh.appendChild(th);
    });
    var thTot = document.createElement('th');
    thTot.textContent = 'Day total (min)';
    trh.appendChild(thTot);
    thead.appendChild(trh);

    tbody.innerHTML = '';
    if (state.days.length === 0) {
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = state.people.length + 2;
      td.className = 'st-tracker-empty-cell';
      td.textContent = 'No entries yet — log minutes for a day above.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    state.days.forEach(function (day) {
      var tr = document.createElement('tr');
      var tdDate = document.createElement('td');
      tdDate.textContent = day.date;
      tr.appendChild(tdDate);
      var rowTotal = 0;
      state.people.forEach(function (p) {
        var td = document.createElement('td');
        var m = day.minutes && day.minutes[p.id] != null ? clampMinutes(day.minutes[p.id]) : 0;
        td.textContent = String(m);
        rowTotal += m;
        tr.appendChild(td);
      });
      var tdTot = document.createElement('td');
      tdTot.className = 'st-tracker-total-cell';
      tdTot.textContent = String(rowTotal);
      tr.appendChild(tdTot);
      tbody.appendChild(tr);
    });
  }

  function renderWeekBars() {
    if (!el.weekBars) return;
    el.weekBars.innerHTML = '';
    var dates = lastNDates(7).reverse();
    var maxM = 1;
    dates.forEach(function (date) {
      var rec = getDayRecord(state, date);
      var t = rec ? totalMinutesForDay(rec) : 0;
      if (t > maxM) maxM = t;
    });
    dates.forEach(function (date) {
      var rec = getDayRecord(state, date);
      var t = rec ? totalMinutesForDay(rec) : 0;
      var pct = maxM > 0 ? Math.round((t / maxM) * 100) : 0;
      var bar = document.createElement('div');
      bar.className = 'st-week-bar';
      var label = document.createElement('div');
      label.className = 'st-week-bar__label';
      label.textContent = date.slice(5);
      var track = document.createElement('div');
      track.className = 'st-week-bar__track';
      var fill = document.createElement('div');
      fill.className = 'st-week-bar__fill';
      fill.style.width = pct + '%';
      fill.setAttribute('title', t + ' min total');
      var val = document.createElement('div');
      val.className = 'st-week-bar__val';
      val.textContent = t ? t + 'm' : '—';
      track.appendChild(fill);
      bar.appendChild(label);
      bar.appendChild(track);
      bar.appendChild(val);
      el.weekBars.appendChild(bar);
    });
  }

  function saveLog() {
    var date = el.logDate && el.logDate.value;
    if (!date) {
      setStatus('Pick a date.', true);
      return;
    }
    var minutes = {};
    state.people.forEach(function (p) {
      var input = document.getElementById('min-' + p.id);
      minutes[p.id] = input ? clampMinutes(input.value) : 0;
    });
    upsertDay(state, date, minutes);
    if (!save(state)) {
      setStatus('Could not save — storage may be full or blocked.', true);
      return;
    }
    setStatus('Saved for ' + date + '.');
    renderHistoryTable();
    renderWeekBars();
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'screen-time-log.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('Download started.');
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || data.v !== 1 || !Array.isArray(data.people) || !Array.isArray(data.days)) {
          setStatus('Invalid file format.', true);
          return;
        }
        if (data.people.length === 0) {
          setStatus('File has no people.', true);
          return;
        }
        state = data;
        save(state);
        renderPeople();
        renderLogFields();
        renderHistoryTable();
        renderWeekBars();
        setStatus('Imported ' + data.days.length + ' day(s).');
      } catch (e) {
        setStatus('Could not read file.', true);
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!window.confirm('Erase all saved screen time on this browser?')) return;
    if (!window.confirm('This cannot be undone. Continue?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = load();
    renderPeople();
    if (el.logDate) el.logDate.value = todayISODate();
    renderLogFields();
    renderHistoryTable();
    renderWeekBars();
    setStatus('Storage cleared.');
  }

  function addPerson() {
    state.people.push({ id: uid(), name: 'Family member ' + (state.people.length + 1) });
    save(state);
    renderPeople();
    renderLogFields();
    renderHistoryTable();
    renderWeekBars();
    setStatus('Person added.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    el.status = document.getElementById('st-status');
    el.peopleList = document.getElementById('st-people-list');
    el.addPersonBtn = document.getElementById('st-add-person');
    el.logDate = document.getElementById('st-log-date');
    el.logFields = document.getElementById('st-log-fields');
    el.saveLogBtn = document.getElementById('st-save-log');
    el.weekBars = document.getElementById('st-week-bars');
    el.exportBtn = document.getElementById('st-export');
    el.importInput = document.getElementById('st-import');
    el.resetBtn = document.getElementById('st-reset');

    if (el.logDate) el.logDate.value = todayISODate();
    if (el.logDate) {
      el.logDate.addEventListener('change', function () {
        renderLogFields();
      });
    }
    if (el.addPersonBtn) el.addPersonBtn.addEventListener('click', addPerson);
    if (el.saveLogBtn) el.saveLogBtn.addEventListener('click', saveLog);
    if (el.exportBtn) el.exportBtn.addEventListener('click', exportJson);
    if (el.importInput) {
      el.importInput.addEventListener('change', function () {
        if (el.importInput.files && el.importInput.files[0]) {
          importFile(el.importInput.files[0]);
          el.importInput.value = '';
        }
      });
    }
    if (el.resetBtn) el.resetBtn.addEventListener('click', resetAll);

    renderPeople();
    renderLogFields();
    renderHistoryTable();
    renderWeekBars();
  });
})();
