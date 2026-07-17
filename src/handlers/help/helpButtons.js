import { createEmbed } from '../../utils/embeds.js';
import { createAllCommandsMenu } from './helpSelectMenus.js';
import { createInitialHelpMenu } from '../../commands/Core/help.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';

// ID ve Prefix kısımlarını tamamen Türkçe karakterli ve baş harfleri büyük olacak şekilde düzenledik
const BACK_BUTTON_ID = "Yardım-Ana-Menüye-Dön";
const PAGINATION_PREFIX = "Yardım-Sayfa";
const BUG_REPORT_BUTTON_ID = "Yardım-Hata-Bildir";

export const helpBackButton = {
    name: BACK_BUTTON_ID,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { embeds, components } = await createInitialHelpMenu(client);
            await interaction.editReply({
                embeds,
                components,
            });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Yardım geri butonu etkileşimi zaten yanıtlandı veya süresi doldu.', {
                    event: 'interaction.help.button.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};

export const helpBugReportButton = {
    name: BUG_REPORT_BUTTON_ID,
    async execute(interaction, client) {
        const githubButton = new ButtonBuilder()
            .setLabel('💬 Yetkililere Bildir & Destek Al')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/QnWNz2dKCE');

        const bugRow = new ActionRowBuilder().addComponents(githubButton);

        const bugReportEmbed = createEmbed({
            title: '🐛 Yardım - Hata Bildirimi',
            description: 'Bir hata mı buldunuz? Lütfen bu durumu hemen **sunucu yetkililerimize** veya destek sunucumuz üzerinden bizlere bildirin!\n\n' +
                '**Hata bildirirken yetkililerimize şunları iletmeyi unutmayın:**\n' +
                '• 📝 Sorunun detaylı açıklaması\n' +
                '• 📋 Hatayı hangi komutla veya nasıl aldığınızın adımları\n' +
                '• 📸 Varsa ekran görüntüleri veya hata kodları\n\n' +
                'Bizlere bildireceğiniz her hata, **Dark Nexus** kalitesini daha da arttırmamıza yardımcı olur!',
            color: 'error'
        });
        bugReportEmbed.setFooter({
            text: 'Dark Nexus - Hata Bildirim Sistemi',
            iconURL: client.user.displayAvatarURL()
        });
        bugReportEmbed.setTimestamp();

        await interaction.reply({
            embeds: [bugReportEmbed],
            components: [bugRow],
            flags: MessageFlags.Ephemeral
        });
    },
};

function getPaginationInfo(components) {
    for (const row of components || []) {
        for (const component of row.components || []) {
            if (component.customId === `${PAGINATION_PREFIX}_page`) {
                const label = component.label || '';
                const match = label.match(/(?:Page|Sayfa)\s+(\d+)\s+(?:of|\/)\s+(\d+)/i) || label.match(/(\d+)\s*\/\s*(\d+)/);
                if (match) {
                    return {
                        currentPage: Number(match[1]),
                        totalPages: Number(match[2]),
                    };
                }
            }
        }
    }

    return { currentPage: 1, totalPages: 1 };
}

export const helpPaginationButton = {
    name: `${PAGINATION_PREFIX}_next`,
    async execute(interaction, client) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            const { currentPage, totalPages } = getPaginationInfo(interaction.message?.components);

            let nextPage = currentPage;
            switch (interaction.customId) {
                case `${PAGINATION_PREFIX}_first`:
                    nextPage = 1;
                    break;
                case `${PAGINATION_PREFIX}_prev`:
                    nextPage = Math.max(1, currentPage - 1);
                    break;
                case `${PAGINATION_PREFIX}_next`:
                    nextPage = Math.min(totalPages, currentPage + 1);
                    break;
                case `${PAGINATION_PREFIX}_last`:
                    nextPage = totalPages;
                    break;
                default:
                    nextPage = currentPage;
                    break;
            }

            const { embeds, components } = await createAllCommandsMenu(nextPage, client);
            await interaction.editReply({ embeds, components });
        } catch (error) {
            if (error?.code === 40060 || error?.code === 10062) {
                logger.warn('Yardım sayfalama etkileşimi zaten yanıtlandı veya süresi doldu.', {
                    event: 'interaction.help.pagination.unavailable',
                    errorCode: String(error.code),
                    customId: interaction.customId,
                    interactionId: interaction.id,
                });
                return;
            }

            throw error;
        }
    },
};
