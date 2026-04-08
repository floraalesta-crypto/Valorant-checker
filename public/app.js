let isRunning = false;
let stats = { checked: 0, valid: 0, invalid: 0, error: 0 };

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const hitsTable = document.getElementById('hits-table-body');

// Fungsi untuk update angka statistik di dashboard
function updateDashboard() {
    document.getElementById('stat-checked').innerText = stats.checked;
    document.getElementById('stat-valid').innerText = stats.valid;
    document.getElementById('stat-invalid').innerText = stats.invalid;
    document.getElementById('stat-error').innerText = stats.error;
}

// Fungsi untuk menambah baris baru ke tabel (Hits)
function appendToTable(data) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="color: #c9d1d9;">${data.combo.substring(0, 20)}...</td>
        <td><span class="badge-region">${data.region}</span></td>
        <td style="color: #58a6ff;">Lv. ${data.level}</td>
        <td style="color: #aff5b4; font-weight: bold;">${data.skins} Skins</td>
        <td style="color: #d2a8ff;">${data.vp} VP / ${data.rp} RP</td>
    `;
    hitsTable.prepend(row); // Menambah ke baris paling atas
}

startBtn.addEventListener('click', async () => {
    const rawTokens = document.getElementById('combos-input').value.split('\n').filter(t => t.trim() !== '');
    const rawProxies = document.getElementById('proxies-input').value.split('\n').filter(p => p.trim() !== '');

    if (rawTokens.length === 0) {
        alert("Masukkan Cookies/Tokens terlebih dahulu!");
        return;
    }

    // Reset Stats
    stats = { checked: 0, valid: 0, invalid: 0, error: 0 };
    updateDashboard();
    
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    let proxyIndex = 0;

    for (let i = 0; i < rawTokens.length; i++) {
        if (!isRunning) break;

        const currentToken = rawTokens[i].trim();
        const currentProxy = rawProxies.length > 0 ? rawProxies[proxyIndex % rawProxies.length] : null;
        proxyIndex++;

        try {
            const response = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: currentToken, proxy: currentProxy })
            });

            const result = await response.json();

            stats.checked++;
            if (result.status === 'VALID') {
                stats.valid++;
                appendToTable(result);
            } else if (result.status === 'INVALID') {
                stats.invalid++;
            } else {
                stats.error++;
            }

        } catch (err) {
            console.error("Error checking token:", err);
            stats.checked++;
            stats.error++;
        }

        updateDashboard();
        
        // Jeda kecil agar tidak dianggap spamming oleh server Railway
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    alert("Proses pengecekan selesai!");
});

stopBtn.addEventListener('click', () => {
    isRunning = false;
    stopBtn.disabled = true;
    startBtn.disabled = false;
});
