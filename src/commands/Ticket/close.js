import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getTicketPermissionContext } from '../../utils/ticket/ticketPermissions.js';
import { closeTicket } from '../../services/ticket.js';

export default {
    data: new SlashCommandBuilder()
        .setName("close")
        .setDescription("Mevcut destek talebini kapatır.")
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Biletin kapatılma nedeni (isteğe bağlı).")
                .setRequired(false),
        ),
    category: "Bilet",

    async execute(interaction, guildConfig, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        const permissionContext = await getTicketPermissionContext({ client, interaction });
        if (!permissionContext.ticketData) {
            return await replyUserError(interaction, { 
                type: ErrorTypes.VALIDATION, 
                message: 'Bu komut yalnızca geçerli bir bilet kanalında kullanılabilir.' 
            });
        }

        // Yetki kontrolü: Kullanıcı kapatma yetkisine sahip mi?
        if (!permissionContext.canCloseTicket) {
            return await replyUserError(interaction, { 
                type: ErrorTypes.PERMISSION, 
                message: 'Bu bileti kapatmak için **Kanalları Yönet** yetkisine, tanımlı **Bilet Yetkili** rolüne veya biletin sahibi olmanız gerekir.' 
            });
        }

        const reason = interaction.options?.getString("reason") || "Belirtilen bir neden yok.";

        await closeTicket(interaction.channel, interaction.user, reason);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    "Bilet Kapatıldı",
                    "Destek talebiniz başarıyla kapatıldı.",
                ),
            ],
        });

        logger.info('Ticket closed successfully', {
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name,
            guildId: interaction.guildId,
            reason: reason,
            commandName: 'close'
        });
    },
};
