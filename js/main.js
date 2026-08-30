/* ============================================================
   NachoFesta — shared UI behaviour
   Nav state, mobile menu, scroll reveal, 3D card tilt, form
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches;

  /* ---------- Active nav link ---------- */
  function markActiveLink() {
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__links a').forEach(function (a) {
      var target = a.getAttribute('href');
      if (target === here) a.classList.add('is-active');
    });
  }

  /* ---------- Sticky nav background + burger ---------- */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var burger = nav.querySelector('.nav__burger');
    if (burger) {
      burger.addEventListener('click', function () {
        nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', nav.classList.contains('is-open'));
      });
      // Close the menu after tapping a link
      nav.querySelectorAll('.nav__links a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('is-open'); });
      });
    }
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3D tilt cards ---------- */
  function initTilt() {
    if (reduceMotion || isTouch) return;

    document.querySelectorAll('.card-3d').forEach(function (card) {
      var max = parseFloat(card.dataset.tilt || '8');
      var frame = null;

      card.addEventListener('mousemove', function (e) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = null;
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 .. 0.5
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--ry', (px * max * 2).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (-py * max * 2).toFixed(2) + 'deg');
        });
      });

      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Contact form (front-end only, no backend) ---------- */
  function initForm() {
    var form = document.querySelector('.form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.form__msg');
      var name = (form.querySelector('#f-name') || {}).value || 'friend';
      if (msg) {
        msg.textContent = 'Thank you, ' + name.trim() + '! Your message has landed at our Moon office. ' +
          'Our team will reply to you within one lunar day.';
        msg.classList.add('is-shown');
      }
      form.reset();
    });
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    markActiveLink();
    initNav();
    initReveal();
    initTilt();
    initForm();
    initYear();
  });
})();
