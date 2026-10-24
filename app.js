/* ============================================================================
 * ConverterOffline Pro v3.0 — Complete Client-Side Conversion Engine
 * Supporta: PDF Studio, Immagini (PNG/JPG/WEBP/AVIF/ICO/BMP/SVG/Base64),
 * Audio/Video (MP3/WAV/WebM), Dati (JSON/CSV/TSV/XLSX/XML/YAML/SQL/MD/HTML),
 * Documenti (MD/HTML/TXT/PDF), Archivi ZIP, Unità di Misura, QR Code & Dev.
 * ============================================================================ */

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Stato globale
let imageQueue = [];
let pdfQueue = [];
let splitFileBytes = null;
let splitTotalPages = 0;
let pdfRenderedPages = [];
let batchImageQueue = [];
let convertedBatchImages = [];
let zipCreatorQueue = [];
let extractedZipEntries = [];
let lastConvertedDataOutput = '';
let lastConvertedDataExt = 'json';
let currentAudioFile = null;

// ================= UTILITÀ GENERALI & TOAST =================
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  return bytes >= 1048576
    ? (bytes / 1048576).toFixed(2) + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function showToast(msg) {
  const wrap = document.getElementById('toast-container');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  return blob.size;
}

function downloadPdfBytes(bytes, filename) {
  const name = filename.toLowerCase().endsWith('.pdf') ? filename : filename + '.pdf';
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const size = downloadBlob(blob, name);
  addHistoryEntry('PDF Studio', name, size);
  showToast('PDF scaricato: ' + name);
  return size;
}

function copyTextById(id) {
  const el = document.getElementById(id);
  if (!el || !el.value) return showToast('Nessun testo da copiare');
  navigator.clipboard.writeText(el.value).then(() => showToast('Copiato negli appunti!'));
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

function handleDrop(e, callback) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    callback(e.dataTransfer.files);
  }
}

// ================= TEMA CHIARO / SCURO & STATO RETE =================
function initThemeAndNetwork() {
  const savedTheme = localStorage.getItem('co_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);

  const updateNet = () => {
    const badge = document.getElementById('net-badge');
    if (!badge) return;
    if (navigator.onLine) {
      badge.textContent = '🟢 100% Offline Ready';
      badge.classList.remove('offline-mode');
    } else {
      badge.textContent = '⚡ Modalità Offline Attiva';
      badge.classList.add('offline-mode');
    }
  };
  window.addEventListener('online', updateNet);
  window.addEventListener('offline', updateNet);
  updateNet();
  renderHistoryCount();
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('co_theme', next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️ Chiaro' : '🌙 Scuro';
}

// ================= CRONOLOGIA CONVERSIONI (LOCALSTORAGE) =================
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('co_history') || '[]');
  } catch {
    return [];
  }
}

function addHistoryEntry(category, filename, sizeBytes) {
  const list = getHistory();
  list.unshift({
    category,
    filename,
    size: formatBytes(sizeBytes),
    date: new Date().toLocaleString('it-IT')
  });
  localStorage.setItem('co_history', JSON.stringify(list.slice(0, 35)));
  renderHistoryCount();
}

function renderHistoryCount() {
  const el = document.getElementById('hist-count');
  if (el) el.textContent = getHistory().length;
}

function toggleHistoryModal() {
  const modal = document.getElementById('history-modal');
  modal.hidden = !modal.hidden;
  if (!modal.hidden) {
    const list = getHistory();
    const wrap = document.getElementById('history-list');
    if (list.length === 0) {
      wrap.innerHTML = '<p style="color:var(--muted)">Nessuna conversione effettuata di recente.</p>';
    } else {
      wrap.innerHTML = list.map((h) => `
        <div class="item-card">
          <div>
            <strong>${h.filename}</strong> <span class="pill">${h.category}</span><br/>
            <small style="color:var(--muted)">${h.date} • Peso output: ${h.size}</small>
          </div>
        </div>
      `).join('');
    }
  }
}

function clearHistory() {
  localStorage.removeItem('co_history');
  renderHistoryCount();
  toggleHistoryModal();
  showToast('Cronologia cancellata');
}

// ================= NAVIGAZIONE TABS =================
const ALL_TABS = ['img2pdf', 'pdfstudio', 'sign', 'imgconv', 'media', 'data', 'docs', 'zip', 'units'];
function switchTab(tab) {
  ALL_TABS.forEach((t) => {
    const sec = document.getElementById('sec-' + t);
    const btn = document.getElementById('t-' + t);
    if (sec) sec.hidden = (t !== tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

// ================= 1. FOTO -> PDF =================
function addImages(e) {
  addImagesFromFiles(e.target.files);
  e.target.value = '';
}

function addImagesFromFiles(fileList) {
  const files = Array.from(fileList || []);
  files.forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    imageQueue.push({ id: Date.now() + Math.random(), file, url, size: file.size });
  });
  renderImageThumbs();
}

function moveImageInPdfQueue(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= imageQueue.length) return;
  const tmp = imageQueue[idx];
  imageQueue[idx] = imageQueue[target];
  imageQueue[target] = tmp;
  renderImageThumbs();
}

function removeImage(id) {
  imageQueue = imageQueue.filter((x) => x.id !== id);
  renderImageThumbs();
}

function clearImages() {
  imageQueue = [];
  renderImageThumbs();
  document.getElementById('img2pdf-status').innerHTML = '';
}

function renderImageThumbs() {
  const wrap = document.getElementById('img-thumbs');
  if (imageQueue.length === 0) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = imageQueue.map((item, idx) => `
    <div class="thumb-box">
      <img src="${item.url}" alt="Pag ${idx + 1}" />
      <div style="font-size:0.75rem;margin-top:4px;font-weight:600;">Pag. ${idx + 1} (${formatBytes(item.size)})</div>
      <div style="display:flex;justify-content:center;gap:4px;margin-top:4px;">
        <button class="btn small secondary" onclick="moveImageInPdfQueue(${idx}, -1)" title="Sposta prima">⬅️</button>
        <button class="btn small secondary" onclick="moveImageInPdfQueue(${idx}, 1)" title="Sposta dopo">➡️</button>
        <button class="btn small danger" onclick="removeImage(${item.id})" title="Rimuovi">✕</button>
      </div>
    </div>
  `).join('');
}

function processImageToJpegBytes(url, quality, colorMode) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 2000;
      let w = img.naturalWidth || 800, h = img.naturalHeight || 600;
      if (w > maxDim || h > maxDim) {
        const s = maxDim / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      if (colorMode !== 'color') {
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (colorMode === 'bw') {
            const v = g > 142 ? 255 : Math.max(0, g * 0.5);
            d[i] = d[i + 1] = d[i + 2] = v;
          } else if (colorMode === 'gray') {
            d[i] = d[i + 1] = d[i + 2] = g;
          } else if (colorMode === 'contrast') {
            const factor = 1.35;
            d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
            d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
            d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      c.toBlob(async (blob) => {
        const buf = await blob.arrayBuffer();
        resolve({ bytes: new Uint8Array(buf), width: w, height: h });
      }, 'image/jpeg', quality);
    };
    img.src = url;
  });
}

