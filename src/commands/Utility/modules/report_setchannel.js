import { PermissionsBitField } from 'discord.js';
import { successEmbed } from '../../../utils/embeds.js';
import { setLogChannel } from '../../../services/loggingService.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';

export default {
    async execute(interaction, config, client) {
        // Güvenlik kontrolü: Kullanıcının Sunucuyu Yönet yetkisi var mı?
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return await replyUserError(interaction, { 
                type: ErrorTypes.PERMISSION, 
                message: 'Şikayet kanalını ayarlamak için **Sunucuyu Yönet** yetkisine sahip olmalısınız.' 
            });
        }

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        try {
            // Şikayet log kanalını veritabanına/servise kaydediyoruz
            await setLogChannel(client, guildId, 'reports', channel.id);

            return InteractionHelper.safeReply(interaction, {
                embeds: [
                    successEmbed(
                        'Şikayet Kanalı Ayarlandı',
                        `Yeni şikayet bildirimleri artık ${channel} kanalına gönderilecek.\n\n` +
                        `⚙️ Bu ayarı dilerseniz \`/logging dashboard\` komutuyla da yönetebilirsiniz.`
                    )
                ],
                ephemeral: true,
            });
        } catch (error) {
            logger.error('report_setchannel error:', error);
            return await replyUserError(interaction, { 
                type: ErrorTypes.UNKNOWN, 
                message: 'Kanal yapılandırması kaydedilirken bir hata oluştu.' 
            });
        }
    },
};
