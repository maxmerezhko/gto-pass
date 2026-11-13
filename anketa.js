/* Анкета участника (макеты P2, P3, P3b, D1, D2).
 * Данные остаются только в этом браузере (localStorage) и в QR на экране.
 */
(function () {
  'use strict';
  var G = window.GTO;
  var app = document.getElementById('app');
  var KEY = 'gto.anketas';
  var params = G.hashParams(location.hash);
  var printMode = false;

  // ---------- маленький помощник для DOM (только textContent) ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      if (k === 'class') el.className = a[k];
      else if (k === 'text') el.textContent = a[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), a[k]);
      else if (a[k] === true) el.setAttribute(k, '');
      else if (a[k] !== false && a[k] != null) el.setAttribute(k, a[k]);
    });
    (function add(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null || c === false) continue;
        if (Array.isArray(c)) add(c);
        else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    })(Array.prototype.slice.call(arguments, 2));
    return el;
  }

  function show() {
    app.className = '';
    app.textContent = '';
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) app.appendChild(arguments[i]);
    window.scrollTo(0, 0);
  }

  function anketas() { return G.load(KEY, []); }
  function passes() { return G.load('gto.passes', []); }

  // Запись на время (P1) передаётся в ссылке после #: z=В-247&w=10:00&e=…
  function bookingLine() {
    var parts = [];
    if (params.z) parts.push('Запись ' + params.z);
    if (params.w) parts.push((params.z ? '' : 'волна ') + params.w);
    return parts.join(' · ');
  }

  function setHeader(title, sub) {
    document.getElementById('title').textContent = title;
    document.getElementById('sub').textContent =
      sub || [params.e, bookingLine()].filter(Boolean).join(' · ') || 'ГТО · Протокол';
    document.title = title;
  }

  function privacyNote(text) {
    return h('p', { class: 'note', text: text || 'Данные анкеты хранятся только в вашем телефоне и никуда не отправляются.' });
  }

  function inAppBanner() {
    var app = G.inAppBrowser();
    if (!app) return null;
    return h('div', { class: 'banner warn' },
      h('b', { text: 'Вы открыли анкету внутри ' + app + '. ' }),
      'Откройте ссылку в обычном браузере (меню «⋯» → «Открыть в браузере»), иначе анкета может потеряться: камера на стойке откроет обычный браузер, а там анкеты не будет.');
  }

  // ---------- D1: компьютер ----------
  function desktopScreen() {
    setHeader('Регистрация с телефона');
    var link = location.href;
    show(
      h('div', { class: 'card desk' },
        h('div', null,
          h('h2', { text: 'Регистрация проходит с телефона' }),
          h('p', { text: 'Анкета останется у вас в телефоне, а на тестировании вы получите в него пропуск. Так быстрее и не нужно ничего печатать.' }),
          h('ol', { class: 'steps' },
            h('li', { text: 'Наведите камеру телефона на код справа' }),
            h('li', { text: 'Нажмите на появившуюся ссылку — откроется анкета' }),
            h('li', { text: 'Заполните анкету' + (bookingLine() ? ' — ваша запись (' + bookingLine() + ') уже будет в ней' : '') }))),
        h('div', null,
          h('div', { class: 'qr' }, G.qrSvg(link, { label: 'Ссылка на анкету' })),
          h('p', { class: 'note', text: 'В коде только ссылка' + (params.z ? ' и номер записи' : '') + ' — без личных данных.' }))),
      h('button', { class: 'link', type: 'button', text: 'Это мой телефон или планшет — заполнить здесь',
        onclick: function () { try { sessionStorage.setItem('gto.force', '1'); } catch (e) {} route(); } }),
      h('button', { class: 'link', type: 'button', text: 'Нет смартфона? Заполнить здесь и распечатать',
        onclick: function () { printMode = true; formScreen(null); } }),
      h('p', { class: 'note', text: 'Или приходите с документом и УИН — зарегистрируем на месте.' }));
    app.className = 'wide';
  }

  // ---------- P3b: анкеты нет (открыт QR стойки) ----------
  function noFormScreen() {
    setHeader('Анкеты на этом телефоне нет');
    show(
      inAppBanner(),
      h('div', { class: 'card' },
        h('h3', { text: 'Заполнить сейчас' }),
        h('p', { class: 'note', text: 'Около 2 минут — успеете, пока стоите в очереди. Можно записать несколько участников.' }),
        h('button', { type: 'button', text: 'Заполнить анкету', onclick: function () { formScreen(null); } })),
      h('div', { class: 'card' },
        h('h3', { text: 'Заполняли в другом браузере или в Telegram, ВК, MAX?' }),
        h('p', { class: 'note', text: 'Анкета осталась там. Откройте ссылку на регистрацию в том же приложении — и покажите код регистратору.' })),
      h('div', { class: 'card' },
        h('h3', { text: 'Распечатали анкету или нет смартфона?' }),
        h('p', { class: 'note', text: 'Подойдите к регистратору: он отсканирует лист или запишет данные по документу и УИН и выдаст наклейку-пропуск.' })),
      privacyNote());
  }

  // ---------- P2: анкета ----------
  function formScreen(index) {
    var list = anketas();
    var a = index == null ? {} : list[index];
    var number = index == null ? list.length + 1 : index + 1;
    setHeader(printMode ? 'Анкета для печати' : 'Анкета участника');

    var err = {};
    function field(name, labelText, input, hint) {
      err[name] = h('div', { class: 'err' });
      return h('div', null, h('label', { for: input.id || null }, labelText, hint ? h('span', { class: 'hint', text: hint }) : null), input, err[name]);
    }
    var uin = h('input', { id: 'uin', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: '25-78-0012345', value: a.u || '' });
    var fio = h('input', { id: 'fio', type: 'text', autocomplete: 'name', placeholder: 'Иванов Илья Сергеевич', value: a.f || '' });
    var bd = h('input', { id: 'bd', type: 'date', value: a.bd || '', max: new Date().toISOString().slice(0, 10) });
    var sxM = h('input', { type: 'radio', name: 'sx', value: 'M', checked: a.sx === 'M' });
    var sxF = h('input', { type: 'radio', name: 'sx', value: 'F', checked: a.sx === 'F' });
    var whoSelf = h('input', { type: 'radio', name: 'who', value: 'self', checked: a.who !== 'parent' });
    var whoParent = h('input', { type: 'radio', name: 'who', value: 'parent', checked: a.who === 'parent' });
    var pn = h('input', { id: 'pn', type: 'text', autocomplete: 'name', value: a.pn || '' });
    var consent = h('input', { type: 'checkbox', checked: !!a.c });
    var consentText = h('span');
    var parentBox = h('div');

    function updateWho() {
      var age = bd.value ? G.ageToday(bd.value) : null;
      if (age != null && age < 18) { whoParent.checked = true; whoSelf.disabled = true; }
      else whoSelf.disabled = false;
      var parent = whoParent.checked;
      parentBox.classList.toggle('hidden', !parent);
      consentText.textContent = parent
        ? 'Как родитель даю согласие центру тестирования на обработку персональных данных ребёнка'
        : 'Даю согласие центру тестирования на обработку моих персональных данных';
    }
    [bd, whoSelf, whoParent].forEach(function (el) { el.addEventListener('change', updateWho); });

    parentBox.appendChild(field('pn', 'ФИО родителя или законного представителя', pn));

    var form = h('form', { class: 'card', novalidate: true, onsubmit: function (ev) {
      ev.preventDefault();
      submit();
    } },
      h('div', { class: 'note', text: (printMode ? '' : 'не отправляется в интернет · ') + 'участник ' + number }),
      field('u', 'УИН участника', uin, 'Номер есть в личном кабинете на gto.ru. Нет УИН — оставьте пустым.'),
      field('f', 'Фамилия, имя, отчество участника', fio),
      field('bd', 'Дата рождения', bd),
      h('label', { text: 'Пол' }),
      h('div', { class: 'seg' }, h('label', null, sxM, 'М'), h('label', null, sxF, 'Ж')),
      (err.sx = h('div', { class: 'err' })),
      h('label', { text: 'Кто заполняет анкету' }),
      h('div', { class: 'seg' }, h('label', null, whoSelf, 'Сам участник, 18+'), h('label', null, whoParent, 'Родитель')),
      parentBox,
      h('label', { class: 'check' }, consent, consentText),
      (err.c = h('div', { class: 'err' })),
      h('button', { type: 'submit', text: printMode ? 'Показать лист для печати' : 'Готово — показать QR для стойки' }),
      index != null || list.length ? h('button', { type: 'button', class: 'link', text: 'Отмена', onclick: route }) : null);

    function submit() {
      Object.keys(err).forEach(function (k) { err[k].textContent = ''; });
      var ok = true;
      function bad(k, msg) { err[k].textContent = msg; ok = false; }
      var u = uin.value.trim() ? G.normalizeUin(uin.value) : null;
      if (uin.value.trim() && !u) bad('u', 'УИН — 11 цифр, например 25-78-0012345');
      var f = fio.value.trim().replace(/\s+/g, ' ');
      if (f.split(' ').length < 2) bad('f', 'Нужны хотя бы фамилия и имя');
      if (!bd.value) bad('bd', 'Укажите дату рождения');
      else if (G.ageToday(bd.value) < 6) bad('bd', 'Тестирование ГТО — с 6 лет');
      var sx = sxM.checked ? 'M' : sxF.checked ? 'F' : null;
      if (!sx) bad('sx', 'Выберите пол');
      var parent = whoParent.checked;
      var p = pn.value.trim().replace(/\s+/g, ' ');
      if (parent && p.split(' ').length < 2) bad('pn', 'Нужны фамилия и имя родителя');
      if (!consent.checked) bad('c', 'Без согласия анкету не принять');
      if (!ok) return;
      var rec = { f: f, bd: bd.value, sx: sx, u: u, pn: parent ? p : null, c: true,
        who: parent ? 'parent' : 'self', z: params.z || a.z || null, w: params.w || a.w || null };
      if (printMode) return printScreen(rec);
      var all = anketas();
      if (index == null) all.push(rec); else all[index] = rec;
      if (!G.save(KEY, all)) {
        bad('c', 'Браузер не даёт сохранить анкету (приватный режим?). Покажите QR сейчас и не закрывайте страницу.');
      }
      listScreen(all);
    }

    show(inAppBanner(), form, privacyNote(printMode
      ? 'Данные не отправляются в интернет и будут стёрты с компьютера после печати.' : null));
    updateWho();
  }

  // ---------- P3: QR для стойки ----------
  function listScreen(listOverride) {
    var list = listOverride || anketas();
    setHeader('Анкета — QR для стойки');
    var cards = list.map(function (a, i) {
      return h('div', { class: 'card' },
        h('div', { class: 'note', text: list.length > 1 ? 'Участник ' + (i + 1) + ' из ' + list.length : 'не отправлено в интернет' }),
        h('h3', { text: 'Покажите код на стойке' }),
        h('p', { class: 'note', text: 'Регистратор отсканирует код — вбивать ничего не нужно.' }),
        h('div', { class: 'qr' }, G.qrSvg(G.encodeAnketa(a), { label: 'Анкета: ' + a.f })),
        h('dl', { class: 'facts' },
          h('dt', { text: 'Участник' }), h('dd', { text: a.f }),
          h('dt', { text: 'УИН' }), h('dd', { text: a.u || 'нет — «УИН позже»' }),
          h('dt', { text: 'Дата рождения' }), h('dd', { text: G.ruDate(a.bd) + ' · ' + (a.sx === 'M' ? 'М' : 'Ж') }),
          h('dt', { text: 'Согласие' }), h('dd', { text: a.who === 'parent' ? 'родитель · ' + a.pn : 'участник' })),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'ghost', text: 'Изменить', onclick: function () { formScreen(i); } }),
          h('button', { type: 'button', class: 'ghost', text: 'Удалить', onclick: function () {
            if (!confirm('Удалить анкету «' + a.f + '» из этого телефона?')) return;
            var all = anketas(); all.splice(i, 1); G.save(KEY, all); route();
          } })));
    });
    var got = passes().length;
    show(
      inAppBanner(),
      got ? h('a', { class: 'btn', href: 'p/', text: 'Мои пропуска (' + got + ')' }) : null,
      h('div', null, cards),
      h('button', { type: 'button', class: 'ghost', text: '+ Ещё участник', onclick: function () { formScreen(null); } }),
      h('div', { class: 'card' },
        h('h3', { text: 'Как получить пропуск' }),
        h('p', { text: 'Покажите этот код регистратору. Потом наведите обычную камеру телефона на его экран — откроется ваш пропуск.' })),
      privacyNote('Анкета сохранена в браузере ' + G.browserName() + '. На стойке откройте её здесь же.'));
  }

  // ---------- D2: лист для печати ----------
  function printScreen(a) {
    setHeader('Анкета для печати');
    var sheet = h('div', { class: 'card' },
      h('h2', { text: 'Анкета участника' }),
      h('p', { text: 'Покажите этот лист на стойке регистрации' }),
      params.e ? h('p', { class: 'note', text: params.e }) : null,
      bookingLine() ? h('p', { class: 'note', text: bookingLine() }) : null,
      h('div', { class: 'qr' }, G.qrSvg(G.encodeAnketa(a), { label: 'Анкета' })),
      h('div', { class: 'banner warn' }, h('b', { text: 'Это не пропуск. ' }),
        'Регистратор отсканирует код, проверит документ и допуск и выдаст вам наклейку-пропуск. Её нужно показывать судьям на каждой станции.'),
      h('dl', { class: 'facts' },
        h('dt', { text: 'Участник' }), h('dd', { text: a.f }),
        h('dt', { text: 'УИН' }), h('dd', { text: a.u || 'нет' }),
        h('dt', { text: 'Дата рождения, пол' }), h('dd', { text: G.ruDate(a.bd) + ' · ' + (a.sx === 'M' ? 'М' : 'Ж') }),
        h('dt', { text: 'Согласие на обработку ПДн' }), h('dd', { text: a.who === 'parent' ? 'дано родителем · ' + a.pn : 'дано участником' })),
      h('p', { class: 'note', text: 'Данные анкеты не отправлялись в интернет и стёрты с компьютера после печати. Лист — единственная копия: возьмите его с собой и не оставляйте на виду.' }));
    var wiped = h('div', { class: 'banner ok hidden no-print', text: 'Данные стёрты с этого компьютера. Возьмите лист с собой.' });
    function wipe() {
      sheet.remove();
      wiped.classList.remove('hidden');
      printBtn.classList.add('hidden');
    }
    var printBtn = h('button', { class: 'no-print', type: 'button', text: 'Распечатать', onclick: function () {
      window.addEventListener('afterprint', wipe, { once: true });
      window.print();
    } });
    show(sheet, printBtn, wiped);
  }

  // ---------- выбор экрана ----------
  function route() {
    var forced = false;
    try { forced = sessionStorage.getItem('gto.force') === '1'; } catch (e) {}
    printMode = false;
    var list = anketas();
    if (list.length) return listScreen(list);
    if (!G.isPhone() && !forced && !params.desk) return desktopScreen();
    if (params.desk) return noFormScreen();
    formScreen(null);
  }

  route();
  // Ссылку открыли в той же вкладке с другой записью — перечитать.
  window.addEventListener('hashchange', function () {
    params = G.hashParams(location.hash);
    route();
  });

  // Страница запоминается в телефоне и дальше открывается без интернета.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
