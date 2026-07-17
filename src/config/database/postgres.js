import { assertAllowlistedIdentifier } from '../../utils/sqlIdentifiers.js';
import { EXPECTED_SCHEMA_LABEL, EXPECTED_SCHEMA_VERSION } from './schemaVersion.js';

const configuredTables = {
    // Orijinal İngilizce anahtarlar ve altlarında tekil Türkçe karşılıkları
    guilds: 'guilds',
    sunucu: 'guilds',

    users: 'users',
    kullanıcı: 'users',

    guild_users: 'guild_users',
    sunucu_kullanıcısı: 'guild_users',

    birthdays: 'birthdays',
    doğumgünü: 'birthdays', // İstediğin gibi birleşik yapıldı

    giveaways: 'giveaways',
    çekiliş: 'giveaways',

    tickets: 'ticket_data',
    bilet: 'ticket_data',

    afk_status: 'afk_status',
    afk_durumu: 'afk_status',

    welcome_configs: 'welcome_configs',
    karşılama_ayarı: 'welcome_configs',

    leveling_configs: 'leveling_configs',
    seviye_ayarı: 'leveling_configs',

    user_levels: 'user_levels',
    kullanıcı_seviyesi: 'user_levels',

    economy: 'economy',
    ekonomi: 'economy',

    invite_tracking: 'invite_tracking',
    davet_takibi: 'invite_tracking',

    application_roles: 'application_roles',
    başvuru_rolü: 'application_roles',

    verification_audit: 'verification_audit',
    onay_denetimi: 'verification_audit',

    temp_data: 'temp_data',
    geçici_veri: 'temp_data',

    cache_data: 'cache_data',
    önbellek_verisi: 'cache_data',
};

const allowedTableIdentifiers = new Set([
    // Orijinal Veritabanı Tablo İsimleri
    'guilds',
    'users',
    'guild_users',
    'birthdays',
    'giveaways',
    'ticket_data',
    'afk_status',
    'welcome_configs',
    'leveling_configs',
    'user_levels',
    'economy',
    'invite_tracking',
    'application_roles',
    'verification_audit',
    'temp_data',
    'cache_data',

    // Filtre İçin Tekil Türkçe Karşılıklar
    'sunucu',
    'kullanıcı',
    'sunucu_kullanıcısı',
    'doğumgünü', // İzin verilenler listesinde de güncellendi
    'çekiliş',
    'bilet',
    'afk_durumu',
    'karşılama_ayarı',
    'seviye_ayarı',
    'kullanıcı_seviyesi',
    'ekonomi',
    'davet_takibi',
    'başvuru_rolü',
    'onay_denetimi',
    'geçici_veri',
    'önbellek_verisi'
]);

const validatedTables = Object.fromEntries(
    Object.entries(configuredTables).map(([key, value]) => [
        key,
        assertAllowlistedIdentifier(value, allowedTableIdentifiers, `PostgreSQL tablo belirteci (${key})`),
    ])
);

// Varsayılan veritabanı adı 'darknexus' olarak güncellendi
const DEFAULT_POSTGRES_URL = 'postgresql://localhost:5432/darknexus';

export function resolveSslConfig() {
    const sslEnv = process.env.POSTGRES_SSL?.toLowerCase();
    if (sslEnv === 'false' || sslEnv === '0') {
        return false;
    }
    if (sslEnv === 'true' || sslEnv === '1') {
        return { rejectUnauthorized: false };
    }

    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
    if (/sslmode=(require|verify-ca|verify-full|prefer)/i.test(url)) {
        return { rejectUnauthorized: false };
    }

    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
        return { rejectUnauthorized: false };
    }

    if (process.env.NODE_ENV === 'production') {
        return { rejectUnauthorized: false };
    }

    return false;
}

export function resolvePostgresPoolConfig() {
    const ssl = resolveSslConfig();
    const url = (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
    const sharedOptions = {
        max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
        min: parseInt(process.env.POSTGRES_MIN_CONNECTIONS) || 2,
        idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT) || 10000,
        application_name: 'darknexus', // Uygulama adı güncellendi
        statement_timeout: process.env.NODE_ENV === 'production' ? 30000 : 0,
        keepalives: 1,
        keepalives_idle: 30,
        ssl,
    };

    if (url && url !== DEFAULT_POSTGRES_URL) {
        return { connectionString: url, ...sharedOptions };
    }

    return {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        database: process.env.POSTGRES_DB || 'darknexus', // Varsayılan yerel veritabanı adı güncellendi
        user: process.env.POSTGRES_USER || 'postgres',
        password: (process.env.POSTGRES_PASSWORD || '').toString(),
        ...sharedOptions,
    };
}

export const pgConfig = {
    url: process.env.POSTGRES_URL || process.env.DATABASE_URL || DEFAULT_POSTGRES_URL,
    
    options: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        database: process.env.POSTGRES_DB || 'darknexus', // Varsayılan yerel veritabanı adı güncellendi
        user: process.env.POSTGRES_USER || 'postgres',
        password: (process.env.POSTGRES_PASSWORD || '').toString(),
        ssl: resolveSslConfig(),

        max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
        min: parseInt(process.env.POSTGRES_MIN_CONNECTIONS) || 2,
        idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT) || 10000,

        application_name: 'darknexus', // Uygulama adı güncellendi
        statement_timeout: process.env.NODE_ENV === 'production' ? 30000 : 0,
        keepalives: 1,
        keepalives_idle: 30,

        retries: parseInt(process.env.POSTGRES_RETRIES) || 3,
        backoffBase: parseInt(process.env.POSTGRES_BACKOFF_BASE) || 100,
        backoffMultiplier: parseInt(process.env.POSTGRES_BACKOFF_MULTIPLIER) || 2,
    },
    
    tables: validatedTables,
    
    defaultTTL: {
        userSession: 86400,
        temp: 3600,
        cache: 1800,
        guildConfig: null,
        economy: null,
        leveling: null,
        giveaway: null,
        ticket: 604800,
        afk: 86400,
        welcome: null,
        birthday: null,
    },
    
    features: {
        pooling: true,
        ssl: process.env.NODE_ENV === 'production',
        metrics: true,
        debug: process.env.NODE_ENV === 'development',
        autoCreateTables: true,
        autoMigrate: process.env.AUTO_MIGRATE !== 'false',
    },
    
    healthCheck: {
        enabled: true,
        interval: 30000,
        maxFailures: 3,
        query: 'SELECT 1',
    },
    
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
    
    migration: {
        enabled: true,
        table: 'schema_migrations',
        directory: 'database/migrations',
        rollbackOnFailure: false,
        expectedVersion: EXPECTED_SCHEMA_VERSION,
        expectedLabel: EXPECTED_SCHEMA_LABEL,
    }
};

export default pgConfig;
