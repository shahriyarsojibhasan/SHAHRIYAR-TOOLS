/**
 * DuoVista PDF Studio — Core Application Controller (v2.1.0)
 * Created by Shahriyar Sojib Hasan — Free for Students Worldwide
 * Support: https://buymeacoffee.com/shahriyarsojibhasan
 */

// Configure PDF.js Worker and CMaps
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  pdfjsLib.GlobalWorkerOptions.cMapUrl = 'lib/cmaps/';
  pdfjsLib.GlobalWorkerOptions.cMapPacked = true;
}

/**
 * Class representing one independent viewer pane (Top or Bottom)
 */
class PaneViewer {
  constructor(paneId) {
    this.paneId = paneId;
    this.paneElement = document.getElementById(paneId);
    this.viewport = this.paneElement.querySelector('.pane-viewport');
    this.pagesContainer = this.paneElement.querySelector('.pages-wrapper');
    this.floatingBar = this.paneElement.querySelector('.pane-floating-bar');
    
    // Floating Micro Controls
    this.pageInput = this.paneElement.querySelector('.pane-page-input');
    this.totalPagesSpan = this.paneElement.querySelector('.pane-total-pages');
    this.zoomSelect = this.paneElement.querySelector('.pane-zoom-select');
    this.btnPrev = this.paneElement.querySelector('.btn-prev-page');
    this.btnNext = this.paneElement.querySelector('.btn-next-page');
    this.btnZoomIn = this.paneElement.querySelector('.btn-zoom-in');
    this.btnZoomOut = this.paneElement.querySelector('.btn-zoom-out');
    this.btnRotate = this.paneElement.querySelector('.btn-rotate');

    // Document State
    this.pdfDoc = null;
    this.numPages = 0;
    this.currentPage = 1;
    this.scale = 1.0;
    this.scaleMode = 'fit-width';
    this.rotation = 0;
    this.fileName = '';
    
    // Pages & Rendering
    this.pageElements = [];
    this.renderTasks = new Map();
    this.isSyncingScroll = false;
    this.observer = null;

    this.initEvents();
    this.initIntersectionObserver();
  }

