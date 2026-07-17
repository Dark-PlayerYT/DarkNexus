import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getTicketPermissionContext } from '../../utils/ticket/ticketPermissions.js';
import { updateTicketPriority } from '../../services/ticket.js';

export default {
    data: new SlashCommandBuilder()
        .setName("priority")
        .setDescription("Mevcut destek talebinin öncelik seviyesini ayarlar.")
        .addStringOption((option) =>
            option
                .setName("level")
                .setDescription("Bilet için öncelik seviyesi.")
                .setRequired(true)
                .addChoices(
                    { name: "Acil", value: "urgent" },
                    { name: "Yüksek", value: "high" },
                    { name: "Orta", value: "medium" },
                    { name: "Düşük", value: "low" },
                    { name: "Yok", value: "none" },
                ),
        )
        .setDMPermission(false),
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

        if (!permissionContext.canManageTicket) {
            return await replyUserError(interaction, { 
                type: ErrorTypes.PERMISSION, 
                message: 'Bilet önceliğini değiştirmek için **Kanalları Yönet** yetkisine veya yapılandırılmış **Bilet Yetkili** rolüne sahip olmalısınız.' 
            });
        }

        const priorityLevel = interaction.options.getString("level");
        await updateTicketPriority(interaction.channel, priorityLevel, interaction.user);

        // Öncelik seviyesini şık bir şekilde geri bildirim olarak sunuyoruz
        const priorityLabels = {
            urgent: "ACİL",
            high: "YÜKSEK",
            medium: "ORTA",
            low: "DÜŞÜK",
            none: "YOK"
        };

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    "Öncelik Güncellendi",
                    `Bilet önceliği **${priorityLabels[priorityLevel]}** olarak ayarlandı.`,
                ),
            ],
        });

        logger.info('Ticket priority updated successfully', {
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name,
            guildId: interaction.guildId,
            priority: priorityLevel,
            commandName: 'priority'
        });
    },
};
