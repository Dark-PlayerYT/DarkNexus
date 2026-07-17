import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

import { handleCreate } from './modules/serverstats_create.js';
import { handleList } from './modules/serverstats_list.js';
import { handleUpdate } from './modules/serverstats_update.js';
import { handleDelete } from './modules/serverstats_delete.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName("serverstats")
        .setDescription("Sunucu istatistiklerini (üye sayısı, kanal verileri vb.) yönetir.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Sunucu için yeni bir istatistik takip kanalı oluşturur.")
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Takip edilecek istatistik türü")
                        .setRequired(true)
                        .addChoices(
                            { name: "Üyeler + Botlar", value: "members" },
                            { name: "Sadece Üyeler", value: "members_only" },
                            { name: "Sadece Botlar", value: "bots" }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName("channel_type")
                        .setDescription("Oluşturulacak kanal türü")
                        .setRequired(true)
                        .addChoices(
                            { name: "Ses Kanalı (Önerilen)", value: "voice" },
                            { name: "Metin Kanalı", value: "text" }
                        )
                )
                .addChannelOption(option =>
                    option
                        .setName("category")
                        .setDescription("İstatistik kanalının oluşturulacağı kategori")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Sunucudaki tüm istatistik takipçilerini listeler.")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("update")
                .setDescription("Mevcut bir istatistik takipçisini günceller.")
                .addStringOption(option =>
                    option
                        .setName("counter-id")
                        .setDescription("Güncellenecek takipçinin ID'si")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Yeni takipçi türü")
                        .setRequired(false)
                        .addChoices(
                            { name: "Üyeler + Botlar", value: "members" },
                            { name: "Sadece Üyeler", value: "members_only" },
                            { name: "Sadece Botlar", value: "bots" }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("delete")
                .setDescription("Mevcut bir istatistik takipçisini siler.")
                .addStringOption(option =>
                    option
                        .setName("counter-id")
                        .setDescription("Silinecek takipçinin ID'si")
                        .setRequired(true)
                )
        ),
    category: "Sunucu",

    async execute(interaction, guildConfig, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "create":
                await handleCreate(interaction, client);
                break;
            case "list":
                await handleList(interaction, client);
                break;
            case "update":
                await handleUpdate(interaction, client);
                break;
            case "delete":
                await handleDelete(interaction, client);
                break;
            default:
                await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Bilinmeyen alt komut.' });
        }
    }
};
