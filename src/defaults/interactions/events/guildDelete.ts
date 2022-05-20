import { Guild } from "discord.js"

import { BaseBotCache, BaseEntry, BaseEvent, BaseGuildCache } from "../../.."

export default class<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseEvent<E, GC, BC, "guildDelete"> {
	override name = "guildDelete" as const

	override middleware = []

	override async execute(botCache: BC, guild: Guild) {
		logger.info(`Removed from Guild(${guild.name})`)
		await botCache.eraseGuildCache(guild.id)
		botCache.caches.delete(guild.id)
	}
}
