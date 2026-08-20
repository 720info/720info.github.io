/* =========================================================================
   720info 博客「美化增强包」JS 逻辑
   集中：社交分享 / 头图轮换 / 代码块顶栏 / Banner 粒子 / 看板娘 / 音乐
   所有模块独立 try/catch，单个失效不影响全局；某 CDN 资源挂了会自动隐藏对应装饰。
   回退：恢复 _beautify_backup/_config.fluid.yml.orig 并删除本文件 + beautify.css。
   ========================================================================= */
(function () {
  'use strict';

  /* ========== 0. 公共工具 ========== */
  // 动态注入 <script>
  function loadScript(src, onLoad, onErr) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = onLoad || (function () {});
    s.onerror = onErr || (function () {});
    document.head.appendChild(s);
  }
  // 动态注入 <link>
  function loadCss(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }
  // 判断是否文章内容页
  var POST_CONTENT = '.post-content, .page-body';
  function hasContent() {
    return !!document.querySelector(POST_CONTENT);
  }

  /* ========== 1. 文章底部社交分享栏 ========== */
  // 说明：网页端无法直接唤起微信/QQ 的原生分享面板。
  // 因此：能调用系统分享（navigator.share）时优先弹系统面板；微信走二维码+引导转发；QQ/微博走官方分享页。
  function initShareBar() {
    if (!hasContent()) return;
    var content = document.querySelector(POST_CONTENT);
    var share = document.createElement('div');
    share.className = 'b-share';
    var encUrl = encodeURIComponent(location.href);
    var encTitle = encodeURIComponent(document.title);
    // 仅支持系统分享的浏览器才显示「分享」按钮
    var sysBtn = (typeof navigator.share === 'function')
      ? '<button class="b-share__btn b-share__btn--sys" data-share="system">📤 系统分享</button>'
      : '';
    share.innerHTML =
      '<div class="b-share__title">💬 觉得有用？分享给更多人～</div>' +
      '<div class="b-share__btns">' +
      sysBtn +
      '  <button class="b-share__btn b-share__btn--wechat" data-share="wechat">📱 微信</button>' +
      '  <button class="b-share__btn b-share__btn--qzone" data-share="qzone">☁️ QQ空间</button>' +
      '  <button class="b-share__btn b-share__btn--weibo" data-share="weibo">🅝 微博</button>' +
      '  <button class="b-share__btn b-share__btn--copy" data-share="copy">🔗 复制链接</button>' +
      '</div>' +
      '<div class="b-share__hint">小提示：网页里没法直接唤起微信/QQ 分享面板，可用系统「分享」；微信请点「微信」扫码后转发。</div>';
    content.parentNode.insertBefore(share, content.nextSibling);

    // 微信二维码浮层（引导转发）
    var mask = document.createElement('div');
    mask.className = 'b-share__qrmask';
    mask.innerHTML =
      '<div class="b-share__qrbox">' +
      '<h4 class="b-share__qrtitle">用微信扫一扫</h4>' +
      '<img id="b-shareqr-img" alt="微信二维码" />' +
      '<p class="b-share__qrtips">扫码打开文章后，点右上角 <b>···</b><br/>再选择「发送给朋友 / 分享到朋友圈」</p>' +
      '<button class="b-share__qrclose">关 闭</button>' +
      '</div>';
    document.body.appendChild(mask);
    var qrImg = mask.querySelector('#b-shareqr-img');
    var okTip = null;

    function toast(msg) {
      if (okTip) okTip.remove();
      okTip = document.createElement('span');
      okTip.className = 'b-share__ok';
      okTip.textContent = msg;
      share.querySelector('.b-share__btns').appendChild(okTip);
      setTimeout(function () { okTip && okTip.remove(); }, 2000);
    }

    function copyText(text, done) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
      } else { legacyCopy(text, done); }
    }
    function legacyCopy(text, done) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;left:0;top:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        done();
      } catch (err) { /* ignore */ }
    }

    share.addEventListener('click', function (e) {
      var btn = e.target.closest('.b-share__btn');
      if (!btn) return;
      var type = btn.getAttribute('data-share');
      if (type === 'system') {
        if (navigator.share) {
          navigator.share({
            title: document.title,
            text: document.title,
            url: location.href
          }).catch(function () { /* 用户取消 */ });
        }
      } else if (type === 'wechat') {
        qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(location.href);
        mask.classList.add('is-open');
      } else if (type === 'qzone') {
        // 使用 https 官方接口，避免 http 被浏览器标记为不安全
        var w = window.open('https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=' + encUrl + '&title=' + encTitle + '&summary=' + encTitle);
        if (w) { w.opener = null; } else { copyText(location.href, function () { toast('弹窗被拦截，已复制链接'); }); }
      } else if (type === 'weibo') {
        var wb = window.open('https://service.weibo.com/share/share.php?url=' + encUrl + '&title=' + encTitle);
        if (wb) { wb.opener = null; } else { copyText(location.href, function () { toast('弹窗被拦截，已复制链接'); }); }
      } else if (type === 'copy') {
        copyText(location.href, function () { toast('✅ 链接已复制'); });
      }
    });
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.closest('.b-share__qrclose')) {
        mask.classList.remove('is-open');
      }
    });
  }

  /* ========== 2.（已移除）Banner 头图轮换：按你要求保留原定头图，不做随机替换 ========== */

  /* ========== 3. 代码块顶栏：macOS 三色点 + 语言徽章（仅限代码块，不打到纯文本段落上） ========== */
  function initCodeMac() {
    var pres = document.querySelectorAll(POST_CONTENT + ' pre');
    if (!pres.length) return;
    Array.prototype.forEach.call(pres, function (pre) {
      if (pre.querySelector('.code-mac')) return;
      var code = pre.querySelector('code');
      // 仅在真正的代码块（带明确语言类的 code）上显示顶栏；
      // 防止把正文第一个普通段落/未加语言标识的文字误装饰成 "TEXT 语言徽章 + 红点"。
      var lang = '';
      if (code) {
        var m = /lang-(x-|)([a-zA-Z0-9+#_-]+)/.exec(code.className || '');
        lang = m ? m[2] : '';
      }
      if (!lang) return;
      var mac = document.createElement('div');
      mac.className = 'code-mac';
      mac.innerHTML = '<span class="code-lang">' + lang + '</span>';
      pre.insertBefore(mac, pre.firstChild);
    });
  }

  /* ========== 4. Banner 粒子背景（tsParticles） ========== */
  function initParticles() {
    var banner = document.getElementById('banner');
    if (!banner) return;
    var wrap = document.createElement('div');
    wrap.className = 'banner-particles';
    wrap.id = 'banner-particles';
    banner.appendChild(wrap);
    loadScript('https://cdn.jsdelivr.net/npm/tsparticles@2.12.0/tsparticles.min.js', function () {
      if (!window.tsParticles) return;
      window.tsParticles.load('banner-particles', {
        fpsLimit: 60,
        particles: {
          number: { value: 55, density: { enable: true, area: 900 } },
          color: { value: '#8b9bff' },
          opacity: { value: 0.5, anim: { enable: true, speed: 1, opacity_min: 0.1 } },
          size: { value: 2.2, random: true },
          links: { enable: true, distance: 130, color: '#818cf8', opacity: 0.35, width: 1 },
          move: { enable: true, speed: 1, out_mode: 'out' }
        },
        interactivity: {
          events: { onhover: { enable: true, mode: 'grab' }, resize: true },
          modes: { grab: { distance: 140, line_linked: { opacity: 0.4 } } }
        },
        retina_detect: true
      });
    });
  }

  /* ========== 5. 看板娘（L2Dwidget：双击看板娘进入独立设置页） ========== */
  // 模型均来自 jsDelivr CDN 官方包，纯本地控制无外部跳转。
  // 每个模型配置了独立基准缩放（baseScale），滑杆=1 时保证各娘视觉尺寸相近；
  // 实际 canvas 缩放 = baseScale × 用户滑杆值。
  var B_L2D_KEY = 'b-l2d-model';
  var L2D_MODELS = {
    shizuku:  { name: '小紫衣',          path: 'https://cdn.jsdelivr.net/npm/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json',                   baseScale: 1.0,  baseW: 150, baseH: 235 },
    '22':      { name: 'B站22娘',         path: 'https://cdn.jsdelivr.net/gh/52cik/bilibili-haruna@master/assets/haruna/22/model.2017.tomo-bukatsu.low.json', baseScale: 0.72, baseW: 170, baseH: 250 },
    hijiki:   { name: '黑猫娘',          path: 'https://cdn.jsdelivr.net/npm/live2d-widget-model-hijiki@1.0.5/assets/hijiki.model.json',                     baseScale: 1.12, baseW: 150, baseH: 235 },
    tororo:   { name: '白猫娘',          path: 'https://cdn.jsdelivr.net/npm/live2d-widget-model-tororo@1.0.5/assets/tororo.model.json',                     baseScale: 1.12, baseW: 150, baseH: 235 },
    z16:      { name: '御姐 z16',        path: 'https://cdn.jsdelivr.net/npm/live2d-widget-model-z16@1.0.5/assets/z16.model.json',                         baseScale: 1.2,  baseW: 150, baseH: 235 },
    epsilon2: { name: 'Epsilon 礼服娘',  path: 'https://cdn.jsdelivr.net/npm/live2d-widget-model-epsilon2_1@1.0.5/assets/Epsilon2.1.model.json',           baseScale: 0.86, baseW: 150, baseH: 235 }
  };

  // 一次性搭建容器 + 独立设置页（先隐藏，双击看板娘时打开）
  function buildL2dShell() {
    var wrap = document.createElement('div');
    wrap.id = 'b-l2d';
    document.body.appendChild(wrap);
    var ms = document.createElement('div');
    ms.id = 'b-l2d-settings';
    ms.className = 'b-l2d-modal';
    var picks = '';
    Object.keys(L2D_MODELS).forEach(function (k) {
      picks += '<label class="b-l2d-modal__pick"><input type="radio" name="b-l2d-model" value="' + k + '"> ' + L2D_MODELS[k].name + '</label>';
    });
    ms.innerHTML =
      '<div class="b-l2d-modal__card">' +
      '<button class="b-l2d-modal__close" title="返回">×</button>' +
      '<h3 class="b-l2d-modal__title">看板娘设置</h3>' +
      '<div class="b-l2d-modal__group"><div class="b-l2d-modal__label">换装</div>' + picks + '</div>' +
      '<div class="b-l2d-modal__group"><div class="b-l2d-modal__label">大小</div>' +
      '<input class="b-l2d-modal__range" type="range" min="0.5" max="2.5" step="0.05" value="1"></div>' +
      '<div class="b-l2d-modal__actions">' +
      '<button class="b-l2d-modal__hide">隐藏看板娘</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(ms);
  }

  function initLive2d() {
    if (!document.getElementById('b-l2d')) buildL2dShell();
    var modelKey = localStorage.getItem(B_L2D_KEY) || 'shizuku';
    if (!L2D_MODELS[modelKey]) modelKey = 'shizuku';
    bootL2d(modelKey);
    // 兜底：如果选定模型在 6s 内仍没产出 canvas（资源挂了/被跨域拦），自动回退默认娘
    setTimeout(function () {
      if (modelKey !== 'shizuku' && !document.getElementById('live2dcanvas')) {
        localStorage.setItem(B_L2D_KEY, 'shizuku');
        bootL2d('shizuku');
      }
    }, 6000);
  }

  function bootL2d(modelKey) {
    var cfg = L2D_MODELS[modelKey];
    loadScript('https://cdn.jsdelivr.net/npm/live2d-widget@3.1.4/lib/L2Dwidget.min.js', function () {
      var L2Dwidget = window.L2Dwidget;
      if (!L2Dwidget) return;
      // 注意这里的 model.scale 是 Live2D 库内部缩放，只对每个模型自己的基准做微调；
      // 真正跨模型统一尺寸的是画布外层：baseScale × 滑杆
      L2Dwidget.init({
        model: { jsonPath: cfg.path, scale: 1 },
        display: { superSample: 2, position: 'custom', width: cfg.baseW, height: cfg.baseH },
        mobile: { show: false },
        react: { opacityDefault: 0.75, opacityOnHover: 1 },
        dialog: { enable: false }
      });
      wireL2dControls(cfg);
    }, function () { /* 库加载失败，不显示 */ });
  }

  // 等 canvas 生成后：移入容器 + 绑定「双击看板娘打开设置页」等交互
  function wireL2dControls(cfg) {
    var tries = 0;
    var timer = setInterval(function () {
      var canvas = document.getElementById('live2dcanvas');
      if (!canvas) {
        if (++tries > 60) { clearInterval(timer); return; }
        return;
      }
      clearInterval(timer);
      var ctl = document.getElementById('b-l2d');
      var ms = document.getElementById('b-l2d-settings');
      if (!ctl || ctl.getAttribute('data-ready') === '1') return;
      ctl.setAttribute('data-ready', '1');
      ctl.appendChild(canvas);

      // 双击看板娘 → 打开独立设置页，同步当前娘与滑杆
      canvas.addEventListener('dblclick', function () {
        ms.classList.add('is-open');
        var cur = localStorage.getItem(B_L2D_KEY) || 'shizuku';
        Array.prototype.forEach.call(ms.querySelectorAll('input[name="b-l2d-model"]'), function (r) {
          r.checked = (r.value === cur);
        });
        ms.querySelector('.b-l2d-modal__range').value = parseFloat(localStorage.getItem('b-l2d-zoom') || '1').toFixed(2);
      });

      // 关闭设置页：× 或遮罩
      ms.querySelector('.b-l2d-modal__close').addEventListener('click', closeSettings);
      ms.addEventListener('click', function (e) { if (e.target === ms) closeSettings(); });
      function closeSettings() { ms.classList.remove('is-open'); }

      // 换装：选中即保存并刷新（Live2D 单实例，刷新最稳）
      Array.prototype.forEach.call(ms.querySelectorAll('input[name="b-l2d-model"]'), function (r) {
        r.addEventListener('change', function () {
          localStorage.setItem(B_L2D_KEY, r.value);
          location.reload();
        });
      });

      // 大小：滑杆实时缩放并记住
      // 这里的关键：最终 scale = 模型基准 cfg.baseScale × 用户滑杆值
      // 这样滑杆在 1 时所有娘视觉大小接近，滑杆再放大缩小都按比例
      var rng = ms.querySelector('.b-l2d-modal__range');
      applyZoom(parseFloat(localStorage.getItem('b-l2d-zoom') || '1'));
      rng.addEventListener('input', function () { applyZoom(parseFloat(rng.value)); });
      function applyZoom(z) {
        z = Math.max(0.5, Math.min(2.5, z));
        canvas.style.transform = 'scale(' + (cfg.baseScale * z) + ')';
        localStorage.setItem('b-l2d-zoom', String(z));
      }

      // 隐藏看板娘
      ms.querySelector('.b-l2d-modal__hide').addEventListener('click', function () {
        ctl.style.display = 'none';
        closeSettings();
      });

      // 拖动：按住看板娘整体移动容器
      var startX = 0, startY = 0, originX = 0, originY = 0, dragging = false;
      canvas.addEventListener('mousedown', function (e) {
        e.preventDefault();
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        var r = ctl.getBoundingClientRect();
        originX = r.left; originY = r.top;
        ctl.style.left = originX + 'px';
        ctl.style.top = originY + 'px';
        ctl.style.bottom = 'auto';
        ctl.style.right = 'auto';
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        ctl.style.left = (originX + e.clientX - startX) + 'px';
        ctl.style.top = (originY + e.clientY - startY) + 'px';
      });
      document.addEventListener('mouseup', function () { dragging = false; });
    }, 200);
  }

  /* ========== 6. 音乐播放器（右下角，仅当音频资源可用才展示） ========== */
  function initMusic() {
    // 使用一个网易云公开解析接口拿音频直链；失败则整块隐藏，保证不影响其它
    var META_URL = 'https://api.injahow.cn/meting/?type=url&server=netease&id=3402612&auth=3cd6105f4b26e3ae';
    var snd = new Audio();
    snd.preload = 'none';
    snd.onloadedmetadata = function () {
      // 音频可访问才注入 UI
      var box = document.createElement('div');
      box.className = 'b-music';
      box.innerHTML =
        '<div class="b-music__panel"><div id="aplayer-music"></div></div>' +
        '<button class="b-music__toggle" aria-label="音乐">🎵</button>';
      document.body.appendChild(box);
      loadCss('https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css');
      loadScript('https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js', function () {
        if (!window.APlayer) return;
        var player = new window.APlayer({
          container: document.getElementById('aplayer-music'),
          mini: false,
          audio: [{ name: '分享一首歌', artist: '720 · BGM', url: META_URL, cover: '' }]
        });
      });
      box.querySelector('.b-music__toggle').addEventListener('click', function () {
        box.classList.toggle('is-open');
      });
    };
    snd.onerror = function () { /* 资源不可用，不展示播放器 */ };
    snd.src = META_URL;
  }

  /* ========== 启动 ========== */
  function boot() {
    try { initShareBar(); } catch (e) { /* ignore */ }
    try { initCodeMac(); } catch (e) { /* ignore */ }
    try { initParticles(); } catch (e) { /* ignore */ }
    try { initLive2d(); } catch (e) { /* ignore */ }
    try { initMusic(); } catch (e) { /* ignore */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();