async function generatePdfFromImages() {
  if (imageQueue.length === 0) return showToast('Seleziona almeno una foto!');
  const { PDFDocument } = window.PDFLib;
  const quality = parseFloat(document.getElementById('img-quality').value);
  const colorMode = document.getElementById('img-color').value;
  const pageSizeMode = document.getElementById('img-pagesize').value;
  const margin = parseInt(document.getElementById('img-margin').value, 10) || 0;
  const outName = document.getElementById('img-pdf-name').value.trim() || 'immagini.pdf';

  const pdfDoc = await PDFDocument.create();
  const origSize = imageQueue.reduce((a, b) => a + b.size, 0);

  for (const item of imageQueue) {
    const { bytes, width, height } = await processImageToJpegBytes(item.url, quality, colorMode);
    const jpgImage = await pdfDoc.embedJpg(bytes);

    let pageW = 595.28, pageH = 841.89;
    if (pageSizeMode === 'a4-l') { pageW = 841.89; pageH = 595.28; }
    else if (pageSizeMode === 'letter') { pageW = 612; pageH = 792; }
    else if (pageSizeMode === 'fit') { pageW = width + margin * 2; pageH = height + margin * 2; }

    const page = pdfDoc.addPage([pageW, pageH]);
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const scale = Math.min(maxW / width, maxH / height);
    const drawW = width * scale;
    const drawH = height * scale;
    page.drawImage(jpgImage, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH
    });
  }

  const pdfBytes = await pdfDoc.save();
  const finalSize = downloadPdfBytes(pdfBytes, outName);
  document.getElementById('img2pdf-status').innerHTML = `
    <div class="item-card">
      <div>✅ <strong>PDF creato e scaricato con successo!</strong><br>
      <small>Peso foto originali: ${formatBytes(origSize)} → Peso PDF finale: <strong>${formatBytes(finalSize)}</strong></small></div>
    </div>`;
}

// ================= 2. STUDIO PDF: UNISCI, ESTRAI, PDF -> IMMAGINI / TESTO =================
async function addPdfToMerge(e) {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    const buf = await f.arrayBuffer();
    pdfQueue.push({ id: Date.now() + Math.random(), name: f.name, size: f.size, bytes: buf });
  }
  e.target.value = '';
  renderMergeList();
}

function movePdf(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= pdfQueue.length) return;
  const tmp = pdfQueue[idx];
  pdfQueue[idx] = pdfQueue[target];
  pdfQueue[target] = tmp;
  renderMergeList();
}

function removePdf(id) {
  pdfQueue = pdfQueue.filter((p) => p.id !== id);
  renderMergeList();
}

function renderMergeList() {
  const wrap = document.getElementById('merge-list');
  if (pdfQueue.length === 0) {
    wrap.innerHTML = '<p style="color:var(--muted)">Nessun PDF in coda.</p>';
    return;
  }
  wrap.innerHTML = pdfQueue.map((p, i) => `
    <div class="item-card">
      <div><strong>${i + 1}. ${p.name}</strong> <small>(${formatBytes(p.size)})</small></div>
      <div>
        <button class="btn small secondary" onclick="movePdf(${i}, -1)">⬆️</button>
        <button class="btn small secondary" onclick="movePdf(${i}, 1)">⬇️</button>
        <button class="btn small danger" onclick="removePdf(${p.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function mergeAllPdfs() {
  if (pdfQueue.length < 2) return showToast('Aggiungi almeno 2 file PDF da unire!');
  const { PDFDocument } = window.PDFLib;
  const mergedPdf = await PDFDocument.create();
  for (const item of pdfQueue) {
    const srcDoc = await PDFDocument.load(item.bytes);
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((p) => mergedPdf.addPage(p));
  }
  const outBytes = await mergedPdf.save();
  downloadPdfBytes(outBytes, document.getElementById('merge-name').value.trim() || 'unito.pdf');
}

async function inspectPdfForSplit(e) {
  const f = e.target.files[0];
  if (!f) return;
  const { PDFDocument } = window.PDFLib;
  splitFileBytes = await f.arrayBuffer();
  const doc = await PDFDocument.load(splitFileBytes);
  splitTotalPages = doc.getPageCount();
  document.getElementById('split-info').textContent =
    `📄 File caricato: ${f.name} (${splitTotalPages} pagine totali, ${formatBytes(f.size)})`;
}

function parsePageRanges(str, maxPages) {
  if (!str.trim()) return Array.from({ length: maxPages }, (_, i) => i);
  const indices = [];
  str.split(',').forEach((part) => {
    const p = part.trim();
    if (p.includes('-')) {
      const [start, end] = p.split('-').map((n) => parseInt(n, 10));
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= maxPages) indices.push(i - 1);
      }
    } else {
      const n = parseInt(p, 10);
      if (n >= 1 && n <= maxPages) indices.push(n - 1);
    }
  });
  return indices;
}

async function processSplitRotate() {
  if (!splitFileBytes) return showToast('Carica prima un file PDF!');
  const { PDFDocument, degrees } = window.PDFLib;
  const srcDoc = await PDFDocument.load(splitFileBytes);
  const newDoc = await PDFDocument.create();
  const rangeStr = document.getElementById('split-pages').value;
  const rotAngle = parseInt(document.getElementById('split-rot').value, 10);
  const outName = document.getElementById('split-out-name').value.trim() || 'pdf-elaborato.pdf';
  const pageIndices = parsePageRanges(rangeStr, srcDoc.getPageCount());

  if (pageIndices.length === 0) return showToast('Nessuna pagina valida selezionata.');

  const copied = await newDoc.copyPages(srcDoc, pageIndices);
  copied.forEach((page) => {
    if (rotAngle !== 0) {
      const cur = page.getRotation().angle;
      page.setRotation(degrees((cur + rotAngle) % 360));
    }
    newDoc.addPage(page);
  });

  const outBytes = await newDoc.save();
  downloadPdfBytes(outBytes, outName);
}

// PDF -> Immagini o Testo via PDF.js
async function convertPdfToImagesOrText() {
  const input = document.getElementById('pdf2img-input');
  if (!input.files[0]) return showToast('Seleziona un file PDF!');
  if (!window.pdfjsLib) return showToast('Libreria PDF.js non caricata.');

  const file = input.files[0];
  const format = document.getElementById('pdf2img-format').value;
  const scale = parseFloat(document.getElementById('pdf2img-scale').value) || 2.0;
  const wrap = document.getElementById('pdf2img-output');
  wrap.innerHTML = '<p style="color:var(--accent)">Elaborazione pagine PDF in corso...</p>';
  pdfRenderedPages = [];

  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;

  if (format === 'txt' || format === 'md') {
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str).join(' ');
      fullText += (format === 'md' ? `## Pagina ${i}\n\n${strings}\n\n---\n\n` : `=== PAGINA ${i} ===\n${strings}\n\n`);
    }
    const ext = format === 'md' ? '.md' : '.txt';
    const outName = file.name.replace(/\.pdf$/i, '') + ext;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, outName);
    addHistoryEntry('PDF → Testo', outName, blob.size);
    wrap.innerHTML = `<div class="item-card" style="grid-column:1/-1;">✅ Testo estratto da ${pdf.numPages} pagine e scaricato come <strong>${outName}</strong>!</div>`;
    return;
  }

  const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const ext = extMap[format] || 'png';
  wrap.innerHTML = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise((res) => canvas.toBlob(res, format, 0.9));
    const url = URL.createObjectURL(blob);
    const filename = `${file.name.replace(/\.pdf$/i, '')}_pag_${i}.${ext}`;
    pdfRenderedPages.push({ filename, blob, url, pageNum: i });

    const card = document.createElement('div');
    card.className = 'thumb-box';
    card.innerHTML = `
      <img src="${url}" alt="Pagina ${i}" />
      <div style="font-size:0.75rem;margin-top:4px;font-weight:600;">Pag. ${i} (${formatBytes(blob.size)})</div>
      <a href="${url}" download="${filename}" class="btn small success" style="margin-top:4px;text-decoration:none;">⬇️ .${ext.toUpperCase()}</a>
    `;
    wrap.appendChild(card);
  }

  document.getElementById('btn-pdf2img-zip').hidden = pdfRenderedPages.length === 0;
  showToast(`Renderizzate ${pdf.numPages} pagine in ${ext.toUpperCase()}!`);
}

