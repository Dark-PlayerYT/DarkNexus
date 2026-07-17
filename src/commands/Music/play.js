import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { playQuery, replyMusicSuccess } from '../../services/music/musicActions.js';

export default {
    slashOnly: true,
    category: 'Müzik',
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Bir şarkı çalar veya sıraya ekler.')
        .addStringOption((opt) =>
            opt.setName('sorgu')
               .setDescription('Şarkı adı veya bağlantısı (URL)')
               .setRequired(true),
        ),

    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        
        const result = await playQuery(client, interaction, interaction.options.getString('sorgu'));
        
        // İşlem sonucuna göre kullanıcıya yanıt ver
        await replyMusicSuccess(interaction, result.embed);
    },
};
