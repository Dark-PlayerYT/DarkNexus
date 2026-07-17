/**
 * Komut Takma Ad Yapılandırması
 * Kısaltılmış veya alternatif Türkçe komut isimlerini tam komut isimlerine eşler
 */

export const commandAliases = {
    // Ekonomi Komutları
    'bakiye': 'balance',
    'para': 'balance',
    'nakit': 'balance',
    'bal': 'balance',
    'yatir': 'deposit',
    'cek': 'withdraw',
    'calis': 'work',
    'gunluk': 'daily',
    'kumar': 'gamble',
    'bahis': 'gamble',
    'soy': 'rob',
    'soygubay': 'rob',
    'suc': 'crime',
    'ode': 'pay',
    'ver': 'pay',
    'gonder': 'pay',

    // Genel Komutlar
    'gecikme': 'ping',
    'ping': 'ping',
    'yardim': 'help',
    'y': 'help',
    'h': 'help',
    'bilgi': 'help',

    // Moderasyon ve Yönetici Komutları (Kurbancılara İşlem Yapılan Kısım)
    'yasakla': 'ban',
    'engelle': 'ban',
    'at': 'kick',
    'sustur': 'timeout',
    'mut': 'timeout',
    'ceza': 'timeout',
    'uyar': 'warn',
    'temizle': 'purge',
    'sil': 'purge',
    'susturma-kaldir': 'untimeout',
    'susturmakaldir': 'untimeout',

    // Seviye Sistemi
    'seviye': 'rank',
    'seviyem': 'rank',
    'xp': 'rank',
    'siralama': 'leaderboard',
    'skor': 'leaderboard',
    'top': 'leaderboard',

    // Mağaza ve Envanter
    'market': 'shop',
    'magaza': 'shop',
    'al': 'buy',
    'satinal': 'buy',
    'envanter': 'inventory',
    'canta': 'inventory',
    'esyalar': 'inventory',

    // Kullanıcı Bilgisi
    'kullanici': 'userinfo',
    'kullanicibilgi': 'userinfo',
    'profil': 'userinfo',
    'avatar': 'avatar',
    'pfp': 'avatar',
    'resim': 'avatar',

    // Doğum Günü
    'dogumgunu': 'birthday',
    'dg': 'birthday',

    // Eğlence ve Oyunlar
    'yazitura': 'flip',
    'yazi-tura': 'flip',
    'para-at': 'flip',
    'zar': 'roll',
    'zarat': 'roll',
    'dovus': 'fight',
    'savas': 'fight',

    // Çekiliş Komutları
    'cekilis-olustur': 'gcreate',
    'cekilisbaslat': 'gcreate',
    'cekilisbitir': 'gend',
    'cekilisdurdur': 'gend',
    'cekilissil': 'gdelete',
    'cekilis-yenile': 'greroll',
    'yeniden-cek': 'greroll',

    // Destek Talebi (Ticket)
    'destek': 'ticket',
    'talep': 'ticket',
    'yeni': 'ticket',

    // Doğrulama Komutları
    'dogrula': 'verify',
    'onayla': 'verify',
    'dogrulama-yonetim': 'verification',
    'otodogrula': 'autoverify',

    // Karşılama ve Ayarlar
    'hosgeldin': 'welcome',
    'karsila': 'greet',
    'gorusuruz': 'goodbye',
    'otorol': 'autorole',

    // Araçlar ve Bilgisi
    'hesapla': 'calculate',
    'matematik': 'calculate',
    'hava': 'weather',
    'havadurumu': 'weather',
    'yapilacaklar': 'todo',
    'rapor': 'report',
    'sikayet': 'report',
    'whois': 'userinfo',

    // Sunucu İstatistikleri
    'sunucuistatistik': 'serverstats',
    'istatistik': 'serverstats',
    'ss': 'serverstats',

    // Tepki Rolleri
    'tepkirol': 'reactroles',
    'tepki-rolleri': 'reactroles',

    // Ses Kanalı Oluşturma
    'sesolustur': 'jointocreate',
    'jtc': 'jointocreate',

    // Müzik Durumu
    'suanchalan': 'nowplaying',
    'necaliyor': 'nowplaying',
};

export const subcommandAliases = {
    // Genel Alt Komut Eşleşmeleri
    'liste': 'list',
    'listele': 'list',
    'ayarla': 'set',
    'kur': 'set',
    'bilgi': 'info',
    'detay': 'info',
    'kaldir': 'remove',
    'sil': 'remove',
    'sonraki': 'next',
    'kanalayarla': 'setchannel',

    // İşlem / Durum Eşleşmeleri
    'ekle': 'add',
    'tamamla': 'complete',
    'yapildi': 'complete',
    'bitir': 'complete',

    // Çekiliş ve Yönetim Alt Komutları
    'baslat': 'create',
    'olustur': 'create',
    'durdur': 'end',
    'yeniden-cek': 'reroll',
};

/**
 * Verilen komut takma adını tam komut ismine güvenli şekilde dönüştürür
 * @param {string} commandName - Komut adı veya takma adı
 * @returns {string} - Tam komut adı, geçersiz girdi veya eşleşme yoksa girdinin kendisi
 */
export function resolveCommandAlias(commandName) {
    if (!commandName || typeof commandName !== 'string') {
        return commandName;
    }
    const normalized = commandName.toLowerCase();
    return commandAliases[normalized] || commandName;
}

/**
 * Verilen alt komut takma adını tam alt komut ismine güvenli şekilde dönüştürür
 * @param {string} subcommandName - Alt komut adı veya takma adı
 * @returns {string} - Tam alt komut adı, geçersiz girdi veya eşleşme yoksa girdinin kendisi
 */
export function resolveSubcommandAlias(subcommandName) {
    if (!subcommandName || typeof subcommandName !== 'string') {
        return subcommandName;
    }
    const normalized = subcommandName.toLowerCase();
    return subcommandAliases[normalized] || subcommandName;
}
