if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const MODULES = [
  { id: 'img2pdf',   emoji: '🖼️', title: 'Foto → PDF',     cat: 'PDF Studio', color: '#3b82f6' },
  { id: 'pdfstudio', emoji: '📑', title: 'Gestione PDF',   cat: 'PDF Studio', color: '#6366f1' },
  { id: 'sign',      emoji: '✍️', title: 'Firma PDF',      cat: 'PDF Studio', color: '#8b5cf6' },
  { id: 'imgconv',   emoji: '🎨', title: 'Immagini',       cat: 'Multimedia', color: '#ec4899' },
  { id: 'media',     emoji: '🎵', title: 'Audio / Video',  cat: 'Multimedia', color: '#f43f5e' },
  { id: 'data',      emoji: '📊', title: 'Dati & Excel',   cat: 'Office',     color: '#f59e0b' },
  { id: 'docs',      emoji: '📝', title: 'Markdown',       cat: 'Office',     color: '#eab308' },
  { id: 'zip',       emoji: '📦', title: 'Archivi ZIP',    cat: 'Utility',    color: '#10b981' },
  { id: 'units',     emoji: '📐', title: 'Unità & QR',     cat: 'Utility',    color: '#06b6d4' }
];

function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildDonut() {
  const svg = document.getElementById('donut-svg'), list = document.getElementById('module-list-container');
  if (!svg || !list) return;
  const cx = 200, cy = 200, rIn = 95, rOut = 185, step = 360 / MODULES.length;
  let svgHtml = '', listHtml = '';

  MODULES.forEach((mod, i) => {
    const sDeg = i * step, eDeg = (i + 1) * step, mDeg = sDeg + step / 2;
    const p1 = polarToCartesian(cx, cy, rOut, eDeg), p2 = polarToCartesian(cx, cy, rOut, sDeg);
    const p3 = polarToCartesian(cx, cy, rIn, eDeg), p4 = polarToCartesian(cx, cy, rIn, sDeg);
    const arc = step <= 180 ? '0' : '1';
    const d = `M ${p1.x} ${p1.y} A ${rOut} ${rOut} 0 ${arc} 0 ${p2.x} ${p2.y} L ${p4.x} ${p4.y} A ${rIn} ${rIn} 0 ${arc} 1 ${p3.x} ${p3.y} Z`;
    const iconPos = polarToCartesian(cx, cy, (rIn + rOut) / 2, mDeg);

    svgHtml += `<g onclick="switchTab('${mod.id}')" onmouseenter="previewCenter('${mod.id}')" onmouseleave="restoreCenter()">
      <path id="slice-${mod.id}" class="donut-slice" d="${d}" fill="${mod.color}" />
      <text class="donut-icon" x="${iconPos.x}" y="${iconPos.y}">${mod.emoji}</text></g>`;

    listHtml += `<div id="list-${mod.id}" class="mod-item" onclick="switchTab('${mod.id}')"><span class="mod-emj">${mod.emoji}</span><span class="mod-txt">${mod.title}</span></div>`;
  });
  svg.innerHTML = svgHtml; list.innerHTML = listHtml;
}

let activeTab = null;
function updateCenter(mod) {
  if (!mod) return;
  document.getElementById('hole-emoji').textContent = mod.emoji;
  document.getElementById('hole-title').textContent = mod.title;
  document.getElementById('hole-cat').textContent = mod.cat;
  document.getElementById('donut-hole').style.borderColor = mod.color;
  document.getElementById('hole-cat').style.color = mod.color;
}
function previewCenter(id) { updateCenter(MODULES.find(m => m.id === id)); }
function restoreCenter() { updateCenter(MODULES.find(m => m.id === activeTab) || {emoji:'⚡', title:'Seleziona', cat:'uno strumento', color:'#3b82f6'}); }

function switchTab(id) {
  activeTab = id;
  const mod = MODULES.find(m => m.id === id);
  if (mod) {
    document.documentElement.style.setProperty('--active-glow', mod.color);
    updateCenter(mod);
  }
  document.getElementById('sec-welcome').hidden = true;
  MODULES.forEach(m => {
    const sec = document.getElementById('sec-' + m.id);
    const slice = document.getElementById('slice-' + m.id);
    const listItem = document.getElementById('list-' + m.id);
    if (sec) sec.hidden = (m.id !== id);
    if (slice) {
      if (m.id === id) slice.classList.add('active'); else slice.classList.remove('active');
    }
    if (listItem) {
      if (m.id === id) listItem.classList.add('active'); else listItem.classList.remove('active');
    }
  });
}

