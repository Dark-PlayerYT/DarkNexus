import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { checkUserPermissions } from '../../utils/permissionGuard.js';
import { addLevels, getLevelingConfig } from '../../services/leveling/leveling.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('seviye-ekle') // Komut ismi Türkçe yapıldı
    .setDescription('Bir kullanıcıya seviye ekler')
    .addUserOption((option) =>
      option
        .setName('kullanıcı')
        .setDescription('Seviye eklenecek kullanıcı')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('miktar')
        .setDescription('Eklenecek seviye miktarı')
        .setRequired(true)
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  category: 'Seviye',

  async execute(interaction, config, client) {
    // 1. Önce yetki kontrolü yapıyoruz (Defer etmeden önce, yetki yoksa doğrudan gizli cevap dönebilsin)
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

    // 3. Kontroller başarıyla geçtiyse, veritabanı işlemi sürebileceği için şimdi güvenli şekilde defer ediyoruz
    await InteractionHelper.safeDefer(interaction);

    const targetUser = interaction.options.getUser('kullanıcı');
    const levelsToAdd = interaction.options.getInteger('miktar');

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      throw new TitanBotError(
        `Kullanıcı ${targetUser.id} sunucuda bulunamadı`,
        ErrorTypes.USER_INPUT,
        'Belirtilen kullanıcı bu sunucuda bulunmuyor.'
      );
    }

    // Seviye ekleme servisini çağırıyoruz
    const userData = await addLevels(client, interaction.guildId, targetUser.id, levelsToAdd);

    await InteractionHelper.safeEditReply(interaction, {
      embeds: [
        createEmbed({
          title: 'Seviye Eklendi',
          description: `${targetUser} kullanıcısına başarıyla **${levelsToAdd}** seviye eklendi.\n**Yeni Seviyesi:** ${userData.level}`,
          color: 'success'
        })
      ]
    });

    logger.info(
      `[ADMIN] ${interaction.user.tag}, ${interaction.guildId} sunucusunda ${targetUser.tag} kullanıcısına ${levelsToAdd} seviye ekledi.`
    );
  }
};
