// setup-offline.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const vendorDir = path.join(__dirname, 'js', 'vendor');
if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
}

const libraries = [
    { url: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', name: 'pdf-lib.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', name: 'pdf.min.js' },
    { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', name: 'pdf.worker.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', name: 'jszip.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', name: 'xlsx.full.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js', name: 'lame.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js', name: 'marked.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js', name: 'qrcode.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/heic2any.min.js', name: 'heic2any.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/turndown@7.1.3/dist/turndown.js', name: 'turndown.js' },
    { url: 'https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js', name: 'purify.min.js' }
];

console.log("Inizio download librerie per l'uso offline...");

libraries.forEach(lib => {
    const filePath = path.join(vendorDir, lib.name);
    const file = fs.createWriteStream(filePath);
    https.get(lib.url, response => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`✅ Scaricato: ${lib.name}`);
        });
    }).on('error', err => {
        fs.unlink(filePath);
        console.error(`❌ Errore scaricando ${lib.name}:`, err.message);
    });
});
