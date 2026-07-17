// leveling.js

import { EmbedBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { getGuildConfig, setGuildConfig } from '../config/guildConfig.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { addXp } from './xpSystem.js';
import { getUserLevelKey } from '../../utils/database/keys.js';

const TEMEL_XP = 100;
const XP_CARPANI = 1.5;
const MAKS_SEVIYE = 1000;
const MIN_SEVIYE = 0;

export function seviyeIcinGerekenXp(seviye) {
  if (!Number.isInteger(seviye) || seviye < 0 || seviye > MAKS_SEVIYE) {
    throw new TitanBotError(
      `Geçersiz seviye: ${seviye}. ${MIN_SEVIYE} ile ${MAKS_SEVIYE} arasında olmalı.`,
      ErrorTypes.VALIDATION,
      'Seviye geçerli bir sayı olmalıdır.'
    );
  }
  return 5 * Math.pow(seviye, 2) + 50 * seviye + 50;
}

export function xpdenSeviyeHesapla(xp) {
  if (!Number.isInteger(xp) || xp < 0) {
    throw new TitanBotError(
      `Geçersiz XP: ${xp}`,
      ErrorTypes.VALIDATION,
      'XP negatif olmayan bir sayı olmalıdır.'
    );
  }

  let seviye = 0;
  let gerekenXp = 0;
  
  while (xp >= seviyeIcinGerekenXp(seviye) && seviye < MAKS_SEVIYE) {
    gerekenXp = seviyeIcinGerekenXp(seviye);
    xp -= gerekenXp;
    seviye++;
  }
  
  return {
    level: Math.min(seviye, MAKS_SEVIYE),
    currentXp: xp,
    xpNeeded: seviyeIcinGerekenXp(Math.min(seviye, MAKS_SEVIYE))
  };
}

export function toplamXpHesapla(seviye, mevcutXp = 0) {
  let toplam = mevcutXp;
  for (let i = 0; i < seviye; i++) {
    toplam += seviyeIcinGerekenXp(i);
  }
  return toplam;
}

export async function liderlikTablosuGetir(client, sunucuId, limit = 10) {
  try {
    
    if (!sunucuId || typeof sunucuId !== 'string') {
      throw new TitanBotError(
        'Geçersiz sunucu ID',
        ErrorTypes.VALIDATION,
        'Sunucu ID gereklidir.'
      );
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      limit = Math.min(Math.max(limit, 1), 100);
    }

    const sunucu = client.guilds.cache.get(sunucuId);
    if (!sunucu) {
      logger.warn(`Sunucu ${sunucuId} önbellekte bulunamadı`);
      return [];
    }
    
    const uyeler = await sunucu.members.fetch().catch(hata => {
      logger.error(`Sunucu ${sunucuId} üyeleri alınamadı:`, hata);
      return new Map();
    });

    const liste = [];
    
    for (const [kullaniciId, uye] of uyeler) {
      if (uye.user.bot) continue;
      
      const veri = await kullaniciSeviyeVerisiGetir(client, sunucuId, kullaniciId);
      if (veri && (veri.totalXp > 0 || veri.level > 0)) {
        liste.push({
          userId: kullaniciId,
          username: uye.user.username,
          discriminator: uye.user.discriminator,
          ...veri
        });
      }
    }
    
    liste.sort((a, b) => b.totalXp - a.totalXp);
    
    liste.forEach((girdi, indeks) => {
      girdi.rank = indeks + 1;
    });
    
    return liste.slice(0, limit);
    
  } catch (hata) {
    logger.error('Liderlik tablosu alınırken hata oluştu:', hata);
    if (hata instanceof TitanBotError) throw hata;
    throw new TitanBotError(
      `Liderlik tablosu alınamadı: ${hata.message}`,
      ErrorTypes.DATABASE,
      'Şu anda liderlik tablosuna ulaşılamıyor.'
    );
  }
}

export function liderlikTablosuEmbedOlustur(liste, sunucu) {
  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${sunucu.name} Liderlik Tablosu`)
    .setColor('#2ecc71')
    .setTimestamp();
    
  if (!liste || liste.length === 0) {
    embed.setDescription('Henüz liderlik tablosunda kimse yok!');
    return embed;
  }
  
  const ilk3 = liste.slice(0, 3);
  const digerleri = liste.slice(3);
  
  const ilk3Metin = ilk3.map((kullanici, indeks) => {
    const madalya = ['🥇', '🥈', '🥉'][indeks];
    return `${madalya} **#${kullanici.rank}** ${kullanici.username} - Seviye ${kullanici.level} (${kullanici.totalXp} XP)`;
  }).join('\n');
  
  const digerleriMetin = digerleri.map(kullanici => {
    return `**#${kullanici.rank}** ${kullanici.username} - Seviye ${kullanici.level} (${kullanici.totalXp} XP)`;
  }).join('\n');
  
  embed.setDescription(
    `**En İyi Üyeler**\n${ilk3Metin}${digerleriMetin ? '\n\n' + digerleriMetin : ''}`
  );
  
  return embed;
}

