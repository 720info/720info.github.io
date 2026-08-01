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

  // ===== 2. 鼠标点击涟漪特效（明显版：更大、更亮、颜色饱和） =====
  function initClickRipple() {
    var colors = [
      'rgba(96, 165, 250, 0.75)',   // 蓝
      'rgba(129, 140, 248, 0.78)',  // 靛蓝
      'rgba(192, 132, 252, 0.78)',  // 紫
      'rgba(244, 114, 182, 0.75)',  // 粉
      'rgba(52, 211, 153, 0.75)',   // 绿
      'rgba(251, 191, 36, 0.75)',   // 金
      'rgba(248, 113, 113, 0.75)'   // 红
    ];
    var size = 260;   // 更大的涟漪尺寸（明显看得见）

    function createRipple(x, y) {
      var el = document.createElement('span');
      el.className = 'click-ripple';
      var color = colors[Math.floor(Math.random() * colors.length)];
      // 拆出颜色通道给内外渐变都用
      el.style.cssText =
        'left:' + (x - size / 2) + 'px;' +
        'top:' + (y - size / 2) + 'px;' +
        'width:' + size + 'px;' +
        'height:' + size + 'px;' +
        'background: radial-gradient(circle, ' + color + ' 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 72%);';
      document.body.appendChild(el);
      el.addEventListener('animationend', function () {
        el.parentNode && el.parentNode.removeChild(el);
      }, { once: true });
    }

    document.addEventListener('click', function (e) {
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
