(function () {
  'use strict';

  /** Google Translate language codes for Indian languages (website translator). */
  var LANGUAGES = [
    { code: 'hi', label: 'हिंदी', labelEn: 'Hindi' },
    { code: 'ta', label: 'தமிழ்', labelEn: 'Tamil' },
    { code: 'te', label: 'తెలుగు', labelEn: 'Telugu' },
    { code: 'bn', label: 'বাংলা', labelEn: 'Bengali' },
    { code: 'mr', label: 'मराठी', labelEn: 'Marathi' },
    { code: 'gu', label: 'ગુજરાતી', labelEn: 'Gujarati' },
    { code: 'kn', label: 'ಕನ್ನಡ', labelEn: 'Kannada' },
    { code: 'ml', label: 'മലയാളം', labelEn: 'Malayalam' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ', labelEn: 'Punjabi' },
    { code: 'or', label: 'ଓଡ଼ିଆ', labelEn: 'Odia' },
    { code: 'as', label: 'অসমীয়া', labelEn: 'Assamese' },
    { code: 'ur', label: 'اردو', labelEn: 'Urdu' },
    { code: 'ne', label: 'नेपाली', labelEn: 'Nepali' },
    { code: 'sa', label: 'संस्कृतम्', labelEn: 'Sanskrit' }
  ];

  function translatePageUrl(langCode) {
    var u = window.location.href;
    if (u.indexOf('file:') === 0) {
      return null;
    }
    return (
      'https://translate.google.com/translate?sl=en&tl=' +
      encodeURIComponent(langCode) +
      '&u=' +
      encodeURIComponent(u)
    );
  }

  function openTranslation(langCode) {
    var url = translatePageUrl(langCode);
    if (!url) {
      window.alert(
        'Machine translation needs this page to be opened from a website (http:// or https://), not from a saved file on your computer.\n\n' +
          'Publish the page (for example on GitHub Pages) and open that link, then use “Read in Indian languages” again.'
      );
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function buildChips(container) {
    if (!container) return;
    LANGUAGES.forEach(function (lang) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-chip';
      btn.setAttribute('lang', lang.code === 'ur' ? 'ur' : 'en');
      btn.textContent = lang.label;
      btn.title = lang.labelEn + ' — opens Google Translate in a new tab';
      btn.addEventListener('click', function () {
        openTranslation(lang.code);
      });
      container.appendChild(btn);
    });
  }

  function buildSelect(selectEl) {
    if (!selectEl) return;
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = 'Choose language…';
    selectEl.appendChild(opt0);
    LANGUAGES.forEach(function (lang) {
      var opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = lang.labelEn + ' (' + lang.label + ')';
      selectEl.appendChild(opt);
    });
    selectEl.addEventListener('change', function () {
      if (selectEl.value) {
        openTranslation(selectEl.value);
        selectEl.value = '';
      }
    });
  }

  function updateHostingNote() {
    var el = document.getElementById('lang-hosting-note');
    if (!el) return;
    el.hidden = window.location.protocol !== 'file:';
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildChips(document.getElementById('lang-chips'));
    buildSelect(document.getElementById('lang-select'));
    updateHostingNote();
  });
})();
