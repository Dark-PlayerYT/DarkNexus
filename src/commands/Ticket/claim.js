import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getTicketPermissionContext } from '../../utils/ticket/ticketPermissions.js';
import { claimTicket } from '../../services/ticket.js';

export default {
    data: new SlashCommandBuilder()
        .setName("claim")
        .setDescription("Açık bir bilet talebini üzerine alır ve sorumluluğu üstlenir.")
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

        // Yetki kontrolü: Kullanıcı bilet sorumluluğunu alabilir mi?
        if (!permissionContext.canManageTicket) {
            return await replyUserError(interaction, { 
                type: ErrorTypes.PERMISSION, 
                message: 'Bilet sorumluluğunu alabilmek için **Kanalları Yönet** yetkisine veya yapılandırılmış **Bilet Yetkili** rolüne sahip olmalısınız.' 
            });
        }

        await claimTicket(interaction.channel, interaction.user);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    "Bilet Sorumluluğu Alındı",
                    "Bu biletin sorumluluğunu başarıyla üstlendiniz.",
                ),
            ],
        });

        logger.info('Ticket claimed successfully', {
            userId: interaction.user.id,
            userTag: interaction.user.tag,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name,
            guildId: interaction.guildId,
            commandName: 'claim'
        });
    },
};