export async function seviyeAyarlariniGetir(client, sunucuId) {
  try {
    const sunucuAyari = await getGuildConfig(client, sunucuId);
    return sunucuAyari.leveling || {
      enabled: true,
      xpPerMessage: { min: 15, max: 25 },
      xpCooldown: 20,
      levelUpMessage: '{user} seviye atladı ve {level}. seviyeye ulaştı!',
      levelUpChannel: null,
      ignoredChannels: [],
      ignoredRoles: [],
      blacklistedUsers: [],
      roleRewards: {},
      announceLevelUp: true,
      xpMultiplier: 1
    };
  } catch (hata) {
    logger.error(`Sunucu ${sunucuId} için seviye ayarları alınırken hata oluştu:`, hata);
    return {
      enabled: true,
      xpPerMessage: { min: 15, max: 25 },
      xpCooldown: 20,
      levelUpMessage: '{user} seviye atladı ve {level}. seviyeye ulaştı!',
      levelUpChannel: null,
      ignoredChannels: [],
      ignoredRoles: [],
      blacklistedUsers: [],
      roleRewards: {},
      announceLevelUp: true,
      xpMultiplier: 1
    };
  }
}

export async function kullaniciSeviyeVerisiGetir(client, sunucuId, kullaniciId) {
  try {
    if (!sunucuId || !kullaniciId) {
      throw new TitanBotError(
        'Sunucu ID ve Kullanıcı ID gereklidir',
        ErrorTypes.VALIDATION
      );
    }

    const anahtar = getUserLevelKey(sunucuId, kullaniciId);
    const veri = await client.db.get(anahtar);
    
    if (!veri) {
      return {
        xp: 0,
        level: 0,
        totalXp: 0,
        lastMessage: 0,
        rank: 0
      };
    }
    
    return {
      xp: Math.max(0, veri.xp || 0),
      level: Math.max(0, Math.min(veri.level || 0, MAKS_SEVIYE)),
      totalXp: Math.max(0, veri.totalXp || 0),
      lastMessage: veri.lastMessage || 0,
      rank: veri.rank || 0
    };
  } catch (hata) {
    logger.error(`Kullanıcı ${kullaniciId} için seviye verisi alınırken hata:`, hata);
    if (hata instanceof TitanBotError) throw hata;
    throw new TitanBotError(
      `Kullanıcı verisi alınamadı: ${hata.message}`,
      ErrorTypes.DATABASE,
      'Şu anda seviye verisine ulaşılamıyor.'
    );
  }
}

export async function kullaniciSeviyeVerisiniKaydet(client, sunucuId, kullaniciId, veri) {
  try {
    if (!sunucuId || !kullaniciId) {
      throw new TitanBotError(
        'Sunucu ID ve Kullanıcı ID gereklidir',
        ErrorTypes.VALIDATION
      );
    }

    if (!veri || typeof veri !== 'object') {
      throw new TitanBotError(
        'Geçersiz kullanıcı seviye verisi',
        ErrorTypes.VALIDATION
      );
    }

    const temizVeri = {
      xp: Math.max(0, Number(veri.xp) || 0),
      level: Math.max(0, Math.min(Number(veri.level) || 0, MAKS_SEVIYE)),
      totalXp: Math.max(0, Number(veri.totalXp) || 0),
      lastMessage: Number(veri.lastMessage) || 0,
      rank: Number(veri.rank) || 0
    };

    const anahtar = getUserLevelKey(sunucuId, kullaniciId);
    await client.db.set(anahtar, temizVeri);
  } catch (hata) {
    logger.error(`Kullanıcı ${kullaniciId} için seviye verisi kaydedilirken hata:`, hata);
    if (hata instanceof TitanBotError) throw hata;
    throw new TitanBotError(
      `Kullanıcı verisi kaydedilemedi: ${hata.message}`,
      ErrorTypes.DATABASE,
      'Şu anda seviye verisi kaydedilemiyor.'
    );
  }
}