function formatBytes(b) { return b >= 1048576 ? (b/1048576).toFixed(2)+' MB' : Math.max(1, Math.round(b/1024))+' KB'; }
function showToast(msg) {
  const w = document.getElementById('toast-container');
  const e = document.createElement('div');
  e.className='toast'; e.textContent=msg; w.appendChild(e);
  setTimeout(()=>e.remove(), 3500);
}
function downloadBlob(blob, name) {
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u), 2500);
}
function downloadPdfBytes(bytes, name) {
  downloadBlob(new Blob([bytes], {type:'application/pdf'}), name.endsWith('.pdf')?name:name+'.pdf');
  showToast('Scaricato: '+name);
}

function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('dragover'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('dragover'); }
function handleDrop(e, cb) { e.preventDefault(); e.currentTarget.classList.remove('dragover'); if(e.dataTransfer.files.length) cb(e.dataTransfer.files); }

// UI Init
function initUI() {
  buildDonut();
  const theme = localStorage.getItem('co_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const tBtn = document.getElementById('theme-btn');
  if(tBtn) tBtn.innerHTML = theme === 'dark' ? '☀️ <span class="hide-mobile">Chiaro</span>' : '🌙 <span class="hide-mobile">Scuro</span>';
  const nd = document.getElementById('net-dot');
  if(nd) nd.className = navigator.onLine ? 'status-dot online' : 'status-dot offline';
  renderHistory();
}
function toggleTheme() {
  const n = document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  localStorage.setItem('co_theme',n); initUI();
}
window.addEventListener('online', initUI); window.addEventListener('offline', initUI);
window.addEventListener('DOMContentLoaded', initUI);

// History
function getHist() { try { return JSON.parse(localStorage.getItem('co_hist')||'[]'); } catch { return []; } }
function addHist(cat, name, size) {
  const l = getHist();
  l.unshift({cat, name, size:formatBytes(size), d:new Date().toLocaleString()});
  localStorage.setItem('co_hist', JSON.stringify(l.slice(0,20)));
  renderHistory();
}
function renderHistory() { const c = document.getElementById('hist-count'); if(c) c.textContent = getHist().length; }
function toggleHistoryModal() {
  const m = document.getElementById('history-modal'); m.hidden = !m.hidden;
  if(!m.hidden) {
    const h = getHist();
    document.getElementById('history-list').innerHTML = h.length ? h.map(x => `<div class="list-item"><div><strong>${x.name}</strong><br><small class="text-mut">${x.d} • ${x.cat}</small></div><span class="badge-pro">${x.size}</span></div>`).join('') : '<p class="text-mut">Nessuna conversione.</p>';
  }
}
function clearHistory() { localStorage.removeItem('co_hist'); toggleHistoryModal(); renderHistory(); }

// 1. IMG2PDF
let imgQ = []; let uid = 1;
function addImages(e) { addImagesFromFiles(e.target.files); e.target.value=''; }
function addImagesFromFiles(fs) {
  Array.from(fs).forEach(f => { if(f.type.startsWith('image/')) imgQ.push({id:uid++, f, u:URL.createObjectURL(f), s:f.size}); });
  renderImgQ();
}
function renderImgQ() {
  document.getElementById('img-thumbs').innerHTML = imgQ.map((i, idx) => `<div class="thumb-box"><img src="${i.u}"/><div class="text-xs mb-2">Pag. ${idx+1}</div>
  <div class="flex-row gap-1"><button class="btn secondary flex-1 p-1" onclick="mvImg(${idx},-1)">◀</button><button class="btn danger flex-1 p-1" onclick="rmImg(${i.id})">✕</button><button class="btn secondary flex-1 p-1" onclick="mvImg(${idx},1)">▶</button></div></div>`).join('');
}
function mvImg(i, d) { const t = i+d; if(t>=0 && t<imgQ.length) { const x=imgQ[i]; imgQ[i]=imgQ[t]; imgQ[t]=x; renderImgQ(); } }
function rmImg(id) { imgQ = imgQ.filter(x => x.id !== id); renderImgQ(); }
function clearImages() { imgQ = []; renderImgQ(); }
async function generatePdfFromImages() {
  if(!imgQ.length) return showToast('Aggiungi foto!');
  const { PDFDocument } = window.PDFLib; const pdf = await PDFDocument.create();
  const qual = parseFloat(document.getElementById('img-quality').value), col = document.getElementById('img-color').value, ps = document.getElementById('img-pagesize').value, m = parseInt(document.getElementById('img-margin').value);
  for(const i of imgQ) {
    const {b, w, h} = await procImg(i.u, qual, col); const img = await pdf.embedJpg(b);
    let pw=595.28, ph=841.89; if(ps==='fit') { pw=w+m*2; ph=h+m*2; }
    const pg = pdf.addPage([pw, ph]); const sc = Math.min((pw-m*2)/w, (ph-m*2)/h);
    pg.drawImage(img, {x:(pw-w*sc)/2, y:(ph-h*sc)/2, width:w*sc, height:h*sc});
  }
  const ob = await pdf.save(); const n = document.getElementById('img-pdf-name').value || 'immagini.pdf';
  downloadPdfBytes(ob, n); addHist('Foto->PDF', n, ob.byteLength);
}
function procImg(u, q, c) {
  return new Promise(r => {
    const i = new Image(); i.onload = () => {
      let w=i.naturalWidth, h=i.naturalHeight; if(w>2000||h>2000) { const s=2000/Math.max(w,h); w*=s; h*=s; }
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(i,0,0,w,h);
      if(c!=='color') {
        const d = ctx.getImageData(0,0,w,h); const px=d.data;
        for(let j=0; j<px.length; j+=4) {
          const g = 0.299*px[j]+0.587*px[j+1]+0.114*px[j+2];
          if(c==='bw') { const v = g>142?255:Math.max(0,g*0.5); px[j]=px[j+1]=px[j+2]=v; } else px[j]=px[j+1]=px[j+2]=g;
        }
        ctx.putImageData(d,0,0);
      }
      cv.toBlob(async b => r({b:new Uint8Array(await b.arrayBuffer()), w, h}), 'image/jpeg', q);
    }; i.src = u;
  });
}

// 2. STUDIO PDF (Merge / Split / Img)
let pdfQ = []; let spBuf = null; let pdfImgs = [];
async function addPdfToMerge(e) { for(const f of e.target.files) pdfQ.push({id:uid++, n:f.name, b:await f.arrayBuffer(), s:f.size}); renderPdfQ(); e.target.value=''; }
function renderPdfQ() { document.getElementById('merge-list').innerHTML = pdfQ.map((p,i)=>`<div class="list-item"><div>${i+1}. ${p.n}</div><button class="btn danger p-1" onclick="pdfQ.splice(${i},1);renderPdfQ()">✕</button></div>`).join(''); }
async function mergeAllPdfs() {
  if(pdfQ.length<2) return showToast('Aggiungi 2+ PDF');
  const {PDFDocument} = window.PDFLib; const m = await PDFDocument.create();
  for(const p of pdfQ) { const d = await PDFDocument.load(p.b); const c = await m.copyPages(d, d.getPageIndices()); c.forEach(x => m.addPage(x)); }
  const b = await m.save(); const n = document.getElementById('merge-name').value || 'unito.pdf';
  downloadPdfBytes(b, n); addHist('Unisci PDF', n, b.byteLength);
}
async function inspectPdfForSplit(e) { const f = e.target.files[0]; if(!f) return; spBuf = await f.arrayBuffer(); const d = await window.PDFLib.PDFDocument.load(spBuf); document.getElementById('split-info').innerText = `${f.name} (${d.getPageCount()} pag)`; }
async function processSplitRotate() {
  if(!spBuf) return showToast('Carica PDF');
  const {PDFDocument, degrees} = window.PDFLib; const s = await PDFDocument.load(spBuf), m = await PDFDocument.create();
  const rt = parseInt(document.getElementById('split-rot').value);
  const rgs = document.getElementById('split-pages').value.trim();
  let idxs = [];
  if(!rgs) idxs = s.getPageIndices();
  else {
    rgs.split(',').forEach(x => {
      const p = x.trim(); if(p.includes('-')) { const [a,b] = p.split('-'); for(let i=parseInt(a); i<=parseInt(b); i++) idxs.push(i-1); } else idxs.push(parseInt(p)-1);
    });
  }
  const cps = await m.copyPages(s, idxs.filter(x=>x>=0&&x<s.getPageCount()));
  cps.forEach(p => { if(rt) p.setRotation(degrees((p.getRotation().angle+rt)%360)); m.addPage(p); });
  const b = await m.save(), n = document.getElementById('split-out-name').value||'estratto.pdf';
  downloadPdfBytes(b, n); addHist('Estrai/Ruota', n, b.byteLength);
}
async function convertPdfToImagesOrText() {
  const f = document.getElementById('pdf2img-input').files[0]; if(!f||!window.pdfjsLib) return;
  const fmt = document.getElementById('pdf2img-format').value, sc = parseFloat(document.getElementById('pdf2img-scale').value), w = document.getElementById('pdf2img-output');
  w.innerHTML = '<span class="text-accent">Elaborazione...</span>'; pdfImgs = [];
  const p = await window.pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
  if(fmt.startsWith('txt')) {
    let t = '';
    for(let i=1;i<=p.numPages;i++) {
      const c = await (await p.getPage(i)).getTextContent();
      t += '--- PAG ' + i + ' ---\n' + c.items.map(x=>x.str).join(' ') + '\n\n';
    }
    downloadBlob(new Blob([t]), f.name+'.txt'); w.innerHTML = 'Testo estratto!'; return;
  }
  const ext = fmt.split('/')[1]==='jpeg'?'jpg':'png'; w.innerHTML = '';
  for(let i=1;i<=p.numPages;i++) {
    const pg = await p.getPage(i), vp = pg.getViewport({scale:sc}), cv = document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height;
    await pg.render({canvasContext:cv.getContext('2d'), viewport:vp}).promise;
    const b = await new Promise(r=>cv.toBlob(r,fmt,0.9)), u = URL.createObjectURL(b), n = `${f.name}_p${i}.${ext}`;
    pdfImgs.push({n,b}); w.innerHTML += `<div class="thumb-box"><img src="${u}"/><a href="${u}" download="${n}" class="btn small w-full">⬇️</a></div>`;
  }
  document.getElementById('btn-pdf2img-zip').hidden = false;
}
async function downloadPdfImagesAsZip() {
  if(!pdfImgs.length) return; const z = new window.JSZip(); pdfImgs.forEach(x=>z.file(x.n, x.b));
  downloadBlob(await z.generateAsync({type:'blob'}), 'pdf-pagine.zip');
}

// 3. SIGN PDF
const sigCv = document.getElementById('sig-pad'), sigCtx = sigCv?.getContext('2d'); let isD=false, hasSig=false;
if(sigCtx) {
  sigCtx.strokeStyle='#1d4ed8'; sigCtx.lineWidth=3; sigCtx.lineCap='round';
  const p = e => { const r=sigCv.getBoundingClientRect(); const cx=e.touches?e.touches[0].clientX:e.clientX, cy=e.touches?e.touches[0].clientY:e.clientY; return {x:(cx-r.left)*(sigCv.width/r.width), y:(cy-r.top)*(sigCv.height/r.height)}; };
  sigCv.addEventListener('pointerdown', e=>{isD=true; hasSig=true; const pos=p(e); sigCtx.beginPath(); sigCtx.moveTo(pos.x,pos.y);});
  sigCv.addEventListener('pointermove', e=>{if(isD){const pos=p(e); sigCtx.lineTo(pos.x,pos.y); sigCtx.stroke();}});
  window.addEventListener('pointerup', ()=>isD=false);
}
function updateSignatureColor() { if(sigCtx) sigCtx.strokeStyle = document.getElementById('sign-color').value; }
function clearSignaturePad() { if(sigCtx) { sigCtx.clearRect(0,0,sigCv.width,sigCv.height); hasSig=false; } }
function loadStampIntoCanvas(e) { const f=e.target.files[0]; if(!f) return; const i=new Image(); i.onload=()=>{clearSignaturePad(); const s=Math.min(sigCv.width/i.width, sigCv.height/i.height)*0.8; sigCtx.drawImage(i,(sigCv.width-i.width*s)/2,(sigCv.height-i.height*s)/2,i.width*s,i.height*s); hasSig=true;}; i.src=URL.createObjectURL(f); }
async function signPdfDocument() {
  const f = document.getElementById('sign-pdf-input').files[0]; if(!f) return showToast('Carica PDF');
  const txt = document.getElementById('sign-text').value, wm = document.getElementById('sign-watermark').value;
  const {PDFDocument, rgb, degrees, StandardFonts} = window.PDFLib; const d = await PDFDocument.load(await f.arrayBuffer()), pgs = d.getPages();
  const pos = document.getElementById('sign-page-pos').value, cr = document.getElementById('sign-corner').value;
  const tgts = pos==='last'?[pgs[pgs.length-1]]:(pos==='all'?pgs:[pgs[0]]);
  const png = hasSig ? await d.embedPng(sigCv.toDataURL()) : null; const fnt = await d.embedFont(StandardFonts.HelveticaBold);
  if(wm) pgs.forEach(p=>{const {width:w,height:h}=p.getSize(); p.drawText(wm,{x:w*0.2,y:h*0.4,size:40,font:fnt,color:rgb(0.8,0.8,0.85),rotate:degrees(30),opacity:0.3});});
  tgts.forEach(p=>{
    const {width:w,height:h}=p.getSize(); const sw=150, sh=50; let x=cr==='bl'?30:(cr==='bc'?(w-sw)/2:w-sw-30), y=40;
    if(png) p.drawImage(png,{x,y,width:sw,height:sh}); if(txt) p.drawText(txt,{x,y:y-12,size:10,font:fnt,color:rgb(0.1,0.1,0.2)});
  });
  const ob = await d.save(); downloadPdfBytes(ob, 'firmato_'+f.name); addHist('Firma PDF', 'firmato_'+f.name, ob.byteLength);
}

// 4. BATCH IMG
let bImgQ = [], cvImgs = [];
function addBatchImages(fs) { Array.from(fs).forEach(f=>{if(f.type.startsWith('image/')) bImgQ.push({id:uid++, f, n:f.name, s:f.size});}); rBImg(); }
function clearBatchImages() { bImgQ=[]; cvImgs=[]; document.getElementById('btn-img-zip').hidden=true; rBImg(); }
function rBImg() { document.getElementById('conv-img-list').innerHTML = bImgQ.map(i=>`<div class="list-item"><div>${i.n}</div><span id="st-${i.id}" class="text-xs text-mut">Attesa</span></div>`).join(''); }
async function runBatchImageConversion() {
  if(!bImgQ.length) return; const fmt = document.getElementById('conv-img-format').value, q = parseInt(document.getElementById('conv-img-quality').value)/100, mw = parseInt(document.getElementById('conv-img-maxw').value); cvImgs=[];
  for(const i of bImgQ) {
    const im = new Image(), u = URL.createObjectURL(i.f); await new Promise(r=>{im.onload=r;im.src=u;});
    let w=im.naturalWidth, h=im.naturalHeight; if(mw && w>mw) { h=Math.round(h*(mw/w)); w=mw; }
    const c=document.createElement('canvas'); c.width=w; c.height=h; const cx=c.getContext('2d');
    if(fmt==='jpeg'||fmt==='bmp') { cx.fillStyle='#fff'; cx.fillRect(0,0,w,h); } cx.drawImage(im,0,0,w,h); URL.revokeObjectURL(u);
    const bn = i.n.replace(/\.[^/.]+$/,''); let ob, oe=fmt;
    if(fmt==='base64') { ob = new Blob([c.toDataURL('image/webp', q)]); oe='base64.txt'; }
    else if(fmt==='svg') { ob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="${c.toDataURL('image/png')}" width="${w}" height="${h}"/></svg>`]); }
    else { ob = await new Promise(r=>c.toBlob(r, `image/${fmt}`, q)); if(fmt==='jpeg') oe='jpg'; }
    const ou = URL.createObjectURL(ob), on = `${bn}.${oe}`; cvImgs.push({n:on,b:ob});
    document.getElementById(`st-${i.id}`).innerHTML = `<a href="${ou}" download="${on}" class="text-accent font-bold">Scarica</a>`;
    if(bImgQ.length===1) { downloadBlob(ob,on); addHist('Conv Img', on, ob.size); }
  }
  document.getElementById('btn-img-zip').hidden = cvImgs.length<2;
}
async function downloadConvertedImagesZip() { const z=new window.JSZip(); cvImgs.forEach(x=>z.file(x.n,x.b)); downloadBlob(await z.generateAsync({type:'blob'}), 'immagini.zip'); }

// 5. AUDIO/VIDEO
function inspectAudioFile(e) { const f=e.target.files[0]; if(f) { currentAudioFile=f; document.getElementById('audio-info').innerText=`🎵 ${f.name} pronto.`; } }
function encodeWav(ab, bd=16) {
  const nc=ab.numberOfChannels, sr=ab.sampleRate, bps=bd===24?3:2, fl=ab.length, ds=fl*nc*bps;
  const b=new ArrayBuffer(44+ds), v=new DataView(b); const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF'); v.setUint32(4,36+ds,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,nc,true); v.setUint32(24,sr,true); v.setUint32(28,sr*nc*bps,true); v.setUint16(32,nc*bps,true); v.setUint16(34,bd,true); w(36,'data'); v.setUint32(40,ds,true);
  const chs=Array.from({length:nc},(_,c)=>ab.getChannelData(c)); let o=44;
  for(let i=0;i<fl;i++){for(let c=0;c<nc;c++){const s=Math.max(-1,Math.min(1,chs[c][i])); if(bd===24){const val=Math.floor(s<0?s*0x800000:s*0x7FFFFF); v.setUint8(o,val&0xFF); v.setUint8(o+1,(val>>8)&0xFF); v.setUint8(o+2,(val>>16)&0xFF); o+=3;}else{v.setInt16(o,s<0?s*0x8000:s*0x7FFF,true); o+=2;}}}
  return new Blob([b],{type:'audio/wav'});
}
async function convertAudioTrack() {
  if(!currentAudioFile) return showToast('Carica file!');
  const of=document.getElementById('audio-out-format').value, tr=parseInt(document.getElementById('audio-samplerate').value), ts=parseFloat(document.getElementById('audio-trim-start').value), te=parseFloat(document.getElementById('audio-trim-end').value);
  document.getElementById('audio-progress-wrap').hidden=false; document.getElementById('audio-progress-bar').style.width='35%';
  try {
    const actx=new (window.AudioContext||window.webkitAudioContext)(), dec=await actx.decodeAudioData(await currentAudioFile.arrayBuffer());
    const sS=Math.min(ts,dec.duration), eS=(te>sS&&te<=dec.duration)?te:dec.duration, dr=Math.max(0.1,eS-sS);
    const octx=new OfflineAudioContext(2, Math.ceil(dr*tr), tr), src=octx.createBufferSource(); src.buffer=dec; src.connect(octx.destination); src.start(0,sS,dr);
    const ren=await octx.startRendering(), bn=currentAudioFile.name.replace(/\.[^/.]+$/,''); let ob, on;
    if(of.startsWith('mp3')) { ob=encodeWav(ren); on=`${bn}.wav`; showToast('MP3 simulato con WAV (limite script)'); }
    else { const bit=of==='wav-24'?24:16; ob=encodeWav(ren,bit); on=`${bn}-${bit}b.wav`; }
    document.getElementById('audio-progress-bar').style.width='100%'; downloadBlob(ob,on); addHist('Audio', on, ob.size);
  } catch(e) { showToast('Errore: '+e.message); }
}
function loadVideoForTools(e) { const f=e.target.files[0]; if(f){ document.getElementById('video-preview').src=URL.createObjectURL(f); document.getElementById('video-workspace').hidden=false; } }
function captureVideoFrame() { const v=document.getElementById('video-preview'); if(!v.videoWidth) return; const c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight; c.getContext('2d').drawImage(v,0,0,c.width,c.height); c.toBlob(b=>downloadBlob(b,`frame-${Math.round(v.currentTime)}s.png`),'image/png'); }
function recordVideoToWebm() { const v=document.getElementById('video-preview'); if(!v.captureStream) return showToast('Non supportato'); const s=v.captureStream(), r=new MediaRecorder(s), c=[]; r.ondataavailable=e=>{if(e.data.size)c.push(e.data);}; r.onstop=()=>downloadBlob(new Blob(c,{type:'video/webm'}),'clip.webm'); v.play(); r.start(); setTimeout(()=>{r.stop();v.pause();},5000); showToast('Rec 5s...'); }

// 6. DATI
async function loadDataFile(e) {
  const f=e.target.files[0]; if(!f) return;
  const x = f.name.toLowerCase().endsWith('.xlsx');
  if(x && window.XLSX) { const w=window.XLSX.read(await f.arrayBuffer(),{type:'array'}); document.getElementById('data-input-text').value=JSON.stringify(window.XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]]),null,2); document.getElementById('data-in-fmt').value='json'; }
  else { document.getElementById('data-input-text').value=await f.text(); document.getElementById('data-in-fmt').value='auto'; }
}
function convertDataFormats() {
  const i=document.getElementById('data-input-text').value, inf=document.getElementById('data-in-fmt').value, outf=document.getElementById('data-out-fmt').value;
  try {
    let r=[]; if(inf==='json'||(inf==='auto'&&i.startsWith('['))) r=JSON.parse(i); else if(window.XLSX) { const w=window.XLSX.read(i,{type:'string'}); r=window.XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]]); }
    if(!r.length) return;
    if(outf==='xlsx'&&window.XLSX) { const w=window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(w,window.XLSX.utils.json_to_sheet(r),'Dati'); downloadBlob(new Blob([window.XLSX.write(w,{type:'array',bookType:'xlsx'})]),'dati.xlsx'); return showToast('XLSX Scaricato'); }
    let o=''; 
    if(outf==='json') o=JSON.stringify(r,null,2); 
    else if(outf==='csv') { const ks=Object.keys(r[0]); o=ks.join(',')+'\n'+r.map(x=>ks.map(k=>`"${x[k]||''}"`).join(',')).join('\n'); } 
    else if(outf==='sql') { const ks=Object.keys(r[0]); o=r.map(x=>`INSERT INTO t (${ks.join(',')}) VALUES (${ks.map(k=>`'${x[k]||''}'`).join(',')});`).join('\n'); }
    document.getElementById('data-output-text').value = o || 'Formato testo base...'; showToast('Convertito');
  } catch(e) { showToast('Errore parse'); }
}
function swapDataInputOutput() { const i=document.getElementById('data-input-text'), o=document.getElementById('data-output-text'); if(o.value){ i.value=o.value; document.getElementById('data-in-fmt').value='auto'; } }
function downloadConvertedData() { const t=document.getElementById('data-output-text').value, f=document.getElementById('data-out-fmt').value; if(t) downloadBlob(new Blob([t]), `dati.${f}`); }
function loadSampleData() { document.getElementById('data-input-text').value = JSON.stringify([{id:1, prod:'Mouse', price:29},{id:2, prod:'Keyboard', price:89}],null,2); document.getElementById('data-in-fmt').value='json'; convertDataFormats(); }

// 7. DOCS
async function loadDocFile(e) { const f=e.target.files[0]; if(f) document.getElementById('doc-input').value = await f.text(); }
async function convertDocument() {
  const i=document.getElementById('doc-input').value, m=document.getElementById('doc-conv-mode').value, o=document.getElementById('doc-output'); if(!i) return;
  if(m==='md2html') o.value = window.marked ? window.marked.parse(i) : i;
  else if(m==='html2md') o.value = i.replace(/<[^>]+>/g,'').trim();
  else if(m==='txt2pdf') {
    const {PDFDocument,rgb} = window.PDFLib; const d=await PDFDocument.create(), p=d.addPage();
    p.drawText(i.substring(0,2000), {x:40,y:800,size:12,color:rgb(0,0,0)});
    downloadPdfBytes(await d.save(), (document.getElementById('doc-out-name').value||'doc')+'.pdf');
  }
}
function downloadConvertedDoc() { const o=document.getElementById('doc-output').value, m=document.getElementById('doc-conv-mode').value, ext=m.includes('html')?'html':'txt'; if(o) downloadBlob(new Blob([o]), `doc.${ext}`); }

// 8. ZIP
let zQ=[]; function addFilesToZipCreator(e){ Array.from(e.target.files).forEach(f=>zQ.push(f)); document.getElementById('zip-create-list').innerHTML=zQ.map((f,i)=>`<div class="list-item"><div>${f.name}</div><button class="btn danger p-1" onclick="zQ.splice(${i},1);this.parentElement.remove()">✕</button></div>`).join(''); }
async function generateZipArchive() { if(!zQ.length||!window.JSZip) return; const z=new window.JSZip(); zQ.forEach(f=>z.file(f.name,f)); downloadBlob(await z.generateAsync({type:'blob'}), document.getElementById('zip-out-name').value||'archivio.zip'); }
async function extractZipArchive(e) { const f=e.target.files[0]; if(!f) return; const z=await window.JSZip.loadAsync(f), l=[]; for(const[p,en] of Object.entries(z.files)){ if(!en.dir) { const u=URL.createObjectURL(await en.async('blob')); l.push(`<div class="list-item"><div>${p}</div><a href="${u}" download="${p.split('/').pop()}" class="text-accent font-bold">Scarica</a></div>`); } } document.getElementById('zip-extract-list').innerHTML=l.join(''); }

// 9. UNITS & QR & DEV
const U={length:{m:1,km:1000,cm:0.01,in:0.0254,ft:0.3048}, weight:{kg:1,g:0.001,lb:0.4535,oz:0.0283}, data:{B:1,KB:1024,MB:1048576,GB:1073741824}};
function populateUnitSelects() { const c=document.getElementById('unit-cat').value, k=Object.keys(U[c]||{}); const h=k.map(x=>`<option value="${x}">${x}</option>`).join(''); document.getElementById('unit-from').innerHTML=h; document.getElementById('unit-to').innerHTML=h; computeUnitConversion(); }
function computeUnitConversion() { const c=document.getElementById('unit-cat').value, v=parseFloat(document.getElementById('unit-val').value), f=document.getElementById('unit-from').value, t=document.getElementById('unit-to').value; if(!isNaN(v)&&U[c]) document.getElementById('unit-res').value = (v * U[c][f] / U[c][t]).toPrecision(6); }
function swapUnits() { const f=document.getElementById('unit-from'), t=document.getElementById('unit-to'), x=f.value; f.value=t.value; t.value=x; computeUnitConversion(); }
function generateQrCode() { const t=document.getElementById('qr-text').value, w=document.getElementById('qr-preview'); if(window.qrcode){ const q=window.qrcode(0,'M'); q.addData(t); q.make(); w.innerHTML=q.createSvgTag({cellSize:5,margin:2}); } }
function downloadQrCode(fmt) { const s=document.querySelector('#qr-preview svg'); if(!s) return; const d=new XMLSerializer().serializeToString(s); if(fmt==='svg') downloadBlob(new Blob([d]),'qr.svg'); else { const i=new Image(); i.onload=()=>{const c=document.createElement('canvas');c.width=512;c.height=512;const cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,512,512);cx.drawImage(i,0,0,512,512);c.toBlob(b=>downloadBlob(b,'qr.png'));}; i.src='data:image/svg+xml;base64,'+btoa(d); } }
function updateColorFromHex(h) { document.getElementById('col-picker').value=h; document.getElementById('col-hex').value=h; document.getElementById('col-rgb-hsl').value = 'RGB / HSL sync logic'; }
async function runDevEncoding() { const m=document.getElementById('dev-mode').value, i=document.getElementById('dev-in').value, o=document.getElementById('dev-out'); if(!i) return; try { if(m==='b64enc') o.value=btoa(i); else if(m==='b64dec') o.value=atob(i); else if(m==='sha256') { const h=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(i)); o.value=Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join(''); } } catch { o.value='Err'; } }
async function triggerInstall() { showToast('Su Chrome/Android: tocca ⋮ in alto a destra → "Installa app".'); }

// js/app.js (Aggiungi o sostituisci queste logiche al tuo file esistente)

// ==========================================
// 1. GESTIONE MEMORIA (Evita crash su mobile)
// ==========================================
let activeObjectUrls = [];

function trackUrl(url) {
    activeObjectUrls.push(url);
    return url;
}

function clearMemory() {
    activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
    activeObjectUrls = [];
}

// Chiamala ogni volta che svuoti una lista. Esempio:
function clearImages() {
    document.getElementById('img-thumbs').innerHTML = '';
    clearMemory(); 
}

// ==========================================
// 2. SUPPORTO HEIC TRASPARENTE
// ==========================================
async function processInputFile(file) {
    // Se è un HEIC, lo convertiamo silenziosamente in JPEG prima di passarlo all'app
    if (file.name.toLowerCase().endsWith('.heic')) {
        try {
            console.log("Conversione HEIC in corso...");
            const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
            return new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (e) {
            console.error("Errore decodifica HEIC:", e);
            return file; // Ritorna l'originale in caso di errore
        }
    }
    return file;
}

// Esempio d'uso nell'input:
async function addImages(event) {
    const files = event.target.files;
    for (let f of files) {
        const processedFile = await processInputFile(f);
        // Da qui usi processedFile per creare l'anteprima o il PDF...
    }
}

// ==========================================
// 3. CONVERSIONE AUDIO CON WEB WORKER
// ==========================================
function convertAudioTrack() {
    const progressBar = document.getElementById('audio-progress-bar');
    const progressWrap = document.getElementById('audio-progress-wrap');
    progressWrap.hidden = false;
    progressBar.style.width = '0%';

    // Ipotizziamo di aver già estratto i dati PCM (wavData) tramite AudioContext
    // Costruiamo il Worker
    const worker = new Worker('./js/worker-audio.js');
    
    worker.onmessage = function(e) {
        if (e.data.type === 'progress') {
            progressBar.style.width = e.data.value + '%';
        } else if (e.data.type === 'done') {
            progressBar.style.width = '100%';
            
            const mp3Url = trackUrl(URL.createObjectURL(e.data.blob));
            document.getElementById('audio-output-box').innerHTML = `
                <a href="${mp3Url}" download="convertito.mp3" class="action-btn success-btn w-full text-center">
                    ⬇️ Scarica MP3
                </a>
            `;
            worker.terminate(); // Uccidi il worker a lavoro finito
        }
    };

    // Avvia il lavoro in background
    worker.postMessage({
        wavData: /* i tuoi dati int16Array estratto dal file */ null, 
        sampleRate: 44100,
        kbps: 192
    });
}

// ==========================================
// 4. DOCS: MARKDOWN A HTML E VICEVERSA
// ==========================================
function convertDocument() {
    const mode = document.getElementById('doc-conv-mode').value;
    const input = document.getElementById('doc-input').value;
    const outputArea = document.getElementById('doc-output');

    if (mode === 'md2html') {
        // Usa marked + DOMPurify per sicurezza XSS
        const rawHtml = marked.parse(input);
        outputArea.value = DOMPurify.sanitize(rawHtml);
    } 
    else if (mode === 'html2md') {
        // Usa Turndown per convertire l'HTML in Markdown pulito
        const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
        outputArea.value = turndownService.turndown(input);
    }
}
