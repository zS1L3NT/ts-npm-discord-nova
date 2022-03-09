import admin from "firebase-admin"
import { BaseEntry, BaseGuildCache, iBaseGuildCache, iConfig } from ".."
import { Client, Collection, Guild } from "discord.js"

export type iBaseBotCache<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> = new (GCClass: iBaseGuildCache<E, GC>, bot: Client, config: iConfig) => BC

export default abstract class BaseBotCache<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	public readonly ref: admin.firestore.CollectionReference<E>
	public readonly caches = new Collection<string, GC>()

	public constructor(
		private readonly GCClass: iBaseGuildCache<E, GC>,
		public readonly bot: Client,
		config: iConfig
	) {
		admin.initializeApp({ credential: admin.credential.cert(config.firebase.service_account) })
		this.ref = admin
			.firestore()
			.collection(config.firebase.collection) as admin.firestore.CollectionReference<E>
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