  initEvents() {
    this.btnPrev.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    this.btnNext.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    this.pageInput.addEventListener('change', (e) => {
      const p = parseInt(e.target.value, 10);
      if (!isNaN(p)) this.goToPage(p);
    });

    this.zoomSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'fit-width' || val === 'fit-page') {
        this.scaleMode = val;
      } else {
        this.scaleMode = 'custom';
        this.scale = parseFloat(val);
      }
      this.recalculateAndRerender();
    });

    this.btnZoomIn.addEventListener('click', () => {
      this.scaleMode = 'custom';
      this.scale = Math.min(3.0, (this.scale || 1.0) + 0.15);
      this.updateZoomSelectValue();
      this.recalculateAndRerender();
    });

    this.btnZoomOut.addEventListener('click', () => {
      this.scaleMode = 'custom';
      this.scale = Math.max(0.4, (this.scale || 1.0) - 0.15);
      this.updateZoomSelectValue();
      this.recalculateAndRerender();
    });

    this.btnRotate.addEventListener('click', () => {
      this.rotation = (this.rotation + 90) % 360;
      this.recalculateAndRerender();
    });

    this.viewport.addEventListener('scroll', () => {
      this.onViewportScroll();
    }, { passive: true });

    let resizeTimer = null;
    this.lastViewportWidth = 0;
    this.lastViewportHeight = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!this.pdfDoc) return;
        const curW = this.viewport.clientWidth;
        const curH = this.viewport.clientHeight;
        const widthChanged = Math.abs(curW - this.lastViewportWidth) > 4;
        const heightChanged = Math.abs(curH - this.lastViewportHeight) > 4;
        if ((this.scaleMode === 'fit-width' && widthChanged) ||
            (this.scaleMode === 'fit-page' && (widthChanged || heightChanged))) {
          this.lastViewportWidth = curW;
          this.lastViewportHeight = curH;
          this.recalculateAndRerender();
        }
      }, 120);
    });
  }

  updateZoomSelectValue() {
    for (let opt of this.zoomSelect.options) {
      if (Math.abs(parseFloat(opt.value) - this.scale) < 0.05) {
        opt.selected = true;
        return;
      }
    }
    this.zoomSelect.value = '';
  }

  initIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const pageNum = parseInt(entry.target.dataset.pageNumber, 10);
        if (entry.isIntersecting) {
          this.renderPage(pageNum);
        } else {
          this.unloadPage(pageNum);
        }
      });
    }, {
      root: this.viewport,
      rootMargin: '250px 0px',
      threshold: 0.01
    });
  }

  async loadDocument(pdfDoc, initialPage = 1, fileName = '') {
    this.pdfDoc = pdfDoc;
    this.numPages = pdfDoc.numPages;
    this.fileName = fileName;
    this.totalPagesSpan.textContent = this.numPages;
    this.pageInput.max = this.numPages;
    this.currentPage = initialPage;
    this.pageInput.value = initialPage;

    this.pagesContainer.innerHTML = '';
    this.pageElements = [];

    const firstPage = await pdfDoc.getPage(1);
    const unscaledViewport = firstPage.getViewport({ scale: 1, rotation: this.rotation });
    const defaultWidth = unscaledViewport.width;
    const defaultHeight = unscaledViewport.height;

    for (let i = 1; i <= this.numPages; i++) {
      const pageWrap = document.createElement('div');
      pageWrap.className = 'page-container';
      pageWrap.dataset.pageNumber = i;
      pageWrap.dataset.paneId = this.paneId;
      pageWrap.style.width = `${defaultWidth}px`;
      pageWrap.style.height = `${defaultHeight}px`;

      const canvas = document.createElement('canvas');
      canvas.className = 'page-canvas';
      pageWrap.appendChild(canvas);

      const annotCanvas = document.createElement('canvas');
      annotCanvas.className = 'annotation-canvas';
      pageWrap.appendChild(annotCanvas);

      const textLayer = document.createElement('div');
      textLayer.className = 'text-layer';
      pageWrap.appendChild(textLayer);

      if (app && app.annotationManager) {
        app.annotationManager.bindPage(pageWrap, annotCanvas, i);
      }

      this.pagesContainer.appendChild(pageWrap);
      this.pageElements.push(pageWrap);
      this.observer.observe(pageWrap);
    }

    await this.recalculateAndRerender();

    if (initialPage > 1) {
      this.goToPage(initialPage, false);
    }
  }

  computeScaleForPage(unscaledViewport) {
    const isMobile = window.innerWidth <= 600;
    const padX = isMobile ? 10 : 28;
    const rawW = this.viewport.clientWidth || window.innerWidth;
    if (this.scaleMode === 'fit-width') {
      const availWidth = Math.max(180, rawW - padX);
      return availWidth / unscaledViewport.width;
    } else if (this.scaleMode === 'fit-page') {
      const availWidth = Math.max(180, rawW - padX);
      const availHeight = Math.max(160, (this.viewport.clientHeight || 300) - 24);
      const scaleX = availWidth / unscaledViewport.width;
      const scaleY = availHeight / unscaledViewport.height;
      return Math.min(scaleX, scaleY);
    } else {
      return this.scale || 1.0;
    }
  }

  async recalculateAndRerender() {
    if (!this.pdfDoc || this.numPages === 0) return;

    this.lastViewportWidth = this.viewport.clientWidth;
    this.lastViewportHeight = this.viewport.clientHeight;
    const firstPage = await this.pdfDoc.getPage(1);
    const unscaledViewport = firstPage.getViewport({ scale: 1, rotation: this.rotation });
    this.scale = this.computeScaleForPage(unscaledViewport);

    for (let i = 1; i <= this.numPages; i++) {
      const pageWrap = this.pageElements[i - 1];
      if (!pageWrap) continue;
      const w = Math.floor(unscaledViewport.width * this.scale);
      const h = Math.floor(unscaledViewport.height * this.scale);
      pageWrap.style.width = `${w}px`;
      pageWrap.style.height = `${h}px`;
    }

    this.pageElements.forEach((pageWrap, idx) => {
      const pageNum = idx + 1;
      const rect = pageWrap.getBoundingClientRect();
      const viewRect = this.viewport.getBoundingClientRect();
      if (rect.bottom >= viewRect.top - 250 && rect.top <= viewRect.bottom + 250) {
        this.renderPage(pageNum, true);
      }
    });
  }

  async renderPage(pageNum, force = false) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) return;
    const pageWrap = this.pageElements[pageNum - 1];
    if (!pageWrap) return;

    const renderedScale = pageWrap.dataset.renderedScale;
    const renderedRotation = pageWrap.dataset.renderedRotation;
    if (!force && renderedScale === String(this.scale) && renderedRotation === String(this.rotation)) {
      return;
    }

    if (this.renderTasks.has(pageNum)) {
      const task = this.renderTasks.get(pageNum);
      try { task.cancel(); } catch (e) {}
      this.renderTasks.delete(pageNum);
    }

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale, rotation: this.rotation });
      
      const canvas = pageWrap.querySelector('.page-canvas');
      const annotCanvas = pageWrap.querySelector('.annotation-canvas');
      const textLayer = pageWrap.querySelector('.text-layer');
      const dpr = window.devicePixelRatio || 1;

      pageWrap.style.width = `${Math.floor(viewport.width)}px`;
      pageWrap.style.height = `${Math.floor(viewport.height)}px`;
      pageWrap.style.setProperty('--scale-factor', viewport.scale);

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      if (annotCanvas) {
        annotCanvas.width = Math.floor(viewport.width * dpr);
        annotCanvas.height = Math.floor(viewport.height * dpr);
        annotCanvas.style.width = `${Math.floor(viewport.width)}px`;
        annotCanvas.style.height = `${Math.floor(viewport.height)}px`;
        if (app && app.annotationManager) {
          app.annotationManager.redrawPage(pageWrap, pageNum);
        }
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      this.renderTasks.set(pageNum, renderTask);

      await renderTask.promise;
      this.renderTasks.delete(pageNum);

      if (textLayer) {
        textLayer.innerHTML = '';
        textLayer.style.width = `${Math.floor(viewport.width)}px`;
        textLayer.style.height = `${Math.floor(viewport.height)}px`;
        textLayer.style.setProperty('--scale-factor', viewport.scale);

        const textContent = await page.getTextContent();
        pdfjsLib.renderTextLayer({
          textContent: textContent,
          container: textLayer,
          viewport: viewport,
          textDivs: []
        });
      }

      pageWrap.dataset.renderedScale = String(this.scale);
      pageWrap.dataset.renderedRotation = String(this.rotation);
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error(`Error rendering page ${pageNum}:`, err);
      }
    }
  }

  unloadPage(pageNum) {
    if (this.renderTasks.has(pageNum)) {
      try { this.renderTasks.get(pageNum).cancel(); } catch (e) {}
      this.renderTasks.delete(pageNum);
    }
    const pageWrap = this.pageElements[pageNum - 1];
    if (pageWrap) {
      const canvas = pageWrap.querySelector('.page-canvas');
      const textLayer = pageWrap.querySelector('.text-layer');
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
      if (textLayer) {
        textLayer.innerHTML = '';
      }
      delete pageWrap.dataset.renderedScale;
      delete pageWrap.dataset.renderedRotation;
    }
  }

  goToPage(pageNum, smooth = true) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) return;
    this.currentPage = pageNum;
    this.pageInput.value = pageNum;

    const pageWrap = this.pageElements[pageNum - 1];
    if (pageWrap) {
      const topClearance = this.floatingBar ? (this.floatingBar.offsetHeight + 12) : 40;
      this.viewport.scrollTo({
        top: Math.max(0, pageWrap.offsetTop - topClearance),
        behavior: smooth ? 'smooth' : 'instant'
      });
    }
  }

  onViewportScroll() {
    if (!this.pdfDoc || this.pageElements.length === 0) return;

    const vCenter = this.viewport.scrollTop + this.viewport.clientHeight / 2;
    for (let i = 0; i < this.pageElements.length; i++) {
      const wrap = this.pageElements[i];
      if (vCenter >= wrap.offsetTop && vCenter <= (wrap.offsetTop + wrap.offsetHeight)) {
        const pageNum = i + 1;
        if (this.currentPage !== pageNum) {
          this.currentPage = pageNum;
          this.pageInput.value = pageNum;
        }
        break;
      }
    }

    if (app && app.isSyncScrollActive && !this.isSyncingScroll) {
      app.broadcastScroll(this);
    }
  }

  syncScrollRatio(ratio) {
    this.isSyncingScroll = true;
    const maxScroll = this.viewport.scrollHeight - this.viewport.clientHeight;
    if (maxScroll > 0) {
      this.viewport.scrollTop = ratio * maxScroll;
    }
    setTimeout(() => {
      this.isSyncingScroll = false;
    }, 50);
  }
}

/**
 * Edge-Style Annotation Manager
 */
