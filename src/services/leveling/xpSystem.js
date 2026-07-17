// xpSystem.js

import { logger } from '../../utils/logger.js';
import { seviyeAyarlariniGetir, seviyeIcinGerekenXp, kullaniciSeviyeVerisiGetir, kullaniciSeviyeVerisiniKaydet } from './leveling.js';
import { logEvent, EVENT_TYPES } from '../loggingService.js';
import { formatLogLine } from '../../utils/logging/logEmbeds.js';
import { Mutex } from '../../utils/mutex.js';
import { wrapServiceBoundary } from '../../utils/errorHandler.js';

/**
 * Bir üyeye XP verir. XP devre dışıysa veya miktar geçersizse null döner.
 * Depolama veya beklenmedik hatalarda hata fırlatır.
 */
export const xpEkle = wrapServiceBoundary(async function xpEkle(client, sunucu, uye, eklenecekXp) {
  const kilitAnahtari = `leveling:${sunucu.id}:${uye.user.id}`;
  return await Mutex.runExclusive(kilitAnahtari, async () => {
    if (!eklenecekXp || eklenecekXp <= 0) {
      return null;
    }

    const ayarlar = await seviyeAyarlariniGetir(client, sunucu.id);

    if (!ayarlar.enabled) {
      return null;
    }

    const seviyeVerisi = await kullaniciSeviyeVerisiGetir(client, sunucu.id, uye.user.id);

    seviyeVerisi.xp += eklenecekXp;
    seviyeVerisi.totalXp += eklenecekXp;
    seviyeVerisi.lastMessage = Date.now();

    let sonrakiSeviyeIcinGerekenXp = seviyeIcinGerekenXp(seviyeVerisi.level);
    let seviyeAtladimi = false;
    const baslangicSeviyesi = seviyeVerisi.level;

    while (seviyeVerisi.xp >= sonrakiSeviyeIcinGerekenXp && seviyeVerisi.level < 1000) {
      seviyeVerisi.xp -= sonrakiSeviyeIcinGerekenXp;
      seviyeVerisi.level += 1;
      seviyeAtladimi = true;
      sonrakiSeviyeIcinGerekenXp = seviyeIcinGerekenXp(seviyeVerisi.level);

      logger.info(`🎉 ${uye.user.tag} sunucuda ${seviyeVerisi.level}. seviyeye ulaştı: ${sunucu.name}`);

      if (ayarlar.roleRewards && ayarlar.roleRewards[seviyeVerisi.level]) {
        await rolOduluVer(sunucu, uye, ayarlar.roleRewards[seviyeVerisi.level], seviyeVerisi.level);
      }
    }

    if (seviyeAtladimi) {
      if (ayarlar.announceLevelUp) {
        await seviyeAtlamaDuyurusuGonder(sunucu, uye, seviyeVerisi, ayarlar);
      }

      try {
        await logEvent({
          client,
          guildId: sunucu.id,
          eventType: EVENT_TYPES.LEVELING_LEVELUP,
          data: {
            title: 'Seviye Atlandı',
            lines: [
              formatLogLine('Üye', `${uye.user.tag} (\`${uye.user.id}\`)`),
              formatLogLine('Yeni Seviye', seviyeVerisi.level.toString()),
              formatLogLine('Kazanılan Seviye', (seviyeVerisi.level - baslangicSeviyesi).toString()),
              formatLogLine('Toplam XP', seviyeVerisi.totalXp.toString()),
            ],
            userId: uye.user.id,
          },
        });
      } catch (logHatasi) {
        logger.debug('Seviye atlama olayı loglanamadı:', logHatasi.message);
      }
    }

    await kullaniciSeviyeVerisiniKaydet(client, sunucu.id, uye.user.id, seviyeVerisi);

    return {
      level: seviyeVerisi.level,
      xp: seviyeVerisi.xp,
      totalXp: seviyeVerisi.totalXp,
      xpNeeded: seviyeIcinGerekenXp(seviyeVerisi.level + 1),
      leveledUp: seviyeAtladimi,
    };
  });
}, {
  service: 'xpSistemi',
  operation: 'xpEkle',
  userMessage: 'XP verilemedi. Lütfen tekrar dene.',
});

async function rolOduluVer(sunucu, uye, rolId, seviye) {
  try {
    const rol = sunucu.roles.cache.get(rolId);

    if (!rol) {
      logger.warn(`Sunucu ${sunucu.id} içinde ${seviye}. seviye ödülü olan ${rolId} rolü bulunamadı.`);
      return;
    }

    if (uye.roles.cache.has(rolId)) {
      return;
    }

    await uye.roles.add(rol, `Seviye ${seviye} ödülü`);
    logger.info(`✅ ${uye.user.tag} kullanıcısına ${seviye}. seviye için ${rol.name} rolü verildi.`);
  } catch (hata) {
    logger.error(`Kullanıcıya ${uye.user.id} rol ödülü verilemedi:`, hata);
  }
}

async function seviyeAtlamaDuyurusuGonder(sunucu, uye, seviyeVerisi, ayarlar) {
  try {
    const duyuruKanali = ayarlar.levelUpChannel
      ? sunucu.channels.cache.get(ayarlar.levelUpChannel)
      : sunucu.systemChannel;

    if (!duyuruKanali || !duyuruKanali.isTextBased()) {
      return;
    }

    const izinler = duyuruKanali.permissionsFor(sunucu.members.me);
    if (!izinler || !izinler.has(['SendMessages', 'EmbedLinks'])) {
      logger.warn(`Duyuru kanalında (${duyuruKanali.id}) mesaj gönderme yetkisi eksik.`);
      return;
    }

    const mesaj = ayarlar.levelUpMessage
      .replace(/{user}/g, uye.toString())
      .replace(/{level}/g, seviyeVerisi.level)
      .replace(/{xp}/g, seviyeVerisi.xp)
      .replace(/{xpNeeded}/g, seviyeIcinGerekenXp(seviyeVerisi.level + 1));

    await duyuruKanali.send(mesaj).catch(hata => {
      logger.error(`Kanalda (${duyuruKanali.id}) seviye atlama mesajı gönderilemedi:`, hata);
    });
  } catch (hata) {
    logger.error('Seviye atlama duyurusu gönderilirken hata oluştu:', hata);
  }
}
