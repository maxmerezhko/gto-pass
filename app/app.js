/* Установка по одному QR: Android — скачать приложение, iPhone — объяснить,
 * что приложение не нужно (страницу судьи раздаёт телефон главного),
 * компьютер — программа для Windows, инструкции и QR этой страницы. */
(function () {
  'use strict';
  var G = window.GTO;
  var REL = 'https://github.com/maxmerezhko/gto-pass/releases/latest/download/';
  var FILES = {
    apk: REL + 'gto-protocol-android.apk',
    apkUni: REL + 'gto-protocol-android-universal.apk',
    win: REL + 'GTO-Protocol-Windows.zip',
    docs: REL + 'gto-protocol-docs.zip',
  };
  var app = document.getElementById('app');
  var ua = navigator.userAgent || '';
  var android = /Android/i.test(ua);
  var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      if (k === 'class') el.className = a[k];
      else if (k === 'text') el.textContent = a[k];
      else el.setAttribute(k, a[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function btn(href, text, ghost) { return h('a', { class: 'btn' + (ghost ? ' ghost' : ''), href: href, text: text }); }
  function steps(list) { var ol = h('ol'); list.forEach(function (t) { ol.appendChild(h('li', { text: t })); }); return ol; }

  function androidView() {
    app.appendChild(h('div', { class: 'card' },
      h('h3', { text: 'Приложение для Android' }),
      h('p', { text: 'Скачивание начнётся само. Не началось — кнопка ниже.' }),
      btn(FILES.apk, 'Скачать приложение'),
      steps([
        'Откройте скачанный файл gto-protocol-android.apk (шторка уведомлений или «Загрузки»).',
        'Разрешите установку из этого источника. Play Protect предупредит — «Всё равно установить».',
        'Откройте «ГТО Протокол» и выберите свою роль.',
      ]),
      h('p', { class: 'note', text: 'Не ставится («ошибка при разборе пакета») — старый телефон, нужен универсальный файл:' }),
      btn(FILES.apkUni, 'Универсальная версия', true),
      h('p', { class: 'note', text: 'Новая версия ставится поверх старой — приложение не удаляйте, иначе записи на телефоне пропадут.' })));
    // QR открыли камерой — сразу качаем, без лишнего нажатия.
    setTimeout(function () { location.href = FILES.apk; }, 600);
  }

  function iosView() {
    app.appendChild(h('div', { class: 'card' },
      h('h3', { text: 'На iPhone ничего ставить не нужно' }),
      h('p', { text: 'Судья и регистратор с iPhone работают в браузере. На площадке:' }),
      steps([
        'Подключитесь к Wi-Fi главного судьи: у него «QR для судей» → «1 · Wi-Fi» → обычная камера.',
        'Там же вкладка «Нет приложения» → обычная камера → откроется страница судьи в Safari, уже подключённая к бригаде.',
        'Перед сменой: Настройки → Экран и яркость → Автоблокировка → Никогда (после смены верните).',
      ]),
      h('p', { class: 'note', text: 'Пропуск в браузере сканируют фотографией: «Сфотографировать QR». Главному судье нужен телефон Android.' })));
  }

  function desktopView() {
    var page = location.href.split('#')[0];
    app.appendChild(h('div', { class: 'card' },
      h('h3', { text: 'Ноутбук центра (Windows 10/11)' }),
      btn(FILES.win, 'Скачать программу для Windows'),
      steps([
        'Распакуйте архив целиком, например в C:\\GTO. Установка и права администратора не нужны.',
        'Запустите gto_protocol.exe. «Неизвестный издатель» — «Подробнее» → «Выполнить в любом случае».',
      ]),
      btn(FILES.docs, 'Инструкции и памятки (PDF)', true)));
    var qr = h('div', { class: 'qr' });
    qr.appendChild(G.qrSvg(page, { label: 'Установка ГТО Протокол' }));
    app.appendChild(h('div', { class: 'card' },
      h('h3', { text: 'Телефоны судей' }),
      h('p', { text: 'Наведите камеру телефона на этот код: Android скачает приложение, iPhone покажет, как работать без него.' }),
      qr,
      h('p', { class: 'note', text: page })));
  }

  if (android) androidView(); else if (ios) iosView(); else desktopView();

  fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (v) { if (v && v.version) document.getElementById('ver').textContent = 'версия ' + v.version + ' · ' + v.date; })
    .catch(function () {});
})();
