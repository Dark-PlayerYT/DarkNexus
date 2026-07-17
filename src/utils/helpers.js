// helpers.js

import { BotConfig } from "../config/bot.js";

export function getPriorityMap() {
    const priorities = BotConfig.tickets?.priorities || {};
    const map = {};

    for (const [key, config] of Object.entries(priorities)) {
        map[key] = {
            // Türkçe karakterlerin (ı-I, i-İ, ş-Ş vb.) düzgün büyümesi için toLocaleUpperCase('tr-TR') kullanıldı
            name: `${config.emoji} ${config.label.toLocaleUpperCase('tr-TR')}`,
            color: config.color,
            emoji: config.emoji,
            label: config.label,
        };
    }

    return map;
}

export const PRIORITY_MAP = getPriorityMap();