class AnnotationManager {
  constructor(app) {
    this.app = app;
    this.activeTool = null;
    this.highlightColor = '#fef08a';
    this.penColor = '#2563eb';
    this.penWidth = 3;
    this.highlightWidth = 18;
    this.pageStrokes = new Map();

    this.initDOM();
  }

  initDOM() {
    this.bar = document.getElementById('annotationToolbar');
    this.btnToggle = document.getElementById('btnToggleAnnotate');
    this.btnClose = document.getElementById('btnCloseAnnotBar');
    
    this.btnHighlight = document.getElementById('annotBtnHighlight');
    this.btnPen = document.getElementById('annotBtnPen');
    this.btnText = document.getElementById('annotBtnText');
    this.btnEraser = document.getElementById('annotBtnEraser');
    this.btnClear = document.getElementById('annotBtnClear');

    this.highlightColorPreview = document.getElementById('highlightColorPreview');
    this.penColorPreview = document.getElementById('penColorPreview');

    this.btnToggle.addEventListener('click', () => this.toggleBar());
    this.btnClose.addEventListener('click', () => this.hideBar());

    const groupHighlight = document.getElementById('groupHighlight');
    const groupPen = document.getElementById('groupPen');

    this.btnHighlight.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setTool('highlight');
      if (groupHighlight) groupHighlight.classList.toggle('show-colors');
      if (groupPen) groupPen.classList.remove('show-colors');
    });
    this.btnPen.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setTool('pen');
      if (groupPen) groupPen.classList.toggle('show-colors');
      if (groupHighlight) groupHighlight.classList.remove('show-colors');
    });
    this.btnText.addEventListener('click', () => {
      this.setTool('text');
      if (groupHighlight) groupHighlight.classList.remove('show-colors');
      if (groupPen) groupPen.classList.remove('show-colors');
    });
    this.btnEraser.addEventListener('click', () => {
      this.setTool('eraser');
      if (groupHighlight) groupHighlight.classList.remove('show-colors');
      if (groupPen) groupPen.classList.remove('show-colors');
    });
    this.btnClear.addEventListener('click', () => this.clearCurrentPage());

    document.addEventListener('click', () => {
      if (groupHighlight) groupHighlight.classList.remove('show-colors');
      if (groupPen) groupPen.classList.remove('show-colors');
    });

    document.querySelectorAll('#highlightColorPicker .color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.highlightColor = dot.dataset.color;
        this.highlightColorPreview.style.backgroundColor = this.highlightColor;
        document.querySelectorAll('#highlightColorPicker .color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        this.setTool('highlight');
        if (groupHighlight) groupHighlight.classList.remove('show-colors');
      });
    });

    document.querySelectorAll('#penColorPicker .color-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.penColor = dot.dataset.color;
        this.penColorPreview.style.backgroundColor = this.penColor;
        document.querySelectorAll('#penColorPicker .color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        this.setTool('pen');
        if (groupPen) groupPen.classList.remove('show-colors');
      });
    });
  }

  toggleBar() {
    const isVisible = this.bar.style.display !== 'none';
    if (isVisible) this.hideBar();
    else this.showBar();
  }

  showBar() {
    this.bar.style.display = 'flex';
    this.btnToggle.classList.add('active');
    if (!this.activeTool) this.setTool('highlight');
  }

  hideBar() {
    this.bar.style.display = 'none';
    this.btnToggle.classList.remove('active');
    this.setTool(null);
  }

  setTool(tool) {
    this.activeTool = tool;
    document.body.classList.toggle('annotation-active', tool !== null && tool !== 'text');

    this.btnHighlight.classList.toggle('active', tool === 'highlight');
    this.btnPen.classList.toggle('active', tool === 'pen');
    this.btnText.classList.toggle('active', tool === 'text');
    this.btnEraser.classList.toggle('active', tool === 'eraser');
  }

  bindPage(pageWrap, annotCanvas, pageNum) {
    const paneId = pageWrap.dataset.paneId;
    const pageKey = `${paneId}_${pageNum}`;

    let isPointerDown = false;
    let localPath = [];

    annotCanvas.addEventListener('pointerdown', (e) => {
      if (!this.activeTool || this.activeTool === 'text') return;
      isPointerDown = true;
      annotCanvas.setPointerCapture(e.pointerId);

      const rect = annotCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (rect.width / annotCanvas.width);
      const y = (e.clientY - rect.top) / (rect.height / annotCanvas.height);

      if (this.activeTool === 'eraser') {
        this.eraseNear(pageKey, x, y, annotCanvas);
        return;
      }

      localPath = [{ x, y }];
    });

    annotCanvas.addEventListener('pointermove', (e) => {
      if (!isPointerDown) return;
      const rect = annotCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / (rect.width / annotCanvas.width);
      const y = (e.clientY - rect.top) / (rect.height / annotCanvas.height);

      if (this.activeTool === 'eraser') {
        this.eraseNear(pageKey, x, y, annotCanvas);
        return;
      }

      localPath.push({ x, y });
      this.drawLiveStroke(annotCanvas, localPath, this.activeTool);
    });

    const stopDrawing = (e) => {
      if (isPointerDown) {
        isPointerDown = false;
        try { annotCanvas.releasePointerCapture(e.pointerId); } catch (err) {}

        if (this.activeTool !== 'eraser' && localPath.length > 1) {
          if (!this.pageStrokes.has(pageKey)) {
            this.pageStrokes.set(pageKey, []);
          }
          const dpr = window.devicePixelRatio || 1;
          const baseW = this.activeTool === 'highlight' ? this.highlightWidth : this.penWidth;
          this.pageStrokes.get(pageKey).push({
            tool: this.activeTool,
            color: this.activeTool === 'highlight' ? this.highlightColor : this.penColor,
            width: baseW * dpr,
            opacity: this.activeTool === 'highlight' ? 0.35 : 1.0,
            points: [...localPath]
          });
          this.redrawPage(pageWrap, pageNum);
        }
        localPath = [];
      }
    };

    annotCanvas.addEventListener('pointerup', stopDrawing);
    annotCanvas.addEventListener('pointercancel', stopDrawing);

    pageWrap.addEventListener('click', (e) => {
      if (this.activeTool === 'text' && !e.target.classList.contains('user-text-annotation')) {
        const rect = pageWrap.getBoundingClientRect();
        const left = e.clientX - rect.left;
        const top = e.clientY - rect.top;
        this.createTextBox(pageWrap, left, top);
      }
    });
  }

  createTextBox(pageWrap, left, top) {
    const box = document.createElement('div');
    box.className = 'user-text-annotation';
    box.contentEditable = true;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.textContent = 'Type note...';

    box.addEventListener('focus', () => {
      if (box.textContent === 'Type note...') box.textContent = '';
    });
    box.addEventListener('blur', () => {
      if (box.textContent.trim() === '') box.remove();
    });

    pageWrap.appendChild(box);
    box.focus();
  }

  drawLiveStroke(canvas, points, tool) {
    const ctx = canvas.getContext('2d');
    if (points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'highlight') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = this.highlightColor;
      ctx.lineWidth = this.highlightWidth * dpr;
    } else {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = this.penColor;
      ctx.lineWidth = this.penWidth * dpr;
    }

    ctx.beginPath();
    ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.restore();
  }

  redrawPage(pageWrap, pageNum) {
    const paneId = pageWrap.dataset.paneId;
    const pageKey = `${paneId}_${pageNum}`;
    const canvas = pageWrap.querySelector('.annotation-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const strokes = this.pageStrokes.get(pageKey) || [];
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = stroke.opacity || 1.0;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  eraseNear(pageKey, x, y, canvas) {
    const strokes = this.pageStrokes.get(pageKey) || [];
    const threshold = 20 * (window.devicePixelRatio || 1);

    const filtered = strokes.filter(stroke => {
      for (const pt of stroke.points) {
        const dist = Math.hypot(pt.x - x, pt.y - y);
        if (dist < threshold) return false;
      }
      return true;
    });

    this.pageStrokes.set(pageKey, filtered);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of filtered) {
      ctx.save();
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      ctx.stroke();
      ctx.restore();
    }
  }

  clearCurrentPage() {
    if (confirm('Clear all drawings and highlights on current view?')) {
      this.pageStrokes.clear();
      document.querySelectorAll('.annotation-canvas').forEach(c => {
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
      });
      document.querySelectorAll('.user-text-annotation').forEach(t => t.remove());
      this.app.showToast('Annotations cleared.');
    }
  }
}

