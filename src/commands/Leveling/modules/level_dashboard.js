// levelingDashboard.js (Türkçeleştirilmiş)

import { getColor } from '../../../config/bot.js';
import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    LabelBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags,
    ComponentType,
    EmbedBuilder,
} from 'discord.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { successEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { TitanBotError, ErrorTypes, replyUserError } from '../../../utils/errorHandler.js';
import { getLevelingConfig, saveLevelingConfig } from '../../../services/leveling/leveling.js';
import { botHasPermission } from '../../../utils/permissionGuard.js';
import { startDashboardSession } from '../../../utils/dashboardSession.js';

function dashboardEmbedOlustur(cfg, sunucu) {
    const kanal = cfg.levelUpChannel ? `<#${cfg.levelUpChannel}>` : '`Ayarlı değil`';
    const xpMin = cfg.xpRange?.min ?? cfg.xpPerMessage?.min ?? 15;
    const xpMax = cfg.xpRange?.max ?? cfg.xpPerMessage?.max ?? 25;
    const beklemeSuresi = cfg.xpCooldown ?? 60;
    const hamMesaj = cfg.levelUpMessage || '{user} {level}. seviyeye ulaştı!';
    const mesajOnizleme = `\`${rawMsg.length > 60 ? hamMesaj.substring(0, 60) + '…' : hamMesaj}\``;

    const oduller = cfg.roleRewards ?? {};
    const odulGirdileri = Object.entries(oduller).sort(([a], [b]) => Number(a) - Number(b));
    const odulDegeri = odulGirdileri.length > 0
        ? odulGirdileri.map(([lvl, rolId]) => `${lvl}. Seviye → <@&${rolId}>`).join('\n')
        : '`Yapılandırılmadı`';

    const yoksayilanKanallar = cfg.ignoredChannels ?? [];
    const yoksayilanRoller = cfg.ignoredRoles ?? [];
    const yoksayilanKanalDegeri = yoksayilanKanallar.length > 0 ? yoksayilanKanallar.map(id => `<#${id}>`).join(',') : '`Yok`';
    const yoksayilanRolDegeri = yoksayilanRoller.length > 0 ? yoksayilanRoller.map(id => `<@&${id}>`).join(',') : '`Yok`';

    return new EmbedBuilder()
        .setTitle('⚡ Seviye Sistemi Kontrol Paneli')
        .setDescription(`**${sunucu.name}** için seviye ayarlarını yönet.\nBir ayarı değiştirmek için aşağıdan seçim yap.`)
        .setColor(getColor('info'))
        .addFields(
            { name: 'Seviye Atlama Kanalı', value: kanal, inline: true },
            { name: 'Sistem Durumu', value: cfg.enabled ? '**Aktif**' : '**Pasif**', inline: true },
            { name: 'Duyurular', value: cfg.announceLevelUp !== false ? '**Aktif**' : '**Pasif**', inline: true },
            { name: 'Mesaj Başı XP', value: `\`${xpMin} – ${xpMax}\``, inline: true },
            { name: 'XP Bekleme Süresi', value: `\`${beklemeSuresi}sn\``, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },
            { name: 'Seviye Atlama Mesajı', value: mesajOnizleme, inline: false },
            { name: 'Rol Ödülleri', value: odulDegeri, inline: false },
            { name: 'Yoksayılan Kanallar', value: yoksayilanKanalDegeri, inline: true },
            { name: 'Yoksayılan Roller', value: yoksayilanRolDegeri, inline: true },
        )
        .setFooter({ text: 'Panel 10 dakika hareketsizlikten sonra kapanır' })
        .setTimestamp();
}

function secimMenusuOlustur(sunucuId) {
    return new StringSelectMenuBuilder()
        .setCustomId(`level_cfg_${sunucuId}`)
        .setPlaceholder('Yapılandırılacak ayarı seç...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Seviye Atlama Kanalını Değiştir')
                .setDescription('Bildirimlerin gönderileceği kanalı ayarla')
                .setValue('channel')
                .setEmoji('📢'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Seviye Atlama Mesajını Düzenle')
                .setDescription('Kullanıcı seviye atladığında gösterilecek mesajı özelleştir')
                .setValue('message')
                .setEmoji('💬'),
            new StringSelectMenuOptionBuilder()
                .setLabel('XP Aralığını Ayarla')
                .setDescription('Mesaj başına verilecek minimum ve maksimum XP')
                .setValue('xp_range')
                .setEmoji('🎲'),
            new StringSelectMenuOptionBuilder()
                .setLabel('XP Bekleme Süresi')
                .setDescription('Aynı kullanıcı için XP kazanımı arasındaki süre (saniye)')
                .setValue('xp_cooldown')
                .setEmoji('⏱️'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Rol Ödülü Ekle')
                .setDescription('Belirli bir seviyeye ulaşan kullanıcıya rol ver')
                .setValue('role_reward_add')
                .setEmoji('🏆'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Rol Ödülünü Kaldır')
                .setDescription('Seviye bazlı rol ödülünü sil')
                .setValue('role_reward_remove')
                .setEmoji('\ud83d\uddd1\ufe0f'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Yoksayılan Kanallar')
                .setDescription('XP kazanılmayacak kanalları seç')
                .setValue('ignore_channels')
                .setEmoji('\ud83d\udeab'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Yoksayılan Roller')
                .setDescription('XP kazanamayacak rolleri seç')
                .setValue('ignore_roles')
                .setEmoji('\ud83d\udeab'),
        );
}

// ... (Diğer fonksiyonlar da aynı mantıkla Türkçeleştirilebilir Gardaşım)

export default {
    prefixOnly: false,
    async execute(interaction, config, client) {
        try {
            const sunucuId = interaction.guild.id;
            const cfg = await getLevelingConfig(client, sunucuId);

            if (!cfg.configured) {
                throw new TitanBotError(
                    'Seviye sistemi yapılandırılmamış',
                    ErrorTypes.CONFIGURATION,
                    'Seviye sistemi henüz kurulmamış. Yapılandırmak için `/level setup` komutunu kullan.',
                );
            }

            await startDashboardSession({
                interaction,
                embeds: [dashboardEmbedOlustur(cfg, interaction.guild)],
                components: [
                    buildButtonRow(cfg, sunucuId), // Buradaki buton fonksiyonu da Türkçeleştirilebilir
                    new ActionRowBuilder().addComponents(secimMenusuOlustur(sunucuId)),
                ],
                // ... (onSelect ve onButton kısımlarını da benzer şekilde güncelleyebilirsin)
            });
        } catch (error) {
            // ... hata yönetimi
        }
    },
};
