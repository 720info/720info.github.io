/* global document, window */
(function () {
  'use strict';

  // ===== 1. 阅读进度条（超轻量，requestAnimationFrame + 节流） =====
  function initReadingProgress() {
    var bar = document.createElement('div');
    bar.className = 'reading-progress-bar';
    document.body.appendChild(bar);

    var lastY = -1;
    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var scrolled = doc.scrollTop || document.body.scrollTop;
      var h = doc.scrollHeight - doc.clientHeight;
      var pct = h > 0 ? (scrolled / h) * 100 : 0;
      bar.style.width = pct.toFixed(2) + '%';
      lastY = scrolled;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  // ===== 2. 鼠标点击涟漪特效（淡入快，不卡） =====
  function initClickRipple() {
    var colors = ['#60a5fa', '#818cf8', '#c084fc', '#f472b6', '#34d399'];
    var size = 90;

    function createRipple(x, y) {
      var el = document.createElement('span');
      el.className = 'click-ripple';
      var color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText =
        'left:' + (x - size / 2) + 'px;' +
        'top:' + (y - size / 2) + 'px;' +
        'width:' + size + 'px;' +
        'height:' + size + 'px;' +
        'background: radial-gradient(circle, ' + color + ' 0%, rgba(96,165,250,0) 70%);';
      document.body.appendChild(el);
      el.addEventListener('animationend', function () {
        el.parentNode && el.parentNode.removeChild(el);
      }, { once: true });
    }

    document.addEventListener('click', function (e) {
      // 避免在输入框、链接上触发太多，但点空白处也照样有
      if (e.button !== 0) return;
      createRipple(e.clientX, e.clientY);
    }, { passive: true });
  }

  // ===== 3. 滚动淡入动画（IntersectionObserver，性能好） =====
  function initScrollFadeIn() {
    if (!('IntersectionObserver' in window)) return;

    var targets = document.querySelectorAll(
      '.index-card, .post-card, article, .board, #toc, .banner, .about-avatar-wrap, .archive-article'
    );
    if (!targets.length) return;

    targets.forEach(function (el) { el.classList.add('scroll-fade-in'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });

    targets.forEach(function (el) { io.observe(el); });
  }

  // ===== 启动 =====
  function boot() {
    try { initReadingProgress(); } catch (e) { /* ignore */ }
    try { initClickRipple(); } catch (e) { /* ignore */ }
    try { initScrollFadeIn(); } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
