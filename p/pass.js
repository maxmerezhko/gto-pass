/* Пропуск участника (макет P4). Пропуск — это ссылка: данные и подпись
 * после «#», браузер их на сервер не отправляет. Страница сохраняет пропуск
 * в этом телефоне и показывает QR для судьи. Подпись проверяет судья.
 */
(function () {
  'use strict';
  var G = window.GTO;
  var app = document.getElementById('app');
  var KEY = 'gto.passes';

  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      if (k === 'class') el.className = a[k];
      else if (k === 'text') el.textContent = a[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), a[k]);
      else if (a[k] != null && a[k] !== false) el.setAttribute(k, a[k]);
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

  function linkFor(token) {
    return location.origin + location.pathname + '#' + token;
  }

  function two(n) { return (n < 10 ? '0' : '') + n; }

  /** Сохранить пропуск из ссылки. Возвращает {saved, pass} или {error}. */
  function takeFromHash() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw) return {};
    var p = G.readPass(raw);
    if (!p) return { error: 'Ссылка пропуска повреждена. Попросите регистратора показать код ещё раз — или покажите судье фото кода.' };
    if (p.kind === 'sticker') return { error: 'Это код наклейки-заготовки, а не пропуск. Наклейку показывают судье прямо на бумаге.' };
    var list = G.load(KEY, []);
    var same = list.filter(function (x) { return x.id === p.id; })[0];
    if (!same) {
      var t = new Date();
      list.unshift({ id: p.id, token: p.token, savedAt: two(t.getHours()) + ':' + two(t.getMinutes()) });
      G.save(KEY, list);
    } else if (same.token !== p.token) {
      same.token = p.token; // перевыпущенный пропуск заменяет старый
      G.save(KEY, list);
    }
    return { pass: p };
  }

  function testsBlock(tests) {
    if (!tests || !tests.length) return null;
    var d = G.describeTests(tests);
    function list(title, items) {
      if (!items.length) return null;
      return h('div', null, h('b', { text: title }),
        h('ul', null, items.map(function (t) { return h('li', { text: t }); })));
    }
    return h('div', { class: 'tests' },
      h('div', { class: 'note', text: 'Ваши испытания на этом мероприятии' }),
      list('Обязательные', d.required),
      list('По выбору', d.optional));
  }

  function passCard(entry, i, n) {
    var p = G.readPass(entry.token);
    if (!p) return null;
    var line = [
      p.stage ? G.roman(p.stage) + ' ступень' : null,
      p.sex === 'M' ? 'М' : p.sex === 'F' ? 'Ж' : null,
      p.wave ? 'волна ' + p.wave : null,
      p.id,
    ].filter(Boolean).join(' · ');
    var link = linkFor(p.token);
    var share = navigator.share ? h('button', { type: 'button', class: 'ghost', text: 'Отправить себе', onclick: function () {
      navigator.share({ title: 'Пропуск ГТО · ' + p.name, url: link }).catch(function () {});
    } }) : null;
    return h('div', { class: 'card' },
      h('div', null,
        h('span', { class: 'pill', text: 'Пропуск' }), ' ',
        entry.savedAt ? h('span', { class: 'note', text: 'получен ' + entry.savedAt }) : null),
      h('div', { class: 'pass-name', text: p.name }),
      h('div', { class: 'note', text: line }),
      h('div', { class: 'qr' }, G.qrSvg(link, { label: 'Пропуск ' + p.name })),
      h('p', { text: 'Покажите судье на каждой станции' }),
      testsBlock(p.tests),
      share,
      n > 1 ? h('div', { class: 'dots', text: (i + 1) + ' из ' + n + ' — листайте вбок' }) : null);
  }

  function render(state) {
    app.textContent = '';
    if (state.error) app.appendChild(h('div', { class: 'banner alert', text: state.error }));
    var list = G.load(KEY, []);
    if (!list.length && !state.pass) {
      app.appendChild(h('div', { class: 'card' },
        h('h3', { text: 'Пропусков в этом телефоне нет' }),
        h('p', { class: 'note', text: 'Пропуск выдают на стойке регистрации: покажите анкету, а потом наведите обычную камеру телефона на экран регистратора.' }),
        h('a', { class: 'btn ghost', href: '../', text: 'Открыть анкету' })));
      return;
    }
    // Если сохранить не удалось (приватный режим) — показываем хотя бы этот.
    if (!list.length && state.pass) list = [{ id: state.pass.id, token: state.pass.token }];
    var n = list.length;
    var box = h('div', { class: 'passes' });
    list.forEach(function (e, i) { var c = passCard(e, i, n); if (c) box.appendChild(c); });
    app.appendChild(box);
    app.appendChild(h('p', { class: 'note', text: 'Работает без интернета. Пропуск — это ссылка: её можно отправить себе в мессенджер, а судья примет даже фото кода.' }));
    app.appendChild(h('button', { type: 'button', class: 'link', text: 'Удалить пропуска из телефона', onclick: function () {
      if (!confirm('Удалить все пропуска из этого телефона? Делайте это после тестирования.')) return;
      G.save(KEY, []);
      history.replaceState(null, '', location.pathname);
      render({});
    } }));
  }

  render(takeFromHash());
  window.addEventListener('hashchange', function () { render(takeFromHash()); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function () {});
  }
})();
