(function () {
  'use strict';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  从隐藏 script 读完整提示词
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var sourceEl = document.getElementById('promptSource');
  var PROMPT = sourceEl ? sourceEl.textContent.trim() : '';

  var bodyEl     = document.getElementById('promptBody');
  var pillEl     = document.getElementById('charPill');
  var copyBtn    = document.getElementById('btnCopy');
  var dlBtn      = document.getElementById('btnDownload');
  var toastEl    = document.getElementById('toast');
  var cursorGlow = document.getElementById('cursorGlow');
  var progressEl = document.getElementById('progressFill');

  var isTouch = window.matchMedia('(pointer: coarse)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  渲染提示词 + 字数滚动动画
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function render() {
    bodyEl.textContent = PROMPT;
    animateCount(pillEl, PROMPT.length, 1100, function (n) {
      return Math.round(n) + ' 字';
    });
  }

  function animateCount(el, target, duration, fmt) {
    if (reduceMotion) { el.textContent = fmt(target); return; }
    var start = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  toast
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-show');
    }, 1800);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  复制（带降级）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ripple 涟漪
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function spawnRipple(btn, e) {
    if (reduceMotion) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var x = (e.clientX !== undefined ? e.clientX : rect.left + rect.width / 2) - rect.left - size / 2;
    var y = (e.clientY !== undefined ? e.clientY : rect.top + rect.height / 2) - rect.top - size / 2;
    var r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = r.style.height = size + 'px';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    btn.appendChild(r);
    setTimeout(function () { r.remove(); }, 650);
  }
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('pointerdown', function (e) { spawnRipple(btn, e); });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  按钮事件
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  copyBtn.addEventListener('click', function () {
    copyText(PROMPT).then(function () {
      toast('✅ 提示词已复制，去 DeepSeek 粘贴吧');
      var t = copyBtn.querySelector('.btn-text');
      var orig = t.textContent;
      t.textContent = '已复制 ✓';
      setTimeout(function () { t.textContent = orig; }, 1600);
    }).catch(function () {
      toast('❌ 复制失败，请手动选择文本');
    });
  });

  dlBtn.addEventListener('click', function () {
    var blob = new Blob([PROMPT], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'aigc-降重提示词.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('📄 已开始下载');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  鼠标跟随光晕（仅鼠标设备）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!isTouch && cursorGlow && !reduceMotion) {
    var tx = 0, ty = 0, cx = 0, cy = 0, rafId = null, started = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!started) {
        cursorGlow.classList.add('is-active');
        started = true;
        loop();
      }
    }, { passive: true });
    function loop() {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      cursorGlow.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      rafId = requestAnimationFrame(loop);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  卡片 3D tilt（仅鼠标设备）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!isTouch && !reduceMotion) {
    var tiltEls = document.querySelectorAll('.step, .prompt-card');
    tiltEls.forEach(function (el) {
      el.classList.add('tilt-ready');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', (-py * 6) + 'deg');
        el.style.setProperty('--ry', ( px * 6) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  滚动进度条
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  function updateProgress() {
    var h = document.documentElement;
    var total = h.scrollHeight - h.clientHeight;
    var p = total > 0 ? (h.scrollTop || document.body.scrollTop) / total : 0;
    progressEl.style.width = (Math.min(1, Math.max(0, p)) * 100) + '%';

    // 浮动打星按钮：滚动超过一屏后显示
    var floatStar = document.querySelector('.float-star');
    if (floatStar) {
      if ((h.scrollTop || document.body.scrollTop) > window.innerHeight * 0.6) {
        floatStar.classList.add('is-show');
      } else {
        floatStar.classList.remove('is-show');
      }
    }
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  滚动渐显
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  var revealEls = document.querySelectorAll('.prompt-card, .step, .section-title, .cta-star');
  revealEls.forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.06) + 's';
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ⌘/Ctrl+C 在提示词卡片内未选中文本时 → 复制整段
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  bodyEl.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      setTimeout(function () {
        if (!window.getSelection().toString()) {
          copyText(PROMPT).then(function () { toast('✅ 整段已复制'); });
        }
      }, 0);
    }
  });

  // 启动
  render();
})();
