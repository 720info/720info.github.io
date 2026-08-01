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

    document.addEventListener('mousedown', function (e) {
      // 左键/中键/右键都触发（只要按下就有特效——解决超链接一点就跳转看不到特效的问题）
      createRipple(e.clientX, e.clientY);
    }, { passive: true });
  }

  // ===== 2.1 超链接跳转延时：让涟漪有时间扩散到一半再跳走 =====
  function initLinkDelayedNavigation() {
    var NAV_DELAY = 200;   // 跳转前等多少 ms（让涟漪扩散一下）
    var navigating = false;

    document.addEventListener('click', function (e) {
      if (navigating) return;

      // 找到被点击的 a 标签（用户可能点到 a 里面的 span/img 等子元素）
      var a = e.target.closest && e.target.closest('a');
      if (!a || !a.href) return;

      var href = a.getAttribute('href') || '';

      // 跳过这些情况（不延时，保持原样）：
      //  - target=_blank / rel=external（开新窗口，本页不会跳）
      //  - 下载链接 / 打电话 / 发邮件
      //  - 锚点（#开头 / javascript: / mailto: / tel:）
      //  - 按住 Cmd / Ctrl / Shift / Alt / 中键（用户想要新标签/新窗口）
      if (a.target === '_blank') return;
      if (a.hasAttribute('download')) return;
      if (a.hasAttribute('rel') && /\bexternal\b/i.test(a.getAttribute('rel'))) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (!href || /^\s*(#|javascript:|mailto:|tel:|data:|blob:)/i.test(href)) return;

      // 解析链接，判断是不是同源——只对同源链接加延时
      try {
        var url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return;
      } catch (err) {
        return;
      }

      // 拦截，延时后再跳
      e.preventDefault();
      navigating = true;
      var dest = a.href;
      setTimeout(function () {
        location.href = dest;
      }, NAV_DELAY);
    }, false);
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
    try { initLinkDelayedNavigation(); } catch (e) { /* ignore */ }
    try { initScrollFadeIn(); } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
