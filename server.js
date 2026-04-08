const express = require('express');
const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Mengakses folder frontend

// Fungsi kerangka untuk mengecek 1 akun ke Riot Games
async function checkAccount(combo, proxy) {
    const [username, password] = combo.split(':');
    
    // Logika Agent Proxy
    let axiosConfig = {};
    if (proxy) {
        const proxyUrl = proxy.startsWith('http') ? proxy : `http://${proxy}`;
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    try {
        /* * DI SINI ADALAH TEMPAT UNTUK API RIOT GAMES.
         * Alur standarnya:
         * 1. POST ke auth.riotgames.com (Dapat Token)
         * 2. GET ke entitlements.auth.riotgames.com (Dapat Entitlement)
         * 3. GET ke pd.{region}.a.pvp.net (Dapat List Skin)
         */

        // Simulasi proses pengecekan (Hapus ini jika API asli sudah dimasukkan)
        await new Promise(res => setTimeout(res, 1500)); 
        const isHit = Math.random() > 0.5;

        if (isHit) {
            return {
                status: 'VALID',
                combo: combo,
                region: ['AP', 'NA', 'EU'][Math.floor(Math.random() * 3)],
                level: Math.floor(Math.random() * 200) + 1,
                skins: Math.floor(Math.random() * 80),
                vp: Math.floor(Math.random() * 2000),
                rp: Math.floor(Math.random() * 300)
            };
        } else {
            return { status: 'INVALID', combo: combo };
        }

    } catch (error) {
        return { status: 'ERROR', combo: combo, error: error.message };
    }
}

// Endpoint untuk menerima request dari Frontend
app.post('/api/check', async (req, res) => {
    const { combo, proxy } = req.body;
    const result = await checkAccount(combo, proxy);
    res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[POLYGON CLONE] Server berjalan di port ${PORT}`);
});