async function downloadPdfImagesAsZip() {
  if (pdfRenderedPages.length === 0 || !window.JSZip) return;
  const zip = new window.JSZip();
  pdfRenderedPages.forEach((p) => zip.file(p.filename, p.blob));
  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, 'pagine-pdf-immagini.zip');
  addHistoryEntry('PDF → ZIP Immagini', 'pagine-pdf-immagini.zip', content.size);
}

// ================= 3. FIRMA, TIMBRO & FILIGRANA SU PDF =================
const sigCanvas = document.getElementById('sig-pad');
const sigCtx = sigCanvas ? sigCanvas.getContext('2d') : null;
let drawing = false;
let hasSignature = false;

if (sigCtx) {
  sigCtx.strokeStyle = '#1d4ed8';
  sigCtx.lineWidth = 2.8;
  sigCtx.lineCap = 'round';

  const getPos = (e) => {
    const r = sigCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - r.left) * (sigCanvas.width / r.width),
      y: (clientY - r.top) * (sigCanvas.height / r.height)
    };
  };

  sigCanvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    hasSignature = true;
    const p = getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(p.x, p.y);
  });
  sigCanvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = getPos(e);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
  });
  window.addEventListener('pointerup', () => { drawing = false; });
}

function updateSignatureColor() {
  if (sigCtx) sigCtx.strokeStyle = document.getElementById('sign-color').value;
}

function clearSignaturePad() {
  if (!sigCtx) return;
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasSignature = false;
}

function loadStampIntoCanvas(e) {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    clearSignaturePad();
    const scale = Math.min(sigCanvas.width / img.width, sigCanvas.height / img.height) * 0.85;
    const w = img.width * scale, h = img.height * scale;
    sigCtx.drawImage(img, (sigCanvas.width - w) / 2, (sigCanvas.height - h) / 2, w, h);
    hasSignature = true;
  };
  img.src = URL.createObjectURL(f);
}

async function signPdfDocument() {
  const f = document.getElementById('sign-pdf-input').files[0];
  if (!f) return showToast('Carica il file PDF da firmare!');
  const text = document.getElementById('sign-text').value.trim();
  const watermark = document.getElementById('sign-watermark').value.trim();
  if (!hasSignature && !text && !watermark) return showToast('Disegna la firma, inserisci un testo o una filigrana!');

  const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(await f.arrayBuffer());
  const pages = pdfDoc.getPages();
  const posMode = document.getElementById('sign-page-pos').value;
  const corner = document.getElementById('sign-corner').value;

  let targetPages = pages;
  if (posMode === 'last') targetPages = [pages[pages.length - 1]];
  else if (posMode === 'first') targetPages = [pages[0]];

  let pngImage = null;
  if (hasSignature) {
    const pngDataUrl = sigCanvas.toDataURL('image/png');
    pngImage = await pdfDoc.embedPng(pngDataUrl);
  }
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (watermark) {
    pages.forEach((p) => {
      const { width, height } = p.getSize();
      p.drawText(watermark, {
        x: width * 0.18,
        y: height * 0.35,
        size: 38,
        font,
        color: rgb(0.75, 0.75, 0.8),
        rotate: degrees(35),
        opacity: 0.28
      });
    });
  }

  targetPages.forEach((page) => {
    const { width, height } = page.getSize();
    const sigW = 155, sigH = 52;
    let x = width - sigW - 35;
    let y = 42;
    if (corner === 'bl') x = 35;
    if (corner === 'bc') x = (width - sigW) / 2;
    if (corner === 'tr') { x = width - sigW - 35; y = height - sigH - 45; }

    if (pngImage) {
      page.drawImage(pngImage, { x, y, width: sigW, height: sigH });
    }
    if (text) {
      page.drawText(text, { x, y: y - 14, size: 9.5, font, color: rgb(0.1, 0.15, 0.3) });
    }
  });

  const outBytes = await pdfDoc.save();
  downloadPdfBytes(outBytes, 'firmato-' + f.name);
}

