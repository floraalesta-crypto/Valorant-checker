const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Fungsi untuk mengambil data inventory menggunakan Token
async function getInventory(accessToken, entitlementToken, region, puuid, agent) {
    try {
        // 1. Cek Skin
        const skinRes = await axios.get(`https://pd.${region}.a.pvp.net/store/v1/entitlements/${puuid}/ItemEntitlements`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Riot-Entitlements-JWT': entitlementToken
            },
            httpsAgent: agent
        });

        // 2. Cek Balance (VP/RP)
        const walletRes = await axios.get(`https://pd.${region}.a.pvp.net/store/v1/wallet/${puuid}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Riot-Entitlements-JWT': entitlementToken
            },
            httpsAgent: agent
        });

        return {
            skins: skinRes.data.Entitlements.filter(item => item.TypeID === "e7c63390-4e83-f9a8-b2a3-74517cc9e205").length,
            vp: walletRes.data.Balances["85ad13f7-3d1b-4112-bf97-4c8c8ef24b28"] || 0,
            rp: walletRes.data.Balances["e5912443-0335-42a1-a5c6-6a57850a1161"] || 0
        };
    } catch (e) {
        return { skins: 0, vp: 0, rp: 0 };
    }
}

app.post('/api/check', async (req, res) => {
    const { token, proxy } = req.body; // Kita kirim token hasil "jembatan"
    const agent = proxy ? new HttpsProxyAgent(proxy) : null;

    try {
        // Contoh alur jika token sudah valid
        // Anda butuh Entitlement Token juga (biasanya didapat bersama access_token)
        
        // Simulasi Response Berhasil
        res.json({
            status: 'VALID',
            region: 'AP',
            level: 85, // Bisa didapat dari /account-lv/v1/
            skins: 42,
            vp: 1500,
            rp: 45,
            combo: "Token-Auth-Session"
        });
    } catch (error) {
        res.json({ status: 'ERROR', message: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
