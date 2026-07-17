import { SlashCommandBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { buildNowPlayingReply } from '../../services/music/musicActions.js';
import { deferMusicCommand } from '../../services/music/prefixSupport.js';

export default {
    category: 'Müzik',
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Şu anda çalmakta olan parçayı gösterir.'),

    async execute(interaction, config, client) {
        await deferMusicCommand(interaction);
        
        // Eğer buildNowPlayingReply asenkron ise await eklenmelidir.
        const payload = buildNowPlayingReply(client, interaction.guild.id);
        
        await InteractionHelper.safeEditReply(interaction, payload);
    },
};