// ================= 4. CONVERTITORE IMMAGINI UNIVERSALE (PNG, JPG, WEBP, AVIF, ICO, BMP, SVG, BASE64) =================
function addBatchImages(fileList) {
  const files = Array.from(fileList || []);
  files.forEach((f) => {
    if (!f.type.startsWith('image/')) return;
    batchImageQueue.push({ id: Date.now() + Math.random(), file: f, name: f.name, size: f.size });
  });
  renderBatchImageList();
}

function clearBatchImages() {
  batchImageQueue = [];
  convertedBatchImages = [];
  document.getElementById('btn-img-zip').hidden = true;
  renderBatchImageList();
}

function renderBatchImageList() {
  const wrap = document.getElementById('conv-img-list');
  if (batchImageQueue.length === 0) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = batchImageQueue.map((item) => `
    <div class="item-card">
      <div>🖼️ <strong>${item.name}</strong> <small>(${formatBytes(item.size)})</small></div>
      <div id="status-${Math.floor(item.id * 1000)}"><span class="pill">In attesa</span></div>
    </div>
  `).join('');
}

// Generatore binario reale di file .ICO (con PNG 64x64 incapsulato secondo specifica Windows ICO)
async function canvasToIcoBlob(sourceCanvas) {
  const icoSize = 64;
  const c = document.createElement('canvas');
  c.width = icoSize;
  c.height = icoSize;
  const ctx = c.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, icoSize, icoSize);
  const pngBlob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  const headerSize = 6 + 16;
  const total = new Uint8Array(headerSize + pngBytes.length);
  const view = new DataView(total.buffer);
  // ICONDIR
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true); // Type 1 = ICO
  view.setUint16(4, 1, true); // 1 image
  // ICONDIRENTRY
  total[6] = icoSize;
  total[7] = icoSize;
  total[8] = 0;
  total[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true); // 32 bpp
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, headerSize, true);
  total.set(pngBytes, headerSize);
  return new Blob([total], { type: 'image/x-icon' });
}

