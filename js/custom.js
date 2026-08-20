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

  // ===== 2.2 鼠标滑动光晕与短尾迹（仅精确指针设备） =====
  function initMouseTrail() {
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var glow = document.createElement('div');
    glow.className = 'mouse-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var x = -100;
    var y = -100;
    var lastX = x;
    var lastY = y;
    var framePending = false;
    var lastParticleAt = 0;
    var glowIdleTimer = 0;

    function hideGlow() {
      glow.classList.remove('is-active');
    }

    function scheduleGlowFade() {
      window.clearTimeout(glowIdleTimer);
      glowIdleTimer = window.setTimeout(hideGlow, 90);
    }

    function render() {
      glow.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0)';
      framePending = false;
    }

    function onMove(event) {
      x = event.clientX;
      y = event.clientY;
      glow.classList.add('is-active');
      scheduleGlowFade();
      if (!framePending) {
        framePending = true;
        window.requestAnimationFrame(render);
      }

      var now = Date.now();
      var distance = Math.hypot(x - lastX, y - lastY);
      if (distance < 8 || now - lastParticleAt < 18) return;
      lastX = x;
      lastY = y;
      lastParticleAt = now;

      var particle = document.createElement('i');
      particle.className = 'mouse-trail-particle';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.setProperty('--trail-size', (5 + Math.random() * 7).toFixed(1) + 'px');
      document.body.appendChild(particle);
      particle.addEventListener('animationend', function () {
        particle.remove();
      }, { once: true });
    }

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerenter', function () {
      glow.classList.add('is-active');
    }, { passive: true });
    document.addEventListener('pointerleave', function () {
      hideGlow();
    }, { passive: true });
    // Utterances 使用跨域 iframe，鼠标进入后父页面收不到 pointermove；先隐藏光晕，避免停在评论区边缘。
    document.addEventListener('pointerover', function (event) {
      var target = event.target;
      if (target && target.closest && target.closest('#comments, .site-comments')) {
        hideGlow();
      }
    }, true);
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
  // 注意：绝不能让内容停留在 opacity:0。这里用很宽松的阈值 + 兜底定时器，
  // 无论观察器是否触发，都会保证目标最终显示，避免「文章/导出按钮透明白屏」。
  function initScrollFadeIn() {
    if (!('IntersectionObserver' in window)) return;

    var targets = Array.prototype.slice.call(document.querySelectorAll(
      '.index-card, .post-card, article, .board, #toc, .banner, .about-avatar-wrap, .archive-article'
    ));
    if (!targets.length) return;

    targets.forEach(function (el) { el.classList.add('scroll-fade-in'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !entry.target.classList.contains('is-visible')) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -30px 0px',
      threshold: 0.01
    });
    targets.forEach(function (el) { io.observe(el); });

    // 兜底：无论何种原因（目标在视口外、阈值苛刻、观察器异常），
    // 1.5 秒后强制显示所有仍隐藏的目标，彻底杜绝白屏。
    setTimeout(function () {
      targets.forEach(function (el) {
        if (!el.classList.contains('is-visible')) {
          el.classList.add('is-visible');
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
    }, 1500);
  }

  // ===== 4. 图片加载失败全局兜底回退（优先回本地/img/xxx，最后才用SVG占位） =====
  function initImageFallback() {
    // 远端图床 URL → 本地同源 URL 的映射表（图床挂了立刻切回本地，用户无感知）
    var CDN_FALLBACK_MAP = {
      'https://s41.ax1x.com/2026/08/01/pm4GkWt.jpg': '/img/default.jpg',
      'https://s41.ax1x.com/2026/08/01/pm4GiFA.png': '/img/avatar.png'
    };
    // 按域名兜底：任何 ax1x.com 的图片如果文件名命中已知就切本地
    function guessLocalFallback(src) {
      if (CDN_FALLBACK_MAP[src]) return CDN_FALLBACK_MAP[src];
      if (!/\.ax1x\.com\//i.test(src)) return null;
      var m = /\/([^\/]+\.(?:jpg|jpeg|png|gif|webp|bmp))(?:[\?#]|$)/i.exec(src);
      if (!m) return null;
      var name = m[1].toLowerCase();
      if (/pm4gkwt/.test(name)) return '/img/default.jpg';
      if (/pm4gif/.test(name)) return '/img/avatar.png';
      if (name === 'wechat.jpg') return '/img/Wechat.jpg';
      if (name === 'fluid.png') return '/img/fluid.png';
      if (name === 'loading.gif') return '/img/loading.gif';
      if (name === 'police_beian.png') return '/img/police_beian.png';
      return null;
    }
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

    // 4.1 <img> 标签：两级兜底 —— 先切本地 /img/xxx，再切 SVG 占位
    window.addEventListener('error', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'IMG') return;
      if (t.__fallbackDone) return;
      var curSrc = t.src || t.getAttribute('src') || '';
      // Level 1: 如果图床挂了，先试同名本地文件
      var local = guessLocalFallback(curSrc);
      if (local && !t.__localTried) {
        t.__localTried = true;
        t.removeAttribute('srcset');
        t.setAttribute('src', local);
        return; // 等 onerror 再次触发（如果本地也挂）再走下一级
      }
      // Level 2: 本地也挂 → SVG 渐变占位
      t.__fallbackDone = true;
      var w = t.getAttribute('width') || t.offsetWidth || 320;
      var h = t.getAttribute('height') || t.offsetHeight || 240;
      t.removeAttribute('srcset');
      t.setAttribute('src', svgPlaceholder(w, h, '图片加载失败'));
      t.style.objectFit = 'cover';
    }, true);

    // 4.2 Banner 背景图兜底（Fluid 用内联 style 的 background-image，<img> error 捕获不到）
    function fallbackBanner() {
      var banner = document.getElementById('banner');
      if (!banner || banner.__bannerFallbackDone) return;
      var style = banner.currentStyle ? banner.currentStyle : window.getComputedStyle(banner, null);
      var bg = style.backgroundImage || banner.style.backgroundImage || '';
      var m = /url\(['"]?([^'")]+)['"]?\)/.exec(bg);
      if (!m || !m[1] || /^data:/.test(m[1])) return;
      var src = m[1];
      var tester = new Image();
      tester.onerror = function () {
        // Level 1: 试本地 default.jpg
        var local = guessLocalFallback(src) || '/img/default.jpg';
        var localTester = new Image();
        localTester.onload = function () {
          banner.style.backgroundImage = 'url("' + local + '")';
          banner.style.backgroundSize = 'cover';
          banner.style.backgroundPosition = 'center';
          banner.__bannerFallbackDone = true;
        };
        localTester.onerror = function () {
          // Level 2: 本地也失败 → 紫蓝渐变
          banner.style.backgroundImage =
            'linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%)';
          banner.style.backgroundColor = '#6366f1';
          banner.style.backgroundSize = 'cover';
          banner.style.backgroundPosition = 'center';
          banner.__bannerFallbackDone = true;
        };
        localTester.src = local;
      };
      tester.src = src;
    }

    // 4.3 主动预热：页面初始化立刻预加载最关键的 Banner 图（提前失败提前切，用户看不见空白）
    var keyBanner = 'https://s41.ax1x.com/2026/08/01/pm4GkWt.jpg';
    var warm = new Image();
    warm.onerror = function () {
      // 主动预热失败 → 立刻启动 Banner 兜底，不等 load 事件
      fallbackBanner();
    };
    warm.src = keyBanner;

    if (document.readyState === 'complete') {
      setTimeout(fallbackBanner, 300);
    } else {
      window.addEventListener('load', function () {
        setTimeout(fallbackBanner, 300);
      }, { once: true });
    }
    setTimeout(fallbackBanner, 1200);
  }

  // ===== 启动 =====
  function boot() {
    try { initReadingProgress(); } catch (e) { /* ignore */ }
    try { initClickRipple(); } catch (e) { /* ignore */ }
    try { initMouseTrail(); } catch (e) { /* ignore */ }
    try { initLinkDelayedNavigation(); } catch (e) { /* ignore */ }
    try { initScrollFadeIn(); } catch (e) { /* ignore */ }
    try { initImageFallback(); } catch (e) { /* ignore */ }
    try { fixBeianLink(); } catch (e) { /* ignore */ }
    try { injectFooterIcons(); } catch (e) { /* ignore */ }
  }

  // 页脚备案处理：
  //   1) 把 Fluid 默认生成的工信部链接替换为「萌果备案 (萌ICP备20260117号)」
  //   2) 在同一行追加第二个备案：「假ICP备1202622号 → fakeicp.top 查询页」
  function fixBeianLink() {
    var MOE_URL = 'https://icp.gov.moe/?keyword=20260117';
    var FAKE_URL = 'https://fakeicp.top/query.html?number=1202622';
    var FAKE_LABEL = '假ICP备1202622号';

    var link = document.querySelector('#footer .beian-icp a, #footer .beian a, #footer a[href*="beian.miit.gov.cn"]');
    var container = document.querySelector('#footer .beian-icp, #footer .beian');
    if (link) {
      link.href = MOE_URL;
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer nofollow');
    } else if (container && container.textContent && container.textContent.indexOf('萌ICP备') !== -1) {
      var html = container.innerHTML;
      container.innerHTML = html.replace(
        /萌ICP备\d+号/,
        '<a href="' + MOE_URL + '" target="_blank" rel="noopener noreferrer nofollow">$&</a>'
      );
    }

    // 追加假ICP备案号（加在同一行末尾，不重复追加）
    if (container && container.innerHTML.indexOf(FAKE_LABEL) === -1) {
      var spacer = document.createTextNode('　|　');
      var fakeA = document.createElement('a');
      fakeA.href = FAKE_URL;
      fakeA.target = '_blank';
      fakeA.rel = 'noopener noreferrer nofollow';
      fakeA.textContent = FAKE_LABEL;
      // 样式跟旁边备案号保持一致
      fakeA.style.color = 'inherit';
      fakeA.style.textDecoration = 'none';
      container.appendChild(spacer);
      container.appendChild(fakeA);
    }
  }

  // 页脚末尾补 Sitemap 和 RSS 📡 图标（跟随 Fluid 暗色模式）
  function injectFooterIcons() {
    var target = document.querySelector('#footer .copyright, #footer .footer-content, #footer > .container > div:last-child, #footer');
    if (!target) return;
    var mount = (target.id === 'footer') ? target : target;
    var node = document.createElement('div');
    node.className = 'custom-footer-icons';
    node.style.cssText = 'margin-top:8px;font-size:0.8rem;color:#94a3b8;';
    node.innerHTML =
      '<a href="/sitemap.xml" target="_blank" rel="noopener noreferrer nofollow" style="color:#94a3b8;margin-right:14px;text-decoration:none;">🗺 Sitemap</a>' +
      '<a href="/atom.xml" target="_blank" rel="noopener noreferrer nofollow" style="color:#94a3b8;text-decoration:none;">📡 RSS 订阅</a>';
    mount.appendChild(node);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
