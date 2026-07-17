import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Bir kullanıcı hakkında detaylı bilgi gösterir")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Bilgilerine bakılacak kullanıcı (belirtilmezse siz)")
        ),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`UserInfo interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'userinfo'
            });
            return;
        }

        const user = interaction.options.getUser("target") || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);

        const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
        const joinedTimestamp = member?.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;

        const embed = createEmbed({ title: `Kullanıcı Bilgisi: ${user.username}` })
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "🆔 ID", value: user.id, inline: true },
                { name: "🤖 Bot mu?", value: user.bot ? "Evet" : "Hayır", inline: true },
                {
                    name: "🎭 Roller",
                    value:
                        member && member.roles.cache.size > 1
                            ? member.roles.cache
                                  .filter((r) => r.id !== interaction.guild.id) // @everyone rolünü listeden gizler
                                  .map((r) => r.name)
                                  .slice(0, 5)
                                  .join(", ")
                            : "Yok",
                    inline: true,
                },
                {
                    name: "📅 Hesap Oluşturulma Tarihi",
                    value: `<t:${createdTimestamp}:R>`,
                    inline: false,
                },
                {
                    name: "📥 Sunucuya Katılma Tarihi",
                    value: joinedTimestamp ? `<t:${joinedTimestamp}:R>` : "Bu sunucuda değil",
                    inline: false,
                },
                {
                    name: "👑 En Yüksek Rol",
                    value: member?.roles?.highest?.name || "Yok",
                    inline: true,
                },
            );

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
        logger.info(`UserInfo command executed`, {
            userId: interaction.user.id,
            targetUserId: user.id,
            guildId: interaction.guildId
        });
    },
};