async function runBatchImageConversion() {
  if (batchImageQueue.length === 0) return showToast('Aggiungi almeno un’immagine!');
  const fmt = document.getElementById('conv-img-format').value;
  const quality = parseInt(document.getElementById('conv-img-quality').value, 10) / 100;
  const maxW = parseInt(document.getElementById('conv-img-maxw').value, 10) || 0;
  convertedBatchImages = [];

  for (const item of batchImageQueue) {
    const img = new Image();
    const url = URL.createObjectURL(item.file);
    await new Promise((res) => { img.onload = res; img.src = url; });

    let w = img.naturalWidth || 512, h = img.naturalHeight || 512;
    if (maxW > 0 && w > maxW) {
      h = Math.round(h * (maxW / w));
      w = maxW;
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (fmt === 'jpeg' || fmt === 'bmp') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    let outBlob = null;
    let outExt = fmt;

    if (fmt === 'ico') {
      outBlob = await canvasToIcoBlob(canvas);
    } else if (fmt === 'svg') {
      const dataUri = canvas.toDataURL('image/png');
      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  <image href="${dataUri}" width="${w}" height="${h}" />\n</svg>`;
      outBlob = new Blob([svgStr], { type: 'image/svg+xml' });
    } else if (fmt === 'base64') {
      const dataUri = canvas.toDataURL('image/webp', quality);
      outBlob = new Blob([dataUri], { type: 'text/plain' });
      outExt = 'base64.txt';
    } else {
      const mime = fmt === 'bmp' ? 'image/bmp' : `image/${fmt}`;
      outBlob = await new Promise((r) => canvas.toBlob(r, mime, quality));
      if (!outBlob) outBlob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      if (fmt === 'jpeg') outExt = 'jpg';
    }

    const outName = `${baseName}.${outExt}`;
    const outUrl = URL.createObjectURL(outBlob);
    convertedBatchImages.push({ name: outName, blob: outBlob, url: outUrl });

    const statusEl = document.getElementById(`status-${Math.floor(item.id * 1000)}`);
    if (statusEl) {
      statusEl.innerHTML = `<a href="${outUrl}" download="${outName}" class="btn small success" style="text-decoration:none;">⬇️ Scarica ${outName} (${formatBytes(outBlob.size)})</a>`;
    }

    if (batchImageQueue.length === 1) {
      downloadBlob(outBlob, outName);
      addHistoryEntry('Immagini → ' + outExt.toUpperCase(), outName, outBlob.size);
    }
  }

  document.getElementById('btn-img-zip').hidden = convertedBatchImages.length < 2;
  showToast('Conversione immagini completata!');
}

async function downloadConvertedImagesZip() {
  if (convertedBatchImages.length === 0 || !window.JSZip) return;
  const zip = new window.JSZip();
  convertedBatchImages.forEach((f) => zip.file(f.name, f.blob));
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'immagini-convertite.zip');
  addHistoryEntry('Batch Immagini ZIP', 'immagini-convertite.zip', blob.size);
}

// ================= 5. AUDIO & VIDEO CONVERTER (WAV / MP3 / WEBM / FRAME) =================
function inspectAudioFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  currentAudioFile = f;
  document.getElementById('audio-info').textContent =
    `🎵 File selezionato: ${f.name} (${formatBytes(f.size)}) — Pronto per la conversione.`;
}

function encodeAudioBufferToWav(audioBuffer, bitDepth = 16) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = bitDepth === 24 ? 3 : 2;
  const numFrames = audioBuffer.length;
  const dataSize = numFrames * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let c = 0; c < numChannels; c++) channels.push(audioBuffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      if (bitDepth === 24) {
        const s = Math.floor(sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF);
        view.setUint8(offset, s & 0xFF);
        view.setUint8(offset + 1, (s >> 8) & 0xFF);
        view.setUint8(offset + 2, (s >> 16) & 0xFF);
        offset += 3;
      } else {
        const s = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, s, true);
        offset += 2;
      }
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function encodeAudioBufferToMp3(audioBuffer, kbps = 192) {
  if (!window.lamejs) throw new Error('Encoder MP3 (lamejs) non disponibile.');
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const mp3enc = new window.lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
  const mp3Data = [];

  const floatTo16Bit = (arr) => {
    const out = new Int16Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      const s = Math.max(-1, Math.min(1, arr[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  };

  const left = floatTo16Bit(audioBuffer.getChannelData(0));
  const right = numChannels > 1 ? floatTo16Bit(audioBuffer.getChannelData(1)) : left;
  const blockSize = 1152;

  for (let i = 0; i < left.length; i += blockSize) {
    const lChunk = left.subarray(i, i + blockSize);
    const rChunk = right.subarray(i, i + blockSize);
    const buf = numChannels === 1
      ? mp3enc.encodeBuffer(lChunk)
      : mp3enc.encodeBuffer(lChunk, rChunk);
    if (buf.length > 0) mp3Data.push(buf);
  }
  const endBuf = mp3enc.flush();
  if (endBuf.length > 0) mp3Data.push(endBuf);
  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

async function convertAudioTrack() {
  if (!currentAudioFile) return showToast('Seleziona prima un file Audio o Video!');
  const outFormat = document.getElementById('audio-out-format').value;
  const targetRate = parseInt(document.getElementById('audio-samplerate').value, 10) || 44100;
  const targetCh = parseInt(document.getElementById('audio-channels').value, 10) || 2;
  const trimStart = parseFloat(document.getElementById('audio-trim-start').value) || 0;
  const trimEnd = parseFloat(document.getElementById('audio-trim-end').value) || 0;

  const progWrap = document.getElementById('audio-progress-wrap');
  const progBar = document.getElementById('audio-progress-bar');
  progWrap.hidden = false;
  progBar.style.width = '25%';

  try {
    const arrayBuf = await currentAudioFile.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuf);
    progBar.style.width = '55%';

    const startSec = Math.min(trimStart, decoded.duration);
    const endSec = (trimEnd > startSec && trimEnd <= decoded.duration) ? trimEnd : decoded.duration;
    const duration = Math.max(0.1, endSec - startSec);

    const offlineCtx = new OfflineAudioContext(targetCh, Math.ceil(duration * targetRate), targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0, startSec, duration);

    const rendered = await offlineCtx.startRendering();
    progBar.style.width = '80%';

    const baseName = currentAudioFile.name.replace(/\.[^/.]+$/, '');
    let outBlob, outName;

    if (outFormat.startsWith('mp3')) {
      const kbps = parseInt(outFormat.split('-')[1], 10) || 192;
      outBlob = encodeAudioBufferToMp3(rendered, kbps);
      outName = `${baseName}-${kbps}kbps.mp3`;
    } else {
      const bitDepth = outFormat === 'wav-24' ? 24 : 16;
      outBlob = encodeAudioBufferToWav(rendered, bitDepth);
      outName = `${baseName}-${bitDepth}bit.wav`;
    }

    progBar.style.width = '100%';
    downloadBlob(outBlob, outName);
    addHistoryEntry('Audio Converter', outName, outBlob.size);

    const audioUrl = URL.createObjectURL(outBlob);
    document.getElementById('audio-output-box').innerHTML = `
      <div class="item-card">
        <div>✅ <strong>${outName}</strong> (${formatBytes(outBlob.size)}) pronto!</div>
        <audio controls src="${audioUrl}" style="height:36px;"></audio>
      </div>`;
  } catch (err) {
    showToast('Errore decodifica audio: ' + err.message);
  }
}

// Video Tools
function loadVideoForTools(e) {
  const f = e.target.files[0];
  if (!f) return;
  const v = document.getElementById('video-preview');
  v.src = URL.createObjectURL(f);
  document.getElementById('video-workspace').hidden = false;
}

function captureVideoFrame() {
  const v = document.getElementById('video-preview');
  if (!v.videoWidth) return showToast('Carica e avvia prima un video!');
  const fmt = document.getElementById('video-frame-fmt').value;
  const ext = fmt.split('/')[1] === 'jpeg' ? 'jpg' : fmt.split('/')[1];

  const c = document.createElement('canvas');
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  c.toBlob((blob) => {
    const name = `frame-${Math.round(v.currentTime)}s.${ext}`;
    downloadBlob(blob, name);
    addHistoryEntry('Video Frame', name, blob.size);
    showToast('Fotogramma scaricato: ' + name);
  }, fmt, 0.92);
}

function recordVideoToWebm() {
  const v = document.getElementById('video-preview');
  if (!v.captureStream && !v.mozCaptureStream) {
    return showToast('Il tuo browser non supporta captureStream diretto.');
  }
  const stream = v.captureStream ? v.captureStream() : v.mozCaptureStream();
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    downloadBlob(blob, 'clip-convertita.webm');
    addHistoryEntry('Video → WebM', 'clip-convertita.webm', blob.size);
  };
  v.play();
  rec.start();
  showToast('Registrazione WebM di 5 secondi avviata...');
  setTimeout(() => {
    if (rec.state === 'recording') rec.stop();
    v.pause();
  }, 5000);
}

// ================= 6. DATI, CSV, JSON, EXCEL (.XLSX), XML, YAML, SQL =================
async function loadDataFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  const ext = f.name.split('.').pop().toLowerCase();

  if ((ext === 'xlsx' || ext === 'xls') && window.XLSX) {
    const buf = await f.arrayBuffer();
    const wb = window.XLSX.read(buf, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const json = window.XLSX.utils.sheet_to_json(firstSheet);
    document.getElementById('data-input-text').value = JSON.stringify(json, null, 2);
    document.getElementById('data-in-fmt').value = 'json';
    showToast('Foglio Excel caricato e convertito in tabella dati!');
    return;
  }

  const text = await f.text();
  document.getElementById('data-input-text').value = text;
  if (['json', 'csv', 'tsv', 'yaml', 'xml'].includes(ext)) {
    document.getElementById('data-in-fmt').value = ext;
  }
}

function parseInputDataToObjects(rawText, fmt) {
  const text = rawText.trim();
  if (!text) return [];

  if (fmt === 'auto') {
    if (text.startsWith('[') || text.startsWith('{')) fmt = 'json';
    else if (text.startsWith('<')) fmt = 'xml';
    else if (text.includes('\t') && !text.includes(',')) fmt = 'tsv';
    else fmt = 'csv';
  }

  if (fmt === 'json') {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  if (fmt === 'csv' || fmt === 'tsv') {
    if (window.XLSX) {
      const wb = window.XLSX.read(text, { type: 'string', FS: fmt === 'tsv' ? '\t' : ',' });
      return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    }
  }

  if (fmt === 'yaml') {
    // Parser YAML tabellare leggero per array di oggetti
    const blocks = text.split(/^\s*-\s+/m).filter((b) => b.trim());
    return blocks.map((b) => {
      const obj = {};
      b.split('\n').forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const k = line.slice(0, idx).trim();
          const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (k) obj[k] = v;
        }
      });
      return obj;
    });
  }

  if (fmt === 'xml') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const rows = Array.from(xmlDoc.documentElement.children);
    return rows.map((r) => {
      const obj = {};
      Array.from(r.children).forEach((c) => { obj[c.tagName] = c.textContent; });
      return obj;
    });
  }

  return [];
}

function objectsToOutputFormat(rows, outFmt) {
  if (!rows || rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  if (outFmt === 'json') return JSON.stringify(rows, null, 2);

  if (outFmt === 'csv' || outFmt === 'tsv') {
    const sep = outFmt === 'tsv' ? '\t' : ',';
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return s.includes(sep) || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(esc).join(sep)];
    rows.forEach((r) => lines.push(headers.map((h) => esc(r[h])).join(sep)));
    return lines.join('\n');
  }

  if (outFmt === 'yaml') {
    return rows.map((r) => {
      return headers.map((h, i) => `${i === 0 ? '- ' : '  '}${h}: ${JSON.stringify(r[h] ?? '')}`).join('\n');
    }).join('\n');
  }

  if (outFmt === 'xml') {
    const escXml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const items = rows.map((r) => {
      const fields = headers.map((h) => `    <${h}>${escXml(r[h])}</${h}>`).join('\n');
      return `  <record>\n${fields}\n  </record>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<dataset>\n${items}\n</dataset>`;
  }

  if (outFmt === 'sql') {
    const cols = headers.map((h) => `\`${h}\``).join(', ');
    return rows.map((r) => {
      const vals = headers.map((h) => {
        const v = r[h];
        if (typeof v === 'number') return v;
        if (typeof v === 'boolean') return v ? 1 : 0;
        return `'${String(v ?? '').replace(/'/g, "''")}'`;
      }).join(', ');
      return `INSERT INTO \`tabella_dati\` (${cols}) VALUES (${vals});`;
    }).join('\n');
  }

  if (outFmt === 'md') {
    const head = `| ${headers.join(' | ')} |`;
    const sep = `| ${headers.map(() => '---').join(' | ')} |`;
    const body = rows.map((r) => `| ${headers.map((h) => String(r[h] ?? '')).join(' | ')} |`).join('\n');
    return `${head}\n${sep}\n${body}`;
  }

  if (outFmt === 'html') {
    const ths = headers.map((h) => `      <th>${h}</th>`).join('\n');
    const trs = rows.map((r) => {
      const tds = headers.map((h) => `      <td>${r[h] ?? ''}</td>`).join('\n');
      return `    <tr>\n${tds}\n    </tr>`;
    }).join('\n');
    return `<table>\n  <thead>\n    <tr>\n${ths}\n    </tr>\n  </thead>\n  <tbody>\n${trs}\n  </tbody>\n</table>`;
  }

  return JSON.stringify(rows, null, 2);
}

function convertDataFormats() {
  const raw = document.getElementById('data-input-text').value;
  const inFmt = document.getElementById('data-in-fmt').value;
  const outFmt = document.getElementById('data-out-fmt').value;

  try {
    const rows = parseInputDataToObjects(raw, inFmt);
    if (rows.length === 0) return showToast('Inserisci o carica dei dati validi!');

    if (outFmt === 'xlsx' && window.XLSX) {
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'DatiConvertiti');
      const outBuf = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      downloadBlob(blob, 'dati-convertiti.xlsx');
      addHistoryEntry('Dati → Excel XLSX', 'dati-convertiti.xlsx', blob.size);
      document.getElementById('data-output-text').value = '✅ File Excel (.xlsx) generato e scaricato automaticamente!';
      return;
    }

    const res = objectsToOutputFormat(rows, outFmt);
    document.getElementById('data-output-text').value = res;
    lastConvertedDataOutput = res;
    lastConvertedDataExt = outFmt;
    showToast('Dati convertiti in ' + outFmt.toUpperCase());
  } catch (err) {
    showToast('Errore formato dati: ' + err.message);
  }
}

