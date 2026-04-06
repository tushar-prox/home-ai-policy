(function () {
  'use strict';

  var OFFSET = 148;
  var MQ_MOBILE = window.matchMedia('(max-width: 900px)');

  var nav = document.getElementById('doc-nav');
  var collapseBtn = document.getElementById('doc-nav-collapse');
  var reopenBtn = document.getElementById('doc-nav-reopen');
  var stickyToc = document.getElementById('site-header-toc');
  var links = Array.prototype.slice.call(
    document.querySelectorAll('#doc-nav a.doc-nav__link[href^="#"]')
  );

  function getTargetId(href) {
    if (!href || href.charAt(0) !== '#') return '';
    return href.slice(1);
  }

  function updateActive() {
    var activeId = '';
    for (var i = 0; i < links.length; i++) {
      var id = getTargetId(links[i].getAttribute('href'));
      if (!id) continue;
      var el = document.getElementById(id);
      if (!el) continue;
      var rect = el.getBoundingClientRect();
      if (rect.top <= OFFSET) {
        activeId = id;
      }
    }
    if (!activeId && links.length) {
      activeId = getTargetId(links[0].getAttribute('href')) || '';
    }

    for (var j = 0; j < links.length; j++) {
      var a = links[j];
      var on = getTargetId(a.getAttribute('href')) === activeId;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'location');
      } else {
        a.removeAttribute('aria-current');
      }
    }
  }

  function syncStickyHeader() {
    if (!nav || !stickyToc) return;
    var collapsed = nav.classList.contains('is-collapsed');
    stickyToc.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    stickyToc.setAttribute(
      'aria-label',
      collapsed ? 'Open table of contents' : 'Close table of contents'
    );
  }

  function setCollapsed(collapsed) {
    if (!nav) return;
    nav.classList.toggle('is-collapsed', collapsed);
    document.body.classList.toggle('doc-nav-collapsed', collapsed);
    if (collapseBtn) {
      collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    if (reopenBtn) {
      reopenBtn.hidden = true;
    }
    syncStickyHeader();
    try {
      localStorage.setItem('docNavCollapsed', collapsed ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
  }

  function applyInitialCollapse() {
    try {
      var pref = localStorage.getItem('docNavCollapsed');
      if (pref === '1') {
        setCollapsed(true);
        return;
      }
      if (pref === '0') {
        setCollapsed(false);
        return;
      }
    } catch (e) {
      /* ignore */
    }
    if (MQ_MOBILE.matches) {
      setCollapsed(true);
    }
  }

  var scrollTicking = false;
  function onScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(function () {
        updateActive();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    updateActive();
  });

  if (collapseBtn) {
    collapseBtn.addEventListener('click', function () {
      setCollapsed(true);
    });
  }
  if (reopenBtn) {
    reopenBtn.addEventListener('click', function () {
      setCollapsed(false);
    });
  }

  if (stickyToc) {
    stickyToc.addEventListener('click', function () {
      if (!nav) return;
      setCollapsed(!nav.classList.contains('is-collapsed'));
    });
  }

  links.forEach(function (a) {
    a.addEventListener('click', function () {
      if (MQ_MOBILE.matches) {
        setCollapsed(true);
      }
    });
  });

  MQ_MOBILE.addEventListener('change', function (e) {
    if (e.matches) {
      document.body.classList.add('doc-nav-mobile');
    } else {
      document.body.classList.remove('doc-nav-mobile');
    }
  });
  if (MQ_MOBILE.matches) {
    document.body.classList.add('doc-nav-mobile');
  }

  applyInitialCollapse();
  syncStickyHeader();
  updateActive();
})();
