import { logger } from '../../utils/logger.js';
import { getLevelingConfig, getUserLevelData, saveLevelingConfig } from './leveling.js';
import { getUserLevelPrefix } from '../../utils/database/keys.js';

// Veritabanındaki seviye verisi olan kullanıcıların listesini çeker
async function seviyeKullaniciIdleriniListele(client, sunucuId) {
    if (!client.db?.list) return [];

    const onEkler = [getUserLevelPrefix(sunucuId), `${sunucuId}:leveling:users:`];
    const kullaniciIdleri = new Set();

    for (const onEk of onEkler) {
        let anahtarlar = await client.db.list(onEk).catch(() => []);
        if (!Array.isArray(anahtarlar)) {
            anahtarlar = typeof anahtarlar === 'object' && anahtarlar !== null ? Object.keys(anahtarlar) : [];
        }

        for (const anahtar of anahtarlar) {
            if (!anahtar.startsWith(onEk)) continue;
            const kullaniciId = anahtar.slice(onEk.length);
            if (/^\d{17,19}$/.test(kullaniciId)) kullaniciIdleri.add(kullaniciId);
        }
    }

    return [...kullaniciIdleri];
}

// Kullanıcıya rolü vermeyi dener
async function rolOduluVer(uye, rolId, seviye) {
    const rol = uye.guild.roles.cache.get(rolId) || (await uye.guild.roles.fetch(rolId).catch(() => null));
    if (!rol || uye.roles.cache.has(rolId)) return false;

    await uye.roles.add(rol, `Level ${seviye} ödülü (başlangıç senkronizasyonu)`);
    return true;
}

// Seviye rollerini kontrol eder ve eksikleri tamamlar
export async function seviyeRolleriniEsitle(client, sunucuId = null) {
    const ozet = {
        tarananSunucular: 0,
        silinenOdulKayitlari: 0,
        verilenRoller: 0,
        hatalar: 0,
    };

    const sunucular = sunucuId
        ? [client.guilds.cache.get(sunucuId)].filter(Boolean)
        : [...client.guilds.cache.values()];

    for (const sunucu of sunucular) {
        ozet.tarananSunucular += 1;

        try {
            const ayar = await getLevelingConfig(client, sunucu.id);
            if (ayar.enabled === false) continue;

            const oduller = { ...(ayar.roleRewards || {}) };
            if (Object.keys(oduller).length === 0) continue;

            let ayarDegistiMi = false;

            // Silinmiş rolleri temizle
            for (const [seviye, rolId] of Object.entries(oduller)) {
                const rol =
                    sunucu.roles.cache.get(rolId) || (await sunucu.roles.fetch(rolId).catch(() => null));
                if (!rol) {
                    delete oduller[seviye];
                    ayarDegistiMi = true;
                    ozet.silinenOdulKayitlari += 1;
                    logger.warn(
                        `Sunucu ${sunucu.id} içerisinde, ${seviye}. seviye için tanımlı ${rolId} rolü bulunamadı ve silindi.`,
                    );
                }
            }

            if (ayarDegistiMi) {
                ayar.roleRewards = oduller;
                await saveLevelingConfig(client, sunucu.id, ayar);
            }

            if (Object.keys(oduller).length === 0) continue;

            const kullaniciIdleri = await seviyeKullaniciIdleriniListele(client, sunucu.id);

            for (const kullaniciId of kullaniciIdleri) {
                const seviyeVerisi = await getUserLevelData(client, sunucu.id, kullaniciId);
                const uye = await sunucu.members.fetch(kullaniciId).catch(() => null);
                if (!uye) continue;

                for (const [seviyeMetni, rolId] of Object.entries(oduller)) {
                    const gerekenSeviye = Number(seviyeMetni);
                    if (!Number.isFinite(gerekenSeviye) || seviyeVerisi.level < gerekenSeviye) continue;

                    try {
                        const verildiMi = await rolOduluVer(uye, rolId, gerekenSeviye);
                        if (verildiMi) ozet.verilenRoller += 1;
                    } catch (hata) {
                        ozet.hatalar += 1;
                        logger.warn(
                            `Sunucu ${sunucu.id} içerisinde ${kullaniciId} kullanıcısına ${gerekenSeviye}. seviye rolü verilemedi:`,
                            hata.message,
                        );
                    }
                }
            }
        } catch (hata) {
            ozet.hatalar += 1;
            logger.warn(`Sunucu ${sunucu.id} için seviye rolü eşitlemesi başarısız:`, hata.message);
        }
    }

    return ozet;
}
