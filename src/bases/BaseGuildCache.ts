import { Client, Colors, Guild } from "discord.js"

import { PrismaClient } from "@prisma/client"

import { BaseEntry, LogManager } from "../"
import { Alias } from "./BaseEntry"

export type iBaseGuildCache<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>
> = new (bot: Client, guild: Guild, prisma: P) => GC

/**
 * A class containing information related to each Guild.
 *
 * Each Guild that the bot is in will have its own GuildCache.
 */
export default abstract class BaseGuildCache<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>
> {
	/**
	 * The instance of the logger for this Guild
	 */
	readonly logger: LogManager<P, E, GC> = new LogManager(this)

	/**
	 * Cached entry value
	 */
	entry: E = this.getEmptyEntry()

	/**
	 * Command aliases
	 */
	aliases: Alias[] = []

	/**
	 * The property determining if the bot has the admin permission in this Guild
	 */
	isAdministrator: boolean = false

	constructor(
		/**
		 * The Discord Client that is used to interact with the Discord API.
		 */
		public readonly bot: Client,
		/**
		 * The Discord Guild that this GuildCache is for.
		 */
		public readonly guild: Guild,
		public readonly prisma: P
	) {
		this.onConstruct()
		setInterval(this.refresh, 15_000)
	}

	/**
	 * The prefix of this Guild
	 */
	get prefix() {
		return this.entry.prefix
	}

	/**
	 * Update the entry data
	 *
	 * @param data The data that changed in the entry
	 */
	async update(data: Partial<E>) {
		this.entry = { ...JSON.parse(JSON.stringify(this.entry)), ...data }
		try {
			this.entry = await (<any>this.prisma).entry.update({
				data,
				where: { guild_id: this.guild.id }
			})
		} catch (err) {
			this.refresh()
			logger.error(err)
			this.logger.log({
				title: (<Error>err).name,
				description: (<Error>err).message,
				color: Colors.Red
			})
		}
	}

	/**
	 * A method that is called when the GuildCache is constructed.
	 */
	abstract onConstruct(): void

	/**
	 * This method is where the GuildCache's data is refetched from the database.
	 */
	abstract refresh(): Promise<void>

	/**
	 * A method that is called every minute by the bot
	 */
	abstract updateMinutely(): void

	/**
	 * Get an empty entry
	 */
	abstract getEmptyEntry(): E
}
