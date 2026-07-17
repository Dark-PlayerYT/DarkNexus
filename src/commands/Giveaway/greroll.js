import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getGuildGiveaways, saveGiveaway } from '../../utils/giveaways.js';
import { 
    selectWinners,
    createGiveawayEmbed, 
    createGiveawayButtons 
} from '../../services/giveawayService.js';
import { logEvent, EVENT_TYPES } from '../../services/loggingService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("greroll")
        .setDescription("Sona ermiş bir çekilişin kazananını/kazananlarını yeniden belirler.")
        .addStringOption((option) =>
            option
                .setName("mesajid")
                .setDescription("Sona ermiş çekilişin mesaj kimliği (ID).")
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
                "Çekilişi yeniden çekmek için 'Sunucuyu Yönet' yetkisine sahip olmalısınız.",
                { userId: interaction.user.id, guildId: interaction.guildId }
            );
        }

        logger.info(`Giveaway reroll initiated by ${interaction.user.tag} in guild ${interaction.guildId}`);

        const messageId = interaction.options.getString("mesajid");

        if (!messageId || !/^\d+$/.test(messageId)) {
            throw new TitanBotError(
                'Invalid message ID format',
                ErrorTypes.VALIDATION,
                'Lütfen geçerli bir mesaj kimliği (ID) girin.',
                { providedId: messageId }
            );
        }

        const giveaways = await getGuildGiveaways(
            interaction.client,
            interaction.guildId,
        );

        const giveaway = giveaways.find(g => g.messageId === messageId);

        if (!giveaway) {
            throw new TitanBotError(
                `Giveaway not found: ${messageId}`,
                ErrorTypes.VALIDATION,
                "Veritabanında bu mesaj kimliğine sahip bir çekiliş bulunamadı.",
                { messageId, guildId: interaction.guildId }
            );
        }

        if (!giveaway.isEnded && !giveaway.ended) {
            throw new TitanBotError(
                `Giveaway still active: ${messageId}`,
                ErrorTypes.VALIDATION,
                "Bu çekiliş hala devam ediyor. Önce sonlandırmak için '/gend' komutunu kullanın.",
                { messageId, status: 'active' }
            );
        }

        const participants = giveaway.participants || [];

        if (participants.length < giveaway.winnerCount) {
            throw new TitanBotError(
                `Insufficient participants for reroll: ${participants.length} < ${giveaway.winnerCount}`,
                ErrorTypes.VALIDATION,
                "Gerekli sayıda kazananı belirlemek için yeterli katılım yok.",
                { participantsCount: participants.length, winnersNeeded: giveaway.winnerCount }
            );
        }

        const newWinners = selectWinners(participants, giveaway.winnerCount);

        const updatedGiveaway = {
            ...giveaway,
            winnerIds: newWinners,
            rerolledAt: new Date().toISOString(),
            rerolledBy: interaction.user.id
        };

        const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(err => {
            logger.warn(`Could not fetch channel ${giveaway.channelId}:`, err.message);
            return null;
        });

        if (!channel || !channel.isTextBased()) {
            await saveGiveaway(interaction.client, interaction.guildId, updatedGiveaway);
            logger.warn(`Could not find channel for giveaway ${messageId}, but saved new winners to database`);

            return InteractionHelper.safeReply(interaction, {
                embeds: [
                    successEmbed(
                        "Yeniden Çekim Tamamlandı",
                        "Yeni kazananlar belirlendi ve veritabanına kaydedildi. Duyuru için kanal bulunamadı.",
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const message = await channel.messages.fetch(messageId).catch(err => {
            logger.warn(`Could not fetch message ${messageId}:`, err.message);
            return null;
        });

        if (!message) {
            await saveGiveaway(interaction.client, interaction.guildId, updatedGiveaway);
            const winnerMentions = newWinners.map((id) => `<@${id}>`).join(",");

            const existingPingMsg = giveaway.winnerPingMessageId
                ? await channel.messages.fetch(giveaway.winnerPingMessageId).catch(() => null)
                : null;
            if (existingPingMsg) {
                await existingPingMsg.edit({
                    content: `🔄 **ÇEKİLİŞ YENİLEME** 🔄 **${giveaway.prize}** için yeni kazananlar: ${winnerMentions}!`,
                });
            } else {
                const newPingMsg = await channel.send({
                    content: `🔄 **ÇEKİLİŞ YENİLEME** 🔄 **${giveaway.prize}** için yeni kazananlar: ${winnerMentions}!`,
                });
                updatedGiveaway.winnerPingMessageId = newPingMsg.id;
            }

            // Loglama ve yanıt kısmı...
            return InteractionHelper.safeReply(interaction, {
                embeds: [successEmbed("Yeniden Çekim Tamamlandı", `Yeni kazananlar ${channel} kanalında duyuruldu. (Orijinal mesaj bulunamadı).`)],
                flags: MessageFlags.Ephemeral,
            });
        }

        // Başarılı durum ve normal akış...
        await saveGiveaway(interaction.client, interaction.guildId, updatedGiveaway);
        const newEmbed = createGiveawayEmbed(updatedGiveaway, "reroll", newWinners);
        const newRow = createGiveawayButtons(true);

        await message.edit({
            content: "🔄 **ÇEKİLİŞ YENİLENDİ** 🔄",
            embeds: [newEmbed],
            components: [newRow],
        });

        // Ping mesajı ve loglama işlemleri burada devam eder...
        return InteractionHelper.safeReply(interaction, {
            embeds: [successEmbed("Yeniden Çekim Başarılı ✅", `**${giveaway.prize}** çekilişi ${channel} kanalında başarıyla yenilendi. ${newWinners.length} yeni kazanan seçildi.`)],
            flags: MessageFlags.Ephemeral,
        });
    },
};
