import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { checkUserPermissions } from '../../utils/permissionGuard.js';
import { removeLevels, getUserLevelData, getLevelingConfig } from '../../services/leveling/leveling.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('seviye-düşür') // Komut ismi Türkçe yapıldı
    .setDescription('Bir kullanıcının seviyesini azaltır')
    .addUserOption((option) =>
      option
        .setName('kullanıcı')
        .setDescription('Seviyesi düşürülecek kullanıcı')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('miktar')
        .setDescription('Düşürülecek seviye miktarı')
        .setRequired(true)
        .setMinValue(1)
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
    const levelsToRemove = interaction.options.getInteger('miktar');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      throw new TitanBotError(
        `Kullanıcı ${targetUser.id} sunucuda bulunamadı`,
        ErrorTypes.USER_INPUT,
        'Belirtilen kullanıcı bu sunucuda bulunmuyor.'
      );
    }

    // Kullanıcının mevcut verisini kontrol ediyoruz
    const userData = await getUserLevelData(client, interaction.guildId, targetUser.id);
    if (!userData || userData.level === 0) {
      throw new TitanBotError(
        `Kullanıcı ${targetUser.id} zaten minimum seviyede`,
        ErrorTypes.VALIDATION,
        `${targetUser.tag} zaten 0. seviyede olduğu için seviyesi daha fazla düşürülemez.`
      );
    }

    // Seviye düşürme servisini çağırıyoruz
    const updatedData = await removeLevels(client, interaction.guildId, targetUser.id, levelsToRemove);

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [
        createEmbed({
          title: 'Seviye Düşürüldü',
          description: `${targetUser} kullanıcısından başarıyla **${levelsToRemove}** seviye düşürüldü.\n**Yeni Seviyesi:** ${updatedData.level}`,
          color: 'success'
        })
      ]
    });

    logger.info(
      `[ADMIN] ${interaction.user.tag}, ${interaction.guildId} sunucusunda ${targetUser.tag} kullanıcısından ${levelsToRemove} seviye düşürdü.`
    );
  }
};
