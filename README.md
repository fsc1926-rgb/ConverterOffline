# 🚀 ConverterOffline Pro v3.0 — Studio Universale 100% Offline

**ConverterOffline Pro** è una Progressive Web App (PWA) completa, modulare e **100% Client-Side** per la conversione di file, documenti PDF, immagini, tracce audio/video, strutture dati (CSV/JSON/Excel/SQL/XML/YAML), archivi `.ZIP`, unità di misura e QR Code.

🔒 **Privacy Totale:** Nessun file viene mai caricato su server esterni. Tutte le conversioni avvengono direttamente nel browser dell'utente tramite API native (`Canvas`, `Web Audio API`, `OfflineAudioContext`, `Web Crypto API`) e librerie client-side pre-cachate dal **Service Worker (`sw.js`)**.

---

## ✨ Tutte le Funzionalità e Formati di Output Supportati

| Reparto | Input Supportati | Formati di Output / Azioni |
| :--- | :--- | :--- |
| **🖼️ Foto → PDF** | `JPG`, `PNG`, `WEBP`, `AVIF`, `BMP`, `GIF`, `SVG` | **PDF** (`A4 Verticale/Orizzontale`, `US Letter`, `Fit-to-Image`), filtro Scanner Bianco/Nero nitido, riordino pagine e compressione |
| **📑 Studio PDF** | `PDF` | **Unisci PDF**, **Estrai/Dividi Pagine**, **Ruota (90°/180°/270°)**, **PDF → Immagini (`PNG`, `JPG`, `WEBP` + `.ZIP`)**, **PDF → Testo (`.TXT`, `.MD`)** |
| **✍️ Firma & Timbra PDF** | `PDF` + Firma/Timbro `PNG` | **PDF Firmato** (inchiostro Nero/Blu/Rosso, data, posizione, **Filigrana diagonale** su tutte le pagine) |
| **🎨 Immagini Universale** | `PNG`, `JPG`, `WEBP`, `AVIF`, `BMP`, `GIF`, `SVG` | **`WEBP`**, **`PNG`**, **`JPG`**, **`AVIF`**, **`.ICO` (vera icona Windows/Favicon binaria)**, **`BMP`**, **`SVG`**, **`Base64 Data URI`**, download singolo o **`.ZIP` in blocco** |
| **🎵 Audio & Video** | `MP3`, `WAV`, `OGG`, `M4A`, `FLAC`, `MP4`, `WEBM`, `MOV` | **`MP3` (128 / 192 / 320 kbps)**, **`WAV` (16-bit / 24-bit PCM)**, estrazione audio da video, taglio Inizio/Fine (Trim), scelta Sample Rate e Mono/Stereo, cattura Frame HD e clip **`.WEBM`** |
| **📊 Dati & Excel** | `JSON`, `CSV`, `TSV`, `XLSX`, `XML`, `YAML` | **`CSV`**, **`JSON`**, **`Excel (.XLSX)`**, **`SQL (INSERT)`**, **`YAML`**, **`XML`**, **`Tabella Markdown`**, **`Tabella HTML`**, **`TSV`** |
| **📝 Documenti & Testo** | `Markdown (.md)`, `HTML`, `TXT` | **`HTML`**, **`Markdown (.md)`**, **`Testo Puro (.txt)`**, **`PDF (A4)`** |
| **📦 Archivi ZIP** | Qualsiasi file / Archivi `.zip` | **Creazione archivi `.ZIP`** (compressione configurabile) ed **Estrazione file da `.ZIP`** |
| **📐 Unità, Colori, QR & Dev** | Valori numerici, Testo, URL, HEX | Conversione **Lunghezza, Peso, Temperatura, Dati Digitali, Area, Volume, Velocità, Tempo**, **QR Code (`.PNG` e `.SVG`)**, **Colori (`HEX` ↔ `RGB` ↔ `HSL` ↔ `CMYK`)**, **`Base64` / `URL` / `HEX` / `Binario` / `SHA-256`** |

---

## 📁 Struttura del Repository

```text
ConverterOffline-main/
├── index.html               # Interfaccia principale Single-Page App (9 categorie)
├── manifest.webmanifest     # Configurazione PWA con icone locali per installazione Android/iOS/Desktop
├── sw.js                    # Service Worker v3.0 per funzionamento 100% Offline
├── css/
│   └── style.css            # Foglio di stile modulare con supporto Tema Scuro / Chiaro
├── js/
│   └── app.js               # Motore di conversione completo + Cronologia in localStorage
├── icons/
│   ├── icon-192.png         # Icona PWA 192x192
│   ├── icon-512.png         # Icona PWA 512x512
│   ├── icon-maskable-512.png# Icona Maskable Android
│   ├── apple-touch-icon.png # Icona iOS
│   └── favicon.png          # Favicon browser
├── LICENSE                  # Licenza MIT
└── README.md                # Documentazione completa
```

---

## 🌐 Come pubblicarlo su GitHub Pages

1. Carica i file contenuti in questo archivio nel tuo repository GitHub.
2. Vai su **Settings** → **Pages** del tuo repository.
3. Sotto **Build and deployment**, seleziona il branch `main` (cartella `/ (root)`) e clicca **Save**.
4. Dopo circa 1 minuto la tua Web App sarà online e **installabile come App nativa** su Android, iOS, Windows e macOS!
