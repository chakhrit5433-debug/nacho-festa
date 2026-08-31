/* ============================================================
   NachoFesta — About Us org chart
   Measures the live card layout and draws the reporting lines from
   the CEO down to every manager, redrawing them on resize so the
   chart stays correct at 4 / 2 / 1 columns. Hovering a card traces
   its line and brings out the managers it works with.
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var R = 8;          // corner radius on the elbows
  var ROW_TOL = 24;   // px tolerance when grouping cards into rows

  var org, svg, ceo, cards, frame = null, activeId = null;

  /* ---------- geometry helpers ---------- */

  /* Layout offsets, not getBoundingClientRect(): the reveal animation and the
     card tilt both apply transforms, which would poison a rect measurement. */
  function boxIn(el, root) {
    var x = 0, y = 0, node = el;
    while (node && node !== root) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    var w = el.offsetWidth, h = el.offsetHeight;
    return { l: x, t: y, w: w, h: h, r: x + w, b: y + h, cx: x + w / 2 };
  }

  function toward(from, to, dist) {
    var dx = to[0] - from[0], dy = to[1] - from[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (!len) return [from[0], from[1]];
    var k = Math.min(dist, len) / len;
    return [from[0] + dx * k, from[1] + dy * k];
  }

  function n(v) { return Math.round(v * 10) / 10; }

  /* Polyline with rounded corners. */
  function polyPath(pts, radius) {
    var clean = [], i;
    for (i = 0; i < pts.length; i++) {
      var prev = clean[clean.length - 1];
      if (!prev || Math.abs(prev[0] - pts[i][0]) > 0.5 || Math.abs(prev[1] - pts[i][1]) > 0.5) {
        clean.push(pts[i]);
      }
    }
    if (clean.length < 2) return '';

    var d = 'M' + n(clean[0][0]) + ',' + n(clean[0][1]);
    for (i = 1; i < clean.length - 1; i++) {
      var a = clean[i - 1], c = clean[i], b = clean[i + 1];
      var rr = Math.min(radius,
        Math.hypot(c[0] - a[0], c[1] - a[1]) / 2,
        Math.hypot(b[0] - c[0], b[1] - c[1]) / 2);
      var p1 = toward(c, a, rr), p2 = toward(c, b, rr);
      d += ' L' + n(p1[0]) + ',' + n(p1[1]) +
           ' Q' + n(c[0]) + ',' + n(c[1]) + ' ' + n(p2[0]) + ',' + n(p2[1]);
    }
    var last = clean[clean.length - 1];
    return d + ' L' + n(last[0]) + ',' + n(last[1]);
  }

  function addPath(d, cls, a, b) {
    if (!d) return;
    var el = document.createElementNS(NS, 'path');
    el.setAttribute('d', d);
    el.setAttribute('class', cls);
    if (a) el.setAttribute('data-a', a);
    if (b) el.setAttribute('data-b', b);
    svg.appendChild(el);
  }

  /* ---------- the drawing ---------- */

  function build() {
    if (!org || !svg || !ceo) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var W = org.clientWidth, H = org.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var ceoBox = boxIn(ceo, org);
    var boxes = [];
    cards.forEach(function (card) {
      if (!card.offsetParent && card.offsetWidth === 0) return;
      var box = boxIn(card, org);
      box.id = card.getAttribute('data-node');
      box.el = card;
      boxes.push(box);
    });
    if (!boxes.length) return;

    /* Group into visual rows — this is what keeps the chart correct
       at 4, 2 and 1 columns without hard-coding any breakpoint. */
    boxes.sort(function (p, q) { return (p.t - q.t) || (p.l - q.l); });
    var rows = [];
    boxes.forEach(function (box) {
      var row = rows[rows.length - 1];
      if (row && Math.abs(row[0].t - box.t) <= ROW_TOL) row.push(box);
      else rows.push([box]);
    });
    rows.forEach(function (row) { row.sort(function (p, q) { return p.l - q.l; }); });

    var singleColumn = rows.every(function (row) { return row.length === 1; }) && rows.length > 1;
    var routes = {};   // node id -> full route from the CEO, used for the hover highlight

    if (singleColumn) {
      buildSpineLayout(ceoBox, rows, routes);
    } else {
      buildTreeLayout(ceoBox, rows, routes);
    }

    /* One invisible "trace" per manager, sitting exactly on the shared trunk.
       Lighting it up makes the whole route from the CEO glow on hover. */
    Object.keys(routes).forEach(function (id) {
      addPath(routes[id], 'org__link org__link--report org__link--trace', 'ceo', id);
    });

    // a redraw (resize, late image) throws the paths away — put the highlight back
    if (activeId) lightLinks(activeId);
  }

  /* CEO on top, a bus above each row, a spine down the first column gap. */
  function buildTreeLayout(ceoBox, rows, routes) {
    var busY = [];
    rows.forEach(function (row, i) {
      var above = i === 0 ? ceoBox.b : rows[i - 1][0].b;
      busY.push(above + (row[0].t - above) / 2);
    });

    /* Vertical spine linking the buses, tucked into the gap between
       the first and second column so it never crosses a card. */
    var spineX;
    var top = rows[0];
    if (top.length > 1) spineX = (top[0].r + top[1].l) / 2;
    else spineX = top[0].cx;

    // CEO stem
    addPath(polyPath([[ceoBox.cx, ceoBox.b], [ceoBox.cx, busY[0]]], 0),
      'org__link org__link--report');

    if (rows.length > 1) {
      addPath(polyPath([[spineX, busY[0]], [spineX, busY[rows.length - 1]]], 0),
        'org__link org__link--report');
    }

    rows.forEach(function (row, i) {
      var y = busY[i];
      var startX = row[0].cx;
      var endX = row[row.length - 1].cx;
      var left = Math.min(startX, i > 0 ? spineX : ceoBox.cx);
      var right = Math.max(endX, i > 0 ? spineX : ceoBox.cx);

      // one horizontal bus, wide enough to meet the CEO stem (row 0) or the spine
      if (right - left > 1) {
        addPath(polyPath([[left, y], [right, y]], 0), 'org__link org__link--report');
      }
      // one drop per card — kept as separate straight strokes so nothing overlaps
      row.forEach(function (box) {
        addPath(polyPath([[box.cx, y], [box.cx, box.t]], 0), 'org__link org__link--report');
      });

      // per-card route, for the hover highlight
      row.forEach(function (box) {
        var pts = [[ceoBox.cx, ceoBox.b], [ceoBox.cx, busY[0]]];
        if (i > 0) {
          pts.push([spineX, busY[0]]);
          pts.push([spineX, y]);
        }
        pts.push([box.cx, y]);
        pts.push([box.cx, box.t]);
        routes[box.id] = polyPath(pts, R);
      });
    });
  }

  /* One column: a spine down the left margin with a branch into each card. */
  function buildSpineLayout(ceoBox, rows, routes) {
    var first = rows[0][0];
    var spineX = Math.max(6, first.l - 16);
    var busY = ceoBox.b + (first.t - ceoBox.b) / 2;
    var branchY = function (box) { return box.t + Math.min(56, box.h * 0.16); };
    var last = rows[rows.length - 1][0];

    addPath(polyPath([
      [ceoBox.cx, ceoBox.b], [ceoBox.cx, busY], [spineX, busY], [spineX, branchY(last)]
    ], R), 'org__link org__link--report');

    rows.forEach(function (row) {
      var box = row[0];
      var y = branchY(box);
      addPath(polyPath([[spineX, y], [box.l, y]], 0), 'org__link org__link--report');
      routes[box.id] = polyPath([
        [ceoBox.cx, ceoBox.b], [ceoBox.cx, busY], [spineX, busY], [spineX, y], [box.l, y]
      ], R);
    });
  }

  /* ---------- highlight on hover / keyboard focus ---------- */

  function lightLinks(id) {
    svg.querySelectorAll('.org__link').forEach(function (path) {
      var a = path.getAttribute('data-a'), b = path.getAttribute('data-b');
      if (a !== id && b !== id) return;
      path.classList.add('is-lit');
      var mate = a === id ? b : a;
      var partner = org.querySelector('[data-node="' + mate + '"]');
      if (partner) partner.classList.add('is-related');
    });

    // the people this manager works with stay lit alongside the reporting line
    var card = org.querySelector('[data-node="' + id + '"]');
    var links = card ? (card.getAttribute('data-links') || '').split(/\s+/) : [];
    links.forEach(function (mate) {
      if (!mate) return;
      var partner = org.querySelector('.team-grid [data-node="' + mate + '"]');
      if (partner) partner.classList.add('is-related');
    });
  }

  function light(card) {
    activeId = card.getAttribute('data-node');
    org.classList.add('is-focused');
    card.classList.add('is-active');
    lightLinks(activeId);
  }

  function clear() {
    activeId = null;
    org.classList.remove('is-focused');
    org.querySelectorAll('.is-active, .is-related').forEach(function (el) {
      el.classList.remove('is-active', 'is-related');
    });
    svg.querySelectorAll('.is-lit').forEach(function (el) { el.classList.remove('is-lit'); });
  }

  function initHighlight() {
    var all = [ceo].concat(cards);
    all.forEach(function (card) {
      card.addEventListener('mouseenter', function () { light(card); });
      card.addEventListener('mouseleave', clear);
      card.addEventListener('focusin', function () { light(card); });
      card.addEventListener('focusout', clear);
    });
  }

  /* ---------- lifecycle ---------- */

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(function () { frame = null; build(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    org = document.querySelector('.org');
    if (!org) return;
    svg = org.querySelector('.org__lines');
    ceo = org.querySelector('.org__ceo');
    cards = Array.prototype.slice.call(org.querySelectorAll('.team-grid [data-node]'));
    if (!svg || !ceo || !cards.length) return;

    build();
    initHighlight();

    window.addEventListener('resize', schedule, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(org);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    window.addEventListener('load', schedule);

    /* Fade the links in once the chart is on screen. threshold 0, so it fires however
       tall the chart gets and wherever the reader enters it. */
    var show = function () { org.classList.add('is-drawn'); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { show(); io.disconnect(); }
      }, { threshold: 0 });
      io.observe(org);
    } else {
      show();
    }
  });
})();
