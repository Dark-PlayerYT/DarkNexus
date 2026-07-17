/**
 * Prefix command restrictions — dashboard and advanced setup flows stay slash-only.
 */

/** Top-level commands that cannot be invoked via prefix at all. */
export const SLASH_ONLY_COMMANDS = new Set([
  'configwizard',
  'kurulumsihirbazı', 
  'help',
  'yardım',           
  'embedbuilder',
  'embedoluştur',     
  'wipedata',
  'verilerisil',      
  'apply',         
  'onayla',           // Eklenen Türkçe alternatif
]);

/** Subcommands blocked for every command when invoked via prefix. */
export const GLOBAL_BLOCKED_SUBCOMMANDS = new Set([
  'dashboard',
  'panel',            
  'setup',
  'kurulum',          
]);

/** Subcommand groups blocked for every command when invoked via prefix. */
export const GLOBAL_BLOCKED_SUBCOMMAND_GROUPS = new Set([
  'config',           
  'ayarlar',          
]);

/** Per-command subcommands that stay slash-only (beyond the global block list). */
export const COMMAND_BLOCKED_SUBCOMMANDS = {
  music: new Set([
    'shuffle', 'karıştır', 
    'loop', 'döngü',       
    'seek', 'süre',        
    'remove', 'sil',
    'move', 'taşı',        
    'clear', 'temizle',
  ]),
  müzik: new Set([ 
    'shuffle', 'karıştır',
    'loop', 'döngü',
    'seek', 'süre',
    'remove', 'sil',
    'move', 'taşı',
    'clear', 'temizle',
  ]),
  birthday: new Set(['setchannel', 'kanalayarla']),
  doğumgünü: new Set(['setchannel', 'kanalayarla']), 
  report: new Set(['setchannel', 'kanalayarla']),
  rapor: new Set(['setchannel', 'kanalayarla']),
};

function collectSubcommandNames(commandJson) {
  const subcommandGroup = commandJson.options?.find((opt) => opt.type === 2);

  if (subcommandGroup) {
    const names = [];
    for (const group of subcommandGroup.options || []) {
      names.push(...(group.options?.map((opt) => opt.name) || []));
    }
    return names;
  }

  return (commandJson.options?.filter((opt) => opt.type === 1) || []).map((sub) => sub.name);
}

function isSubcommandBlocked(commandName, subcommandName) {
  if (!subcommandName) {
    return false;
  }

  if (GLOBAL_BLOCKED_SUBCOMMANDS.has(subcommandName)) {
    return true;
  }

  const commandBlocked = COMMAND_BLOCKED_SUBCOMMANDS[commandName];
  return commandBlocked?.has(subcommandName) ?? false;
}

/**
 * Returns whether a prefix invocation should be rejected.
 * @param {object} command - Loaded command module
 * @param {string[]} args - Parsed prefix arguments (after command name)
 * @param {(name: string) => string} resolveSubcommandAlias
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function getPrefixRestriction(command, args, resolveSubcommandAlias) {
  if (!command?.data?.toJSON) {
    return { blocked: false };
  }

  const commandJson = command.data.toJSON();
  const commandName = commandJson.name?.toLowerCase();

  if (command.prefixOnly === false || command.slashOnly === true) {
    return { blocked: true, reason: 'Bu komut sadece eğik çizgi (/) komutu olarak kullanılabilir.' };
  }

  if (SLASH_ONLY_COMMANDS.has(commandName)) {
    return { blocked: true, reason: 'Bu komut sadece eğik çizgi (/) komutu olarak kullanılabilir.' };
  }

  const [firstArg, secondArg] = args.map((arg) => arg?.toLowerCase?.() || null);
  const resolvedFirstArg = firstArg ? resolveSubcommandAlias(firstArg) : null;
  const resolvedSecondArg = secondArg ? resolveSubcommandAlias(secondArg) : null;

  const subcommandGroup = commandJson.options?.find((opt) => opt.type === 2);

  const allSubcommandNames = collectSubcommandNames(commandJson);
  const allSubcommandsBlocked =
    allSubcommandNames.length > 0 &&
    allSubcommandNames.every((name) => isSubcommandBlocked(commandName, name));

  if (allSubcommandsBlocked) {
    return { blocked: true, reason: 'Bu komut sadece eğik çizgi (/) komutu olarak kullanılabilir.' };
  }

  if (firstArg && GLOBAL_BLOCKED_SUBCOMMAND_GROUPS.has(firstArg)) {
    return {
      blocked: true,
      reason: 'Bu yapılandırma akışı sadece eğik çizgi (/) komutu olarak kullanılabilir.',
    };
  }

  if (resolvedFirstArg && isSubcommandBlocked(commandName, resolvedFirstArg)) {
    return {
      blocked: true,
      reason: 'Bu alt komut sadece eğik çizgi (/) komutu olarak kullanılabilir.',
    };
  }

  if (subcommandGroup && resolvedSecondArg && isSubcommandBlocked(commandName, resolvedSecondArg)) {
    return {
      blocked: true,
      reason: 'Bu alt komut sadece eğik çizgi (/) komutu olarak kullanılabilir.',
    };
  }

  return { blocked: false };
}

export function isPrefixRestrictedCommand(command, args, resolveSubcommandAlias) {
  return getPrefixRestriction(command, args, resolveSubcommandAlias).blocked;
}
