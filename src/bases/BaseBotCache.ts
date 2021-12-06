import admin from "firebase-admin"
import { BaseEntry, BaseGuildCache, iBaseGuildCache, iConfig } from ".."
import { Client, Collection, Guild } from "discord.js"

export type iBaseBotCache<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> = new (GCClass: iBaseGuildCache<E, GC>, config: iConfig, bot: Client) => BC

export default abstract class BaseBotCache<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private readonly GCClass: iBaseGuildCache<E, GC>

	public readonly bot: Client
	public readonly ref: admin.firestore.CollectionReference<E>
	public readonly caches: Collection<string, GC>

	public constructor(GCClass: iBaseGuildCache<E, GC>, config: iConfig, bot: Client) {
		this.GCClass = GCClass

		admin.initializeApp({
			credential: admin.credential.cert(config.firebase.service_account),
			databaseURL: config.firebase.database_url
		})
		this.bot = bot
		this.ref = admin
			.firestore()
			.collection(config.firebase.collection) as admin.firestore.CollectionReference<E>
		this.caches = new Collection<string, GC>()
		this.onConstruct()
	}

	public getGuildCache(guild: Guild): Promise<GC> {
		return new Promise<GC>((resolve, reject) => {
			const cache = this.caches.get(guild.id)
			if (!cache) {
				const cache = new this.GCClass(this.bot, guild, this.ref.doc(guild.id), resolve)
				this.caches.set(guild.id, cache)
				this.onSetGuildCache(cache)

				this.ref
					.doc(guild.id)
					.get()
					.then(snap => {
						if (!snap.exists) reject()
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
}