/**
 * Main Application Orchestrator
 */
class DuoVistaApp {
  constructor() {
    this.doc1 = null;
    this.doc2 = null;
    this.currentFileName = '';
    this.isDualDocumentMode = false;
    
    // DEFAULT TO VERTICAL (Up-Down / Top & Bottom)
    this.layoutMode = localStorage.getItem('duovista_layout') || 'vertical';
    this.splitRatio = parseFloat(localStorage.getItem('duovista_split_ratio')) || 50;
    this.isSyncScrollActive = false;

    // Panes & Annotations
    this.pane1 = null;
    this.pane2 = null;
    this.annotationManager = null;

    // Timer
    this.timerSeconds = 1200;
    this.timerInitial = 1200;
    this.timerInterval = null;
    this.isTimerRunning = false;
    this.isStopwatch = false;

    this.initDOM();
    this.initPanes();
    this.annotationManager = new AnnotationManager(this);
    this.initSplitResizer();
    this.initTimer();
    this.initSlideMenu();
    this.initAnswerSheet();
    this.initEvents();
    this.loadInitialPreferences();
  }

  initDOM() {
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.viewerContainer = document.getElementById('viewerContainer');
    this.splitResizer = document.getElementById('splitResizer');
    
    // File Inputs & Indicators
    this.btnOpenPdf = document.getElementById('btnOpenPdf');
    this.filePill = document.getElementById('filePill');
    this.activeFileName = document.getElementById('activeFileName');
    this.fileInput = document.getElementById('fileInput');
    this.fileInputTop = document.getElementById('fileInputTop');
    this.fileInputBottom = document.getElementById('fileInputBottom');
    this.btnWelcomeOpen = document.getElementById('btnWelcomeOpen');
    this.btnWelcomeSample = document.getElementById('btnWelcomeSample');

    // Dual File Bar
    this.dualFileBar = document.getElementById('dualFileBar');
    this.btnPickTopPdf = document.getElementById('btnPickTopPdf');
    this.btnPickBottomPdf = document.getElementById('btnPickBottomPdf');
    this.labelTopPdf = document.getElementById('labelTopPdf');
    this.labelBottomPdf = document.getElementById('labelBottomPdf');

    // Layout buttons
    this.btnLayoutVertical = document.getElementById('btnLayoutVertical');
    this.btnLayoutHorizontal = document.getElementById('btnLayoutHorizontal');
    this.btnLayoutSingle = document.getElementById('btnLayoutSingle');

    // Doc Mode Toggle
    this.btnModeSame = document.getElementById('btnModeSame');
    this.btnModeDual = document.getElementById('btnModeDual');

    // Slide Menu & Drawers
    this.btnMenuDrawer = document.getElementById('btnMenuDrawer');
    this.menuDrawer = document.getElementById('menuDrawer');
    this.btnCloseMenuDrawer = document.getElementById('btnCloseMenuDrawer');
    this.btnBrandAbout = document.getElementById('btnBrandAbout');

    // IELTS Drawer
    this.ieltsDrawer = document.getElementById('ieltsDrawer');
    this.btnToggleDrawer = document.getElementById('btnToggleDrawer');
    this.btnCloseDrawer = document.getElementById('btnCloseDrawer');
    this.btnFullscreen = document.getElementById('btnFullscreen');

    this.dropOverlay = document.getElementById('dropOverlay');
    this.toastContainer = document.getElementById('toastContainer');
  }

  initPanes() {
    this.pane1 = new PaneViewer('pane1');
    this.pane2 = new PaneViewer('pane2');
  }

