import { Client, Guild } from "discord.js"
import { DocumentReference } from "firebase-admin/firestore"

import { BaseEntry, LogManager } from "../"

export type iBaseGuildCache<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> = new (
	bot: Client,
	guild: Guild,
	ref: DocumentReference<E>,
	entry: E,
	resolve: (cache: GC) => void
) => GC

/**
 * A class containing information related to each Guild.
 *
 * Each Guild that the bot is in will have its own GuildCache.
 */
export default abstract class BaseGuildCache<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> {
	/**
	 * The instance of the logger for this Guild
	 */
	readonly logger: LogManager<E, GC> = new LogManager(this)

	constructor(
		/**
		 * The Discord Client that is used to interact with the Discord API.
		 */
		public readonly bot: Client,
		/**
		 * The Discord Guild that this GuildCache is for.
		 */
		public readonly guild: Guild,
		/**
		 * The Firestore reference to the Guild's Entry.
		 */
		public readonly ref: DocumentReference<E>,
		/**
		 * The Guild's Entry.
		 */
		public entry: E,
		resolve: (cache: GC) => void
	) {
		this.resolve(resolve)
		this.onConstruct()
	}

	/**
	 * The Record of aliases for all commands in this server
	 */
	get aliases() {
		return this.entry.aliases
	}

	/**
	 * The prefix of this Guild
	 */
	get prefix() {
		return this.entry.prefix
	}

	/**
	 * A method that is called when the GuildCache is constructed.
	 */
	onConstruct() {}

	/**
	 * This method is where the GuildCache's Firestore Entry should be listened to.
	 *
	 * It is important to call the {@link resolve} function to let the BotCache know that the GuildCache has been created.
	 * If this method is not called, the BotCache will be stuck, since it waits for the GuildCache to be created.
	 *
	 * @param resolve The function used to alert the BotCache that this GuildCache has received it's first Firestore Entry
	 */
	abstract resolve(resolve: (cache: GC) => void): void

	/**
	 * A method that is called every minute by the bot
	 */
	abstract updateMinutely(): void
}
