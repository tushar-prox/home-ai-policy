(function () {
  'use strict';

  var STORAGE_KEY = 'familyScreenTimeTracker_v1';

  /* Policy tiers (index.html · Section 01). quotaMin = daily minutes for Quota % (Parent & Grandparent: 12 hr household ceiling). */
  var MEMBER_GROUPS = [
    { id: 'toddler', label: 'Young Child / Toddler (Below 5 yrs)', shortLabel: 'Toddler', quotaMin: 30 },
    { id: 'child', label: 'Pre-Teen / Child (6–12 yrs)', shortLabel: 'Pre-Teen', quotaMin: 90 },
    { id: 'teen', label: 'Teenager (13–17 yrs)', shortLabel: 'Teenager', quotaMin: 180 },
    { id: 'parent', label: 'Parent / Guardian (18+)', shortLabel: 'Parent', quotaMin: 720 },
    { id: 'grandparent', label: 'Grandparent / Senior (60+)', shortLabel: 'Grandparent', quotaMin: 720 }
  ];

  function quotaMinutesForGroupId(groupId) {
    for (var i = 0; i < MEMBER_GROUPS.length; i++) {
      if (MEMBER_GROUPS[i].id === groupId) {
        var q = MEMBER_GROUPS[i].quotaMin;
        return q == null ? null : q;
      }
    }
    return null;
  }

  function groupShortLabel(groupId) {
    for (var i = 0; i < MEMBER_GROUPS.length; i++) {
      if (MEMBER_GROUPS[i].id === groupId) return MEMBER_GROUPS[i].shortLabel;
    }
    return 'Member';
  }

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
      v: 2,
      people: [{ id: uid(), name: 'Family member 1', groupId: 'parent' }],
      days: []
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.people) || !Array.isArray(data.days)) {
        return emptyState();
      }
      var migrated = false;
      if (data.v === 1) {
        data.v = 2;
        migrated = true;
      } else if (data.v !== 2) {
        return emptyState();
      }
      if (data.people.length === 0) {
        data.people = emptyState().people;
      }
      data.people.forEach(function (p) {
        if (!p.groupId) {
          p.groupId = 'parent';
          migrated = true;
        }
      });
      if (migrated) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
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

  var CHART_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#10b981', '#e11d48', '#0369a1', '#ec4899', '#14b8a6'];

  function chartColor(i) {
    return CHART_COLORS[i % CHART_COLORS.length];
  }

  function polarPt(cx, cy, r, angleDeg) {
    var rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function donutSlicePath(cx, cy, rOut, rIn, a0, a1) {
    var p1 = polarPt(cx, cy, rOut, a0);
    var p2 = polarPt(cx, cy, rOut, a1);
    var p3 = polarPt(cx, cy, rIn, a1);
    var p4 = polarPt(cx, cy, rIn, a0);
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    var sweep = 1;
    return (
      'M' +
      p1.x.toFixed(2) +
      ',' +
      p1.y.toFixed(2) +
      'A' +
      rOut +
      ',' +
      rOut +
      ' 0 ' +
      large +
      ' ' +
      sweep +
      ' ' +
      p2.x.toFixed(2) +
      ',' +
      p2.y.toFixed(2) +
      'L' +
      p3.x.toFixed(2) +
      ',' +
      p3.y.toFixed(2) +
      'A' +
      rIn +
      ',' +
      rIn +
      ' 0 ' +
      large +
      ' 0 ' +
      p4.x.toFixed(2) +
      ',' +
      p4.y.toFixed(2) +
      'Z'
    );
  }

  function renderDonutChart() {
    var root = document.getElementById('st-donut-chart');
    var legend = document.getElementById('st-donut-legend');
    if (!root || !legend) return;
    root.innerHTML = '';
    legend.innerHTML = '';
    var date = (el.logDate && el.logDate.value) || todayISODate();
    var rec = getDayRecord(state, date);
    var slices = [];
    var total = 0;
    state.people.forEach(function (p, idx) {
      var m = rec && rec.minutes && rec.minutes[p.id] != null ? clampMinutes(rec.minutes[p.id]) : 0;
      if (m > 0) {
        slices.push({ name: p.name, min: m, color: chartColor(idx) });
        total += m;
      }
    });
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('class', 'st-donut-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Donut chart of screen minutes for ' + date);
    var cx = 60;
    var cy = 60;
    var rOut = 46;
    var rIn = 28;
    if (total === 0) {
      var ring = document.createElementNS(svgNS, 'circle');
      ring.setAttribute('cx', String(cx));
      ring.setAttribute('cy', String(cy));
      ring.setAttribute('r', String((rOut + rIn) / 2));
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', 'rgba(15, 23, 42, 0.12)');
      ring.setAttribute('stroke-width', String(rOut - rIn));
      svg.appendChild(ring);
      var empty = document.createElement('div');
      empty.className = 'st-donut-empty';
      empty.textContent = 'No minutes for ' + date;
      root.appendChild(svg);
      root.appendChild(empty);
      return;
    }
    var angle = 0;
    slices.forEach(function (s) {
      var sweep = (s.min / total) * 360;
      if (sweep >= 359.99) {
        sweep = 359.99;
      }
      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', donutSlicePath(cx, cy, rOut, rIn, angle, angle + sweep));
      path.setAttribute('fill', s.color);
      path.setAttribute('stroke', '#fff');
      path.setAttribute('stroke-width', '1');
      svg.appendChild(path);
      angle += (s.min / total) * 360;
    });
    root.appendChild(svg);
    slices.forEach(function (s) {
      var li = document.createElement('li');
      li.className = 'st-donut-legend__item';
      var dot = document.createElement('span');
      dot.className = 'st-donut-legend__dot';
      dot.style.background = s.color;
      var lab = document.createElement('span');
      lab.className = 'st-donut-legend__text';
      lab.textContent = s.name + ' · ' + s.min + ' min';
      li.appendChild(dot);
      li.appendChild(lab);
      legend.appendChild(li);
    });
  }

  function renderSparkline() {
    var wrap = document.getElementById('st-sparkline');
    if (!wrap) return;
    wrap.innerHTML = '';
    var dates = lastNDates(7).reverse();
    var totals = dates.map(function (date) {
      var rec = getDayRecord(state, date);
      return rec ? totalMinutesForDay(rec) : 0;
    });
    var maxT = 1;
    totals.forEach(function (t) {
      if (t > maxT) maxT = t;
    });
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 72');
    svg.setAttribute('class', 'st-sparkline-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    var padX = 8;
    var padY = 8;
    var w = 240 - padX * 2;
    var h = 72 - padY * 2;
    var grid = document.createElementNS(svgNS, 'line');
    grid.setAttribute('x1', String(padX));
    grid.setAttribute('y1', String(72 - padY));
    grid.setAttribute('x2', String(240 - padX));
    grid.setAttribute('y2', String(72 - padY));
    grid.setAttribute('stroke', 'rgba(15, 23, 42, 0.08)');
    grid.setAttribute('stroke-width', '1');
    svg.appendChild(grid);
    var n = totals.length;
    if (n === 0) {
      wrap.appendChild(svg);
      return;
    }
    var pts = [];
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? padX + w / 2 : padX + (i / (n - 1)) * w;
      var y = padY + h - (totals[i] / maxT) * h;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    var bottomY = padY + h;
    var area = document.createElementNS(svgNS, 'polygon');
    area.setAttribute(
      'points',
      padX + ',' + bottomY + ' ' + pts.join(' ') + ' ' + (padX + w) + ',' + bottomY
    );
    area.setAttribute('fill', 'rgba(13, 148, 136, 0.14)');
    svg.appendChild(area);
    var poly = document.createElementNS(svgNS, 'polyline');
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#0d9488');
    poly.setAttribute('stroke-width', '2.5');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    poly.setAttribute('points', pts.join(' '));
    svg.appendChild(poly);
    for (var j = 0; j < n; j++) {
      var cx = n === 1 ? padX + w / 2 : padX + (j / (n - 1)) * w;
      var cy = padY + h - (totals[j] / maxT) * h;
      var dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('cx', String(cx));
      dot.setAttribute('cy', String(cy));
      dot.setAttribute('r', '3.5');
      dot.setAttribute('fill', '#fff');
      dot.setAttribute('stroke', '#0d9488');
      dot.setAttribute('stroke-width', '2');
      dot.setAttribute('title', dates[j].slice(5) + ': ' + totals[j] + ' min');
      svg.appendChild(dot);
    }
    wrap.appendChild(svg);
    var labels = document.createElement('div');
    labels.className = 'st-sparkline-labels';
    dates.forEach(function (d) {
      var s = document.createElement('span');
      s.textContent = d.slice(5);
      labels.appendChild(s);
    });
    wrap.appendChild(labels);
  }

  function renderStackedWeekBars() {
    if (!el.weekBars) return;
    el.weekBars.innerHTML = '';
    var dates = lastNDates(7).reverse();
    dates.forEach(function (date) {
      var rec = getDayRecord(state, date);
      var total = 0;
      var parts = [];
      state.people.forEach(function (p, idx) {
        var m = rec && rec.minutes && rec.minutes[p.id] != null ? clampMinutes(rec.minutes[p.id]) : 0;
        if (m > 0) {
          parts.push({ name: p.name, min: m, color: chartColor(idx) });
          total += m;
        }
      });
      var bar = document.createElement('div');
      bar.className = 'st-week-bar st-week-bar--stacked';
      var label = document.createElement('div');
      label.className = 'st-week-bar__label';
      label.textContent = date.slice(5);
      var track = document.createElement('div');
      track.className = 'st-week-bar__track st-week-bar__track--stacked';
      if (total === 0) {
        track.classList.add('st-week-bar__track--empty');
      } else {
        parts.forEach(function (seg) {
          var segEl = document.createElement('div');
          segEl.className = 'st-week-seg';
          segEl.style.width = (seg.min / total) * 100 + '%';
          segEl.style.background = seg.color;
          segEl.title = seg.name + ': ' + seg.min + ' min';
          track.appendChild(segEl);
        });
      }
      var val = document.createElement('div');
      val.className = 'st-week-bar__val';
      val.textContent = total ? total + 'm' : '—';
      bar.appendChild(label);
      bar.appendChild(track);
      bar.appendChild(val);
      el.weekBars.appendChild(bar);
    });
  }

  function renderCharts() {
    renderDonutChart();
    renderSparkline();
    renderStackedWeekBars();
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
    resetBtn: null,
    sessionPerson: null,
    sessionDuration: null,
    sessionAddToday: null,
    sessionStart: null,
    sessionList: null
  };

  var state = load();

  var sessions = {};
  var globalTickId = null;

  function newSessionId() {
    return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function hasActiveSessionForPerson(personId) {
    for (var sid in sessions) {
      if (sessions[sid].personId === personId) return true;
    }
    return false;
  }

  function getPersonName(personId) {
    for (var i = 0; i < state.people.length; i++) {
      if (state.people[i].id === personId) return state.people[i].name;
    }
    return 'Member';
  }

  function getElapsedMsFor(s) {
    var seg = s.segmentStart ? Date.now() - s.segmentStart : 0;
    return s.accumulatedMs + seg;
  }

  function getRemainingMsFor(s) {
    return Math.max(0, s.limitMs - getElapsedMsFor(s));
  }

  function mergeSegment(s) {
    if (s.segmentStart) {
      s.accumulatedMs += Date.now() - s.segmentStart;
      s.segmentStart = null;
    }
  }

  function formatClock(ms) {
    ms = Math.max(0, ms);
    var totalSec = Math.floor(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function addSessionMinutesToToday(personId, minutesRounded) {
    minutesRounded = clampMinutes(minutesRounded);
    if (minutesRounded <= 0) return;
    var date = todayISODate();
    var rec = getDayRecord(state, date);
    var minutes = {};
    state.people.forEach(function (p) {
      var v = rec && rec.minutes && rec.minutes[p.id] != null ? clampMinutes(rec.minutes[p.id]) : 0;
      minutes[p.id] = v;
    });
    minutes[personId] = clampMinutes((minutes[personId] || 0) + minutesRounded);
    upsertDay(state, date, minutes);
    save(state);
  }

  function syncSessionMinutesToLog(s, useRound) {
    if (!el.sessionAddToday || !el.sessionAddToday.checked || !s.personId) return 0;
    var elapsed = Math.min(getElapsedMsFor(s), s.limitMs);
    var targetMin = useRound ? Math.round(elapsed / 60000) : Math.floor(elapsed / 60000);
    var delta = targetMin - s.sessionAddedMinutes;
    if (delta > 0) {
      addSessionMinutesToToday(s.personId, delta);
      s.sessionAddedMinutes += delta;
      renderLogFields();
      renderHistoryTable();
      renderCharts();
    }
    return delta;
  }

  function ensureTickLoop() {
    if (globalTickId) return;
    globalTickId = window.setInterval(tickAllSessions, 250);
  }

  function stopTickLoopIfEmpty() {
    if (Object.keys(sessions).length === 0 && globalTickId) {
      clearInterval(globalTickId);
      globalTickId = null;
    }
  }

  function showSessionWarnInCard(sid, personName, text, level) {
    var wrap = document.getElementById('st-sess-warn-' + sid);
    if (!wrap) return;
    var div = document.createElement('div');
    div.className = 'st-session-warn st-session-warn--' + (level || 'soft');
    div.setAttribute('role', 'alert');
    div.innerHTML =
      '<i class="fa-solid fa-bell" aria-hidden="true"></i> <strong>' +
      personName +
      ':</strong> ' +
      text;
    wrap.appendChild(div);
    try {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(level === 'urgent' ? [80, 40, 80] : 40);
      }
    } catch (e) {
      /* ignore */
    }
  }

  function checkSessionWarnings(sid, s, remaining) {
    var name = s.personName || 'Member';
    if (s.limitMs > 5 * 60 * 1000 && remaining <= 5 * 60 * 1000 && !s.warned.m5) {
      s.warned.m5 = true;
      showSessionWarnInCard(sid, name, 'About 5 minutes left — time to wrap up gently.', 'soft');
    }
    if (s.limitMs >= 2 * 60 * 1000 && remaining <= 60 * 1000 && !s.warned.m1) {
      s.warned.m1 = true;
      showSessionWarnInCard(sid, name, '1 minute left — finish what you are doing.', 'amber');
    }
    if (s.limitMs >= 45 * 1000 && remaining <= 30 * 1000 && !s.warned.s30) {
      s.warned.s30 = true;
      showSessionWarnInCard(sid, name, '30 seconds left — get ready to stop.', 'urgent');
    }
  }

  function updateSessionCard(sid) {
    var s = sessions[sid];
    if (!s) return;
    var elapsed = getElapsedMsFor(s);
    var remaining = getRemainingMsFor(s);
    var elE = document.getElementById('st-sess-elapsed-' + sid);
    var elR = document.getElementById('st-sess-remaining-' + sid);
    var elP = document.getElementById('st-sess-progress-fill-' + sid);
    var elW = document.getElementById('st-sess-progress-wrap-' + sid);
    if (elE) elE.textContent = formatClock(elapsed);
    if (elR) elR.textContent = formatClock(remaining);
    if (elP && s.limitMs > 0) {
      var pct = Math.min(100, (elapsed / s.limitMs) * 100);
      elP.style.width = pct + '%';
      if (elW) elW.setAttribute('aria-valuenow', String(Math.round(pct)));
    }
  }

  function tickAllSessions() {
    for (var sid in sessions) {
      var s = sessions[sid];
      if (s.paused || !s.segmentStart) {
        updateSessionCard(sid);
        continue;
      }
      var remaining = getRemainingMsFor(s);
      if (remaining <= 0) {
        mergeSegment(s);
        s.accumulatedMs = s.limitMs;
        endSession(sid, true);
        continue;
      }
      updateSessionCard(sid);
      checkSessionWarnings(sid, s, remaining);
    }
  }

  function renderSessionList() {
    if (!el.sessionList) return;
    el.sessionList.innerHTML = '';
    var keys = Object.keys(sessions);
    if (keys.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'st-session-empty';
      empty.setAttribute('role', 'status');
      empty.innerHTML =
        '<span class="st-session-empty__icon" aria-hidden="true"><i class="fa-solid fa-hourglass"></i></span>' +
        '<p class="st-session-empty__text">No active timers. Choose who and how long above, then <strong>Start timer</strong>. You can run several at once — one per person.</p>';
      el.sessionList.appendChild(empty);
      return;
    }
    keys.forEach(function (sid) {
      var s = sessions[sid];
      var running = !s.paused && s.segmentStart;
      var paused = s.paused;
      var planMin = Math.round(s.limitMs / 60000);

      var art = document.createElement('article');
      art.className = 'st-session-card';
      art.id = 'st-sess-card-' + sid;

      var head = document.createElement('header');
      head.className = 'st-session-card__head';
      var h3 = document.createElement('h3');
      h3.className = 'st-session-card__name';
      h3.textContent = s.personName;
      var meta = document.createElement('span');
      meta.className = 'st-session-card__plan';
      meta.textContent = planMin + ' min plan';
      head.appendChild(h3);
      head.appendChild(meta);
      art.appendChild(head);

      var badge = document.createElement('p');
      badge.className = 'st-session-paused-badge st-session-paused-badge--inline';
      badge.id = 'st-sess-paused-' + sid;
      badge.hidden = !paused;
      badge.innerHTML =
        '<i class="fa-solid fa-pause" aria-hidden="true"></i> Paused — press Resume to continue';
      art.appendChild(badge);

      var big = document.createElement('div');
      big.className = 'st-session-big';
      var b1 = document.createElement('div');
      b1.className = 'st-session-big__block';
      b1.innerHTML =
        '<span class="st-session-big__label">Time spent</span>' +
        '<span class="st-session-big__value" id="st-sess-elapsed-' +
        sid +
        '">0:00</span>';
      var b2 = document.createElement('div');
      b2.className = 'st-session-big__block';
      b2.innerHTML =
        '<span class="st-session-big__label">Time left</span>' +
        '<span class="st-session-big__value st-session-big__value--left" id="st-sess-remaining-' +
        sid +
        '">0:00</span>';
      big.appendChild(b1);
      big.appendChild(b2);
      art.appendChild(big);

      var prog = document.createElement('div');
      prog.className = 'st-session-progress';
      prog.id = 'st-sess-progress-wrap-' + sid;
      prog.setAttribute('role', 'progressbar');
      prog.setAttribute('aria-valuemin', '0');
      prog.setAttribute('aria-valuemax', '100');
      prog.setAttribute('aria-valuenow', '0');
      var fill = document.createElement('div');
      fill.className = 'st-session-progress__fill';
      fill.id = 'st-sess-progress-fill-' + sid;
      prog.appendChild(fill);
      art.appendChild(prog);

      var warns = document.createElement('div');
      warns.className = 'st-session-warnings st-session-warnings--card';
      warns.id = 'st-sess-warn-' + sid;
      art.appendChild(warns);

      var actions = document.createElement('div');
      actions.className = 'st-session-card__actions';

      var btnPause = document.createElement('button');
      btnPause.type = 'button';
      btnPause.className = 'st-tracker-btn st-tracker-btn--secondary';
      btnPause.setAttribute('data-sid', sid);
      btnPause.setAttribute('data-session-action', 'pause');
      btnPause.hidden = !running;
      btnPause.innerHTML = '<i class="fa-solid fa-pause" aria-hidden="true"></i> Pause';

      var btnResume = document.createElement('button');
      btnResume.type = 'button';
      btnResume.className = 'st-tracker-btn st-tracker-btn--primary';
      btnResume.setAttribute('data-sid', sid);
      btnResume.setAttribute('data-session-action', 'resume');
      btnResume.hidden = !paused;
      btnResume.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Resume';

      var btnStop = document.createElement('button');
      btnStop.type = 'button';
      btnStop.className = 'st-tracker-btn st-tracker-btn--secondary';
      btnStop.setAttribute('data-sid', sid);
      btnStop.setAttribute('data-session-action', 'stop');
      btnStop.innerHTML = '<i class="fa-solid fa-stop" aria-hidden="true"></i> Stop';

      actions.appendChild(btnPause);
      actions.appendChild(btnResume);
      actions.appendChild(btnStop);
      art.appendChild(actions);

      el.sessionList.appendChild(art);
      updateSessionCard(sid);
    });
  }

  function endSession(sid, endedByTimer) {
    var s = sessions[sid];
    if (!s) return;
    mergeSegment(s);
    if (endedByTimer) {
      s.accumulatedMs = s.limitMs;
    }
    var delta = syncSessionMinutesToLog(s, true);
    var totalRounded = Math.round(Math.min(s.accumulatedMs, s.limitMs) / 60000);
    var label = s.personName;

    delete sessions[sid];
    stopTickLoopIfEmpty();
    renderSessionList();
    renderSessionPersonSelect();

    var msg = '';
    if (el.sessionAddToday && el.sessionAddToday.checked) {
      if (delta > 0) {
        msg =
          (endedByTimer ? 'Timer finished (' + label + ') — ' : 'Stopped (' + label + ') — ') +
          'logged ' +
          delta +
          ' more min to today (~' +
          totalRounded +
          ' min this session).';
      } else if (totalRounded === 0) {
        msg =
          endedByTimer
            ? 'Timer finished (' + label + ') — under 1 minute, nothing new added.'
            : 'Stopped (' + label + ') — under 1 minute, nothing new added.';
      } else {
        msg =
          (endedByTimer ? 'Timer finished (' + label + ') — ' : 'Stopped (' + label + ') — ') +
          'time was already saved on pause(s).';
      }
    } else if (totalRounded === 0) {
      msg = endedByTimer ? 'Timer finished (checkbox off).' : 'Stopped (checkbox off).';
    } else {
      msg = 'Turn on "add to today" to save time for ' + label + '.';
    }
    if (endedByTimer) {
      msg = msg + ' Time is up — great job sticking to the plan!';
    }
    setStatus(msg);
  }

  function pauseSession(sid) {
    var s = sessions[sid];
    if (!s || s.paused || !s.segmentStart) return;
    mergeSegment(s);
    s.paused = true;
    var delta = syncSessionMinutesToLog(s, false);
    renderSessionList();
    setStatus(
      delta > 0
        ? 'Paused (' + s.personName + ') — added ' + delta + ' min to today (full minutes).'
        : 'Paused (' + s.personName + ') — nothing new to add yet this segment.'
    );
  }

  function resumeSession(sid) {
    var s = sessions[sid];
    if (!s || !s.paused) return;
    s.paused = false;
    s.segmentStart = Date.now();
    ensureTickLoop();
    renderSessionList();
    tickAllSessions();
    setStatus('Resumed (' + s.personName + ').');
  }

  function stopSession(sid) {
    if (!sessions[sid]) return;
    endSession(sid, false);
  }

  function startSession() {
    var personId = el.sessionPerson && el.sessionPerson.value;
    if (!personId) {
      setStatus('Choose who is using the device.', true);
      return;
    }
    if (hasActiveSessionForPerson(personId)) {
      setStatus('That person already has an active timer. Stop or finish it before starting another.', true);
      return;
    }
    var dur = el.sessionDuration ? parseInt(el.sessionDuration.value, 10) : 15;
    if (isNaN(dur) || dur < 1 || dur > 480) {
      setStatus('Set planned time between 1 and 480 minutes.', true);
      return;
    }
    var sid = newSessionId();
    sessions[sid] = {
      personId: personId,
      personName: getPersonName(personId),
      limitMs: dur * 60 * 1000,
      accumulatedMs: 0,
      segmentStart: Date.now(),
      paused: false,
      sessionAddedMinutes: 0,
      warned: { m5: false, m1: false, s30: false }
    };
    ensureTickLoop();
    renderSessionList();
    renderSessionPersonSelect();
    tickAllSessions();
    setStatus('Timer started for ' + sessions[sid].personName + ' — you can start more for other people.');
  }

  function abortSessionNoSave() {
    sessions = {};
    if (globalTickId) {
      clearInterval(globalTickId);
      globalTickId = null;
    }
    renderSessionList();
    renderSessionPersonSelect();
  }

  function onSessionListClick(e) {
    var btn = e.target.closest('button[data-session-action]');
    if (!btn || !el.sessionList.contains(btn)) return;
    var sid = btn.getAttribute('data-sid');
    var act = btn.getAttribute('data-session-action');
    if (!sid || !sessions[sid]) return;
    if (act === 'pause') pauseSession(sid);
    else if (act === 'resume') resumeSession(sid);
    else if (act === 'stop') stopSession(sid);
  }

  function renderSessionPersonSelect() {
    if (!el.sessionPerson) return;
    var v = el.sessionPerson.value;
    el.sessionPerson.innerHTML = '';
    state.people.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + ' · ' + groupShortLabel(p.groupId);
      if (hasActiveSessionForPerson(p.id)) {
        opt.disabled = true;
        opt.textContent = p.name + ' · ' + groupShortLabel(p.groupId) + ' (timer on)';
      }
      el.sessionPerson.appendChild(opt);
    });
    if (v && state.people.some(function (x) { return x.id === v; }) && !hasActiveSessionForPerson(v)) {
      el.sessionPerson.value = v;
    } else {
      var firstFree = null;
      for (var i = 0; i < state.people.length; i++) {
        if (!hasActiveSessionForPerson(state.people[i].id)) {
          firstFree = state.people[i];
          break;
        }
      }
      if (firstFree) el.sessionPerson.value = firstFree.id;
    }
  }

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
        renderCharts();
        renderSessionList();
        renderSessionPersonSelect();
      });
      var grp = document.createElement('select');
      grp.className = 'st-tracker-input st-tracker-select st-tracker-group-select';
      grp.id = 'st-group-' + p.id;
      grp.setAttribute('aria-label', 'Member tier for ' + (p.name || 'member'));
      MEMBER_GROUPS.forEach(function (g) {
        var o = document.createElement('option');
        o.value = g.id;
        o.textContent = g.label;
        grp.appendChild(o);
      });
      grp.value = p.groupId && MEMBER_GROUPS.some(function (g) { return g.id === p.groupId; }) ? p.groupId : 'parent';
      grp.addEventListener('change', function () {
        p.groupId = grp.value;
        save(state);
        setStatus('Tier saved.');
        renderHistoryTable();
        renderCharts();
        renderSessionPersonSelect();
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'st-tracker-btn st-tracker-btn--ghost';
      del.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i><span class="visually-hidden">Remove</span>';
      del.disabled = state.people.length <= 1;
      del.addEventListener('click', function () {
        if (state.people.length <= 1) return;
        if (!window.confirm('Remove this person? Their past minutes stay in history under this ID until you edit those days.')) return;
        var stopped = 0;
        for (var sid in sessions) {
          if (sessions[sid].personId === p.id) {
            delete sessions[sid];
            stopped++;
          }
        }
        if (stopped) {
          stopTickLoopIfEmpty();
        }
        state.people = state.people.filter(function (x) {
          return x.id !== p.id;
        });
        save(state);
        renderPeople();
        renderLogFields();
        renderHistoryTable();
        renderCharts();
        renderSessionList();
        setStatus(stopped ? 'Person removed — ' + stopped + ' active timer(s) cleared.' : 'Person removed.');
      });
      row.appendChild(inp);
      row.appendChild(grp);
      row.appendChild(del);
      el.peopleList.appendChild(row);
    });
    renderSessionPersonSelect();
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

  function quotaPctCell(minutes, personId, other) {
    var td = document.createElement('td');
    td.className = 'st-history-quota-cell';
    if (other || !personId) {
      td.textContent = '—';
      return td;
    }
    var person = null;
    for (var i = 0; i < state.people.length; i++) {
      if (state.people[i].id === personId) {
        person = state.people[i];
        break;
      }
    }
    if (!person) {
      td.textContent = '—';
      return td;
    }
    var cap = quotaMinutesForGroupId(person.groupId);
    if (cap == null) {
      td.textContent = '—';
      td.title = 'Unknown tier';
      return td;
    }
    var pct = Math.round((minutes / cap) * 100);
    td.textContent = String(pct) + '%';
    if (pct > 100) {
      td.classList.add('st-history-quota-cell--over');
    }
    td.title = 'Logged ' + minutes + ' min vs ' + cap + ' min/day guideline for this tier (Section 09)';
    return td;
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
    var thPerson = document.createElement('th');
    thPerson.textContent = 'Name';
    trh.appendChild(thPerson);
    var thMin = document.createElement('th');
    thMin.textContent = 'Minutes';
    trh.appendChild(thMin);
    var thQuota = document.createElement('th');
    thQuota.textContent = 'Quota %';
    trh.appendChild(thQuota);
    thead.appendChild(trh);

    tbody.innerHTML = '';
    if (state.days.length === 0) {
      var trEmpty = document.createElement('tr');
      var tdEmpty = document.createElement('td');
      tdEmpty.colSpan = 4;
      tdEmpty.className = 'st-tracker-empty-cell';
      tdEmpty.textContent = 'No entries yet — log minutes for a day above.';
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
      return;
    }
    state.days.forEach(function (day) {
      var totalAll = totalMinutesForDay(day);
      var sumShown = 0;
      var rows = [];
      state.people.forEach(function (p) {
        var m = day.minutes && day.minutes[p.id] != null ? clampMinutes(day.minutes[p.id]) : 0;
        sumShown += m;
        rows.push({ name: p.name, min: m, other: false, personId: p.id });
      });
      if (totalAll > sumShown) {
        rows.push({
          name: 'Other (legacy / removed member)',
          min: totalAll - sumShown,
          other: true,
          personId: null
        });
      }
      var n = rows.length;
      if (n === 0) return;

      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        var tdDate = document.createElement('td');
        tdDate.className = 'st-history-date-cell';
        tdDate.textContent = day.date;
        tr.appendChild(tdDate);
        var tdPerson = document.createElement('td');
        tdPerson.className = r.other ? 'st-history-person-cell st-history-person-cell--other' : 'st-history-person-cell';
        tdPerson.textContent = r.name;

        var tdMin = document.createElement('td');
        tdMin.className = 'st-history-min-cell';
        tdMin.textContent = String(r.min);

        tr.appendChild(tdPerson);
        tr.appendChild(tdMin);
        tr.appendChild(quotaPctCell(r.min, r.personId, r.other));
        tbody.appendChild(tr);
      });
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
    renderCharts();
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
        if (!data || (data.v !== 1 && data.v !== 2) || !Array.isArray(data.people) || !Array.isArray(data.days)) {
          setStatus('Invalid file format.', true);
          return;
        }
        if (data.people.length === 0) {
          setStatus('File has no people.', true);
          return;
        }
        if (data.v === 1) {
          data.v = 2;
        }
        data.people.forEach(function (p) {
          if (!p.groupId) p.groupId = 'parent';
        });
        abortSessionNoSave();
        state = data;
        save(state);
        renderPeople();
        renderLogFields();
        renderHistoryTable();
        renderCharts();
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
    abortSessionNoSave();
    localStorage.removeItem(STORAGE_KEY);
    state = load();
    renderPeople();
    if (el.logDate) el.logDate.value = todayISODate();
    renderLogFields();
    renderHistoryTable();
    renderCharts();
    setStatus('Storage cleared.');
  }

  function addPerson() {
    state.people.push({ id: uid(), name: 'Family member ' + (state.people.length + 1), groupId: 'parent' });
    save(state);
    renderPeople();
    renderLogFields();
    renderHistoryTable();
    renderCharts();
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
        renderCharts();
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

    el.sessionPerson = document.getElementById('st-session-person');
    el.sessionDuration = document.getElementById('st-session-duration');
    el.sessionAddToday = document.getElementById('st-session-add-today');
    el.sessionStart = document.getElementById('st-session-start');
    el.sessionList = document.getElementById('st-session-list');
    if (el.sessionStart) el.sessionStart.addEventListener('click', startSession);
    if (el.sessionList) el.sessionList.addEventListener('click', onSessionListClick);

    window.addEventListener('beforeunload', function (e) {
      if (Object.keys(sessions).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    renderPeople();
    renderSessionList();
    renderLogFields();
    renderHistoryTable();
    renderCharts();
  });
})();
