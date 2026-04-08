let isRunning = false;
let stats = { checked: 0, valid: 0, invalid: 0, error: 0 };

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');

function updateUI() {
    document.getElementById('stat-checked').innerText = stats.checked;
    document.getElementById('stat-valid').innerText = stats.valid;
    document.getElementById('stat-invalid').innerText = stats.invalid;
    document.getElementById('stat-error').innerText = stats.error;
}

function addHitToTable(data) {
    const tbody = document.getElementById('hits-table-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${data.combo}</td>
        <td><span class="badge">${data.region}</span></td>
        <td>${data.level}</td>
        <td><strong>${data.skins}</strong></td>
        <td>${data.vp} / ${data.rp}</td>
    `;
    tbody.prepend(row); // Tambah di paling atas
}

startBtn.addEventListener('click', async () => {
    const combos = document.getElementById('combos-input').value.split('\n').filter(c => c.trim() !== '');
    const proxies = document.getElementById('proxies-input').value.split('\n').filter(p => p.trim() !== '');

    if (combos.length === 0) return alert("Masukkan minimal 1 combo!");

    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    let proxyIndex = 0;

    for (let i = 0; i < combos.length; i++) {
        if (!isRunning) break;

        const combo = combos[i];
        const proxy = proxies.length > 0 ? proxies[proxyIndex % proxies.length] : null;
        proxyIndex++;

        try {
            const response = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combo, proxy })
            });
            const result = await response.json();

            stats.checked++;
            if (result.status === 'VALID') {
                stats.valid++;
                addHitToTable(result);
            } else if (result.status === 'INVALID') {
                stats.invalid++;
            } else {
                stats.error++;
            }
            updateUI();

        } catch (err) {
            stats.checked++;
            stats.error++;
            updateUI();
        }
    }

    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
});

stopBtn.addEventListener('click', () => {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
});