export async function seviyeAyarlariniKaydet(client, sunucuId, ayar) {
  try {
    if (!sunucuId || !ayar) {
      throw new TitanBotError(
        'Sunucu ID ve ayar gereklidir',
        ErrorTypes.VALIDATION
      );
    }

    const sunucuAyari = await getGuildConfig(client, sunucuId);

    if (ayar.xpCooldown && (ayar.xpCooldown < 0 || ayar.xpCooldown > 3600)) {
      throw new TitanBotError(
        'XP bekleme süresi 0 ile 3600 saniye arasında olmalıdır',
        ErrorTypes.VALIDATION,
        'Bekleme süresi 0 ile 3600 saniye arasında olmalıdır.'
      );
    }

    if (ayar.xpRange && (ayar.xpRange.min < 1 || ayar.xpRange.max < 1 || ayar.xpRange.min > ayar.xpRange.max)) {
      throw new TitanBotError(
        'Geçersiz XP aralığı ayarı',
        ErrorTypes.VALIDATION,
        'Minimum XP maksimum XP\'den küçük olmalı ve her ikisi de pozitif olmalıdır.'
      );
    }

    sunucuAyari.leveling = ayar;
    await setGuildConfig(client, sunucuId, sunucuAyari);
    
    logger.info(`Sunucu ${sunucuId} için seviye ayarları güncellendi`);
  } catch (hata) {
    logger.error(`Sunucu ${sunucuId} için seviye ayarları kaydedilirken hata:`, hata);
    if (hata instanceof TitanBotError) throw hata;
    throw new TitanBotError(
      `Ayarlar kaydedilemedi: ${hata.message}`,
      ErrorTypes.DATABASE,
      'Şu anda ayarlar kaydedilemiyor.'
    );
  }
}

export async function seviyeEkle(client, sunucuId, kullaniciId, miktar) {
  try {
    const seviyeAyarlari = await seviyeAyarlariniGetir(client, sunucuId);
    if (!seviyeAyarlari?.enabled) {
      throw new TitanBotError(
        'Seviye sistemi bu sunucuda devre dışı',
        ErrorTypes.CONFIGURATION,
        'Seviye sistemi şu anda bu sunucuda kapalı.'
      );
    }

    if (!Number.isInteger(miktar) || miktar <= 0) {
      throw new TitanBotError(
        `Geçersiz seviye miktarı: ${miktar}`,
        ErrorTypes.VALIDATION,
        'Pozitif bir seviye miktarı eklemelisin.'
      );
    }

    const kullaniciVerisi = await kullaniciSeviyeVerisiGetir(client, sunucuId, kullaniciId);
    const yeniSeviye = kullaniciVerisi.level + miktar;

    if (yeniSeviye > MAKS_SEVIYE) {
      throw new TitanBotError(
        `Seviye ${yeniSeviye}, maksimum seviye olan ${MAKS_SEVIYE}'yi aşıyor`,
        ErrorTypes.VALIDATION,
        `Maksimum seviye ${MAKS_SEVIYE}.`
      );
    }

    const yeniXp = 0;
    const yeniToplamXp = toplamXpHesapla(yeniSeviye, yeniXp);

    kullaniciVerisi.level = yeniSeviye;
    kullaniciVerisi.xp = yeniXp;
    kullaniciVerisi.totalXp = yeniToplamXp;

    await kullaniciSeviyeVerisiniKaydet(client, sunucuId, kullaniciId, kullaniciVerisi);
    
    logger.info(`Kullanıcı ${kullaniciId} için ${miktar} seviye eklendi (Sunucu: ${sunucuId})`);
    return kullaniciVerisi;
  } catch (hata) {
    logger.error(`Kullanıcı ${kullaniciId} için seviye eklenirken hata:`, hata);
    if (hata instanceof TitanBotError) throw hata;
    throw new TitanBotError(
      `Seviye eklenemedi: ${hata.message}`,
      ErrorTypes.DATABASE,
      'Şu anda seviye eklenemiyor.'
    );
  }
}

