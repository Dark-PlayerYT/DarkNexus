import { PermissionFlagsBits } from 'discord.js';
import { createEmbed, successEmbed } from '../../../utils/embeds.js';
import { getServerCounters, saveServerCounters, updateCounter, getCounterEmoji, getCounterTypeLabel } from '../../../services/serverstatsService.js';
import { logger } from '../../../utils/logger.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';

export async function handleUpdate(interaction, client) {
    const guild = interaction.guild;
    const counterId = interaction.options.getString("counter-id");
    const newType = interaction.options.getString("type");

    try {
        await InteractionHelper.safeDefer(interaction);
    } catch (error) {
        logger.error("Yanıt ertelenemedi:", error);
        return;
    }

    // Yetki kontrolü
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await replyUserError(interaction, { 
            type: ErrorTypes.PERMISSION, 
            message: 'İstatistik takipçilerini güncellemek için **Kanalları Yönet** yetkisine sahip olmalısınız.' 
        }).catch(logger.error);
        return;
    }

    if (!newType) {
        await replyUserError(interaction, { 
            type: ErrorTypes.UNKNOWN, 
            message: 'Güncellemek için yeni bir istatistik türü belirtmelisiniz.' 
        }).catch(logger.error);
        return;
    }

    try {
        const counters = await getServerCounters(client, guild.id);

        const counterIndex = counters.findIndex(c => c.id === counterId);
        if (counterIndex === -1) {
            await replyUserError(interaction, { 
                type: ErrorTypes.USER_INPUT, 
                message: `\`${counterId}\` ID'sine sahip bir takipçi bulunamadı. Tüm takipçileri görmek için \`/serverstats list\` komutunu kullanın.` 
            }).catch(logger.error);
            return;
        }

        const counter = counters[counterIndex];
        const oldChannel = guild.channels.cache.get(counter.channelId);

        if (!oldChannel) {
            await replyUserError(interaction, { 
                type: ErrorTypes.USER_INPUT, 
                message: 'Bu takipçiye ait kanal artık mevcut değil. Silinmiş bir kanal için güncelleme yapamazsınız.' 
            }).catch(logger.error);
            return;
        }

        if (newType !== counter.type) {
            const existingTypeCounter = counters.find(c => c.type === newType && c.id !== counter.id);
            if (existingTypeCounter) {
                const existingChannel = guild.channels.cache.get(existingTypeCounter.channelId);
                await replyUserError(interaction, { 
                    type: ErrorTypes.UNKNOWN, 
                    message: `Bu sunucuda zaten bir **${getCounterTypeLabel(newType)}** takipçisi mevcut${existingChannel ? ` (${existingChannel})` : ''}. Lütfen önce mevcut olanı silin.` 
                }).catch(logger.error);
                return;
            }
        }

        const oldType = counter.type;
        counter.type = newType;
        counter.updatedAt = new Date().toISOString();

        const saved = await saveServerCounters(client, guild.id, counters);
        if (!saved) {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Güncellenen veri kaydedilemedi. Lütfen tekrar deneyin.' }).catch(logger.error);
            return;
        }

        const updated = await updateCounter(client, guild, counter);
        if (!updated) {
            await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Takipçi ayarları güncellendi ancak kanal ismi güncellenemedi. İstatistikler 15 dakikalık periyotlarda otomatik yenilenecektir.' }).catch(logger.error);
            return;
        }

        const finalChannel = guild.channels.cache.get(counter.channelId);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [successEmbed(
                "Takipçi Başarıyla Güncellendi",
                `**Takipçi ID:** \`${counterId}\`\n**Tür Değişimi:** ${getCounterEmoji(oldType)} ${getCounterTypeLabel(oldType)} → ${getCounterEmoji(newType)} ${getCounterTypeLabel(newType)}\n\n**Güncel Ayarlar:**\n- **Tür:** ${getCounterEmoji(counter.type)} ${getCounterTypeLabel(counter.type)}\n- **Kanal:** ${finalChannel}\n- **Kanal Adı:** ${finalChannel.name}\n\nİstatistikler 15 dakikada bir otomatik olarak güncellenecektir.`
            )]
        }).catch(logger.error);

    } catch (error) {
        logger.error("Takipçi güncellenirken hata oluştu:", error);
        await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Takipçi güncellenirken bir hata oluştu. Lütfen tekrar deneyin.' }).catch(logger.error);
    }
}
