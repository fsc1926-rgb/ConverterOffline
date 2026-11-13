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

// Quando svuoti le immagini, ricordati di pulire la memoria
function clearImages() {
    document.getElementById('img-thumbs').innerHTML = '';
    clearMemory(); 
}

function clearBatchImages() {
    document.getElementById('conv-img-list').innerHTML = '';
    clearMemory();
}


// ==========================================
// 2. SUPPORTO HEIC TRASPARENTE
// ==========================================
async function processInputFile(file) {
    // Se è un HEIC di iPhone, lo converte al volo in JPEG per compatibilità
    if (file.name.toLowerCase().endsWith('.heic')) {
        try {
            console.log("Conversione HEIC in corso per:", file.name);
            const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 });
            return new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (e) {
            console.error("Errore decodifica HEIC:", e);
            return file; 
        }
    }
    return file;
}


// ==========================================
// 3. ESTRAZIONE E CONVERSIONE AUDIO (CON WORKER)
// ==========================================
async function convertAudioTrack() {
    const fileInput = document.getElementById('audio-input');
    const formatSelect = document.getElementById('audio-out-format').value; // es: mp3-192
    const progressBar = document.getElementById('audio-progress-bar');
    const progressWrap = document.getElementById('audio-progress-wrap');
    
    if (!fileInput.files.length) {
        alert("Carica prima un file audio o video.");
        return;
    }

    const file = fileInput.files[0];
    progressWrap.hidden = false;
    progressBar.style.width = '5%'; 
    document.getElementById('audio-info').innerText = "Estrazione tracce in corso...";

    try {
        // 1. Decodifica l'audio nativamente col browser
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // 2. Estrapola i dati PCM (Float32) del primo canale (Mono per semplicità MP3)
        const channelData = audioBuffer.getChannelData(0); 
        
        // 3. Converti in Int16Array (richiesto da lamejs)
        const sampleRate = audioBuffer.sampleRate;
        const wavData = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
            // Moltiplica e limita (clamp) il valore per l'Int16
            let s = Math.max(-1, Math.min(1, channelData[i]));
            wavData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        document.getElementById('audio-info').innerText = "Codifica MP3 in background...";

        // 4. Invia i dati al Web Worker
        const worker = new Worker('./js/worker-audio.js');
        const kbps = parseInt(formatSelect.split('-')[1]) || 192; // Prende 192 o 320

        worker.onmessage = function(e) {
            if (e.data.type === 'progress') {
                progressBar.style.width = Math.max(5, e.data.value) + '%';
            } else if (e.data.type === 'done') {
                progressBar.style.width = '100%';
                document.getElementById('audio-info').innerText = "Conversione completata!";
                
                const mp3Url = trackUrl(URL.createObjectURL(e.data.blob));
                document.getElementById('audio-output-box').innerHTML = `
                    <a href="${mp3Url}" download="${file.name.split('.')[0]}_convertito.mp3" class="action-btn success-btn w-full text-center" style="display:inline-block; padding:10px;">
                        ⬇️ Scarica MP3 (${kbps} kbps)
                    </a>
                `;
                worker.terminate(); // Libera la CPU
            }
        };

        worker.postMessage({
            wavData: wavData, 
            sampleRate: sampleRate,
            kbps: kbps
        });

    } catch (err) {
        console.error("Errore audio:", err);
        document.getElementById('audio-info').innerText = "Errore durante la conversione.";
        progressWrap.hidden = true;
    }
}


// ==========================================
// 4. CONVERSIONE MARKDOWN / DOCS
// ==========================================
function convertDocument() {
    const mode = document.getElementById('doc-conv-mode').value;
    const input = document.getElementById('doc-input').value;
    const outputArea = document.getElementById('doc-output');

    if (!input.trim()) return;

    if (mode === 'md2html') {
        // Usa marked (da CDN) e purifica l'HTML
        const rawHtml = marked.parse(input);
        outputArea.value = DOMPurify.sanitize(rawHtml);
    } 
    else if (mode === 'html2md') {
        // Usa Turndown (da CDN) per convertire l'HTML in Markdown
        const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
        outputArea.value = turndownService.turndown(input);
    }
}
