import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildGiveaways, deleteGiveaway } from '../../utils/giveaways.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("gsil")
        .setDescription(
            "Bir çekiliş mesajını siler ve çekilişi veritabanından kaldırır.",
        )
        .addStringOption((option) =>
            option
                .setName("mesajid")
                .setDescription("Silinecek çekilişin mesaj ID'si.")
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            throw new TitanBotError(
                'Giveaway command used outside guild',
                ErrorTypes.VALIDATION,
                'Bu komut sadece bir sunucu içerisinde kullanılabilir.',
                { userId: interaction.user.id }
            );
        }

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            throw new TitanBotError(
                'User lacks ManageGuild permission',
                ErrorTypes.PERMISSION,
                "Bir çekilişi silmek için 'Sunucuyu Yönet' yetkisine sahip olmalısınız.",
                { userId: interaction.user.id, guildId: interaction.guildId }
            );
        }

        logger.info(`Çekiliş silme işlemi ${interaction.user.tag} tarafından ${interaction.guildId} sunucusunda başlatıldı.`);

        const messageId = interaction.options.getString("mesajid");

        if (!messageId || !/^\d+$/.test(messageId)) {
            throw new TitanBotError(
                'Invalid message ID format',
                ErrorTypes.VALIDATION,
                'Lütfen geçerli bir mesaj ID\'si girin.',
                { providedId: messageId }
            );
        }

        const giveaways = await getGuildGiveaways(interaction.client, interaction.guildId);
        const giveaway = giveaways.find(g => g.messageId === messageId);

        if (!giveaway) {
            throw new TitanBotError(
                `Giveaway not found: ${messageId}`,
                ErrorTypes.VALIDATION,
                "Bu mesaj ID'sine sahip bir çekiliş bulunamadı.",
                { messageId, guildId: interaction.guildId }
            );
        }

        let deletedMessage = false;
        let channelName = "Bilinmeyen Kanal";

        const tryDeleteFromChannel = async (channel) => {
            if (!channel || !channel.isTextBased() || !channel.messages?.fetch) {
                return false;
            }

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) {
                return false;
            }

            await message.delete();
            channelName = channel.name || 'bilinmeyen-kanal';
            deletedMessage = true;
            return true;
        };

        try {
            const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
            if (await tryDeleteFromChannel(channel)) {
                logger.debug(`Çekiliş mesajı (${messageId}) #${channelName} kanalından başarıyla silindi.`);
            }

            if (!deletedMessage && interaction.guild) {
                const textChannels = interaction.guild.channels.cache.filter(
                    ch => ch.id !== giveaway.channelId && ch.isTextBased() && ch.messages?.fetch
                );

                for (const [, guildChannel] of textChannels) {
                    const foundAndDeleted = await tryDeleteFromChannel(guildChannel).catch(() => false);
                    if (foundAndDeleted) {
                        logger.debug(`Çekiliş mesajı (${messageId}) alternatif kanal taramasıyla #${channelName} kanalından silindi.`);
                        break;
                    }
                }
            }
        } catch (error) {
            logger.warn(`Çekiliş mesajı silinemedi: ${error.message}`);
        }

        const removedFromDatabase = await deleteGiveaway(
            interaction.client,
            interaction.guildId,
            messageId,
        );

        if (!removedFromDatabase) {
            throw new TitanBotError(
                `Failed to delete giveaway from database: ${messageId}`,
                ErrorTypes.UNKNOWN,
                'Çekiliş veritabanından silinemedi. Lütfen tekrar deneyin.',
                { messageId, guildId: interaction.guildId }
            );
        }

        const giveawaysAfterDelete = await getGuildGiveaways(interaction.client, interaction.guildId);
        const stillExistsInDatabase = giveawaysAfterDelete.some(g => g.messageId === messageId);

        if (stillExistsInDatabase) {
            throw new TitanBotError(
                `Giveaway still exists after deletion: ${messageId}`,
                ErrorTypes.UNKNOWN,
                'Çekiliş silme işlemi veritabanına kaydedilemedi. Lütfen tekrar deneyin.',
                { messageId, guildId: interaction.guildId }
            );
        }

        const statusMsg = deletedMessage
            ? `ve çekiliş mesajı #${channelName} kanalından silindi.`
            : `ancak çekiliş mesajı zaten silinmişti veya kanala erişilemedi.`;

        const winnerIds = Array.isArray(giveaway.winnerIds) ? giveaway.winnerIds : [];
        const hasWinners = winnerIds.length > 0;
        const wasEnded = giveaway.ended === true || giveaway.isEnded === true || hasWinners;

        const winnerStatusMsg = hasWinners
            ? `Bu çekilişte zaten ${winnerIds.length} kazanan belirlenmişti.`
            : wasEnded
                ? 'Bu çekiliş zaten geçerli bir kazanan olmadan sona ermişti.'
                : 'Silme işleminden önce henüz kazanan seçilmemişti.';

        logger.info(`Çekiliş silindi: ${messageId} (#${channelName} kanalında)`);

        try {
            await logEvent({
                client: interaction.client,
                guildId: interaction.guildId,
                eventType: EVENT_TYPES.GIVEAWAY_DELETE,
                data: {
                    description: `Çekiliş silindi: ${giveaway.prize}`,
                    channelId: giveaway.channelId,
                    userId: interaction.user.id,
                    fields: [
                        {
                            name: 'Ödül',
                            value: giveaway.prize || 'Bilinmiyor',
                            inline: true
                        },
                        {
                            name: 'Katılımcı Sayısı',
                            value: (giveaway.participants?.length || 0).toString(),
                            inline: true
                        }
                    ]
                }
            });
        } catch (logError) {
            logger.debug('Çekiliş silme olayı loglanırken hata oluştu:', logError);
        }

        return InteractionHelper.safeReply(interaction, {
            embeds: [
                successEmbed(
                    "Çekiliş Silindi 🗑️",
                    `**${giveaway.prize}** çekilişi veritabanından başarıyla kaldırıldı ${statusMsg} ${winnerStatusMsg}`,
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
};
