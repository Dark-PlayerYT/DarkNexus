import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig, setGuildConfig } from '../services/config/guildConfig.js';

export default {
  name: Events.GuildCreate,
  async execute(guild, client) {
    try {
      logger.info('Bot yeni bir sunucuya katıldı', {
        event: 'guild.create',
        guildId: guild.id,
        guildName: guild.name,
        memberCount: guild.memberCount,
      });

      // Sunucunun mevcut konfigürasyonunu kontrol et
      let config = await getGuildConfig(client, guild.id);
      
      // Eğer veritabanında bu sunucuya ait bir kayıt yoksa varsayılan ayarları oluştur
      if (!config) {
        config = {
          prefix: '!', // Varsayılan değerleriniz neyse buraya ekleyebilirsiniz
          language: 'tr',
          setupComplete: false
        };
        await setGuildConfig(client, guild.id, config);
        logger.info(`Sunucu için varsayılan konfigürasyon oluşturuldu: ${guild.id}`);
      }
      
    } catch (error) {
      logger.error(`Bot sunucuya katıldığında konfigürasyon yüklenirken hata oluştu (${guild?.id}):`, error);
    }
  },
};
