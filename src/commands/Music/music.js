import { SlashCommandBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
    skipTrack,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    shuffleQueue,
    setLoopMode,
    setVolume,
    seekTrack,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    setTwentyFourSeven,
    leaveVoiceChannel,
    replyMusicSuccess,
} from '../../services/music/musicActions.js';
import { deferMusicCommand } from '../../services/music/prefixSupport.js';

export default {
    category: 'Müzik',
    data: new SlashCommandBuilder()
        .setName('müzik') // Ana komut ismi Türkçe yapıldı
        .setDescription('Müzik oynatmayı, sırayı ve ses kanalı ayarlarını yönetir.')
        .addSubcommand((sub) => sub.setName('duraklat').setDescription('Çalmayı duraklatır.'))
        .addSubcommand((sub) => sub.setName('devam').setDescription('Çalmaya devam eder.'))
        .addSubcommand((sub) => sub.setName('geç').setDescription('Mevcut şarkıyı geçer.'))
        .addSubcommand((sub) => sub.setName('durdur').setDescription('Çalmayı durdurur ve sırayı temizler.'))
        .addSubcommand((sub) => sub.setName('karıştır').setDescription('Sırayı karıştırır.'))
        .addSubcommand((sub) =>
            sub
                .setName('döngü')
                .setDescription('Döngü modunu ayarlar.')
                .addStringOption((opt) =>
                    opt
                        .setName('mod')
                        .setDescription('Döngü modu')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Kapalı', value: 'none' },
                            { name: 'Şarkı', value: 'track' },
                            { name: 'Sıra', value: 'queue' },
                        ),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('ses')
                .setDescription('Ses seviyesini ayarlar.')
                .addIntegerOption((opt) =>
                    opt.setName('seviye').setDescription('Ses seviyesi (0-100)').setRequired(true).setMinValue(0).setMaxValue(100),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('ileri-sar')
                .setDescription('Şarkıda belirli bir konuma atlar.')
                .addIntegerOption((opt) =>
                    opt.setName('saniye').setDescription('Saniye cinsinden konum').setRequired(true).setMinValue(0),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('kaldır')
                .setDescription('Sıradan bir şarkı kaldırır.')
                .addIntegerOption((opt) =>
                    opt.setName('konum').setDescription('Sıra konumu').setRequired(true).setMinValue(1),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('taşı')
                .setDescription('Sıradaki bir şarkının yerini değiştirir.')
                .addIntegerOption((opt) => opt.setName('kaynak').setDescription('Şu anki konum').setRequired(true).setMinValue(1))
                .addIntegerOption((opt) => opt.setName('hedef').setDescription('Yeni konum').setRequired(true).setMinValue(1)),
        )
        .addSubcommand((sub) => sub.setName('temizle').setDescription('Sırayı temizler.'))
        .addSubcommand((sub) => sub.setName('ayrıl').setDescription('Botu ses kanalından çıkarır.'))
        .addSubcommand((sub) =>
            sub
                .setName('247')
                .setDescription('24/7 modunu açıp kapatır.')
                .addBooleanOption((opt) => opt.setName('durum').setDescription('Etkinleştir/Devre dışı bırak').setRequired(true)),
        ),

    async execute(interaction, config, client) {
        await deferMusicCommand(interaction);
        const subcommand = interaction.options.getSubcommand();

        // switch içindeki case'leri de Türkçe isimlere göre güncelledim
        switch (subcommand) {
            case 'duraklat': await replyMusicSuccess(interaction, await pausePlayback(client, interaction)); break;
            case 'devam': await replyMusicSuccess(interaction, await resumePlayback(client, interaction)); break;
            case 'geç': await replyMusicSuccess(interaction, await skipTrack(client, interaction)); break;
            case 'durdur': await replyMusicSuccess(interaction, await stopPlayback(client, interaction)); break;
            case 'karıştır': await replyMusicSuccess(interaction, await shuffleQueue(client, interaction)); break;
            case 'döngü': await replyMusicSuccess(interaction, await setLoopMode(client, interaction, interaction.options.getString('mod'))); break;
            case 'ses': await replyMusicSuccess(interaction, await setVolume(client, interaction, interaction.options.getInteger('seviye'))); break;
            case 'ileri-sar': await replyMusicSuccess(interaction, await seekTrack(client, interaction, interaction.options.getInteger('saniye'))); break;
            case 'kaldır': await replyMusicSuccess(interaction, await removeFromQueue(client, interaction, interaction.options.getInteger('konum'))); break;
            case 'taşı': await replyMusicSuccess(interaction, await moveInQueue(client, interaction, interaction.options.getInteger('kaynak'), interaction.options.getInteger('hedef'))); break;
            case 'temizle': await replyMusicSuccess(interaction, await clearQueue(client, interaction)); break;
            case 'ayrıl': await replyMusicSuccess(interaction, await leaveVoiceChannel(client, interaction)); break;
            case '247': await replyMusicSuccess(interaction, await setTwentyFourSeven(client, interaction, interaction.options.getBoolean('durum'))); break;
            default:
                await InteractionHelper.safeEditReply(interaction, { content: 'Bilinmeyen müzik alt komutu.' });
        }
    },
};
