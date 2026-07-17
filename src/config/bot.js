import { logger } from '../utils/logger.js';

export const botConfig = {
  // =========================
  // BOT DURUMU (Kullanıcıların bot adının altında gördüğü kısım)
  // =========================
  // `status` seçenekleri:
  // - "online"    = yeşil nokta
  // - "idle"      = sarı ay (boşta)
  // - "dnd"       = kırmızı rahatsız etmeyin
  // - "invisible" = çevrimdışı görünür
  presence: {
    // Discord'da gösterilecek mevcut çevrimiçi durumu.
    status: "online",

    // Bot adının altında gösterilecek etkinlik satırları.
    // Discord API'sine göre `type` numara eşleştirmeleri:
    // 0 = Oynuyor
    // 1 = Yayında
    // 2 = Dinliyor
    // 3 = İzliyor
    // 4 = Özel Durum
    // 5 = Yarışıyor
    activities: [
      {
        name: "Custom Status", // Discord API'si için zorunludur, istemcide görünmez
        state: "stalking",     // Kullanıcıların gerçekte göreceği durum yazısı
        type: 4,               // Özel Durum (Custom)
      },
    ],
  },

  // =========================
  // KOMUT DAVRANIŞLARI
  // =========================
  commands: {
    // Bot sahibi kullanıcı ID'leri (OWNER_IDS çevre değişkeninde virgülle ayrılarak yazılır).
    // Sahipler, sahip/yönetici düzeyindeki bot komutlarına erişebilir.
    owners: process.env.OWNER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [],

    // Komut kullanımları arasındaki varsayılan bekleme süresi (saniye cinsinden).
    defaultCooldown: 3,

    // Eğer true ise, eski komutlar yeniden kaydedilmeden önce silinir.
    deleteCommands: false,

    // Eğitim uyumluluğu için tutulan isteğe bağlı sunucu ID'si; komut kaydı için kullanılmaz.
    testGuildId: process.env.TEST_GUILD_ID,

    // True olduğunda (veya MAINTENANCE_MODE=true), yalnızca bot sahipleri komutları çalıştırabilir.
    maintenanceMode: process.env.MAINTENANCE_MODE === "true",

    // Metin tabanlı komutlar için komut ön eki (örn. "!ping" için "!").
    // Hem eğik çizgi (slash) komutlarını hem de ön ek (prefix) komutlarını destekler.
    prefix: process.env.PREFIX || "!",
  },

  // =========================
  // BAŞVURU SİSTEMİ (APPLICATIONS)
  // =========================
  applications: {
    // Birisi başvuru formu doldurduğunda gösterilecek varsayılan sorular.
    defaultQuestions: [
      { question: "Adınız nedir?", required: true },
      { question: "Kaç yaşındasınız?", required: true },
      { question: "Neden katılmak istiyorsunuz?", required: true },
    ],

    // Başvuru durumuna göre embed renkleri.
    statusColors: {
      pending: "#FFA500",  // Beklemede (Turuncu)
      approved: "#00FF00", // Onaylandı (Yeşil)
      denied: "#FF0000",   // Reddedildi (Kırmızı)
    },

    // Kullanıcıların yeni bir başvuru göndermeden önce beklemesi gereken süre (saat cinsinden).
    applicationCooldown: 24,

    // Reddedilen başvuruları şu kadar gün sonra otomatik sil.
    deleteDeniedAfter: 7,

    // Onaylanan başvuruları şu kadar gün sonra otomatik sil.
    deleteApprovedAfter: 30,

    // Başvuruları yönetmesine izin verilen Rol ID'leri.
    managerRoles: [], // Çevre değişkeninden veya veritabanından doldurulacaktır
  },

  // =========================
  // EMBED RENKLERİ & MARKALAMA
  // =========================
  // ÖNEMLİ: Tüm bot renkleri için TEK DOĞRULUK KAYNAĞI burasıdır
  embeds: {
    colors: {
      // Ana marka renkleri.
      primary: "#336699",
      secondary: "#2F3136",

      // Başarılı/Hata/Uyarı/Bilgi mesajları için standart durum renkleri.
      success: "#57F287",
      error: "#ED4245",
      warning: "#FEE75C",
      info: "#3498DB",

      // Nötr yardımcı renkler.
      light: "#FFFFFF",
      dark: "#202225",
      gray: "#99AAB5",

      // Discord tarzı palet kısayolları.
      blurple: "#5865F2",
      green: "#57F287",
      yellow: "#FEE75C",
      fuchsia: "#EB459E",
      red: "#ED4245",
      black: "#000000",

      // Özelliğe özel renkler.
      giveaway: {
        active: "#57F287",
        ended: "#ED4245",
      },
      ticket: {
        open: "#57F287",
        claimed: "#FAA61A",
        closed: "#ED4245",
        pending: "#99AAB5",
      },
      economy: "#F1C40F",
      birthday: "#E91E63",
      moderation: "#9B59B6",

      // Destek talebi (Ticket) öncelik renk eşleştirmesi.
      priority: {
        none: "#95A5A6",
        low: "#3498db",
        medium: "#2ecc71",
        high: "#f1c40f",
        urgent: "#e74c3c",
      },
    },
    footer: {
      // Bot embedlerinde kullanılan varsayılan alt bilgi (footer) metni.
      text: "Dark Nexus",
      // Alt bilgi simge URL'si (null = simge yok).
      icon: null,
    },
    // Embedler için varsayılan küçük resim (thumbnail) URL'si (null = resim yok).
    thumbnail: null,
    author: {
      // İsteğe bağlı varsayılan embed yazar (author) bloğu.
      name: null,
      icon: null,
      url: null,
    },
  },

  // =========================
  // EKONOMİ AYARLARI
  // =========================
  economy: {
    currency: {
      // Para biriminin tekil adı.
      name: "coin",
      // Para biriminin çoğul adı.
      namePlural: "coins",
      // Bakiyelerde gösterilen para birimi simgesi.
      symbol: "$",
    },

    // Yeni kullanıcılar için başlangıç bakiyesi.
    startingBalance: 0,

    // Geliştirmelerden önceki temel banka kapasitesi (geliştirmeler kullanılıyorsa).
    baseBankCapacity: 100000,

    // Günlük ödül miktarı.
    dailyAmount: 100,

    // Çalışma (work) komutu rastgele ödeme aralığı.
    workMin: 10,
    workMax: 100,

    // Dilenme (beg) komutu rastgele ödeme aralığı.
    begMin: 5,
    begMax: 50,

    // Komut bekleme süreleri (milisaniye cinsinden).
    cooldowns: {
      daily: 24 * 60 * 60 * 1000,
      work: 60 * 60 * 1000,
      crime: 2 * 60 * 60 * 1000,
      rob: 4 * 60 * 60 * 1000,
    },

    // Soygun yaparken başarılı olma şansı (0.4 = %40).
    robSuccessRate: 0.4,

    // Başarısız soygundan sonra hapis cezası süresi (milisaniye cinsinden).
    // 3600000 = 1 saat.
    robFailJailTime: 3600000,
  },

  // =========================
  // MAĞAZA (SHOP) AYARLARI
  // =========================
  // Gerekli olduğunda buraya varsayılan mağaza ayarlarını ekleyin.
  shop: {

  },

  // =========================
  // DESTEK TALEBİ (TICKET) SİSTEMİ
  // =========================
  tickets: {
    // Yeni destek taleplerinin oluşturulduğu kategori ID'si (null = zorunlu kategori yok).
    defaultCategory: null,

    // Destek taleplerini yönetmesine/yanıtlamasına izin verilen Rol ID'leri.
    supportRoles: [],

    // Kullanıcıların/yetkililerin atayabileceği öncelik seçenekleri.
    priorities: {
      none: {
        emoji: "⚪",
        color: "#95A5A6",
        label: "Yok",
      },
      low: {
        emoji: "🟢",
        color: "#2ECC71",
        label: "Düşük",
      },
      medium: {
        emoji: "🟡",
        color: "#F1C40F",
        label: "Orta",
      },
      high: {
        emoji: "🔴",
        color: "#E74C3C",
        label: "Yüksek",
      },
      urgent: {
        emoji: "🚨",
        color: "#E91E63",
        label: "Acil",
      },
    },

    // Yeni destek talepleri için varsayılan öncelik derecesi.
    defaultPriority: "none",

    // Kapatılan destek taleplerinin arşivlendiği kategori ID'si.
    archiveCategory: null,

    // Destek talebi günlüklerinin (logs) gönderildiği kanal ID'si.
    logChannel: null,
  },

  // =========================
  // ÇEKİLİŞ (GIVEAWAY) AYARLARI
  // =========================
  giveaways: {
    // Milisaniye cinsinden varsayılan çekiliş süresi.
    // 86400000 = 24 saat.
    defaultDuration: 86400000,

    // İzin verilen kazanan sayısı aralığı.
    minimumWinners: 1,
    maximumWinners: 10,

    // Milisaniye cinsinden izin verilen çekiliş süresi aralığı.
    // 300000 = 5 dakika.
    minimumDuration: 300000,
    // 2592000000 = 30 gün.
    maximumDuration: 2592000000,

    // Çekiliş düzenlemesine izin verilen Rol ID'leri.
    allowedRoles: [],

    // Çekiliş kısıtlamalarını bypass eden (yok sayan) Rol ID'leri.
    bypassRoles: [],
  },

  // =========================
  // DOĞUM GÜNÜ AYARLARI
  // =========================
  birthday: {
    // Kullanıcılara doğum günlerinde verilen rolün ID'si.
    defaultRole: null,

    // Doğum günü duyurularının gönderildiği kanal ID'si.
    announcementChannel: null,

    // Doğum günü tarihlerini hesaplamak için kullanılan saat dilimi.
    timezone: "UTC",
  },

  // =========================
  // DOĞRULAMA (VERIFICATION) AYARLARI
  // =========================
  verification: {
    // Doğrulama paneli gönderildiğinde gösterilecek mesaj.
    defaultMessage: "Kendinizi doğrulamak ve sunucuya erişim sağlamak için aşağıdaki butona tıklayın!",

    // Doğrulama butonundaki metin.
    defaultButtonText: "Doğrula",

    // Otomatik doğrulama davranışı.
    autoVerify: {
      // Otomatik doğrulamanın kimleri onaylayacağına nasıl karar verdiği:
      // - "none"        = herkes anında otomatik olarak doğrulanır
      // - "account_age" = hesabın belirlenen günden daha eski olması gerekir
      // - "server_size" = yalnızca daha küçük sunucularda herkesi otomatik doğrular
      defaultCriteria: "none",

      // `defaultCriteria` değeri `account_age` olduğunda kullanılan gün sayısı.
      defaultAccountAgeDays: 7,

      // `defaultCriteria` değeri `server_size` olduğunda kullanılan üye sayısı eşiği.
      // Örnek: 1000, sunucuda 1000'den az üye varsa herkesi otomatik doğrula anlamına gelir.
      serverSizeThreshold: 1000,

      // Hesap yaşı gereksinimleri için izin verilen güvenlik sınırları.
      // 1 = minimum gün, 365 = maksimum gün.
      minAccountAge: 1,
      maxAccountAge: 365,

      // True ise, kullanıcı doğrulandıktan sonra bir DM bildirimi alır.
      sendDMNotification: true,

      // Her bir kriter modu için anlaşılır açıklamalar.
      criteria: {
        account_age: "Hesap belirtilen gün sayısından daha eski olmalıdır",
        server_size: "Sunucuda 1000'den az üye varsa tüm kullanıcılar",
        none: "Tüm kullanıcılar anında"
      }
    },

    // Doğrulama denemeleri arasındaki minimum süre (milisaniye cinsinden).
    // 5000 = 5 saniye.
    verificationCooldown: 5000,

    // Aşağıdaki zaman penceresinde izin verilen maksimum başarısız deneme sayısı.
    maxVerificationAttempts: 3,

    // Denemeleri saymak için kullanılan zaman penceresi (milisaniye cinsinden).
    // 60000 = 1 dakika.
    attemptWindow: 60000,

    // Bellek içi güvenlik sınırları (belleğin sınırsız büyümesini önlemeye yardımcı olur).
    maxCooldownEntries: 10000,
    maxAttemptEntries: 10000,
    // Bekleme süresi/deneme haritaları için temizleme sıklığı (milisaniye cinsinden).
    // 300000 = 5 dakika.
    cooldownCleanupInterval: 300000,
    // Denetim (audit) girdileri için maksimum meta veri boyutu (bayt cinsinden).
    maxAuditMetadataBytes: 4096,
    // Bellekte tutulan maksimum denetim kaydı sayısı.
    maxInMemoryAuditEntries: 1000,
    // True ise, her doğrulama işlemini günlüğe kaydet (logla).
    logAllVerifications: true,
    // True ise, doğrulama denetim geçmişini sakla.
    keepAuditTrail: true,
  },

  // =========================
  // HOŞ GELDİNİZ / GÜLE GÜLE MESAJLARI
  // =========================
  welcome: {
    // Bir kullanıcı katıldığında gönderilen karşılama şablonu.
    // Değişkenler: {user}, {server}, {memberCount}
    defaultWelcomeMessage:
      "Hoş geldin {user}, sunucumuz {server}'a katıldın! Artık {memberCount} kişiyiz!",
    // Bir kullanıcı ayrıldığında gönderilen veda şablonu.
    // Değişkenler: {user}, {memberCount}
    defaultGoodbyeMessage:
      "{user} sunucudan ayrıldı. Şu an {memberCount} üyemiz kaldı.",
    // Karşılama mesajları için kanal ID'si.
    defaultWelcomeChannel: null,
    // Veda mesajları için kanal ID'si.
    defaultGoodbyeChannel: null,
  },

  // =========================
  // SAYAÇ KANALLARI (COUNTER CHANNELS)
  // =========================
  counters: {
    defaults: {
      // Sayaç kanalları için varsayılan adlandırma/açıklama şablonları.
      name: "{name} Sayacı",
      description: "Sunucu {name} sayacı",
      // Sayaçlar için kullanılan kanal türü (genellikle "voice" yani ses kanalı).
      type: "voice",
      // Kanal adı biçimi. `{count}` otomatik olarak değerle değiştirilir.
      channelName: "{name}-{count}",
    },
    permissions: {
      // Sayaç kanalı için varsayılan reddedilen yetkiler.
      deny: ["VIEW_CHANNEL"],
      // Sayaç kanalı için varsayılan izin verilen yetkiler.
      allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"],
    },
    messages: {
      // Sayaç işlemleri için varsayılan yanıt mesajları.
      created: "✅ **{name}** sayacı oluşturuldu",
      deleted: "🗑️ **{name}** sayacı silindi",
      updated: "🔄 **{name}** sayacı güncellendi",
    },
    types: {
      // Yerleşik sayaç türleri ve her bir sayımın nasıl hesaplandığı.
      members: {
        name: "👥 Üyeler",
        description: "Sunucudaki toplam üye sayısı",
        getCount: (guild) => guild.memberCount.toString(),
      },
      bots: {
        name: "🤖 Botlar",
        description: "Sunucudaki toplam bot hesabı sayısı",
        getCount: (guild) =>
          guild.members.cache.filter((m) => m.user.bot).size.toString(),
      },
      members_only: {
        name: "👤 Kullanıcılar",
        description: "Toplam gerçek kullanıcı sayısı (botlar hariç)",
        getCount: (guild) =>
          guild.members.cache.filter((m) => !m.user.bot).size.toString(),
      },
    },
  },

  // =========================
  // GENEL BOT MESAJLARI
  // =========================
  messages: {
    noPermission: "Bu komutu kullanmak için gerekli izne sahip değilsiniz.",
    cooldownActive: "Bu komutu tekrar kullanabilmek için lütfen {time} bekleyin.",
    errorOccurred: "Bu komut yürütülürken bir hata oluştu.",
    missingPermissions:
      "Bu işlemi gerçekleştirmek için gerekli izinlere sahip değilim.",
    commandDisabled: "Bu komut devre dışı bırakıldı.",
    maintenanceMode: "Bot şu anda bakım modundadır.",
  },

  // =========================
  // ÖZELLİK AÇMA / KAPAMA (TOGGLES)
  // =========================
  // Herhangi bir özelliği küresel olarak devre dışı bırakmak için değerini `false` yapın.
  features: {
    // Çekirdek sistemler.
    economy: true,
    leveling: true,
    moderation: true,
    logging: true,
    welcome: true,

    // Topluluk etkileşim sistemleri.
    tickets: true,
    giveaways: true,
    birthday: true,
    counter: true,

    // Güvenlik ve kendi kendine hizmet sistemleri.
    verification: true,
    reactionRoles: true,
    joinToCreate: true,

    // Yardımcı/Yaşam kalitesi modülleri.
    voice: true,
    search: true,
    tools: true,
    utility: true,
    community: true,
    fun: true,
    music: true,
  },
};

