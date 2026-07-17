import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { checkUserPermissions } from '../../utils/permissionGuard.js';
import { setUserLevel, getLevelingConfig } from '../../services/leveling/leveling.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('seviye-ayarla') // Komut ismi Türkçe yapıldı
    .setDescription('Bir kullanıcının seviyesini belirli bir değere ayarlar')
    .addUserOption((option) =>
      option
        .setName('kullanıcı')
        .setDescription('Seviyesi ayarlanacak kullanıcı')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('seviye')
        .setDescription('Ayarlanacak yeni seviye değeri')
        .setRequired(true)
        .setMinValue(0)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  category: 'Seviye',

  async execute(interaction, config, client) {
    // 1. Yetki kontrolü (Defer etmeden önce, yetki yoksa doğrudan gizli cevap dönebilsin)
    const hasPermission = await checkUserPermissions(
      interaction,
      PermissionFlagsBits.ManageGuild,
      'Bu komutu kullanabilmek için Sunucuyu Yönet yetkisine sahip olmalısınız.'
    );
    if (!hasPermission) return;

    // 2. Seviye sisteminin durumunu kontrol ediyoruz
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

    // 3. Kontroller geçince güvenli şekilde defer ediyoruz
    await InteractionHelper.safeDefer(interaction);

    const targetUser = interaction.options.getUser('kullanıcı');
    const newLevel = interaction.options.getInteger('seviye');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      throw new TitanBotError(
        `Kullanıcı ${targetUser.id} sunucuda bulunamadı`,
        ErrorTypes.USER_INPUT,
        'Belirtilen kullanıcı bu sunucuda bulunmuyor.'
      );
    }

    // Seviye ayarlama servisini çağırıyoruz
    const userData = await setUserLevel(client, interaction.guildId, targetUser.id, newLevel);

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [
        createEmbed({
          title: 'Seviye Ayarlandı',
          description: `${targetUser} kullanıcısının seviyesi başarıyla **${newLevel}** olarak ayarlandı.\n**Toplam XP:** ${userData.totalXp}`,
          color: 'success'
        })
      ]
    });

    logger.info(
      `[ADMIN] ${interaction.user.tag}, ${interaction.guildId} sunucusunda ${targetUser.tag} kullanıcısının seviyesini ${newLevel} olarak ayarladı.`
    );
  }
};
