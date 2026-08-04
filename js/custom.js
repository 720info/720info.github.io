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

  // ===== 5. VIP 会员系统（localStorage） =====
  var VIP_STORAGE_KEY = '720tech_vip_status';
  function getVipStatus() {
    try {
      var raw = localStorage.getItem(VIP_STORAGE_KEY);
      if (!raw) return { level: 'free', code: '', activatedAt: null };
      var obj = JSON.parse(raw);
      return obj && obj.level ? obj : { level: 'free', code: '', activatedAt: null };
    } catch (e) {
      return { level: 'free', code: '', activatedAt: null };
    }
  }
  function hasVipLevel(required) {
    var st = getVipStatus();
    if (st.level === 'premium') return true;
    if (required === 'premium') return false;
    if (st.level === 'pro' && required === 'pro') return true;
    if (required === 'free') return true;
    return false;
  }

  // 找出锁定区域内的所有标题 ID（TOC 靠这些 ID 建立链接）
  function _getLockedHeadingIds() {
    var ids = new Set();
    var all = document.querySelectorAll('.vip-lock-wrap');
    all.forEach(function (wrap) {
      if (wrap.classList.contains('is-unlocked')) return;
      var headings = wrap.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(function (h) {
        if (h.id) ids.add(h.id);
      });
    });
    return ids;
  }

  // 把 TOC 里指向已锁定标题的条目隐藏
  function syncVipToc() {
    var toc = document.getElementById('toc');
    if (!toc) return;
    var ids = _getLockedHeadingIds();
    var tocLinks = toc.querySelectorAll('a[href^="#"]');
    tocLinks.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      var li = a.closest('li') || a;
      if (ids.has(href.substring(1))) li.style.display = 'none';
      else li.style.display = '';
    });
  }

  function initVipContentLocks() {
    var wraps = document.querySelectorAll('.vip-lock-wrap');
    if (!wraps.length) return;
    function applyAll() {
      wraps.forEach(function (wrap) {
        var req = (wrap.getAttribute('data-vip-level') || 'pro').toLowerCase();
        if (hasVipLevel(req)) {
          wrap.classList.add('is-unlocked');
        } else {
          wrap.classList.remove('is-unlocked');
        }
      });
      syncVipToc();
    }
    applyAll();
    window.addEventListener('vipStatusChanged', applyAll);
    window.addEventListener('storage', function (e) {
      if (e.key === VIP_STORAGE_KEY) applyAll();
    });
    // 兜底：TOC 可能由主题异步渲染，1.5s 后再同步一次
    setTimeout(syncVipToc, 1500);
  }
  function initVipBadges() {
    var st = getVipStatus();
    if (st.level === 'free') return;
    var badges = document.querySelectorAll('.vip-post-badge');
    badges.forEach(function (b) {
      var need = (b.getAttribute('data-vip-level') || 'pro').toLowerCase();
      if (hasVipLevel(need)) {
        b.textContent = '已解锁';
        b.style.opacity = '0.75';
      }
    });
  }

  // ===== 5.1 VIP 评论专属标识 =====
  // 在评论区容器上方显示一个 VIP 徽章（仅页面有评论时生效）
  function initVipCommentBadge() {
    var st = getVipStatus();
    if (st.level === 'free') return;
    var containers = document.querySelectorAll('.site-comments, #comments, .comments');
    if (!containers.length) return;
    var name = st.level === 'premium' ? '尊享版' : '专业版';
    containers.forEach(function (c) {
      if (c.querySelector('.vip-comment-badge')) return;
      var badge = document.createElement('div');
      badge.className = 'vip-comment-badge';
      badge.innerHTML = '<span class="vip-cb-icon">👑</span>' +
        '<span class="vip-cb-text">' + name + ' 会员专属标识</span>';
      c.insertBefore(badge, c.firstChild);
    });
  }

  // ===== 5.2 文章一键导出为 HTML =====
  // 在文章页正文顶部加一个「导出为 HTML」按钮，前端把正文打包成单文件下载
  function initVipExportArticle() {
    // 需要是文章页（有 .post-content 或 .markdown-body）
    var content = document.querySelector('.post-content, .markdown-body, article');
    if (!content) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vip-export-btn';
    btn.innerHTML = '⬇️ 导出本文为 HTML';
    btn.title = '把当前文章内容保存为独立的 HTML 文件（纯前端，不上传）';
    btn.addEventListener('click', function () {
      exportArticleAsHtml(content);
    });
    // 插到正文开头
    var wrap = content.parentElement;
    if (wrap) {
      wrap.insertBefore(btn, wrap.firstChild);
    } else {
      content.insertBefore(btn, content.firstChild);
    }
  }

  function exportArticleAsHtml(contentEl) {
    try {
      // 取文章标题
      var title = document.querySelector('.post-title, h1') ? document.querySelector('.post-title, h1').textContent.trim() : '文章';
      // 克隆正文，去掉交互按钮/脚本，内联样式由主题 CSS 提供不了，这里用基本排版样式
      var clone = contentEl.cloneNode(true);
      // 移除正文里可能藏着的脚本/iframe（评论等）
      clone.querySelectorAll('script, iframe, .vip-export-btn, .post-tags, .post-copyright').forEach(function (n) { n.remove(); });
      var bodyText = clone.innerHTML;
      var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>' + title + '</title>' +
        '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;' +
        'line-height:1.8;color:#1f2937;max-width:820px;margin:0 auto;padding:40px 24px;}' +
        'img{max-width:100%;height:auto;border-radius:8px;}pre{background:#f1f5f9;padding:14px;border-radius:8px;overflow:auto;}' +
        'code{background:#f1f5f9;padding:2px 6px;border-radius:4px;}h1,h2,h3,h4{line-height:1.4;}' +
        'blockquote{border-left:4px solid #6366f1;padding-left:14px;color:#64748b;margin-left:0;}' +
        'table{border-collapse:collapse;width:100%;}th,td{border:1px solid #e2e8f0;padding:8px 12px;}' +
        '</style></head><body><h1>' + title + '</h1>' + bodyText + '</body></html>';
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = title.replace(/[\\/:*?"<>|]/g, '_') + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {
      alert('导出失败：' + e.message);
    }
  }

  // ===== 5.3 全部相册解锁（VIP 用户可查看 VIP 相册） =====
  // 相册卡片带 data-vip="true" 时，非 VIP 用户点击会被拦截并提示；VIP 用户正常进入
  function initVipAlbumUnlock() {
    var cards = document.querySelectorAll('.alb-card[data-vip="true"]');
    if (!cards.length) return;
    var st = getVipStatus();
    var isVip = st.level !== 'free';
    function apply() {
      var st2 = getVipStatus();
      var isVip2 = st2.level !== 'free';
      cards.forEach(function (card) {
        if (isVip2) {
          card.classList.remove('alb-locked');
        } else {
          card.classList.add('alb-locked');
        }
      });
    }
    apply();
    // 拦截点击（非 VIP）
    cards.forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (getVipStatus().level === 'free') {
          e.preventDefault();
          e.stopPropagation();
          alert('🔒 该相册为 VIP 专属，激活专业版/尊享版即可查看全部相册。\n\n点击 /vip 即可激活。');
        }
      }, true);
    });
    window.addEventListener('vipStatusChanged', apply);
    window.addEventListener('storage', function (e) {
      if (e.key === VIP_STORAGE_KEY) apply();
    });
  }

  // ===== 5.4 访客感谢名单展示 =====
  // 在 VIP 页面（或含 .vip-thanks 的容器）展示感谢名单
  function initVipThanksList() {
    var container = document.querySelector('.vip-thanks');
    if (!container) return;
    var names = ['测试用户', '开放中'];
    var st = getVipStatus();
    var level = st.level;
    var html = '<div class="vip-thanks-inner">';
    html += '<div class="vip-thanks-title">💖 感谢每一位支持者</div>';
    html += '<div class="vip-thanks-sub">VIP 会员让这个博客能继续下去，你们的支持是我最大的动力。</div>';
    html += '<div class="vip-thanks-list">';
    names.forEach(function (n) {
      html += '<span class="vip-thanks-item">' + n + '</span>';
    });
    html += '</div>';
    html += '<div class="vip-thanks-note">（名单会持续更新，激活后你的名字也可能出现在这里）</div>';
    html += '</div>';
    container.innerHTML = html;
  }

  // ===== 启动 =====
  function boot() {
    try { initReadingProgress(); } catch (e) { /* ignore */ }
    try { initClickRipple(); } catch (e) { /* ignore */ }
    try { initMouseTrail(); } catch (e) { /* ignore */ }
    try { initLinkDelayedNavigation(); } catch (e) { /* ignore */ }
    try { initScrollFadeIn(); } catch (e) { /* ignore */ }
    try { initImageFallback(); } catch (e) { /* ignore */ }
    try { initVipContentLocks(); } catch (e) { /* ignore */ }
    try { initVipBadges(); } catch (e) { /* ignore */ }
    try { initVipCommentBadge(); } catch (e) { /* ignore */ }
    try { initVipExportArticle(); } catch (e) { /* ignore */ }
    try { initVipAlbumUnlock(); } catch (e) { /* ignore */ }
    try { initVipThanksList(); } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
