import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getLevelingConfig, saveLevelingConfig } from '../../services/leveling/leveling.js';
import { botHasPermission } from '../../utils/permissionGuard.js';
import { TitanBotError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import levelDashboard from './modules/level_dashboard.js';

export default {
    data: new SlashCommandBuilder()
        .setName('seviye') // Komut ismi Türkçe yapıldı
        .setDescription('Seviye sistemini yönetmenizi sağlar')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('kurulum')
                .setDescription('Seviye sistemini kurar ve aktif hale getirir')
                .addChannelOption((option) =>
                    option
                        .setName('kanal')
                        .setDescription('Seviye atlama bildirimlerinin gönderileceği metin kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('xp_minimum')
                        .setDescription('Mesaj başına verilecek minimum XP (Varsayılan: 15)')
                        .setMinValue(1)
                        .setMaxValue(500)
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('xp_maksimum')
                        .setDescription('Mesaj başına verilecek maksimum XP (Varsayılan: 25)')
                        .setMinValue(1)
                        .setMaxValue(500)
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName('mesaj')
                        .setDescription('Seviye mesajı. {user} ve {level} değişkenlerini kullanabilirsiniz')
                        .setMaxLength(500)
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName('xp_bekleme_süresi')
                        .setDescription('Kullanıcıların tekrar XP kazanabilmesi için gereken süre (saniye - Varsayılan: 60)')
                        .setMinValue(0)
                        .setMaxValue(3600)
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('panel')
                .setDescription('Etkileşimli seviye yapılandırma panelini açar'),
        ),
    category: 'Seviye',

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });
        if (!deferred) return;

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, { 
                type: ErrorTypes.PERMISSION, 
                message: 'Bu komutu kullanabilmek için **Sunucuyu Yönet** yetkisine sahip olmalısınız.' 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'panel') {
            return levelDashboard.execute(interaction, config, client);
        }

        if (subcommand === 'kurulum') {
            const channel = interaction.options.getChannel('kanal');
            const xpMin = interaction.options.getInteger('xp_minimum') ?? 15;
            const xpMax = interaction.options.getInteger('xp_maksimum') ?? 25;
            const message =
                interaction.options.getString('mesaj') ??
                '{user} tebrikler, {level}. seviyeye ulaştın!';
            const xpCooldown = interaction.options.getInteger('xp_bekleme_süresi') ?? 60;

            if (xpMin > xpMax) {
                return await replyUserError(interaction, { 
                    type: ErrorTypes.VALIDATION, 
                    message: `Minimum XP miktarı (**${xpMin}**), maksimum XP miktarından (**${xpMax}**) büyük olamaz.` 
                });
            }

            if (!botHasPermission(channel, ['SendMessages', 'EmbedLinks'])) {
                throw new TitanBotError(
                    'Botun belirtilen kanalda yetkisi eksik',
                    ErrorTypes.PERMISSION,
                    `Seviye atlama bildirimlerini gönderebilmem için ${channel} kanalında **Mesaj Gönder** ve **Bağlantı Yerleştir** yetkilerime ihtiyaç var.`,
                );
            }

            const existingConfig = await getLevelingConfig(client, interaction.guildId);

            // Güvenli zincirleme (.?) eklendi, veri yoksa çökme önlendi
            if (existingConfig?.configured) {
                return await replyUserError(interaction, { 
                    type: ErrorTypes.UNKNOWN, 
                    message: `Seviye sistemi bu sunucuda zaten kurulmuş (Bildirimler şu kanala gidiyor: <#${existingConfig.levelUpChannel}>).\n\nAyarları değiştirmek için \`/seviye panel\` komutunu kullanabilirsiniz.` 
                });
            }

            const newConfig = {
                ...existingConfig,
                configured: true,
                enabled: true,
                levelUpChannel: channel.id,
                xpRange: { min: xpMin, max: xpMax },
                xpCooldown: xpCooldown,
                levelUpMessage: message,
                announceLevelUp: true,
            };

            await saveLevelingConfig(client, interaction.guildId, newConfig);

            logger.info(`Seviye sistemi kuruldu: ${interaction.guildId}`, {
                channelId: channel.id,
                xpMin,
                xpMax,
                xpCooldown,
                userId: interaction.user.id,
            });

            // createEmbed içerisindeki parantez hatası düzeltildi
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    createEmbed({
                        title: 'Seviye Sistemi Kuruldu',
                        description:
                            `Seviye sistemi başarıyla **aktif edildi** ve kullanıma hazır.\n\n` +
                            `**Bildirim Kanalı:** ${channel}\n` +
                            `**Mesaj Başına XP:** ${xpMin} – ${xpMax}\n` +
                            `**XP Zaman Aşımı:** ${xpCooldown} saniye\n` +
                            `**Seviye Mesajı:** \`${message}\`\n\n` +
                            `Bu ayarları istediğiniz zaman \`/seviye panel\` komutu ile güncelleyebilirsiniz.`,
                        color: 'success',
                    }),
                ],
            });
        }
    },
};
