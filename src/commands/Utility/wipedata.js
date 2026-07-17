import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, warningEmbed } from '../../utils/embeds.js';
import { getConfirmationButtons } from '../../utils/components.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('wipedata')
        .setDescription('Tüm kişisel verilerinizi DarkNexus üzerinden kalıcı olarak siler'), // Komut açıklaması Türkçe yapıldı

    async execute(interaction, guildConfig, client) {
        const warningMessage = 
            `⚠️ **BU İŞLEM GERİ ALINAMAZ!** ⚠️\n\n` +
            `Bu işlem, bu sunucudaki **TÜM** verilerinizi kalıcı olarak silecektir. Silinecek veriler:\n` +
            `• 💰 Ekonomi bakiyesi (cüzdan ve banka)\n` +
            `• 📊 Seviye ve XP (Deneyim puanı)\n` +
            `• 🎒 Envanter eşyaları\n` +
            `• 🛍️ Market alışverişleri\n` +
            `• 🎂 Doğum günü bilgileri\n` +
            `• 🔢 Sayaç verileri\n` +
            `• 📋 Diğer tüm kişisel verileriniz\n\n` +
            `**Bu işlem geri döndürülemez. Devam etmek istediğinizden kesinlikle emin misiniz?**`;

        const embed = warningEmbed('Tüm Verileri Sıfırla', warningMessage);

        // Onay butonlarını Türkçe etiketlerle almak için 'wipedata' ID'si gönderiliyor
        const confirmButtons = getConfirmationButtons('wipedata');

        await InteractionHelper.safeReply(interaction, {
            embeds: [embed],
            components: [confirmButtons],
            flags: MessageFlags.Ephemeral
        });

        logger.info(`Wipedata command executed - confirmation prompt shown`, {
            userId: interaction.user.id,
            guildId: interaction.guildId
        });
    }
};