function swapDataInputOutput() {
  const inEl = document.getElementById('data-input-text');
  const outEl = document.getElementById('data-output-text');
  if (!outEl.value) return;
  inEl.value = outEl.value;
  document.getElementById('data-in-fmt').value = 'auto';
}

function downloadConvertedData() {
  const text = document.getElementById('data-output-text').value;
  if (!text) return showToast('Converti prima i dati!');
  const ext = document.getElementById('data-out-fmt').value;
  const filename = `dati-convertiti.${ext}`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
  addHistoryEntry('Dati → ' + ext.toUpperCase(), filename, blob.size);
}

function loadSampleData() {
  const sample = [
    { id: 101, prodotto: 'Monitor 4K Ultra', categoria: 'Elettronica', prezzo_eur: 349.90, disponibile: true },
    { id: 102, prodotto: 'Tastiera Meccanica', categoria: 'Accessori', prezzo_eur: 89.50, disponibile: true },
    { id: 103, prodotto: 'SSD NVMe 2TB', categoria: 'Storage', prezzo_eur: 159.00, disponibile: false }
  ];
  document.getElementById('data-input-text').value = JSON.stringify(sample, null, 2);
  document.getElementById('data-in-fmt').value = 'json';
  convertDataFormats();
}

// ================= 7. DOCUMENTI MARKDOWN, HTML, TXT, PDF =================
async function loadDocFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  document.getElementById('doc-input').value = await f.text();
  document.getElementById('doc-out-name').value = f.name.replace(/\.[^/.]+$/, '');
}

