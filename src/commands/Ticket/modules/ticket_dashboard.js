// ... dosyanın önceki kısımları ...

async function handleTranscriptChannel(selectInteraction, rootInteraction, guildConfig, guildId, client) {
    await selectInteraction.deferUpdate();

    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId('ticket_cfg_transcript_channel')
        .setPlaceholder('Bir kanal seçin...')
        .addChannelTypes(ChannelType.GuildText)
        .setMaxValues(1);

    await selectInteraction.followUp({
        embeds: [
            new EmbedBuilder()
                .setTitle('📜 Transkript Kanalını Seçin')
                .setDescription('Biletler silindiğinde otomatik oluşturulan transkript dosyalarının gönderileceği kanalı seçin.')
                .setColor(getColor('info')),
        ],
        components: [new ActionRowBuilder().addComponents(channelSelect)],
        flags: MessageFlags.Ephemeral,
    });

    const collector = rootInteraction.channel.createMessageComponentCollector({
        componentType: ComponentType.ChannelSelect,
        filter: i => i.user.id === selectInteraction.user.id && i.customId === 'ticket_cfg_transcript_channel',
        time: 60_000,
        max: 1,
    });

    collector.on('collect', async channelInteraction => {
        await channelInteraction.deferUpdate();
        const channel = channelInteraction.channels.first();

        guildConfig.ticketTranscriptChannelId = channel.id;
        await setGuildConfig(client, guildId, guildConfig);

        await channelInteraction.followUp({
            embeds: [successEmbed('Transkript Kanalı Güncellendi', `Transkriptler artık ${channel} kanalına gönderilecek.`)],
            flags: MessageFlags.Ephemeral,
        });

        await refreshDashboard(rootInteraction, guildConfig, guildId, client);
    });
}

async function handleRepostPanel(btnInteraction, rootInteraction, guildConfig, guildId, client) {
    await btnInteraction.deferUpdate();
    try {
        await repostTicketPanel(client, rootInteraction.guild, guildConfig, guildId);
        await btnInteraction.followUp({
            embeds: [successEmbed('Panel Yeniden Yayınlandı', 'Destek paneli hedef kanala başarıyla gönderildi.')],
            flags: MessageFlags.Ephemeral,
        });
        await refreshDashboard(rootInteraction, guildConfig, guildId, client);
    } catch (error) {
        await replyUserError(btnInteraction, {
            type: ErrorTypes.CONFIGURATION,
            message: 'Panel gönderilemedi: ' + error.message,
        });
    }
}

async function handleDeleteSystem(btnInteraction, rootInteraction, guildConfig, guildId, client) {
    await btnInteraction.deferUpdate();
    
    // Basit bir temizlik işlemi (Veritabanı yapılandırmasını sıfırlama)
    guildConfig.ticketPanelChannelId = null;
    guildConfig.ticketPanelMessageId = null;
    await setGuildConfig(client, guildId, guildConfig);

    await btnInteraction.followUp({
        embeds: [successEmbed('Sistem Sıfırlandı', 'Bilet sistemi yapılandırması başarıyla silindi. Yeni bir kurulum için `/ticket setup` komutunu kullanabilirsiniz.')],
        flags: MessageFlags.Ephemeral,
    });

    await rootInteraction.deleteReply().catch(() => {});
}
