import { Client, Collection, Guild } from "discord.js"

import { PrismaClient } from "@prisma/client"

import { BaseEntry, BaseGuildCache, iBaseGuildCache } from "../"

export type iBaseBotCache<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>,
> = new (GCClass: iBaseGuildCache<P, E, GC>, bot: Client, prisma: P) => BC

/**
 * A class that contains global information about the Discord Bot.
 * Contains all GuildCache of each guild.
 *
 * Only one instance of this class should exist.
 */
export default abstract class BaseBotCache<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
> {
	/**
	 * The collection that contains all GuildCaches.
	 */
	readonly caches = new Collection<string, GC>()

	constructor(
		private readonly GCClass: iBaseGuildCache<P, E, GC>,
		/**
		 * The Discord Client that is used to interact with the Discord API.
		 */
		public readonly bot: Client,
		public readonly prisma: P,
	) {
		this.onConstruct()
	}

	/**
	 * Get a Guild's cache.
	 *
	 * @param guild Guild class from Discord
	 * @returns A promise that returns the GuildCache of the guild
	 */
	getGuildCache(guild: Guild) {
		return new Promise<GC>((resolve, reject) => {
			const cache = this.caches.get(guild.id)
			if (!cache) {
				const cache = new this.GCClass(this.bot, guild, this.prisma)
				this.caches.set(guild.id, cache)
				this.onSetGuildCache(cache)
				cache
					.refresh()
					.then(() => resolve(cache))
					.catch(reject)
			} else {
				resolve(cache)
			}
		})
	}

	/**
	 * A method that is called when the BotCache is constructed.
	 */
	onConstruct() {}

	/**
	 * A method that is called when a GuildCache is stored in the BotCache.
	 *
	 * @param cache The GuildCache that was just created.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onSetGuildCache(cache: GC) {}

	/**
	 * Setup the GuildCache and entry for a new guild
	 *
	 * @param guildId The ID of the guild that was created
	 */
	abstract registerGuildCache(guildId: string): void

	/**
	 * Destroy the GuildCache and entry for the deleted guild
	 *
	 * @param guildId The ID of the guild that was deleted
	 */
	abstract eraseGuildCache(guildId: string): void
}
