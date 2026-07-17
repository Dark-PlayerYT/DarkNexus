import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildGiveaways, saveGiveaway } from '../../utils/giveaways.js';
import { 
    endGiveaway as endGiveawayService,
    createGiveawayEmbed, 
    createGiveawayButtons 
} from '../../services/giveawayService.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("gbitir")
        .setDescription(
            "Aktif bir çekilişi hemen sonlandırır ve kazananı/kazananları belirler.",
        )
        .addStringOption((option) =>
            option
                .setName("mesajid")
                .setDescription("Sonlandırılacak çekilişin mesaj ID'si.")
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
                "Bir çekilişi sonlandırmak için 'Sunucuyu Yönet' yetkisine sahip olmalısınız.",
                { userId: interaction.user.id, guildId: interaction.guildId }
            );
        }

        logger.info(`Çekilişi bitirme işlemi ${interaction.user.tag} tarafından ${interaction.guildId} sunucusunda başlatıldı.`);

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
                "Veritabanında bu mesaj ID'sine sahip aktif bir çekiliş bulunamadı.",
                { messageId, guildId: interaction.guildId }
            );
        }

        const endResult = await endGiveawayService(
            interaction.client,
            giveaway,
            interaction.guildId,
            interaction.user.id
        );

        const updatedGiveaway = endResult.giveaway;
        const winners = endResult.winners;

        const channel = await interaction.client.channels.fetch(
            updatedGiveaway.channelId,
        ).catch(err => {
            logger.warn(`Kanal bulunamadı ${updatedGiveaway.channelId}:`, err.message);
            return null;
        });

        if (!channel || !channel.isTextBased()) {
            throw new TitanBotError(
                `Channel not found: ${updatedGiveaway.channelId}`,
                ErrorTypes.VALIDATION,
                "Çekilişin düzenlendiği kanal bulunamadı. Ancak çekiliş durumu veritabanında güncellendi.",
                { channelId: updatedGiveaway.channelId, messageId }
            );
        }

        const message = await channel.messages
            .fetch(messageId)
            .catch(err => {
                logger.warn(`Mesaj bulunamadı ${messageId}:`, err.message);
                return null;
            });

        if (!message) {
            throw new TitanBotError(
                `Message not found: ${messageId}`,
                ErrorTypes.VALIDATION,
                "Çekiliş mesajı bulunamadı. Ancak çekiliş durumu veritabanında güncellendi.",
                { messageId, channelId: updatedGiveaway.channelId }
            );
        }

        await saveGiveaway(
            interaction.client,
            interaction.guildId,
            updatedGiveaway,
        );

        const newEmbed = createGiveawayEmbed(updatedGiveaway, "ended", winners);
        const newRow = createGiveawayButtons(true);

        await message.edit({
            content: "🎉 **ÇEKİLİŞ SONA ERDİ** 🎉",
            embeds: [newEmbed],
            components: [newRow],
        });

        if (winners.length > 0) {
            const winnerMentions = winners
                .map((id) => `<@${id}>`)
                .join(", ");
            const winnerPingMsg = await channel.send({
                content: `🎉 TEBRİKLER ${winnerMentions}! **${updatedGiveaway.prize}** çekilişini kazandınız! Ödülünüzü almak için lütfen çekiliş sahibi <@${updatedGiveaway.hostId}> ile iletişime geçin.`,
            });
            updatedGiveaway.winnerPingMessageId = winnerPingMsg.id;
            await saveGiveaway(interaction.client, interaction.guildId, updatedGiveaway);

            logger.info(`Çekiliş ${winners.length} kazananla sona erdi. Mesaj ID: ${messageId}`);

            try {
                await logEvent({
                    client: interaction.client,
                    guildId: interaction.guildId,
                    eventType: EVENT_TYPES.GIVEAWAY_WINNER,
                    data: {
                        description: `Çekiliş ${winners.length} kazananla sona erdi`,
                        channelId: channel.id,
                        userId: interaction.user.id,
                        fields: [
                            {
                                name: 'Ödül',
                                value: updatedGiveaway.prize || 'Gizemli Ödül!',
                                inline: true
                            },
                            {
                                name: 'Kazananlar',
                                value: winnerMentions,
                                inline: false
                            },
                            {
                                name: 'Katılımcı Sayısı',
                                value: endResult.participantCount.toString(),
                                inline: true
                            }
                        ]
                    }
                });
            } catch (logError) {
                logger.debug('Çekiliş kazanma olayı loglanırken hata oluştu:', logError);
            }
        } else {
            await channel.send({
                content: `**${updatedGiveaway.prize}** için yapılan çekiliş, geçerli bir katılım olmadığı için kazanan olmadan sona erdi.`,
            });
            logger.info(`Çekiliş kazanan olmadan sona erdi. Mesaj ID: ${messageId}`);
        }

        logger.info(`Çekiliş ${interaction.user.tag} tarafından başarıyla sonlandırıldı. Mesaj ID: ${messageId}`);

        return InteractionHelper.safeReply(interaction, {
            embeds: [
                successEmbed(
                    "Çekiliş Sonlandırıldı ✅",
                    `**${updatedGiveaway.prize}** çekilişi ${channel} kanalında başarıyla sonlandırıldı. ${endResult.participantCount} katılımcı arasından ${winners.length} kazanan belirlendi.`,
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
    },
};
