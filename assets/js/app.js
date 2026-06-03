(function () {
  'use strict';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  配置区 — 修改这里的值来定制你的网站
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // 1) PDF 路径（只渲染第一页）
  var PDF_PATH = 'assets/pdf/sample.pdf';

  // 2) AIGC 高亮区域（基于 PDF 页面坐标，单位 pt）
  //    用 PDF 阅读器量出 top/left/width/height
  var HIGHLIGHT_REGIONS = [
    // { top: 120, left: 60, width: 460, height: 28 },
  ];

  // 3) 提示词内容（所有访客看到的都是这段）
  //    修改这里即可更新全站提示词
  var SITE_PROMPT =
    '你是一个文本改写助手。你的任务是在保持原意不变的前提下，用不同的表达方式重写文本。' +
    '请保持专业和流畅，并确保准确性。\n\n' +
    '改写要求：\n' +
    '1. 保持原文核心含义不变\n' +
    '2. 替换同义词、调整句式结构\n' +
    '3. 避免与原文连续 13 个字相同\n' +
    '4. 保持学术写作风格\n' +
    '5. 直接输出改写结果，不要解释';

  // 4) 管理员密码（用于解锁编辑模式）
  //    访客无法编辑提示词，只有输入正确密码才能进入编辑模式
  //    ★ 修改为你自己的密码 ★
  var ADMIN_PASSWORD = 'admin123';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  var STORAGE_KEY = 'aigc_admin_prompt_v1';

  // ─── DOM ───
  var editor = document.getElementById('promptEditor');
  var charCount = document.getElementById('charCount');
  var saveStatus = document.getElementById('saveStatus');
  var btnReset = document.getElementById('btnReset');
  var btnSave = document.getElementById('btnSave');
  var btnLock = document.getElementById('btnLock');
  var btnAdmin = document.getElementById('btnAdmin');
  var adminActions = document.getElementById('adminActions');
  var promptDisplay = document.getElementById('promptDisplay');
  var editorWrap = document.getElementById('editorWrap');
  var pdfCanvas = document.getElementById('pdfCanvas');
  var pdfContainer = document.getElementById('pdfContainer');
  var pdfPlaceholder = document.getElementById('pdfPlaceholder');
  var highlightOverlay = document.getElementById('highlightOverlay');

  var isAdmin = false;

  // ─── 提示词内容获取 ───
  // 管理员编辑保存到 localStorage，访客始终看 SITE_PROMPT
  function getActivePrompt() {
    if (isAdmin) {
      return localStorage.getItem(STORAGE_KEY) || SITE_PROMPT;
    }
    return localStorage.getItem(STORAGE_KEY) || SITE_PROMPT;
  }

  // ─── 只读展示 ───
  function renderDisplay(text) {
    var lines = text.split('\n');
    var html = '<div class="prompt-content">';
    for (var i = 0; i < lines.length; i++) {
      html += '<span class="prompt-line-num">' + (i + 1) + '</span>' +
        escapeHtml(lines[i]) + '\n';
    }
    html += '</div>';
    promptDisplay.innerHTML = html;
    charCount.textContent = text.length + ' 字';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── 管理员模式 ───
  function enterAdmin() {
    var pwd = prompt('请输入管理员密码：');
    if (pwd !== ADMIN_PASSWORD) {
      if (pwd !== null) alert('密码错误');
      return;
    }
    isAdmin = true;
    btnAdmin.classList.add('active');
    adminActions.style.display = 'flex';
    promptDisplay.style.display = 'none';
    editorWrap.style.display = 'block';
    editor.value = getActivePrompt();
    updateCharCount();
    editor.focus();
  }

  function exitAdmin() {
    isAdmin = false;
    btnAdmin.classList.remove('active');
    adminActions.style.display = 'none';
    promptDisplay.style.display = 'block';
    editorWrap.style.display = 'none';
    renderDisplay(getActivePrompt());
  }

  function savePrompt() {
    localStorage.setItem(STORAGE_KEY, editor.value);
    renderDisplay(editor.value);
    updateCharCount();
    flashSaveStatus();
  }

  function resetPrompt() {
    if (confirm('确定恢复默认提示词？当前内容将丢失。')) {
      editor.value = SITE_PROMPT;
      localStorage.setItem(STORAGE_KEY, SITE_PROMPT);
      savePrompt();
    }
  }

  function updateCharCount() {
    charCount.textContent = editor.value.length + ' 字';
  }

  function flashSaveStatus() {
    saveStatus.textContent = '已保存';
    saveStatus.classList.add('show');
    setTimeout(function () {
      saveStatus.classList.remove('show');
    }, 1500);
  }

  // ─── 事件绑定 ───
  btnAdmin.addEventListener('click', function () {
    if (isAdmin) {
      exitAdmin();
    } else {
      enterAdmin();
    }
  });

  btnSave.addEventListener('click', savePrompt);
  btnReset.addEventListener('click', resetPrompt);
  btnLock.addEventListener('click', exitAdmin);

  editor.addEventListener('input', function () {
    updateCharCount();
  });

  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      savePrompt();
    }
  });

  // ─── PDF 渲染（仅第一页） ───
  function renderPDF(url) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    pdfjsLib.getDocument(url).promise.then(function (pdf) {
      if (pdf.numPages > 1) {
        console.log('PDF 共 ' + pdf.numPages + ' 页，仅渲染第 1 页');
      }
      return pdf.getPage(1);
    }).then(function (page) {
      var containerWidth = pdfContainer.clientWidth - 40;
      var viewport = page.getViewport({ scale: 1 });
      var scale = Math.min(containerWidth / viewport.width, 2);
      var scaledViewport = page.getViewport({ scale: scale });

      pdfCanvas.width = scaledViewport.width;
      pdfCanvas.height = scaledViewport.height;
      pdfPlaceholder.style.display = 'none';

      var ctx = pdfCanvas.getContext('2d');
      page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
      }).promise.then(function () {
        renderHighlights(scaledViewport.width, scaledViewport.height, scale);
      });
    }).catch(function (err) {
      console.error('PDF 加载失败:', err);
      pdfPlaceholder.style.display = 'flex';
    });
  }

  // ─── AIGC 高亮覆盖 ───
  function renderHighlights(canvasW, canvasH, scale) {
    highlightOverlay.innerHTML = '';
    if (HIGHLIGHT_REGIONS.length === 0) return;

    highlightOverlay.style.width = canvasW + 'px';
    highlightOverlay.style.height = canvasH + 'px';

    HIGHLIGHT_REGIONS.forEach(function (r) {
      var div = document.createElement('div');
      div.className = 'highlight-region';
      div.style.top = (r.top * scale) + 'px';
      div.style.left = (r.left * scale) + 'px';
      div.style.width = (r.width * scale) + 'px';
      div.style.height = (r.height * scale) + 'px';
      highlightOverlay.appendChild(div);
    });
  }

  // 窗口缩放时重新渲染 PDF
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      renderPDF(PDF_PATH);
    }, 200);
  });

  // ─── 初始化 ───
  renderDisplay(getActivePrompt());
  renderPDF(PDF_PATH);
})();
