import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName("firstmsg")
        .setDescription("Bu kanaldaki ilk mesajın bağlantısını gönderir")
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    category: "Faydalı",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`FirstMsg interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'firstmsg'
            });
            return;
        }

        // Discord API'sinden kanalın en eski mesajını çekiyoruz
        const messages = await interaction.channel.messages.fetch({
            limit: 1,
            after: '1',
            cache: false
        });

        const firstMessage = messages.first();

        if (!firstMessage) {
            logger.info(`FirstMsg - no messages found in channel`, {
                userId: interaction.user.id,
                channelId: interaction.channelId,
                guildId: interaction.guildId
            });
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed('İlk Mesaj Bulunamadı', "Bu kanalda hiç mesaj bulunamadı!")
                ],
            });
        }

        const messageLink = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${firstMessage.id}`;

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    `#${interaction.channel.name} Kanalındaki İlk Mesaj`,
                    `Kanalın başlangıç noktasına gitmek için aşağıdaki bağlantıyı kullanabilirsiniz:\n\n🔗 **[İlk Mesaja Git](${messageLink})**`
                ),
            ],
        });

        logger.info(`FirstMsg command executed`, {
            userId: interaction.user.id,
            channelId: interaction.channelId,
            messageId: firstMessage.id,
            guildId: interaction.guildId
        });
    },
};
