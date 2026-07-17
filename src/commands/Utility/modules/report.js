import { createEmbed } from '../../../utils/embeds.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { logEvent, EVENT_TYPES, resolveLogChannel } from '../../../services/loggingService.js';
import { formatLogLine, resolveUserAuthor } from '../../../utils/logging/logEmbeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        // Kullanıcının şikayeti gizli (ephemeral) olarak işleniyor
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { ephemeral: true });
        if (!deferSuccess) {
            logger.warn('Report interaction defer failed', { userId: interaction.user.id, guildId: interaction.guildId });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const guildId = interaction.guildId;

        const guildConfig = await getGuildConfig(client, guildId);
        const reportChannelId = resolveLogChannel(guildConfig, 'reports');

        // Şikayet kanalı ayarlanmamışsa kullanıcıyı ve yetkilileri yönlendiren hata mesajı
        if (!reportChannelId) {
            return await replyUserError(interaction, { 
                type: ErrorTypes.UNKNOWN, 
                message: 'Şikayet kanalı henüz ayarlanmamış. Lütfen bir yöneticiden `/report setchannel` veya `/logging dashboard` komutunu kullanmasını isteyin.' 
            });
        }

        // Sunucu sahibine gidecek bildirim metni
        const ownerMention = interaction.guild.ownerId
            ? `<@${interaction.guild.ownerId}> Yeni şikayet bildirimi var!`
            : 'Yeni şikayet bildirimi var!';

        // Log servisine şikayeti iletiyoruz
        await logEvent({
            client,
            guildId,
            eventType: EVENT_TYPES.REPORT_FILE,
            content: ownerMention,
            data: {
                title: '🚨 Kullanıcı Şikayeti',
                lines: [
                    formatLogLine('Şikayet Edilen', `${targetUser.tag} (\`${targetUser.id}\`)`),
                    formatLogLine('Şikayet Eden', `${interaction.user.tag} (\`${interaction.user.id}\`)`),
                    formatLogLine('Kanal', interaction.channel.toString()),
                ],
                blockFields: [{ name: 'Şikayet Nedeni', value: reason }],
                author: await resolveUserAuthor(client, targetUser.id),
                thumbnail: targetUser.displayAvatarURL(),
            },
        });

        // Kullanıcıya şikayetin alındığına dair başarı bildirimi
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: '✅ Şikayet Gönderildi',
                description: `**${targetUser.tag}** adlı kullanıcıya yönelik şikayetiniz başarıyla kaydedildi ve moderasyon ekibine iletildi. Hassasiyetiniz için teşekkür ederiz!`,
            })],
        });

        logger.info('Report submitted', {
            userId: interaction.user.id,
            reportedUserId: targetUser.id,
            guildId,
            reasonLength: reason.length,
        });
    },
};
