import { SlashCommandBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { joinVoiceChannel, replyMusicSuccess } from '../../services/music/musicActions.js';
import { deferMusicCommand } from '../../services/music/prefixSupport.js';

export default {
    category: 'Müzik',
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Ses çalmaya başlamadan ses kanalınıza katılır.'),

    async execute(interaction, config, client) {
        await deferMusicCommand(interaction);
        const embed = await joinVoiceChannel(client, interaction);
        await replyMusicSuccess(interaction, embed);
    },
};
