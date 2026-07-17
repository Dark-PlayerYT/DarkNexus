import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getFromDb, setInDb } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import crypto from 'crypto';

function generateShareId() {
    return crypto.randomBytes(16).toString('hex');
}

export default {
    data: new SlashCommandBuilder()
        .setName("todo")
        .setDescription("Kişisel veya ortak yapılacaklar listenizi yönetin")
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Yapılacaklar listenize yeni bir görev ekler")
                .addStringOption(option =>
                    option
                        .setName("task")
                        .setDescription("Eklenecek görev")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Yapılacaklar listenizi görüntüler")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("complete")
                .setDescription("Bir görevi tamamlandı olarak işaretler")
                .addIntegerOption(option =>
                    option
                        .setName("number")
                        .setDescription("Tamamlanacak görevin numarası")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Yapılacaklar listenizden bir görevi siler")
                .addIntegerOption(option =>
                    option
                        .setName("number")
                        .setDescription("Silinecek görevin numarası")
                        .setRequired(true)
                )
        )
        .addSubcommandGroup(group => 
            group
                .setName("share")
                .setDescription("Ortak yapılacaklar listelerini yönetir")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("create")
                        .setDescription("Yeni bir ortak yapılacaklar listesi oluşturur")
                        .addStringOption(option =>
                            option
                                .setName("name")
                                .setDescription("Ortak liste için bir isim belirleyin")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Ortak listeye yeni bir üye ekler")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("Ortak listenin benzersiz ID'si")
                                .setRequired(true)
                        )
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("Listeye eklenecek kullanıcı")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("view")
                        .setDescription("Ortak bir yapılacaklar listesini görüntüler")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("Görüntülenecek ortak listenin ID'si")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("addtask")
                        .setDescription("Ortak yapılacaklar listesine yeni bir görev ekler")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("Görevin ekleneceği ortak listenin ID'si")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("task")
                                .setDescription("Eklenecek görev")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Ortak yapılacaklar listesinden bir görevi siler")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("Görevin silineceği ortak listenin ID'si")
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName("number")
                                .setDescription("Silinecek görevin numarası")
                                .setRequired(true)
                        )
                )
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    category: "Faydalı",

    async execute(interaction, config, client) {
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        const shareSubcommand = interaction.options.getSubcommandGroup() === 'share' ? interaction.options.getSubcommand() : null;

        async function getOrCreateSharedList(listId, creatorId = null, listName = null) {
            const listKey = `shared_todo_${listId}`;
            let listData = await getFromDb(listKey, null);
            
            if (!listData || (listData.ok === false && listData.error)) {
                if (creatorId) {
                    listData = {
                        id: listId,
                        name: listName,
                        creatorId,
                        members: [creatorId],
                        tasks: [],
                        nextId: 1,
                        createdAt: new Date().toISOString()
                    };
                    await setInDb(listKey, listData);
                } else {
                    return null;
                }
            }
            
            if (listData) {
                if (!Array.isArray(listData.tasks)) listData.tasks = [];
                if (!listData.nextId) listData.nextId = 1;
                if (!Array.isArray(listData.members)) listData.members = [];
            }
            
            return listData;
        }

        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Todo interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'todo'
            });
            return;
        }

        if (shareSubcommand) {
            switch (shareSubcommand) {
                case 'create': {
                    const listName = interaction.options.getString('name');
                    const listId = generateShareId();

                    await getOrCreateSharedList(listId, userId, listName);

                    const userSharedLists = await getFromDb(`user_shared_lists_${userId}`, []);
                    const sharedListsArray = Array.isArray(userSharedLists) ? userSharedLists : [];
                    if (!sharedListsArray.includes(listId)) {
                        sharedListsArray.push(listId);
                        await setInDb(`user_shared_lists_${userId}`, sharedListsArray);
                    }

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed(
                                "Ortak Liste Oluşturuldu",
                                `"${listName}" adlı ortak liste başarıyla oluşturuldu!\n\n` +
                                `🔑 **Liste ID:** \`${listId}\`\n\n` +
                                `👥 Üye eklemek için: \`/todo share add list_id:${listId} user:@Kullanıcı\``
                            )
                        ]
                    });
                }

                case 'add': {
                    const listId = interaction.options.getString('list_id');
                    const memberToAdd = interaction.options.getUser('user');

                    const listData = await getOrCreateSharedList(listId);
                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Belirtilen ortak liste bulunamadı.' });
                    }

                    if (listData.creatorId !== userId) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Bu ortak listeye yalnızca liste sahibi üye ekleyebilir.' });
                    }

                    if (!listData.members.includes(memberToAdd.id)) {
                        listData.members.push(memberToAdd.id);
                        await setInDb(`shared_todo_${listId}`, listData);

                        const memberLists = await getFromDb(`user_shared_lists_${memberToAdd.id}`, []);
                        const memberListsArray = Array.isArray(memberLists) ? memberLists : [];
                        if (!memberListsArray.includes(listId)) {
                            memberListsArray.push(listId);
                            await setInDb(`user_shared_lists_${memberToAdd.id}`, memberListsArray);
                        }

                        return await InteractionHelper.safeEditReply(interaction, {
                            embeds: [
                                successEmbed('Üye Eklendi', 
                                    `**${memberToAdd.username}** kullanıcısı "${listData.name}" ortak listesine başarıyla eklendi.`
                                )
                            ]
                        });
                    } else {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Bu kullanıcı zaten bu listenin bir üyesi.' });
                    }
                }

                case 'view': {
                    const listId = interaction.options.getString('list_id');
                    const listData = await getOrCreateSharedList(listId);

                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Belirtilen ortak liste bulunamadı.' });
                    }

                    if (!listData.members.includes(userId)) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Bu listeyi görüntülemek için yetkiniz bulunmuyor.' });
                    }

                    const memberList = listData.members.map(memberId => {
                        const member = interaction.guild.members.cache.get(memberId);
                        return member ? member.user.username : `<@${memberId}>`;
                    }).join(', ');

                    const owner = interaction.guild.members.cache.get(listData.creatorId);
                    const ownerName = owner ? owner.user.username : `<@${listData.creatorId}>`;

                    const buttons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`shared_todo_add_${listId}`)
                            .setLabel('Görev Ekle')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`shared_todo_complete_${listId}`)
                            .setLabel('Görevi Tamamla')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`shared_todo_remove_${listId}`)
                            .setLabel('Görevi Sil')
                            .setStyle(ButtonStyle.Danger)
                    );

                    if (listData.tasks.length === 0) {
                        return await InteractionHelper.safeEditReply(interaction, {
                                embeds: [
                                    successEmbed(
                                        `📋 **${listData.name}**\n\n` +
                                        `👑 **Kurucu:** ${ownerName}\n` +
                                        `👥 **Üyeler:** ${memberList}\n\n` +
                                        `*Bu liste şu anda boş. Görev eklemek için aşağıdaki butonu kullanabilirsiniz!*`,
                                        `Ortak Liste (ID: \`${listId}\`)`
                                    )
                                ],
                                components: [buttons]
                            });
                    }

                    const taskList = listData.tasks
                        .map(task => 
                            `${task.completed ? '✅' : '📝'} #${task.id}${task.text} ` +
                            `\`[${new Date(task.createdAt).toLocaleDateString()}]` +
                            (task.completed ? ` • Tamamlayan: <@${task.completedBy}>` : '') + '`'
                        )
                        .join('\n');

                    const fullListDisplay = `📋 **${listData.name}**\n\n` +
                        `👑 **Kurucu:** ${ownerName}\n` +
                        `👥 **Üyeler:** ${memberList}\n\n` +
                        `**Görevler:**\n${taskList}`;

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed(`Ortak Liste (ID: \`${listId}\`)`, fullListDisplay)
                        ],
                        components: [buttons]
                    });
                }

                case 'addtask': {
                    const listId = interaction.options.getString('list_id');
                    const taskText = interaction.options.getString('task');

                    const listData = await getOrCreateSharedList(listId);

                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Belirtilen ortak liste bulunamadı.' });
                    }

                    if (!listData.members.includes(userId)) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Bu ortak listeye görev ekleme yetkiniz yok.' });
                    }

                    const newTask = {
                        id: listData.nextId++,
                        text: taskText,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        createdBy: userId
                    };

                    listData.tasks.push(newTask);
                    await setInDb(`shared_todo_${listId}`, listData);

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed('Görev Eklendi', `"${taskText}" görevi "${listData.name}" ortak listesine eklendi.`)
                        ]
                    });
                }

                case 'remove': {
                    const listId = interaction.options.getString('list_id');
                    const taskNumber = interaction.options.getInteger('number');

                    const listData = await getOrCreateSharedList(listId);

                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Belirtilen ortak liste bulunamadı.' });
                    }

                    if (!listData.members.includes(userId)) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Bu ortak listeden görev silme yetkiniz yok.' });
                    }

                    const taskIndex = listData.tasks.findIndex(task => task.id === taskNumber);
                    if (taskIndex === -1) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Belirtilen numaralı görev bulunamadı.' });
                    }

                    const [removedTask] = listData.tasks.splice(taskIndex, 1);
                    await setInDb(`shared_todo_${listId}`, listData);

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed('Görev Silindi', `"${removedTask.text}" görevi "${listData.name}" ortak listesinden silindi.`)
                        ]
                    });
                }
            }
            return;
        }

        const dbKey = `todo_${userId}`;

        const userData = await getFromDb(dbKey, {
            tasks: [],
            nextId: 1
        });

        if (!userData.tasks) userData.tasks = [];
        if (!userData.nextId) userData.nextId = 1;

        switch (subcommand) {
            case 'add': {
                const taskText = interaction.options.getString('task');

                const newTask = {
                    id: userData.nextId++,
                    text: taskText,
                    completed: false,
                    createdAt: new Date().toISOString()
                };

                userData.tasks.push(newTask);
                await setInDb(dbKey, userData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "Görev Eklendi",
                            `"${taskText}" kişisel yapılacaklar listenize eklendi.`
                        ),
                    ],
                });
            }

            case 'list': {
                if (userData.tasks.length === 0) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [successEmbed('Yapılacaklar listeniz şu anda boş!', "Yapılacaklar Listeniz")],
                    });
                }

                const taskList = userData.tasks
                    .map(task => 
                        `${task.completed ? '✅' : '📝'} #${task.id}${task.text} ` +
                        `\`[${new Date(task.createdAt).toLocaleDateString()}]\``
                    )
                    .join('\n');

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed('Yapılacaklar Listeniz', taskList)
                    ],
                });
            }

            case 'complete': {
                const taskNumber = interaction.options.getInteger('number');
                const task = userData.tasks.find(t => t.id === taskNumber);

                if (!task) {
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Belirtilen numaralı görev bulunamadı.' });
                }

                if (task.completed) {
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `#${task.id} numaralı görev zaten tamamlanmış.` });
                }

                task.completed = true;
                await setInDb(`todo_${userId}`, userData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed('Görev Tamamlandı', `"${task.text}" görevi tamamlandı olarak işaretlendi!`)
                    ],
                });
            }

            case 'remove': {
                const taskNumber = interaction.options.getInteger('number');
                const taskIndex = userData.tasks.findIndex(t => t.id === taskNumber);

                if (taskIndex === -1) {
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Belirtilen numaralı görev bulunamadı.' });
                }

                const [removedTask] = userData.tasks.splice(taskIndex, 1);
                await setInDb(`todo_${userId}`, userData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed('Görev Silindi', `"${removedTask.text}" kişisel yapılacaklar listenizden silindi.`)
                    ],
                });
            }

            default:
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Geçersiz alt komut.' });
        }
    },
};
