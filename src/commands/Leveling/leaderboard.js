import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getLeaderboard, getLevelingConfig, getXpForLevel } from '../../services/leveling/leveling.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sıralama') // Komut ismi Türkçe yapıldı
    .setDescription('Sunucunun seviye sıralamasını gösterir')
    .setDMPermission(false),
  category: 'Seviye',

  async execute(interaction, config, client) {
    // Önce seviye sisteminin açık olup olmadığını kontrol ediyoruz (Defer etmeden önce)
    const levelingConfig = await getLevelingConfig(client, interaction.guildId);

    if (!levelingConfig?.enabled) {
      // Defer edilmediği için reply doğrudan Ephemeral (gizli) olarak çalışır
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#f1c40f')
            .setDescription('Seviye sistemi şu anda bu sunucuda devre dışı bırakılmış.')
        ],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Sistem açıksa, veritabanı sorgusu sürebileceği için şimdi güvenli şekilde defer ediyoruz (Herkes görebilir)
    await InteractionHelper.safeDefer(interaction);

    const leaderboard = await getLeaderboard(client, interaction.guildId, 10);

    if (leaderboard.length === 0) {
      throw new TitanBotError(
        'Sıralama verisi bulunamadı',
        ErrorTypes.DATABASE,
        'Henüz sunucuda kayıtlı bir seviye verisi yok. Tecrübe puanı (XP) kazanmak için sohbete başlayın!'
      );
    }

    const embed = new EmbedBuilder()
      .setTitle('Seviye Sıralaması')
      .setColor('#2ecc71')
      .setDescription('Bu sunucudaki en aktif ilk 10 üye:')
      .setTimestamp();

    const leaderboardText = await Promise.all(
      leaderboard.map(async (user, index) => {
        try {
          const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
          const userMention = member?.user.toString() || `<@${user.userId}>`;
          const xpForNextLevel = getXpForLevel(user.level + 1);

          let rankPrefix = `${index + 1}.`;
          if (index === 0) rankPrefix = '🥇';
          else if (index === 1) rankPrefix = '🥈';
          else if (index === 2) rankPrefix = '🥉';
          else rankPrefix = `**${index + 1}.**`;

          return `${rankPrefix} ${userMention} - Seviye ${user.level} (${user.xp}/${xpForNextLevel} XP)`;
        } catch {
          return `**${index + 1}.** Kullanıcı yüklenirken hata oluştu: ${user.userId}`;
        }
      })
    );

    embed.addFields({
      name: 'Sıralama Listesi',
      value: leaderboardText.join('\n')
    });

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.debug(`Sıralama listesi sunucu için görüntülendi: ${interaction.guildId}`);
  }
};
