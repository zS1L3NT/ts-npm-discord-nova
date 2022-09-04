import { Guild } from "discord.js"

import { PrismaClient } from "@prisma/client"

import { BaseBotCache, BaseEntry, BaseEvent, BaseGuildCache } from "../../.."

export default class<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>
> extends BaseEvent<P, E, GC, BC, "guildDelete"> {
	override name = "guildDelete" as const

	override middleware = []

	override async execute(botCache: BC, guild: Guild) {
		logger.info(`Removed from Guild(${guild.name})`)
		await botCache.eraseGuildCache(guild.id)
		botCache.caches.delete(guild.id)
	}
}
