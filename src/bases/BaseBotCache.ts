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

export default abstract class BaseBotCache<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	public readonly ref = getFirestore(firebaseApp).collection(
		process.env.FIREBASE__COLLECTION
	) as CollectionReference<E>
	public readonly caches = new Collection<string, GC>()

	public constructor(
		private readonly GCClass: iBaseGuildCache<E, GC>,
		public readonly bot: Client
	) {
		this.onConstruct()
	}

	public getGuildCache(guild: Guild): Promise<GC> {
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

	public abstract onConstruct(): void
	public abstract onSetGuildCache(cache: GC): void
	public abstract registerGuildCache(guildId: string): void
	public abstract eraseGuildCache(guildId: string): void
	public abstract getEmptyEntry(): E
}
