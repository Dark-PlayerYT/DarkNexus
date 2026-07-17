import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../services/config/guildConfig.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import ticketConfig from './modules/ticket_dashboard.js';

export default {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Sunucunun bilet (destek) sistemini yönetir.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false) // DM üzerinden bilet yönetilemez
        .addSubcommand((subcommand) =>
            subcommand
                .setName("setup")
                .setDescription("Belirtilen kanalda bilet oluşturma panelini kurar.")
                .addChannelOption((option) =>
                    option
                        .setName("panel_channel")
                        .setDescription("Bilet panelinin gönderileceği metin kanalı.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("panel_message")
                        .setDescription("Bilet panelinde görünecek ana açıklama mesajı.")
                        .setRequired(true),
                )
                .addStringOption((option) =>
                    option
                        .setName("button_label")
                        .setDescription("Bilet oluşturma butonunun yazısı (Varsayılan: Destek Talebi Oluştur)")
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("category")
                        .setDescription("Yeni bilet kanallarının açılacağı kategori (İsteğe bağlı).")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addChannelOption((option) =>
                    option
                        .setName("closed_category")
                        .setDescription("Kapatılan biletlerin taşınacağı kategori (İsteğe bağlı).")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false),
                )
                .addRoleOption((option) =>
                    option
                        .setName("staff_role")
                        .setDescription("Biletlere erişebilecek yetkili rolü (İsteğe bağlı).")
                        .setRequired(false),
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_tickets_per_user")
                        .setDescription("Bir kullanıcının açabileceği maksimum bilet sayısı (Varsayılan: 3)")
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(false),
                )
                .addBooleanOption((option) =>
                    option
                        .setName("dm_on_close")
                        .setDescription("Bilet kapatıldığında kullanıcıya DM gönderilsin mi? (Varsayılan: Evet)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("dashboard")
                .setDescription("Etkileşimli bilet sistemi yönetim panelini açar"),
        ),
    category: "Bilet",

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        // Güvenlik Kontrolü: Kanalları Yönet yetkisi var mı?
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            logger.warn('Ticket command permission denied', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'ticket'
            });
            return await replyUserError(interaction, { 
                type: ErrorTypes.PERMISSION, 
                message: 'Bu işlemi gerçekleştirebilmek için **Kanalları Yönet** yetkisine sahip olmalısınız.' 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        // Dashboard alt komutu çalıştırılıyor
        if (subcommand === "dashboard") {
            return ticketConfig.execute(interaction, config, client);
        }

        // Setup alt komutu çalıştırılıyor
        if (subcommand === "setup") {
            const existingConfig = await getGuildConfig(client, interaction.guildId);
            if (existingConfig?.ticketPanelChannelId) {
                return await replyUserError(interaction, { 
                    type: ErrorTypes.UNKNOWN, 
                    message: `Bu sunucuda zaten aktif bir bilet sistemi kurulu (Panel kanalı: <#${existingConfig.ticketPanelChannelId}>).\n\n` +
                             `Sunucu başına yalnızca bir bilet sistemi desteklenir. Kurulumu güncellemek için \`/ticket dashboard\` komutunu kullanabilir veya oradaki **Sistemi Sil** seçeneğiyle sıfırdan başlayabilirsiniz.` 
                });
            }

            const panelChannel = interaction.options.getChannel("panel_channel");
            const categoryChannel = interaction.options.getChannel("category");
            const closedCategoryChannel = interaction.options.getChannel("closed_category");
            const staffRole = interaction.options.getRole("staff_role");
            const panelMessage = interaction.options.getString("panel_message") || "Destek talebi oluşturmak için aşağıdaki butona tıklayın.";
            const buttonLabel = interaction.options.getString("button_label") || "Destek Talebi Oluştur";
            const maxTicketsPerUser = interaction.options.getInteger("max_tickets_per_user") || 3;
            const dmOnClose = interaction.options.getBoolean("dm_on_close") !== false;

            // Bilet Paneli Embed tasarımı
            const setupEmbed = createEmbed({ 
                title: "📩 Destek Sistemi", 
                description: panelMessage,
                color: getColor('info')
            });

            // Etkileşimli butonun oluşturulması
            const ticketButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
                    .setLabel(buttonLabel)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📩"),
            );

            try {
                // Paneli hedef kanala gönderiyoruz
                const sentPanel = await panelChannel.send({
                    embeds: [setupEmbed],
                    components: [ticketButton],
                });

                // Veritabanı bağlantısı varsa yapılandırmayı kaydediyoruz
                if (client.db && interaction.guildId) {
                    const currentConfig = existingConfig || {};
                    currentConfig.ticketCategoryId = categoryChannel ? categoryChannel.id : null;
                    currentConfig.ticketClosedCategoryId = closedCategoryChannel ? closedCategoryChannel.id : null;
                    currentConfig.ticketStaffRoleId = staffRole ? staffRole.id : null;
                    currentConfig.ticketPanelChannelId = panelChannel.id;
                    currentConfig.ticketPanelMessageId = sentPanel?.id || null;
                    currentConfig.ticketPanelMessage = panelMessage;
                    currentConfig.ticketButtonLabel = buttonLabel;
                    currentConfig.maxTicketsPerUser = maxTicketsPerUser;
                    currentConfig.dmOnClose = dmOnClose;

                    await setGuildConfig(client, interaction.guildId, currentConfig);
                    logger.info('Ticket configuration saved', {
                        guildId: interaction.guildId,
                        categoryId: categoryChannel?.id,
                        closedCategoryId: closedCategoryChannel?.id,
                        staffRoleId: staffRole?.id,
                        maxTickets: maxTicketsPerUser,
                        dmOnClose: dmOnClose,
                    });
                } else {
                    logger.error('Ticket setup: database unavailable, panel sent but configuration was NOT saved', {
                        guildId: interaction.guildId,
                    });
                }

                // Başarılı kurulum geri bildirim mesajı
                let successMessage = `Bilet oluşturma paneli başarıyla ${panelChannel} kanalına gönderildi.\n\n`;
                
                if (categoryChannel) {
                    successMessage += `🔹 **Açılacak Kategori:** \`${categoryChannel.name}\`\n`;
                } else {
                    successMessage += '🔹 **Açılacak Kategori:** Varsayılan (Yeni bir "Biletler" kategorisi açılacak)\n';
                }
                
                if (closedCategoryChannel) {
                    successMessage += `🔹 **Kapatılanların Taşınacağı Kategori:** \`${closedCategoryChannel.name}\`\n`;
                }
                
                if (staffRole) {
                    successMessage += `🔹 **Yetkili Rolü:** ${staffRole}\n`;
                }
                
                successMessage += `🔹 **Kullanıcı Başına Sınır:** \`${maxTicketsPerUser}\` adet\n`;
                successMessage += `🔹 **Kapanışta DM Bildirimi:** \`${dmOnClose ? 'Açık' : 'Kapalı'}\``;

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "Bilet Sistemi Kuruldu 🎉",
                            successMessage,
                        ),
                    ],
                });

                logger.info('Ticket panel setup completed', {
                    userId: interaction.user.id,
                    userTag: interaction.user.tag,
                    guildId: interaction.guildId,
                    panelChannelId: panelChannel.id,
                    categoryId: categoryChannel?.id,
                    closedCategoryId: closedCategoryChannel?.id,
                    staffRoleId: staffRole?.id,
                    maxTickets: maxTicketsPerUser,
                    dmOnClose: dmOnClose,
                    commandName: 'ticket_setup'
                });

            } catch (error) {
                logger.error('Ticket setup error', {
                    error: error.message,
                    stack: error.stack,
                    userId: interaction.user.id,
                    guildId: interaction.guildId,
                    commandName: 'ticket_setup'
                });

                if (interaction.deferred || interaction.replied) {
                    await replyUserError(interaction, { 
                        type: ErrorTypes.UNKNOWN, 
                        message: 'Bilet paneli gönderilirken veya yapılandırma kaydedilirken bir hata oluştu. Botun hedef kanalda mesaj gönderme yetkisinin olduğundan ve veritabanı bağlantısının aktif olduğundan emin olun.' 
                    }).catch(err => {
                        logger.error('Failed to send error reply', {
                            error: err.message,
                            guildId: interaction.guildId
                        });
                    });
                } else {
                    await handleInteractionError(interaction, error, {
                        commandName: 'ticket_setup',
                        source: 'ticket_setup_command'
                    });
                }
            }
        }
    }
};
