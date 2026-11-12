// js/worker-audio.js

// Nota: quando avrai i file in locale, cambia questo percorso in '../js/vendor/lame.min.js'
importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');

self.onmessage = function(e) {
    const { wavData, sampleRate, kbps } = e.data;
    
    // Inizializza l'encoder MP3
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
    const mp3Data = [];
    const sampleBlockSize = 1152; // Multiplo raccomandato per lamejs
    
    const totalSamples = wavData.length;
    let samplesProcessed = 0;

    for (let i = 0; i < totalSamples; i += sampleBlockSize) {
        const sampleChunk = wavData.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        
        if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf));
        }

        samplesProcessed += sampleChunk.length;
        
        // Invia il progresso alla UI ogni ~10% per non sovraccaricare il main thread
        if (i % (sampleBlockSize * 10) === 0) {
            const progress = Math.round((samplesProcessed / totalSamples) * 100);
            self.postMessage({ type: 'progress', value: progress });
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
    }

    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
    
    // Invia il file completato
    self.postMessage({ type: 'done', blob: blob });
};