export function validateConfig(config) {
  const errors = [];

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Çevre değişkenleri kontrolü:');
    logger.debug('DISCORD_TOKEN mevcut mu:', !!process.env.DISCORD_TOKEN);
    logger.debug('TOKEN mevcut mu:', !!process.env.TOKEN);
    logger.debug('CLIENT_ID mevcut mu:', !!process.env.CLIENT_ID);
    logger.debug('GUILD_ID mevcut mu:', !!process.env.GUILD_ID);
    logger.debug('POSTGRES_HOST mevcut mu:', !!process.env.POSTGRES_HOST);
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
  }

  if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    errors.push("Bot tokeni gerekli (DISCORD_TOKEN veya TOKEN çevre değişkeni)");
  }

  if (!process.env.CLIENT_ID) {
    errors.push("Client ID gerekli (CLIENT_ID çevre değişkeni)");
  }

  if (process.env.NODE_ENV === 'production') {
    // Tam bir bağlantı URL'si (DATABASE_URL / POSTGRES_URL) tüm Postgres gereksinimlerini karşılar.
    const hasConnectionUrl = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);

    if (!hasConnectionUrl) {
      if (!process.env.POSTGRES_HOST) {
        errors.push("Üretim ortamında PostgreSQL bağlantısı gereklidir (DATABASE_URL/POSTGRES_URL veya POSTGRES_HOST ayarlayın)");
      }
      if (!process.env.POSTGRES_USER) {
        errors.push("Üretim ortamında PostgreSQL kullanıcısı gereklidir (DATABASE_URL/POSTGRES_URL veya POSTGRES_USER ayarlayın)");
      }
      if (!process.env.POSTGRES_PASSWORD) {
        errors.push("Üretim ortamında PostgreSQL şifresi gereklidir (DATABASE_URL/POSTGRES_URL veya POSTGRES_PASSWORD ayarlayın)");
      }
    }
  }

  return errors;
}

