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
  function initShareBar() {
    if (!hasContent()) return;
    var content = document.querySelector(POST_CONTENT);
    var share = document.createElement('div');
    share.className = 'b-share';
    var url = encodeURIComponent(location.href);
    var title = encodeURIComponent(document.title);
    share.innerHTML =
      '<div class="b-share__title">💬 觉得有用？分享给更多人～</div>' +
      '<div class="b-share__btns">' +
      '  <button class="b-share__btn b-share__btn--wechat" data-share="wechat">💬 微信</button>' +
      '  <button class="b-share__btn b-share__btn--qzone" data-share="qzone">☁️ QQ空间</button>' +
      '  <button class="b-share__btn b-share__btn--weibo" data-share="weibo">🅝 微博</button>' +
      '  <button class="b-share__btn b-share__btn--copy" data-share="copy">🔗 复制链接</button>' +
      '</div>';
    content.parentNode.insertBefore(share, content.nextSibling);

    // 微信二维码弹层
    var mask = document.createElement('div');
    mask.className = 'b-share__qrmask';
    mask.innerHTML =
      '<div class="b-share__qrbox">' +
      '<img id="b-shareqr-img" alt="微信二维码" />' +
      '<p>打开微信「扫一扫」分享这篇文章</p>' +
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
      var box = share.querySelector('.b-share__btns');
      box.appendChild(okTip);
      setTimeout(function () { okTip && okTip.remove(); }, 1800);
    }

    share.addEventListener('click', function (e) {
      var btn = e.target.closest('.b-share__btn');
      if (!btn) return;
      var type = btn.getAttribute('data-share');
      var win = null;
      if (type === 'wechat') {
        qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + location.href;
        mask.classList.add('is-open');
      } else if (type === 'qzone') {
        win = window.open('http://connect.qq.com/widget/shareqq/index.html?url=' + url + '&title=' + title);
      } else if (type === 'weibo') {
        win = window.open('https://service.weibo.com/share/share.php?url=' + url + '&title=' + title);
      } else if (type === 'copy') {
        var done = function () { toast('✅ 链接已复制'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(location.href).then(done, function () { fallbackCopy(); });
        } else { fallbackCopy(); }
        function fallbackCopy() {
          try {
            var ta = document.createElement('textarea');
            ta.value = location.href;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            done();
          } catch (err) { /* ignore */ }
        }
      }
      if (win) { win.opener = null; }
    });
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.closest('.b-share__qrclose')) {
        mask.classList.remove('is-open');
      }
    });
  }

  /* ========== 2. 首页/Banner 头图轮换（随机外链，稳定图床） ========== */
  var BANNER_POOL = [
    'https://picsum.photos/seed/720info1/1920/900',
    'https://picsum.photos/seed/720info2/1920/900',
    'https://picsum.photos/seed/720info3/1920/900',
    'https://picsum.photos/seed/720info4/1920/900'
  ];
  function initBannerRotate() {
    var els = document.querySelectorAll('#banner, .header-inner');
    if (!els.length) return;
    var pick = BANNER_POOL[Math.floor(Math.random() * BANNER_POOL.length)];
    Array.prototype.forEach.call(els, function (el) {
      el.style.backgroundImage = 'url("' + pick + '")';
      if (!el.style.backgroundSize) el.style.backgroundSize = 'cover';
      if (!el.style.backgroundPosition) el.style.backgroundPosition = 'center center';
    });
  }

  /* ========== 3. 代码块顶栏：macOS 三色点 + 语言徽章 ========== */
  function initCodeMac() {
    var pres = document.querySelectorAll(POST_CONTENT + ' pre');
    if (!pres.length) return;
    Array.prototype.forEach.call(pres, function (pre) {
      if (pre.querySelector('.code-mac')) return;
      var code = pre.querySelector('code');
      var lang = '';
      if (code) {
        var m = /lang-(x-|)([a-zA-Z0-9+#_-]+)/.exec(code.className || '');
        lang = m ? m[2] : '';
      }
      var mac = document.createElement('div');
      mac.className = 'code-mac';
      mac.innerHTML = '<span class="code-lang">' + (lang ? lang : 'TEXT') + '</span>';
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

  /* ========== 5. 看板娘（右下角轻量小助手） ========== */
  var MASCOT_LINES = [
    'Hi~ 👋 我是 720 的小助手！',
    '有新的文章记得来看看哦～',
    '生活里的小事，也值得被记录 ✨',
    '点我一下，有小惊喜？',
    '愿你的日子也闪闪发光 🌟'
  ];
  function initMascot() {
    var box = document.createElement('div');
    box.className = 'b-mascot';
    box.innerHTML =
      '<div class="b-mascot__bubble"></div>' +
      '<div class="b-mascot__avatar">🤖</div>';
    document.body.appendChild(box);

    var bubble = box.querySelector('.b-mascot__bubble');
    var idx = 0;
    function say(text) { bubble.textContent = text; box.classList.add('is-bubble'); }
    var first = true;
    box.addEventListener('click', function () {
      idx = (idx + 1) % MASCOT_LINES.length;
      say(MASCOT_LINES[idx]);
      if (first) { first = false; }
      clearTimeout(box.__t);
      box.__t = setTimeout(function () { box.classList.remove('is-bubble'); }, 4000);
    });
    // 首屏 2 秒后自动打招呼一次
    setTimeout(function () {
      say(MASCOT_LINES[0]);
      setTimeout(function () { box.classList.remove('is-bubble'); }, 4000);
    }, 2000);
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
    try { initBannerRotate(); } catch (e) { /* ignore */ }
    try { initCodeMac(); } catch (e) { /* ignore */ }
    try { initParticles(); } catch (e) { /* ignore */ }
    try { initMascot(); } catch (e) { /* ignore */ }
    try { initMusic(); } catch (e) { /* ignore */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();