/**
 * Komut erişim yöneticisi için kategori meta verileri ve ikonları.
 */

export const CATEGORY_ICONS = {
    'Doğum Günü': '🎂',
    'Topluluk': '👥',
    'Ana Komutlar': 'ℹ️',
    'Ekonomi': '💰',
    'Eğlence': '🎮',
    'Çekiliş': '🎉',
    'Ses Kanalı Oluşturma': '🔌',
    'Seviye Sistemi': '📊',
    'Loglama': '📝',
    'Moderasyon': '🛡️',
    'Müzik': '🎵',
    'Tepki Rolleri': '🎭',
    'Arama': '🔍',
    'Sunucu İstatistikleri': '📈',
    'Destek Talebi': '🎫',
    'Araçlar': '🛠️',
    'Yardımcı Programlar': '🔧',
    'Doğrulama': '✅',
    'Karşılama': '👋',
};

// İngilizce gelen kategori isimlerini Türkçe karşılıklarına eşlemek için sözlük
const KATEGORI_CEVIRILERI = {
    'birthday': 'Doğum Günü',
    'community': 'Topluluk',
    'core': 'Ana Komutlar',
    'economy': 'Ekonomi',
    'fun': 'Eğlence',
    'giveaway': 'Çekiliş',
    'jointocreate': 'Ses Kanalı Oluşturma',
    'leveling': 'Seviye Sistemi',
    'logging': 'Loglama',
    'moderation': 'Moderasyon',
    'music': 'Müzik',
    'reaction_roles': 'Tepki Rolleri',
    'reactionroles': 'Tepki Rolleri',
    'search': 'Arama',
    'serverstats': 'Sunucu İstatistikleri',
    'ticket': 'Destek Talebi',
    'tools': 'Araçlar',
    'utility': 'Yardımcı Programlar',
    'verification': 'Doğrulama',
    'welcome': 'Karşılama'
};

/** Yöneticilerin erişimi her zaman kurtarabilmesi için her zaman aktif kalan korumalı komutlar. */
export const PROTECTED_COMMANDS = new Set(['commands', 'configwizard']);

/**
 * Kategori anahtarını normalize eder (küçük harfe çevirir ve boşlukları alt tire yapar)
 */
export function normalizeCategoryKey(category) {
    return String(category || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

/**
 * Ham kategori adını yöneticilerin ve kullanıcıların göreceği temiz Türkçe formata dönüştürür
 */
export function formatCategoryName(rawCategory) {
    if (!rawCategory) return 'Bilinmeyen';
    
    // Önce anahtar kelimeyi normalize edip Türkçe karşılığı var mı diye bakıyoruz
    const anahtar = normalizeCategoryKey(rawCategory).replace(/_/g, '');
    if (KATEGORI_CEVIRILERI[anahtar]) {
        return KATEGORI_CEVIRILERI[anahtar];
    }

    // Eğer sözlükte yoksa eski standart temizlemeyi yapıp döndürür
    return String(rawCategory)
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Kategoriye ait ikonu getirir, eşleşme bulamazsa varsayılan klasör ikonunu döner
 */
export function getCategoryIcon(category) {
    if (!category) return '📁';
    
    const turkceAd = formatCategoryName(category);
    return CATEGORY_ICONS[turkceAd] || CATEGORY_ICONS[category] || '📁';
}
