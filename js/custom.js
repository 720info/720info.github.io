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

  // ===== 4. 图片加载失败全局兜底回退（<img>失败→SVG占位，Banner背景图失败→紫蓝渐变） =====
  function initImageFallback() {
    var svgPlaceholder = function (w, h, text) {
      w = w || 320; h = h || 240; text = text || '图片加载失败';
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/>' +
        '</linearGradient></defs>' +
        '<rect fill="url(#g)" width="100%" height="100%"/>' +
        '<rect fill="rgba(255,255,255,0.1)" x="8" y="8" width="' + (w - 16) + '" height="' + (h - 16) + '" rx="10"/>' +
        '<text x="50%" y="50%" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,\\"PingFang SC\\",sans-serif" ' +
        'font-size="16" font-weight="600" text-anchor="middle" dominant-baseline="middle">' + text + '</text>' +
        '</svg>';
      return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    };

    // 4.1 <img> 标签：全局捕获 error（事件委托 + capture，兼容懒加载等各种情况）
    window.addEventListener('error', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'IMG') return;
      if (t.__fallbackDone) return;
      t.__fallbackDone = true;
      var w = t.getAttribute('width') || t.offsetWidth || 320;
      var h = t.getAttribute('height') || t.offsetHeight || 240;
      // 不污染原 DOM 的尺寸
      t.removeAttribute('srcset');
      t.removeAttribute('src');
      t.setAttribute('src', svgPlaceholder(w, h, '图片加载失败'));
      t.style.objectFit = 'cover';
    }, true);

    // 4.2 Banner 背景图兜底（Fluid 用内联 style 的 background-image，<img> error 捕获不到）
    function fallbackBanner() {
      var banner = document.getElementById('banner');
      if (!banner) return;
      var style = banner.currentStyle ? banner.currentStyle : window.getComputedStyle(banner, null);
      var bg = style.backgroundImage || banner.style.backgroundImage || '';
      var m = /url\(['"]?([^'")]+)['"]?\)/.exec(bg);
      if (!m || !m[1] || /^data:/.test(m[1])) return;
      var src = m[1];
      var tester = new Image();
      tester.onerror = function () {
        // 失败 → 换成紫蓝渐变（跟主题配色一致）
        banner.style.backgroundImage =
          'linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%) !important';
        banner.style.backgroundImage =
          'linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%)';
        banner.style.backgroundColor = '#6366f1';
        banner.style.backgroundSize = 'cover';
        banner.style.backgroundPosition = 'center';
      };
      tester.src = src;
    }

    // 页面加载完 + 延迟一小会（等 Fluid 动态注入 Banner 样式后）再检查
    if (document.readyState === 'complete') {
      setTimeout(fallbackBanner, 300);
    } else {
      window.addEventListener('load', function () {
        setTimeout(fallbackBanner, 300);
      }, { once: true });
    }
    // SPA 切路由时也检查一次
    setTimeout(fallbackBanner, 1200);
  }

  // ===== 启动 =====
  function boot() {
    try { initReadingProgress(); } catch (e) { /* ignore */ }
    try { initClickRipple(); } catch (e) { /* ignore */ }
    try { initLinkDelayedNavigation(); } catch (e) { /* ignore */ }
    try { initScrollFadeIn(); } catch (e) { /* ignore */ }
    try { initImageFallback(); } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
