import { Client, Collection, Guild } from "discord.js"
import { cert, initializeApp } from "firebase-admin/app"
import { CollectionReference, getFirestore } from "firebase-admin/firestore"

import { BaseEntry, BaseGuildCache, iBaseGuildCache } from "../"

export type iBaseBotCache<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> = new (GCClass: iBaseGuildCache<E, GC>, bot: Client) => BC

const firebaseApp = initializeApp({
	credential: cert({
		projectId: process.env.FIREBASE__SERVICE_ACCOUNT__PROJECT_ID,
		privateKey: process.env.FIREBASE__SERVICE_ACCOUNT__PRIVATE_KEY,
		clientEmail: process.env.FIREBASE__SERVICE_ACCOUNT__CLIENT_EMAIL
	})
})

/**
 * A class that contains global information about the Discord Bot.
 * Contains all GuildCache of each guild.
 *
 * Only one instance of this class should exist.
 */
export default abstract class BaseBotCache<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	/**
	 * The Firestore reference to all Guild Entries.
	 */
	readonly ref = getFirestore(firebaseApp).collection(
		process.env.FIREBASE__COLLECTION
	) as CollectionReference<E>
	/**
	 * The collection that contains all GuildCaches.
	 */
	readonly caches = new Collection<string, GC>()

	constructor(
		private readonly GCClass: iBaseGuildCache<E, GC>,
		/**
		 * The Discord Client that is used to interact with the Discord API.
		 */
		public readonly bot: Client
	) {
		this.onConstruct()
	}

	/**
	 * Get a Guild's cache.
	 *
	 * If the GuildCache has not been created yet, Nova will create it for you.
	 * The GuildCache is only considered created once the first snapshot of the FirestoreEntry is received,
	 * hence this method is **asynchronous**.
	 * Once the GuildCache is created, it will be cached and returned **synchronously**.
	 *
	 * @param guild Guild class from Discord
	 * @returns A promise that returns the GuildCache of the guild
	 */
	getGuildCache(guild: Guild) {
		return new Promise<GC>((resolve, reject) => {
			const cache = this.caches.get(guild.id)
			if (!cache) {
				const cache = new this.GCClass(
					this.bot,
					guild,
					this.ref.doc(guild.id),
					this.getEmptyEntry(),
					resolve
				)
				this.caches.set(guild.id, cache)
				this.onSetGuildCache(cache)

				this.ref
					.doc(guild.id)
					.get()
					.then(snap => {
						if (!snap.exists) reject(new Error())
					})
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
	onSetGuildCache(cache: GC) {}

	/**
	 * Setup the GuildCache and Firestore Entry for a new guild
	 *
	 * @param guildId The ID of the guild that was created
	 */
	abstract registerGuildCache(guildId: string): void

	/**
	 * Destroy the GuildCache and Firestore Entry for the deleted guild
	 *
	 * @param guildId The ID of the guild that was deleted
	 */
	abstract eraseGuildCache(guildId: string): void

	/**
	 * Get an empty Firestore Entry
	 */
	abstract getEmptyEntry(): E
}
