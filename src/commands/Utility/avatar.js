import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Bir kullanıcının profil resmini gösterir")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Profil resmini görmek istediğiniz kullanıcı (boş bırakılırsa kendinizinkini gösterir)"),
        ),
    category: "Faydalı",

    async execute(interaction) {
        // Hedef kullanıcıyı alıyoruz, yoksa komutu kullanan kişiyi seçiyoruz
        const user = interaction.options.getUser("target") || interaction.user;
        
        // Avatar URL'sini yüksek kalitede ve hareketli (GIF) desteğiyle alıyoruz
        const avatarUrl = user.displayAvatarURL({ size: 2048, dynamic: true });

        // Şık bir embed oluşturuyoruz
        const embed = createEmbed({ 
            title: `${user.username} adlı kullanıcının profil resmi`, 
            description: `🔗 **[Görseli İndir](${avatarUrl})**` 
        })
        .setImage(avatarUrl);

        // Yanıtı güvenli bir şekilde gönderiyoruz
        await InteractionHelper.safeReply(interaction, { embeds: [embed] });

        logger.info(`Avatar command executed`, {
            userId: interaction.user.id,
            targetUserId: user.id,
            guildId: interaction.guildId
        });
    }
};