  initEvents() {
    // Open Main PDF
    this.btnOpenPdf.addEventListener('click', () => {
      if (this.isDualDocumentMode) this.fileInputTop.click();
      else this.fileInput.click();
    });
    this.btnWelcomeOpen.addEventListener('click', () => this.fileInput.click());

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadSingleFile(file);
    });

    this.btnWelcomeSample.addEventListener('click', () => this.loadSamplePdf());

    // Dual File Pickers
    this.btnPickTopPdf.addEventListener('click', () => this.fileInputTop.click());
    this.btnPickBottomPdf.addEventListener('click', () => this.fileInputBottom.click());

    this.fileInputTop.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadTopFile(file);
    });

    this.fileInputBottom.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadBottomFile(file);
    });

    // Document Mode (1 PDF vs 2 Different PDFs)
    this.btnModeSame.addEventListener('click', () => this.setDocumentMode(false));
    this.btnModeDual.addEventListener('click', () => this.setDocumentMode(true));

    // Layout buttons
    this.btnLayoutVertical.addEventListener('click', () => this.setLayout('vertical'));
    this.btnLayoutHorizontal.addEventListener('click', () => this.setLayout('horizontal'));
    this.btnLayoutSingle.addEventListener('click', () => this.setLayout('single'));

    // Fullscreen
    this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Drawer Backdrop
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const syncBackdrop = () => {
      if (!drawerBackdrop) return;
      const anyOpen = this.ieltsDrawer.classList.contains('open') || this.menuDrawer.classList.contains('open');
      drawerBackdrop.classList.toggle('visible', anyOpen);
    };
    this.syncBackdrop = syncBackdrop;

    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', () => {
        this.ieltsDrawer.classList.remove('open');
        this.menuDrawer.classList.remove('open');
        syncBackdrop();
      });
    }

    // IELTS Drawer
    this.btnToggleDrawer.addEventListener('click', () => {
      this.ieltsDrawer.classList.toggle('open');
      this.menuDrawer.classList.remove('open');
      syncBackdrop();
    });
    this.btnCloseDrawer.addEventListener('click', () => {
      this.ieltsDrawer.classList.remove('open');
      syncBackdrop();
    });

    // Windows 10 & 11 Extension Fix Modal Events
    const winFixModal = document.getElementById('winFixModal');
    const btnWelcomeWinFix = document.getElementById('btnWelcomeWinFix');
    const btnMenuWinFix = document.getElementById('btnMenuWinFix');
    const btnCloseWinFixModal = document.getElementById('btnCloseWinFixModal');

    if (btnWelcomeWinFix && winFixModal) {
      btnWelcomeWinFix.addEventListener('click', () => {
        winFixModal.style.display = 'flex';
      });
    }
    if (btnMenuWinFix && winFixModal) {
      btnMenuWinFix.addEventListener('click', () => {
        this.menuDrawer.classList.remove('open');
        syncBackdrop();
        winFixModal.style.display = 'flex';
      });
    }
    if (btnCloseWinFixModal && winFixModal) {
      btnCloseWinFixModal.addEventListener('click', () => {
        winFixModal.style.display = 'none';
      });
    }
    if (winFixModal) {
      winFixModal.addEventListener('click', (e) => {
        if (e.target === winFixModal) winFixModal.style.display = 'none';
      });
    }

    // File Permission Guide Modal Events
    const permModal = document.getElementById('filePermissionModal');
    const btnClosePerm = document.getElementById('btnClosePermModal');
    const btnCopyExtUrl = document.getElementById('btnCopyExtUrl');
    const btnPickLocalDirect = document.getElementById('btnPickLocalFileDirect');
    const permExtUrl = document.getElementById('permExtUrl');

    if (btnClosePerm && permModal) {
      btnClosePerm.addEventListener('click', () => {
        permModal.style.display = 'none';
      });
    }

    if (btnCopyExtUrl && permExtUrl) {
      btnCopyExtUrl.addEventListener('click', () => {
        navigator.clipboard.writeText(permExtUrl.value).then(() => {
          this.showToast('Link copied! Paste into address bar.');
        }).catch(() => {
          permExtUrl.select();
          document.execCommand('copy');
          this.showToast('Link copied!');
        });
      });
    }

    if (btnPickLocalDirect && permModal) {
      btnPickLocalDirect.addEventListener('click', () => {
        permModal.style.display = 'none';
        this.fileInput.click();
      });
    }

    // Drag & Drop (only trigger overlay for dragged external files, not page text selections)
    window.addEventListener('dragenter', (e) => {
      const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
      if (!types.includes('Files')) return;
      e.preventDefault();
      this.dropOverlay.classList.add('visible');
    });

    this.dropOverlay.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    this.dropOverlay.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) {
        this.dropOverlay.classList.remove('visible');
      }
    });

    this.dropOverlay.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropOverlay.classList.remove('visible');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          if (this.isDualDocumentMode) {
            const isTopHalf = e.clientY < window.innerHeight / 2;
            if (isTopHalf) this.loadTopFile(file);
            else this.loadBottomFile(file);
          } else {
            this.loadSingleFile(file);
          }
        } else if (file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')) {
          this.loadAudioFile(file);
        } else {
          this.showToast('Please drop a valid PDF or MP3 audio file.');
        }
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const fileParam = urlParams.get('file');
    if (fileParam) {
      this.loadUrl(fileParam);
    }
  }

  // ==================== 3-Line Slide-Out Menu Drawer ====================
  initSlideMenu() {
    this.btnMenuDrawer.addEventListener('click', () => {
      this.menuDrawer.classList.toggle('open');
      this.ieltsDrawer.classList.remove('open');
      if (this.syncBackdrop) this.syncBackdrop();
    });
    this.btnBrandAbout.addEventListener('click', () => {
      this.menuDrawer.classList.add('open');
      this.ieltsDrawer.classList.remove('open');
      if (this.syncBackdrop) this.syncBackdrop();
    });
    this.btnCloseMenuDrawer.addEventListener('click', () => {
      this.menuDrawer.classList.remove('open');
      if (this.syncBackdrop) this.syncBackdrop();
    });

    // Theme Chips
    document.querySelectorAll('.theme-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const theme = chip.dataset.theme;
        this.setTheme(theme);
        document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Menu Action Buttons
    const btnMenuSwap = document.getElementById('btnMenuSwap');
    const btnMenuReset = document.getElementById('btnMenuReset');
    const btnMenuSync = document.getElementById('btnMenuSync');
    const menuSyncText = document.getElementById('menuSyncText');
    const btnMenuSample = document.getElementById('btnMenuSample');

    btnMenuSwap.addEventListener('click', () => {
      this.swapPanes();
      this.menuDrawer.classList.remove('open');
      if (this.syncBackdrop) this.syncBackdrop();
    });

    btnMenuReset.addEventListener('click', () => {
      this.resetSplit();
      this.menuDrawer.classList.remove('open');
      if (this.syncBackdrop) this.syncBackdrop();
    });

    btnMenuSync.addEventListener('click', () => {
      this.isSyncScrollActive = !this.isSyncScrollActive;
      menuSyncText.textContent = this.isSyncScrollActive ? 'Toggle Sync Scroll (Current: ON)' : 'Toggle Sync Scroll (Current: OFF)';
      this.showToast(this.isSyncScrollActive ? 'Synchronized Scroll Enabled' : 'Independent Hover Scroll Active');
    });

    btnMenuSample.addEventListener('click', () => {
      this.loadSamplePdf();
      this.menuDrawer.classList.remove('open');
      if (this.syncBackdrop) this.syncBackdrop();
    });

    // Audio Player in Slide Menu
    this.btnMenuLoadAudio = document.getElementById('btnMenuLoadAudio');
    this.btnMenuAudioPlay = document.getElementById('btnMenuAudioPlay');
    this.menuAudioTime = document.getElementById('menuAudioTime');
    this.menuAudioProgress = document.getElementById('menuAudioProgress');
    this.audioFileInput = document.getElementById('audioFileInput');
    this.htmlAudio = document.getElementById('htmlAudio');

    this.btnMenuLoadAudio.addEventListener('click', () => this.audioFileInput.click());
    this.audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadAudioFile(file);
    });

    this.btnMenuAudioPlay.addEventListener('click', () => {
      if (!this.htmlAudio.src) {
        this.audioFileInput.click();
        return;
      }
      if (this.htmlAudio.paused) {
        this.htmlAudio.play();
        this.btnMenuAudioPlay.textContent = '⏸ Pause';
      } else {
        this.htmlAudio.pause();
        this.btnMenuAudioPlay.textContent = '▶ Play';
      }
    });

    this.htmlAudio.addEventListener('timeupdate', () => {
      if (this.htmlAudio.duration) {
        const pct = (this.htmlAudio.currentTime / this.htmlAudio.duration) * 100;
        this.menuAudioProgress.value = pct;
        const m = Math.floor(this.htmlAudio.currentTime / 60);
        const s = Math.floor(this.htmlAudio.currentTime % 60);
        this.menuAudioTime.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      }
    });

    this.menuAudioProgress.addEventListener('input', (e) => {
      if (this.htmlAudio.duration) {
        this.htmlAudio.currentTime = (e.target.value / 100) * this.htmlAudio.duration;
      }
    });
  }

  loadAudioFile(file) {
    const url = URL.createObjectURL(file);
    this.htmlAudio.src = url;
    this.btnMenuAudioPlay.textContent = '▶ Play';
    this.showToast(`Audio Track Loaded: ${file.name}`);
  }

  setDocumentMode(isDual) {
    this.isDualDocumentMode = isDual;
    this.btnModeSame.classList.toggle('active', !isDual);
    this.btnModeDual.classList.toggle('active', isDual);

    this.dualFileBar.style.display = isDual ? 'flex' : 'none';
    const openBtnText = document.getElementById('openPdfBtnText');
    openBtnText.textContent = isDual ? 'Top PDF' : 'Open PDF';

    this.showToast(isDual ? 'Dual File Mode: View 2 DIFFERENT PDFs simultaneously' : 'Single Document Mode: Viewing 1 PDF');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.showToast('Full Screen Mode (Tabs & Bookmarks Hidden)');
      }).catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  initSplitResizer() {
    let isDragging = false;
    let lastTapTime = 0;
    const pane1El = document.getElementById('pane1');

    this.splitResizer.addEventListener('pointerdown', (e) => {
      const now = Date.now();
      if (now - lastTapTime < 320) {
        lastTapTime = 0;
        isDragging = false;
        this.resetSplit();
        return;
      }
      lastTapTime = now;

      isDragging = true;
      this.splitResizer.classList.add('is-dragging');
      this.splitResizer.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
    });

    this.splitResizer.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const containerRect = this.viewerContainer.getBoundingClientRect();
      let percentage = 50;

      if (this.layoutMode === 'vertical') {
        const relativeY = e.clientY - containerRect.top;
        percentage = (relativeY / containerRect.height) * 100;
      } else if (this.layoutMode === 'horizontal') {
        const relativeX = e.clientX - containerRect.left;
        percentage = (relativeX / containerRect.width) * 100;
      }

      percentage = Math.max(15, Math.min(85, percentage));
      this.splitRatio = percentage;
      pane1El.style.flex = `0 0 calc(${percentage}% - 1px)`;
    });

    const stopDragging = (e) => {
      if (isDragging) {
        isDragging = false;
        this.splitResizer.classList.remove('is-dragging');
        document.body.style.userSelect = '';
        try { this.splitResizer.releasePointerCapture(e.pointerId); } catch (err) {}
        
        this.pane1.recalculateAndRerender();
        this.pane2.recalculateAndRerender();

        localStorage.setItem('duovista_split_ratio', this.splitRatio);
      }
    };

    this.splitResizer.addEventListener('pointerup', stopDragging);
    this.splitResizer.addEventListener('pointercancel', stopDragging);
  }

  resetSplit() {
    this.splitRatio = 50;
    const pane1El = document.getElementById('pane1');
    pane1El.style.flex = `0 0 calc(50% - 1px)`;
    this.pane1.recalculateAndRerender();
    this.pane2.recalculateAndRerender();
    this.showToast('Divider reset to 50:50');
  }

  setLayout(mode) {
    this.layoutMode = mode;
    this.btnLayoutVertical.classList.toggle('active', mode === 'vertical');
    this.btnLayoutHorizontal.classList.toggle('active', mode === 'horizontal');
    this.btnLayoutSingle.classList.toggle('active', mode === 'single');

    this.viewerContainer.className = `viewer-container layout-${mode}`;
    
    const pane1El = document.getElementById('pane1');
    if (mode === 'single') {
      pane1El.style.flex = '1 1 100%';
    } else {
      pane1El.style.flex = `0 0 calc(${this.splitRatio}% - 1px)`;
    }

    setTimeout(() => {
      this.pane1.recalculateAndRerender();
      if (mode !== 'single') {
        this.pane2.recalculateAndRerender();
      }
    }, 100);

    localStorage.setItem('duovista_layout', mode);
  }

  swapPanes() {
    if (!this.doc1) return;
    
    if (this.isDualDocumentMode && this.doc2) {
      const tempDoc = this.doc1;
      const tempName = this.labelTopPdf.textContent;
      this.doc1 = this.doc2;
      this.doc2 = tempDoc;

      this.labelTopPdf.textContent = this.labelBottomPdf.textContent;
      this.labelBottomPdf.textContent = tempName;

      this.pane1.loadDocument(this.doc1, 1, this.labelTopPdf.textContent);
      this.pane2.loadDocument(this.doc2, 1, this.labelBottomPdf.textContent);
    } else {
      const p1Page = this.pane1.currentPage;
      const p2Page = this.pane2.currentPage;

      this.pane1.goToPage(p2Page);
      this.pane2.goToPage(p1Page);
    }

    this.showToast('Panes Swapped');
  }

  broadcastScroll(sourcePane) {
    const maxScroll = sourcePane.viewport.scrollHeight - sourcePane.viewport.clientHeight;
    if (maxScroll <= 0) return;
    const ratio = sourcePane.viewport.scrollTop / maxScroll;
    
    const targetPane = (sourcePane === this.pane1) ? this.pane2 : this.pane1;
    targetPane.syncScrollRatio(ratio);
  }

  /**
   * Populate both viewer panes with a loaded PDF document instance.
   */
  applySharedDocument(doc, filename) {
    this.doc1 = doc;
    this.doc2 = doc;
    this.currentFileName = filename;
    this.labelTopPdf.textContent = filename;
    this.labelBottomPdf.textContent = filename;

    this.onDocumentActive(filename, doc.numPages);

    const p2Start = doc.numPages >= 3 ? 3 : (doc.numPages >= 2 ? 2 : 1);
    this.pane1.loadDocument(doc, 1, filename);
    this.pane2.loadDocument(doc, p2Start, filename);
  }

  async loadSingleFile(file) {
    try {
      this.showToast(`Loading: ${file.name}...`);
      const buffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      this.applySharedDocument(doc, file.name);
      this.showToast(`Opened "${file.name}" (${doc.numPages} Pages)`);
    } catch (err) {
      console.error(err);
      this.showToast('Failed to open PDF.');
    }
  }

  async loadTopFile(file) {
    try {
      this.showToast(`Loading Top PDF: ${file.name}...`);
      const buffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      this.doc1 = doc;
      this.labelTopPdf.textContent = file.name;
      this.onDocumentActive(file.name, doc.numPages);
      this.pane1.loadDocument(doc, 1, file.name);
      this.showToast(`Top Pane: ${file.name}`);
    } catch (err) {
      console.error(err);
      this.showToast('Failed to open top PDF.');
    }
  }

  async loadBottomFile(file) {
    try {
      this.showToast(`Loading Bottom PDF: ${file.name}...`);
      const buffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
      this.doc2 = doc;
      this.labelBottomPdf.textContent = file.name;
      this.onDocumentActive(file.name, doc.numPages);
      this.pane2.loadDocument(doc, 1, file.name);
      this.showToast(`Bottom Pane: ${file.name}`);
    } catch (err) {
      console.error(err);
      this.showToast('Failed to open bottom PDF.');
    }
  }

  fetchLocalFileAsArrayBuffer(filePath) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', filePath, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function () {
        if (xhr.status === 0 || xhr.status === 200) {
          if (xhr.response && xhr.response.byteLength > 0) {
            resolve(xhr.response);
          } else {
            reject(new Error("Local file is empty or restricted."));
          }
        } else {
          reject(new Error(`Failed to load file. Status: ${xhr.status}`));
        }
      };
      xhr.onerror = function () {
        reject(new Error("Local file access not allowed by browser."));
      };
      xhr.send();
    });
  }

  showFilePermissionGuide(url, filename) {
    const modal = document.getElementById('filePermissionModal');
    if (!modal) return;
    
    const pathElem = document.getElementById('permFailedFilePath');
    if (pathElem) {
      pathElem.textContent = decodeURIComponent(url || '');
    }

    const extUrlInput = document.getElementById('permExtUrl');
    if (extUrlInput) {
      const isEdge = navigator.userAgent.includes('Edg/');
      const browserScheme = isEdge ? 'edge' : 'chrome';
      const extId = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) ? chrome.runtime.id : '';
      extUrlInput.value = extId ? `${browserScheme}://extensions/?id=${extId}` : `${browserScheme}://extensions`;
    }

    modal.style.display = 'flex';
  }

  async loadUrl(url) {
    if (!url) return;
    const cleanUrl = url.trim();
    try {
      this.showToast('Fetching PDF...');
      const rawName = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1).split('?')[0].split('#')[0];
      const filename = decodeURIComponent(rawName) || 'document.pdf';

      let doc;
      if (cleanUrl.startsWith('file://')) {
        // Read local file through arraybuffer (required by Chromium for extensions)
        try {
          const buffer = await this.fetchLocalFileAsArrayBuffer(cleanUrl);
          doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        } catch (fileErr) {
          console.warn("Direct file XHR read failed, checking permissions...", fileErr);
          this.showFilePermissionGuide(cleanUrl, filename);
          this.showToast('Local file permission needed. See guide on screen.');
          return;
        }
      } else {
        // HTTP/HTTPS or chrome-extension://
        try {
          doc = await pdfjsLib.getDocument(cleanUrl).promise;
        } catch (fetchErr) {
          console.warn("Direct pdfjs getDocument failed, retrying with fetch ArrayBuffer...", fetchErr);
          const res = await fetch(cleanUrl);
          if (!res.ok || res.status === 204) {
            throw new Error(`HTTP ${res.status} — blocked by CORS or Download Manager`);
          }
          const buffer = await res.arrayBuffer();
          if (!buffer || buffer.byteLength === 0) {
            throw new Error('Empty PDF response (intercepted by Download Manager)');
          }
          doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        }
      }

      this.applySharedDocument(doc, filename);
      this.showToast(`Loaded "${filename}"`);
    } catch (err) {
      console.error('Failed to load PDF URL:', err);
      if (cleanUrl.startsWith('file://')) {
        this.showToast('Failed to open local PDF. Check permissions.');
        this.showFilePermissionGuide(cleanUrl, 'PDF Document');
      } else {
        this.showToast('Failed to fetch URL (blocked by CORS or Download Manager). Open file from device.');
      }
    }
  }

  async loadSamplePdf() {
    try {
      this.showToast('Loading Practice IELTS Test...');
      // Load .dat mirror first so Windows download managers (e.g. IDM) never hijack .pdf fetch with HTTP 204
      const res = await fetch('sample/sample_ielts_reading.dat');
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer && buffer.byteLength > 100) {
          const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
          this.applySharedDocument(doc, 'sample_ielts_reading.pdf');
          this.showToast('Loaded "sample_ielts_reading.pdf"');
          return;
        }
      }
    } catch (err) {
      console.warn('Sample .dat fetch fallback triggered:', err);
    }
    return this.loadUrl('sample/sample_ielts_reading.pdf');
  }

  onDocumentActive(filename, numPages) {
    this.welcomeScreen.style.display = 'none';
    this.viewerContainer.style.display = 'flex';
    this.filePill.style.display = 'inline-flex';
    this.activeFileName.textContent = filename;
    this.activeFileName.title = `${filename} (${numPages} Pages)`;
  }

  // ==================== Exam Timer ====================
  initTimer() {
    this.timerTime = document.getElementById('timerTime');
    this.btnTimerStart = document.getElementById('btnTimerStart');
    this.btnTimerReset = document.getElementById('btnTimerReset');
    this.timerPreset = document.getElementById('timerPreset');
    this.timerBox = document.getElementById('timerBox');
    this.timerIconPlay = document.getElementById('timerIconPlay');
    this.timerIconPause = document.getElementById('timerIconPause');

    this.btnTimerStart.addEventListener('click', () => this.toggleTimer());
    this.btnTimerReset.addEventListener('click', () => this.resetTimer());
    
    this.timerPreset.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'stopwatch') {
        this.isStopwatch = true;
        this.timerSeconds = 0;
      } else {
        this.isStopwatch = false;
        this.timerSeconds = parseInt(val, 10);
        this.timerInitial = this.timerSeconds;
      }
      this.pauseTimer();
      this.updateTimerDisplay();
    });

    this.updateTimerDisplay();
  }

  toggleTimer() {
    if (this.isTimerRunning) this.pauseTimer();
    else this.startTimer();
  }

  startTimer() {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.timerIconPlay.style.display = 'none';
    this.timerIconPause.style.display = 'block';

    this.timerInterval = setInterval(() => {
      if (this.isStopwatch) {
        this.timerSeconds++;
      } else {
        if (this.timerSeconds > 0) {
          this.timerSeconds--;
          if (this.timerSeconds <= 120 && this.timerSeconds > 0) {
            this.timerBox.classList.add('warning');
          }
          if (this.timerSeconds === 0) {
            this.onTimerExpired();
          }
        }
      }
      this.updateTimerDisplay();
    }, 1000);
  }

  pauseTimer() {
    this.isTimerRunning = false;
    clearInterval(this.timerInterval);
    this.timerIconPlay.style.display = 'block';
    this.timerIconPause.style.display = 'none';
  }

  resetTimer() {
    this.pauseTimer();
    this.timerBox.classList.remove('warning');
    this.timerSeconds = this.isStopwatch ? 0 : this.timerInitial;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    this.timerTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  onTimerExpired() {
    this.pauseTimer();
    this.timerBox.classList.remove('warning');
    this.playAlarmSound();
    alert('⏰ IELTS Exam Time Expired! Your timer has completed.');
  }

  playAlarmSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {}
  }

  // ==================== Answer Sheet & Notes ====================
  initAnswerSheet() {
    const answersGrid = document.getElementById('answersGrid');
    const tabBtnAnswers = document.getElementById('tabBtnAnswers');
    const tabBtnNotes = document.getElementById('tabBtnNotes');
    const answersTab = document.getElementById('answersTab');
    const notesTab = document.getElementById('notesTab');
    const scratchpadNotes = document.getElementById('scratchpadNotes');
    const notesStatus = document.getElementById('notesStatus');
    const btnClearNotes = document.getElementById('btnClearNotes');

    const btnCopyAnswers = document.getElementById('btnCopyAnswers');
    const btnDownloadAnswers = document.getElementById('btnDownloadAnswers');
    const btnClearAnswers = document.getElementById('btnClearAnswers');

    const savedAnswers = JSON.parse(localStorage.getItem('duovista_answers') || '{}');
    answersGrid.innerHTML = '';
    for (let q = 1; q <= 40; q++) {
      const item = document.createElement('div');
      item.className = 'answer-item';
      
      const qNum = document.createElement('span');
      qNum.className = 'answer-qnum';
      qNum.textContent = `${q}.`;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'answer-input';
      input.dataset.question = q;
      input.value = savedAnswers[q] || '';
      input.placeholder = `Q${q}`;

      input.addEventListener('input', (e) => {
        savedAnswers[q] = e.target.value;
        localStorage.setItem('duovista_answers', JSON.stringify(savedAnswers));
      });

      item.appendChild(qNum);
      item.appendChild(input);
      answersGrid.appendChild(item);
    }

    tabBtnAnswers.addEventListener('click', () => {
      tabBtnAnswers.classList.add('active');
      tabBtnNotes.classList.remove('active');
      answersTab.classList.add('active');
      notesTab.classList.remove('active');
    });

    tabBtnNotes.addEventListener('click', () => {
      tabBtnNotes.classList.add('active');
      tabBtnAnswers.classList.remove('active');
      notesTab.classList.add('active');
      answersTab.classList.remove('active');
    });

    scratchpadNotes.value = localStorage.getItem('duovista_scratchpad') || '';
    scratchpadNotes.addEventListener('input', () => {
      localStorage.setItem('duovista_scratchpad', scratchpadNotes.value);
      notesStatus.textContent = 'Saving...';
      setTimeout(() => { notesStatus.textContent = 'Saved'; }, 300);
    });

    btnClearNotes.addEventListener('click', () => {
      if (confirm('Clear scratchpad notes?')) {
        scratchpadNotes.value = '';
        localStorage.removeItem('duovista_scratchpad');
      }
    });

    btnCopyAnswers.addEventListener('click', () => {
      const lines = ['--- IELTS Answers (DuoVista PDF) ---'];
      const inputs = answersGrid.querySelectorAll('.answer-input');
      inputs.forEach(inp => {
        const q = inp.dataset.question;
        const val = inp.value.trim() || '[Blank]';
        lines.push(`${q}. ${val}`);
      });
      navigator.clipboard.writeText(lines.join('\n')).then(() => {
        this.showToast('Copied 40 answers to clipboard!');
      }).catch(() => {
        this.showToast('Failed to copy answers.');
      });
    });

    btnDownloadAnswers.addEventListener('click', () => {
      const lines = [`IELTS Test - Answer Sheet (${this.currentFileName || 'Practice'})`, '==========================================='];
      const inputs = answersGrid.querySelectorAll('.answer-input');
      inputs.forEach(inp => {
        const q = inp.dataset.question;
        const val = inp.value.trim() || '[Blank]';
        lines.push(`${q}. ${val}`);
      });
      lines.push('\n--- Scratchpad Notes ---');
      lines.push(scratchpadNotes.value);

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IELTS_Answers_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });

    btnClearAnswers.addEventListener('click', () => {
      if (confirm('Clear all 40 answers?')) {
        answersGrid.querySelectorAll('.answer-input').forEach(inp => inp.value = '');
        localStorage.removeItem('duovista_answers');
        this.showToast('All answers cleared.');
      }
    });
  }

  setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('duovista_theme', themeName);
  }

  loadInitialPreferences() {
    const savedTheme = localStorage.getItem('duovista_theme') || 'theme-light';
    this.setTheme(savedTheme);

    document.querySelectorAll('.theme-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.theme === savedTheme);
    });

    this.setLayout(this.layoutMode);

    const pane1El = document.getElementById('pane1');
    if (pane1El && this.layoutMode !== 'single') {
      pane1El.style.flex = `0 0 calc(${this.splitRatio}% - 1px)`;
    }
  }

  showToast(message, duration = 2400) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }
}

// Instantiate App
let app = null;
document.addEventListener('DOMContentLoaded', () => {
  app = new DuoVistaApp();
});
