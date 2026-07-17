import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

import report from './modules/report.js';
import reportSetchannel from './modules/report_setchannel.js';

export default {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Bir kullanıcıyı yetkililere şikayet edin veya şikayet kanalını yapılandırın.')
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('file')
                .setDescription('Bir kullanıcıyı sunucu moderasyon ekibine şikayet eder.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Şikayet etmek istediğiniz kullanıcı.')
                        .setRequired(true),
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Şikayet nedeni (lütfen detaylı açıklayın).')
                        .setRequired(true)
                        .setMaxLength(500),
                ),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Şikayetlerin gönderileceği log kanalını ayarlar. (Sunucuyu Yönet yetkisi gerekir)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Şikayet bildirimlerinin düşeceği metin kanalı.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                ),
        )
        // setchannel komutunu doğrudan yetkisizlerin kullanmasını önlemek için varsayılan yetki kısıtlaması ekledik
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    category: 'Faydalı',

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'file') {
            return await report.execute(interaction, config, client);
        }

        if (subcommand === 'setchannel') {
            // Şikayet kanalını ayarlamak için üyenin "Sunucuyu Yönet" yetkisine sahip olup olmadığını kontrol ediyoruz
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return await replyUserError(interaction, { 
                    type: ErrorTypes.UNKNOWN, 
                    message: 'Bu komutu kullanabilmek için `Sunucuyu Yönet` yetkisine sahip olmalısınız.' 
                });
            }
            return await reportSetchannel.execute(interaction, config, client);
        }

        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Bilinmeyen alt komut.' });
    },
};