const configErrors = validateConfig(botConfig);
if (configErrors.length > 0) {
  logger.error("Bot yapılandırma hataları:", configErrors.join("\n"));
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const BotConfig = botConfig;

const COMMAND_CATEGORY_FEATURE_MAP = {
  birthday: "birthday",
  community: "community",
  economy: "economy",
  fun: "fun",
  giveaway: "giveaways",
  jointocreate: "joinToCreate",
  leveling: "leveling",
  logging: "logging",
  moderation: "moderation",
  music: "music",
  reaction_roles: "reactionRoles",
  search: "search",
  serverstats: "counter",
  ticket: "tickets",
  tools: "tools",
  utility: "utility",
  verification: "verification",
  welcome: "welcome",
};

function normalizeCategoryKey(category) {
  return String(category || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function getCommandPrefix() {
  return botConfig.commands?.prefix ?? "!";
}

export function getBotOwners() {
  return (botConfig.commands?.owners ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
}

export function isBotOwner(userId) {
  if (!userId) {
    return false;
  }

  return getBotOwners().includes(String(userId));
}

export function isMaintenanceMode() {
  return botConfig.commands?.maintenanceMode === true;
}

export function getBotMessage(key, replacements = {}) {
  let message = botConfig.messages?.[key] || key;

  for (const [placeholder, value] of Object.entries(replacements)) {
    message = message.replace(new RegExp(`\\{${placeholder}\\}`, "g"), String(value));
  }

  return message;
}

export function isFeatureEnabled(featureKey) {
  if (!featureKey) {
    return true;
  }

  return botConfig.features?.[featureKey] !== false;
}

export function isCommandCategoryEnabled(category) {
  const normalized = normalizeCategoryKey(category);

  if (!normalized || normalized === "core") {
    return true;
  }

  const featureKey = COMMAND_CATEGORY_FEATURE_MAP[normalized];
  if (!featureKey) {
    return true;
  }

  return isFeatureEnabled(featureKey);
}

export function getApplicationStatusColor(status) {
  const colors = botConfig.applications?.statusColors || {};
  const hex = colors[status];
  return hex ? getColor(hex) : getColor(status === "approved" ? "success" : status === "denied" ? "error" : "warning");
}

export function getDefaultApplicationQuestions() {
  return (botConfig.applications?.defaultQuestions || []).map((entry) =>
    typeof entry === "string" ? entry : entry.question,
  ).filter(Boolean);
}

export function getColor(path, fallback = "#99AAB5") {
  
  if (typeof path === "number") return path;
  if (typeof path === "string" && path.startsWith("#")) {
    
    return parseInt(path.replace("#", ""), 16);
  }
  const result = path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : fallback),
      botConfig.embeds.colors,
    );
  
  if (typeof result === "string" && result.startsWith("#")) {
    return parseInt(result.replace("#", ""), 16);
  }
  return result;
}

export function getRandomColor() {
  const colors = Object.values(botConfig.embeds.colors).flatMap((color) =>
    typeof color === "string" ? color : Object.values(color),
  );
  return colors[Math.floor(Math.random() * colors.length)];
}

export default botConfig;
