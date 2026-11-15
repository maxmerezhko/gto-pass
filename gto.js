/* ГТО · Протокол — общий код страниц участника (анкета и пропуск).
 *
 * Главный принцип (заметки, раздел 18): страницы НИЧЕГО не отправляют в
 * интернет. Анкета превращается в QR на экране телефона, пропуск живёт в
 * ссылке после «#» (браузер не отправляет эту часть на сервер). Никакой
 * аналитики и сторонних запросов.
 */
(function (root) {
  'use strict';

  // ---------- base64url + UTF-8 (как base64Url в Dart, без «=») ----------

  function utf8Bytes(str) {
    return new TextEncoder().encode(str);
  }

  function b64urlEncode(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(s) {
    var t = s.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    var bin = atob(t);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ---------- анкета: формат GTOA1 (lib/core/registration.dart) ----------

  var ANKETA_PREFIX = 'GTOA1:';

  /** a: {f, bd 'YYYY-MM-DD', sx 'M'|'F', u?, pn?, c, z?, w?} */
  function encodeAnketa(a) {
    var j = { f: a.f, bd: a.bd, sx: a.sx, c: !!a.c };
    if (a.u) j.u = a.u;
    if (a.pn) j.pn = a.pn;
    if (a.z) j.z = a.z;
    if (a.w) j.w = a.w;
    return ANKETA_PREFIX + b64urlEncode(utf8Bytes(JSON.stringify(j)));
  }

  function decodeAnketa(s) {
    if (!s || s.indexOf(ANKETA_PREFIX) !== 0) return null;
    try {
      return JSON.parse(new TextDecoder().decode(b64urlDecode(s.slice(ANKETA_PREFIX.length))));
    } catch (e) {
      return null;
    }
  }

  // ---------- пропуск: «payload.signature» после # (lib/core/pass.dart) ----------

  /** Достаёт токен из ссылки или голой строки и читает данные пропуска.
   *  Подпись здесь не проверяется — её проверяет телефон судьи. */
  function readPass(linkOrToken) {
    if (!linkOrToken) return null;
    var s = String(linkOrToken).trim();
    var hash = s.indexOf('#');
    var token = hash >= 0 ? s.slice(hash + 1) : s;
    var parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    try {
      var p = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
      if (p.v !== 1 || !p.id || !p.ev) return null;
      return { token: token, kind: p.k === 's' ? 'sticker' : 'participant', id: p.id,
        eventId: p.ev, name: p.n || '', stage: p.st || null, sex: p.sx || null,
        birthYear: p.by || null, wave: p.w || null, tests: Array.isArray(p.t) ? p.t : [] };
    } catch (e) {
      return null;
    }
  }

  // ---------- справочники ----------

  // Коды станций → короткие названия (как в приложении; сверяет test/pass_tests_test.dart).
  var STATIONS = {
    "run10": "Бег 10 м",
    "run30": "Бег 30 м",
    "run60": "Бег 60 м",
    "run100": "Бег 100 м",
    "shuttle": "Челнок 3×10",
    "run_long": "Бег 1–3 км",
    "six_min": "Шестиминутный бег",
    "cross_m": "Смешанное передв. (м)",
    "ski_walk": "Ходьба на лыжах",
    "ski1": "Лыжи 1 км",
    "ski2": "Лыжи 2 км",
    "ski3": "Лыжи 3 км",
    "ski5": "Лыжи 5 км",
    "cross2": "Кросс 2 км",
    "cross3": "Кросс 3 км",
    "cross5": "Кросс 5 км",
    "cross1": "Смеш. передв. 1 км",
    "nordic3": "Скандинавская ходьба",
    "pullups": "Подтягивания",
    "pullups_low": "Подтягивания низкая",
    "pushups": "Отжимания",
    "pushups_bench": "Отжимания от скамьи",
    "pushups_chair": "Отжимания от стула",
    "kettlebell": "Рывок гири",
    "flex": "Наклон",
    "jump_stand": "Прыжок с места",
    "situps": "Пресс 1 мин",
    "situps30": "Пресс 30 с",
    "medball": "Набивной мяч",
    "throw_ball": "Метание 150 г",
    "throw_500": "Метание 500 г",
    "throw_700": "Метание 700 г",
    "throw_tennis": "Метание в цель",
    "swim_m": "Плавание (м)",
    "swim25": "Плавание 25 м",
    "swim50": "Плавание 50 м",
    "shooting": "Стрельба (электр.)",
    "shoot_open": "Стрельба (открытый)",
    "selfdefense": "Самозащита",
    "hike": "Туристский поход"
  };

  /** Название испытания из кода пропуска: «run_long:2000» → «Бег 2 км». */
  function testName(code) {
    var i = code.indexOf(':');
    if (i < 0) return STATIONS[code] || code;
    var km = String(Number(code.slice(i + 1)) / 1000).replace('.', ',');
    return 'Бег ' + km + ' км';
  }

  /** Испытания пропуска: {required: [...], optional: [...]}, «|» → «или». */
  function describeTests(tests) {
    var out = { required: [], optional: [] };
    (tests || []).forEach(function (t) {
      var req = t.charAt(0) === '!';
      var names = (req ? t.slice(1) : t).split('|').map(testName).join(' или ');
      (req ? out.required : out.optional).push(names);
    });
    return out;
  }

  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
    'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII'];

  function roman(n) { return ROMAN[Math.max(0, Math.min(18, n | 0))]; }

  /** УИН: 11 цифр → 22-77-0012345, иначе null. */
  function normalizeUin(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.length !== 11) return null;
    return d.slice(0, 2) + '-' + d.slice(2, 4) + '-' + d.slice(4);
  }

  /** Полных лет на сегодня (для «кто заполняет»: 18+ или родитель). */
  function ageToday(bdIso, now) {
    var b = new Date(bdIso + 'T00:00:00');
    var t = now || new Date();
    var age = t.getFullYear() - b.getFullYear();
    var m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
    return age;
  }

  function ruDate(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
  }

  // ---------- устройство (заметки, раздел 18 «Определение „это телефон“») ----------

  /** env: {ua, uaMobile, maxTouchPoints, screenW, screenH} — для тестов. */
  function isPhone(env) {
    var e = env || currentEnv();
    var ua = e.ua || '';
    var shortSide = Math.min(e.screenW || 9999, e.screenH || 9999);
    if (e.uaMobile === true || /Mobile/.test(ua)) return true; // 1: Android-телефоны, вкл. раскрытые складные
    if (/iPhone/.test(ua)) return true; // 2: любой браузер на iPhone
    if (/Macintosh/.test(ua) && e.maxTouchPoints > 1 && shortSide < 744) return true; // 3: раскрытый складной iPhone
    if (shortSide < 500 && e.maxTouchPoints > 0) return true; // 4: «Версия для ПК» на телефоне
    return false;
  }

  function currentEnv() {
    var nav = root.navigator || {};
    return {
      ua: nav.userAgent || '',
      uaMobile: nav.userAgentData ? nav.userAgentData.mobile : undefined,
      maxTouchPoints: nav.maxTouchPoints || 0,
      screenW: root.screen ? root.screen.width : 9999,
      screenH: root.screen ? root.screen.height : 9999,
    };
  }

  /** Встроенный браузер мессенджера: имя или null. ⚠️ Проверить на устройствах. */
  function inAppBrowser(env, win) {
    var ua = (env || currentEnv()).ua || '';
    var w = win || root;
    if (/Telegram/i.test(ua) || (w && w.TelegramWebviewProxy)) return 'Telegram';
    if (/VKAndroidApp|VKClient|com\.vk\.|vkontakte/i.test(ua)) return 'ВКонтакте';
    if (/\bMAX\/|OneMe|ru\.oneme/i.test(ua)) return 'MAX';
    if (/WhatsApp/i.test(ua)) return 'WhatsApp';
    if (/Instagram|FBAN|FBAV/i.test(ua)) return 'Instagram';
    return null;
  }

  /** Как называть браузер в подсказке «анкета сохранена в …». */
  function browserName(env) {
    var ua = (env || currentEnv()).ua || '';
    var app = inAppBrowser(env);
    if (app) return app;
    if (/YaBrowser/.test(ua)) return 'Яндекс Браузер';
    if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
    if (/FxiOS|Firefox/.test(ua)) return 'Firefox';
    if (/CriOS|Chrome/.test(ua)) return 'Chrome';
    if (/Safari/.test(ua)) return 'Safari';
    return 'этом браузере';
  }

  // ---------- хранилище только в этом браузере ----------

  function load(key, fallback) {
    try {
      var v = root.localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- QR в SVG (только из сетки модулей, без innerHTML) ----------

  function qrSvg(text, opts) {
    var o = opts || {};
    var qr = root.qrcode(0, o.level || 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var quiet = 4;
    var size = n + quiet * 2;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', o.label || 'QR-код');
    var bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('width', size);
    bg.setAttribute('height', size);
    bg.setAttribute('fill', '#fff');
    svg.appendChild(bg);
    var d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
      }
    }
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', '#000');
    svg.appendChild(path);
    return svg;
  }

  /** Параметры после # : «z=В-247&w=10:00&e=…&desk». */
  function hashParams(hash) {
    var h = String(hash || '').replace(/^#/, '');
    var out = {};
    h.split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      out[k] = i < 0 ? true : decodeURIComponent(kv.slice(i + 1));
    });
    return out;
  }

  var api = {
    b64urlEncode: b64urlEncode, b64urlDecode: b64urlDecode,
    encodeAnketa: encodeAnketa, decodeAnketa: decodeAnketa, readPass: readPass,
    describeTests: describeTests, testName: testName, STATIONS: STATIONS,
    roman: roman, normalizeUin: normalizeUin, ageToday: ageToday, ruDate: ruDate,
    isPhone: isPhone, inAppBrowser: inAppBrowser, browserName: browserName,
    load: load, save: save, qrSvg: qrSvg, hashParams: hashParams,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GTO = api;
})(typeof window !== 'undefined' ? window : globalThis);