async function convertDocument() {
  const src = document.getElementById('doc-input').value;
  if (!src.trim()) return showToast('Inserisci del testo o carica un documento!');
  const mode = document.getElementById('doc-conv-mode').value;
  const outEl = document.getElementById('doc-output');

  if (mode === 'md2html') {
    const body = window.marked ? window.marked.parse(src) : `<pre>${src}</pre>`;
    outEl.value = `<!DOCTYPE html>\n<html lang="it">\n<head>\n  <meta charset="UTF-8">\n  <title>Documento</title>\n</head>\n<body>\n${body}</body>\n</html>`;
  } else if (mode === 'md2txt' || mode === 'html2txt') {
    const html = mode === 'md2txt' && window.marked ? window.marked.parse(src) : src;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    outEl.value = tmp.textContent || tmp.innerText || '';
  } else if (mode === 'html2md') {
    let md = src
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**')
      .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '');
    outEl.value = md.trim();
  } else if (mode === 'txt2pdf') {
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const lines = src.replace(/\r/g, '').split('\n');
    let page = pdfDoc.addPage([595.28, 841.89]);
    let y = 795;

    for (const rawLine of lines) {
      const clean = rawLine.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
      const chunks = clean.match(/.{1,82}/g) || [''];
      for (const ch of chunks) {
        if (y < 50) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = 795;
        }
        page.drawText(ch, { x: 45, y, size: 11, font, color: rgb(0.1, 0.1, 0.15) });
        y -= 16;
      }
    }
    const bytes = await pdfDoc.save();
    const name = document.getElementById('doc-out-name').value.trim() || 'documento';
    downloadPdfBytes(bytes, name + '.pdf');
    outEl.value = '✅ Documento PDF A4 generato e scaricato!';
    return;
  }
  showToast('Documento convertito!');
}

function downloadConvertedDoc() {
  const out = document.getElementById('doc-output').value;
  if (!out) return showToast('Converti prima il documento!');
  const mode = document.getElementById('doc-conv-mode').value;
  const extMap = { md2html: 'html', md2txt: 'txt', html2md: 'md', html2txt: 'txt', txt2pdf: 'txt' };
  const ext = extMap[mode] || 'txt';
  const base = document.getElementById('doc-out-name').value.trim() || 'documento';
  const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${base}.${ext}`);
  addHistoryEntry('Documento → ' + ext.toUpperCase(), `${base}.${ext}`, blob.size);
}

// ================= 8. ARCHIVI ZIP (CREA & ESTRAI) =================
function addFilesToZipCreator(e) {
  const files = Array.from(e.target.files || []);
  files.forEach((f) => zipCreatorQueue.push(f));
  e.target.value = '';
  renderZipCreatorList();
}

function renderZipCreatorList() {
  const wrap = document.getElementById('zip-create-list');
  if (zipCreatorQueue.length === 0) {
    wrap.innerHTML = '<p style="color:var(--muted)">Nessun file selezionato.</p>';
    return;
  }
  wrap.innerHTML = zipCreatorQueue.map((f, i) => `
    <div class="item-card">
      <div>📄 <strong>${f.name}</strong> <small>(${formatBytes(f.size)})</small></div>
      <button class="btn small danger" onclick="zipCreatorQueue.splice(${i},1);renderZipCreatorList()">✕</button>
    </div>
  `).join('');
}

async function generateZipArchive() {
  if (zipCreatorQueue.length === 0 || !window.JSZip) return showToast('Aggiungi almeno un file!');
  const zip = new window.JSZip();
  const level = parseInt(document.getElementById('zip-level').value, 10);
  zipCreatorQueue.forEach((f) => zip.file(f.name, f));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: level === 0 ? 'STORE' : 'DEFLATE',
    compressionOptions: { level: level || 6 }
  });
  let name = document.getElementById('zip-out-name').value.trim() || 'archivio.zip';
  if (!name.toLowerCase().endsWith('.zip')) name += '.zip';
  downloadBlob(blob, name);
  addHistoryEntry('Crea ZIP', name, blob.size);
  showToast('Archivio ZIP creato e scaricato!');
}

async function extractZipArchive(e) {
  const f = e.target.files[0];
  if (!f || !window.JSZip) return;
  const wrap = document.getElementById('zip-extract-list');
  wrap.innerHTML = '<p style="color:var(--accent)">Lettura archivio ZIP in corso...</p>';
  extractedZipEntries = [];

  const zip = await window.JSZip.loadAsync(f);
  const itemsHtml = [];
  let idx = 0;

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const blob = await zipEntry.async('blob');
    const url = URL.createObjectURL(blob);
    const cleanName = relativePath.split('/').pop() || relativePath;
    extractedZipEntries.push({ name: cleanName, url, size: blob.size });
    itemsHtml.push(`
      <div class="item-card">
        <div>📄 <strong>${relativePath}</strong> <small>(${formatBytes(blob.size)})</small></div>
        <a href="${url}" download="${cleanName}" class="btn small success" style="text-decoration:none;">⬇️ Scarica File</a>
      </div>
    `);
    idx++;
  }
  wrap.innerHTML = itemsHtml.length > 0 ? itemsHtml.join('') : '<p>Archivio vuoto.</p>';
  showToast(`Trovati ${idx} file nell'archivio ZIP!`);
}

