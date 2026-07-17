import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { getUserLevelData, getLevelingConfig, getXpForLevel } from '../../services/leveling/leveling.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('seviye') // Komut ismi Türkçe yapıldı
    .setDescription('Kendi seviyenizi veya başka bir kullanıcının seviyesini kontrol edersiniz')
    .addUserOption((option) =>
      option
        .setName('kullanıcı')
        .setDescription('Seviyesine bakılacak kullanıcı')
        .setRequired(false)
    )
    .setDMPermission(false),
  category: 'Seviye',

  async execute(interaction, config, client) {
    // 1. Önce seviye sisteminin aktif olup olmadığını kontrol ediyoruz (Gizli mesajın çalışması için)
    const levelingConfig = await getLevelingConfig(client, interaction.guildId);
    if (!levelingConfig?.enabled) {
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

    // 2. Sistem aktifse güvenli şekilde defer başlatıyoruz
    await InteractionHelper.safeDefer(interaction);

    const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
    const member = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!member) {
      throw new TitanBotError(
        `Kullanıcı ${targetUser.id} sunucuda bulunamadı`,
        ErrorTypes.USER_INPUT,
        'Belirtilen kullanıcı bu sunucuda bulunmuyor.'
      );
    }

    const userData = await getUserLevelData(client, interaction.guildId, targetUser.id);

    const safeUserData = {
      level: userData?.level ?? 0,
      xp: userData?.xp ?? 0,
      totalXp: userData?.totalXp ?? 0
    };

    const xpNeeded = getXpForLevel(safeUserData.level + 1);
    const progress = xpNeeded > 0 ? Math.floor((safeUserData.xp / xpNeeded) * 100) : 0;
    const progressBar = createProgressBar(progress, 20);

    const embed = new EmbedBuilder()
      .setTitle(`${member.displayName} Kullanıcısının Profili`)
      .setThumbnail(member.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: 'Seviye',
          value: safeUserData.level.toString(),
          inline: true
        },
        {
          name: 'Mevcut XP',
          value: `${safeUserData.xp}/${xpNeeded}`,
          inline: true
        },
        {
          name: 'Toplam XP',
          value: safeUserData.totalXp.toString(),
          inline: true
        },
        {
          name: `Seviye ${safeUserData.level + 1} için İlerleme`,
          value: `${progressBar} %${progress}`
        }
      )
      .setColor('#2ecc71')
      .setTimestamp();

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.debug(`[SEVİYE] ${interaction.user.tag}, ${interaction.guildId} sunucusunda ${targetUser.tag} kullanıcısının seviyesini sorguladı.`);
  }
};

function createProgressBar(percentage, length = 10) {
  if (percentage < 0 || percentage > 100) {
    percentage = Math.max(0, Math.min(100, percentage));
  }
  const filled = Math.round((percentage / 100) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}