export async function seviyeCikar(client, sunucuId, kullaniciId, miktar) {
  try {
    const seviyeAyarlari = await seviyeAyarlariniGetir(client, sunucuId);
    if (!seviyeAyarlari?.enabled) {
      throw new TitanBotError(
        'Seviye sistemi bu sunucuda devre dışı',
        ErrorTypes.CONFIGURATION,
        'Seviye sistemi şu anda bu sunucuda kapalı.'
      );
    }

    if (!Number.isInteger(miktar) || miktar <= 0) {
      throw new TitanBotError(
        `Geçersiz seviye miktarı: ${miktar}`,
        ErrorTypes.VALIDATION,
        'Pozitif bir seviye miktarı çıkarmalısın.'
      );
    }

    const kullaniciVerisi = await kullaniciSeviyeVerisiGetir(client, sunucuId, kullaniciId);
    const yeniSeviye = Math.max(MIN_SEVIYE, kullaniciVerisi.level - miktar);

    const yeniXp = 0;
    const yeniToplamXp = toplamXpHesapla(yeniSeviye, yeniXp);

    kullaniciVerisi.level = yeniSeviye;
    kullaniciVerisi.xp = yeniXp;
    kullaniciVerisi.totalXp = yeniToplamXp;

    await kullaniciSeviyeVerisiniKaydet(client, sunucuId, kullaniciId, kullaniciVerisi);
    
    logger.info(`Kullanıcı ${kullaniciId} üzerinden ${miktar} seviye çıkarıldı (Sunucu: ${sunucuId})`);
    return kullaniciVerisi;
  } catch (hata) {
    logger.error(`Kullanıcı ${kullaniciId} için seviye çıkarılırken hata:`, hata);
    if (hata instanceof TitanBotError) throw hata;
    throw new TitanBotError(
      `Seviye çıkarılamadı: ${hata.message}`,
      ErrorTypes.DATABASE,
      'Şu anda seviye çıkarılamıyor.'
    );
  }
}

export async function seviyeAyarla(client, sunucuId, kullaniciId, seviye) {
  try {
    const seviyeAyarlari = await seviyeAyarlariniGetir(client, sunucuId);
    if (!seviyeAyarlari?.enabled) {
      throw new TitanBotError(
        'Seviye sistemi bu sunucuda devre dışı',
        ErrorTypes.CONFIGURATION,
        'Seviye sistemi şu anda bu sunucuda kapalı.'
      );
    }

    if (!Number.isInteger(seviye) || seviye < MIN_SEVIYE || seviye > MAKS_SEVIYE) {
      throw new TitanBotError(
        `Geçersiz seviye: ${seviye}`,
        ErrorTypes.VALIDATION,
        `Seviye ${MIN_SEVIYE} ile ${MAKS_SEVIYE} arasında olmalıdır.`
      );
    }

    const kullaniciVerisi = await kullaniciSeviyeVerisiGetir(client, sunucuId, kullaniciId);
    
    const yeniXp = 0;
    const yeniToplamXp = toplamXpHesapla(seviye, yeniXp);

    kullaniciVerisi.level = seviye;
    kullaniciVerisi.xp = yeniXp;
    kullaniciVerisi.totalXp = yeniToplamXp;

    await kullaniciSeviyeVerisiniKaydet(client, sunucuId, kullaniciId, kullaniciVerisi);
    
    logger.info(`Kullanıcı ${kullaniciId} seviyesi ${seviye} olarak ayarlandı (Sunucu: ${sunucuId})`);
    return kullaniciVerisi;
  } catch (hata) {
    logger.error(`Kullanıcı ${kullaniciId} için seviye ayarlanırken hata:`, hata);
    if (hata instanceof TitanBotError) throw hata;
    throw new TitanBotError(
      `Seviye ayarlanamadı: ${hata.message}`,
      ErrorTypes.DATABASE,
      'Şu anda seviye ayarlanamıyor.'
    );
  }
}

export async function kullaniciSeviyeVerisiniSil(client, sunucuId, kullaniciId) {
  try {
    if (!sunucuId || !kullaniciId) {
      throw new TitanBotError(
        'Sunucu ID ve Kullanıcı ID gereklidir',
        ErrorTypes.VALIDATION
      );
    }

    const anahtar = getUserLevelKey(sunucuId, kullaniciId);
    await client.db.delete(anahtar);
    
    logger.debug(`Kullanıcı ${kullaniciId} için seviye verisi silindi (Sunucu: ${sunucuId})`);
  } catch (hata) {
    logger.error(`Kullanıcı ${kullaniciId} için seviye verisi silinirken hata:`, hata);
    if (hata instanceof TitanBotError) throw hata;
    logger.warn(`Kullanıcı ${kullaniciId} için seviye verisi silinemedi (Sunucu: ${sunucuId})`);
  }
}