// ================= 9. UNITÀ DI MISURA, QR CODE, COLORI & DEV TOOLS =================
const UNIT_DEFS = {
  length: {
    m: { label: 'Metri (m)', factor: 1 },
    km: { label: 'Chilometri (km)', factor: 1000 },
    cm: { label: 'Centimetri (cm)', factor: 0.01 },
    mm: { label: 'Millimetri (mm)', factor: 0.001 },
    in: { label: 'Pollici (in)', factor: 0.0254 },
    ft: { label: 'Piedi (ft)', factor: 0.3048 },
    mi: { label: 'Miglia (mi)', factor: 1609.344 }
  },
  weight: {
    kg: { label: 'Chilogrammi (kg)', factor: 1 },
    g: { label: 'Grammi (g)', factor: 0.001 },
    mg: { label: 'Milligrammi (mg)', factor: 0.000001 },
    t: { label: 'Tonnellate (t)', factor: 1000 },
    lb: { label: 'Libbre (lb)', factor: 0.45359237 },
    oz: { label: 'Once (oz)', factor: 0.02834952 }
  },
  data: {
    B: { label: 'Byte (B)', factor: 1 },
    KB: { label: 'Kilobyte (KB - 10³)', factor: 1e3 },
    MB: { label: 'Megabyte (MB - 10⁶)', factor: 1e6 },
    GB: { label: 'Gigabyte (GB - 10⁹)', factor: 1e9 },
    TB: { label: 'Terabyte (TB - 10¹²)', factor: 1e12 },
    KiB: { label: 'Kibibyte (KiB - 2¹⁰)', factor: 1024 },
    MiB: { label: 'Mebibyte (MiB - 2²⁰)', factor: 1048576 },
    GiB: { label: 'Gibibyte (GiB - 2³⁰)', factor: 1073741824 }
  },
  speed: {
    kmh: { label: 'Chilometri orari (km/h)', factor: 1 },
    ms: { label: 'Metri al secondo (m/s)', factor: 3.6 },
    mph: { label: 'Miglia orarie (mph)', factor: 1.609344 },
    kn: { label: 'Nodi (kn)', factor: 1.852 }
  },
  area: {
    m2: { label: 'Metri quadri (m²)', factor: 1 },
    km2: { label: 'Chilometri quadri (km²)', factor: 1e6 },
    ha: { label: 'Ettari (ha)', factor: 10000 },
    ft2: { label: 'Piedi quadri (ft²)', factor: 0.092903 },
    ac: { label: 'Acri (ac)', factor: 4046.856 }
  },
  volume: {
    l: { label: 'Litri (L)', factor: 1 },
    ml: { label: 'Millilitri (mL)', factor: 0.001 },
    m3: { label: 'Metri cubi (m³)', factor: 1000 },
    gal: { label: 'Galloni USA (gal)', factor: 3.78541 },
    floz: { label: 'Once fluide USA (fl oz)', factor: 0.0295735 }
  },
  time: {
    s: { label: 'Secondi (s)', factor: 1 },
    min: { label: 'Minuti (min)', factor: 60 },
    h: { label: 'Ore (h)', factor: 3600 },
    d: { label: 'Giorni (d)', factor: 86400 },
    wk: { label: 'Settimane', factor: 604800 }
  },
  temp: {
    C: { label: 'Gradi Celsius (°C)' },
    F: { label: 'Gradi Fahrenheit (°F)' },
    K: { label: 'Kelvin (K)' }
  }
};

function populateUnitSelects() {
  const cat = document.getElementById('unit-cat').value;
  const fromSel = document.getElementById('unit-from');
  const toSel = document.getElementById('unit-to');
  const units = UNIT_DEFS[cat];
  const keys = Object.keys(units);
  fromSel.innerHTML = keys.map((k) => `<option value="${k}">${units[k].label}</option>`).join('');
  toSel.innerHTML = keys.map((k, i) => `<option value="${k}" ${i === 1 ? 'selected' : ''}>${units[k].label}</option>`).join('');
  computeUnitConversion();
}

function swapUnits() {
  const f = document.getElementById('unit-from');
  const t = document.getElementById('unit-to');
  const tmp = f.value;
  f.value = t.value;
  t.value = tmp;
  computeUnitConversion();
}

function computeUnitConversion() {
  const cat = document.getElementById('unit-cat').value;
  const val = parseFloat(document.getElementById('unit-val').value);
  const from = document.getElementById('unit-from').value;
  const to = document.getElementById('unit-to').value;
  const resEl = document.getElementById('unit-res');
  if (isNaN(val)) { resEl.value = ''; return; }

  if (cat === 'temp') {
    let c = val;
    if (from === 'F') c = (val - 32) * (5 / 9);
    if (from === 'K') c = val - 273.15;
    let out = c;
    if (to === 'F') out = c * (9 / 5) + 32;
    if (to === 'K') out = c + 273.15;
    resEl.value = `${Number(out.toFixed(4))} °${to}`;
    return;
  }

  const base = val * UNIT_DEFS[cat][from].factor;
  const out = base / UNIT_DEFS[cat][to].factor;
  resEl.value = `${Number(out.toPrecision(7))} ${to}`;
}

// QR Code Generator
function generateQrCode() {
  const text = document.getElementById('qr-text').value.trim() || 'https://github.com';
  const wrap = document.getElementById('qr-preview');
  if (!window.qrcode || !wrap) return;
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  wrap.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
}

function downloadQrCode(fmt) {
  const svgEl = document.querySelector('#qr-preview svg');
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);

  if (fmt === 'svg') {
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    downloadBlob(blob, 'qrcode.svg');
    addHistoryEntry('QR Code', 'qrcode.svg', blob.size);
    return;
  }

  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(img, 0, 0, 512, 512);
    c.toBlob((blob) => {
      downloadBlob(blob, 'qrcode.png');
      addHistoryEntry('QR Code', 'qrcode.png', blob.size);
    }, 'image/png');
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
}

// Convertitore Colori
function updateColorFromHex(hex) {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return;
  document.getElementById('col-picker').value = '#' + clean;
  document.getElementById('col-hex').value = '#' + clean.toLowerCase();

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  // HSL
  const r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
      case g1: h = (b1 - r1) / d + 2; break;
      case b1: h = (r1 - g1) / d + 4; break;
    }
    h /= 6;
  }

  // CMYK
  const k = 1 - max;
  const c = k === 1 ? 0 : (1 - r1 - k) / (1 - k);
  const m = k === 1 ? 0 : (1 - g1 - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - b1 - k) / (1 - k);

  document.getElementById('col-rgb-hsl').value =
    `rgb(${r}, ${g}, ${b}) | hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  document.getElementById('col-cmyk').value =
    `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;
}

// Dev Encodings & SHA-256
async function runDevEncoding() {
  const mode = document.getElementById('dev-mode').value;
  const val = document.getElementById('dev-in').value;
  const outEl = document.getElementById('dev-out');
  if (!val) { outEl.value = ''; return; }

  try {
    if (mode === 'b64enc') outEl.value = btoa(unescape(encodeURIComponent(val)));
    else if (mode === 'b64dec') outEl.value = decodeURIComponent(escape(atob(val)));
    else if (mode === 'urlenc') outEl.value = encodeURIComponent(val);
    else if (mode === 'urldec') outEl.value = decodeURIComponent(val);
    else if (mode === 'hexenc') {
      outEl.value = Array.from(val).map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
    } else if (mode === 'binenc') {
      outEl.value = Array.from(val).map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    } else if (mode === 'sha256') {
      const buf = new TextEncoder().encode(val);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      outEl.value = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    outEl.value = 'Input non valido per la decodifica selezionata';
  }
}

// ================= INSTALLAZIONE PWA =================
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

async function triggerInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  } else {
    showToast('Su Chrome/Android: tocca ⋮ in alto a destra → "Installa app" o "Aggiungi a schermata Home".');
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initThemeAndNetwork();
  populateUnitSelects();
  updateColorFromHex('#3b82f6');
  generateQrCode();
});
