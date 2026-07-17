import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Sunucu hakkında detaylı bilgi gösterir")
        .setDMPermission(false), // Sunucu bilgisinin DM'de kullanılmasını engeller

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`ServerInfo interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'serverinfo'
            });
            return;
        }

        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);

        const embed = createEmbed({ 
            title: `Sunucu Bilgisi: ${guild.name}`, 
            description: `🆔 **Sunucu ID:** \`${guild.id}\`` 
        })
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { name: "👑 Sunucu Sahibi", value: owner.user.tag, inline: true },
                { name: "👥 Üyeler", value: `${guild.memberCount}`, inline: true },
                { name: "💬 Kanallar", value: `${guild.channels.cache.size}`, inline: true },
                { name: "🎭 Roller", value: `${guild.roles.cache.size}`, inline: true },
                { 
                    name: "🚀 Takviyeler", 
                    value: `Seviye ${guild.premiumTier} (${guild.premiumSubscriptionCount} Takviye)`, 
                    inline: true 
                },
                { 
                    name: "📅 Kuruluş Tarihi", 
                    value: `<t:${createdTimestamp}:R>`, 
                    inline: true 
                },
            );

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`ServerInfo command executed`, {
            userId: interaction.user.id,
            guildId: guild.id,
            guildName: guild.name,
            memberCount: guild.memberCount
        });
    },
};
