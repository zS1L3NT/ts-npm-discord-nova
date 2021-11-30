import admin from "firebase-admin"
import {
	BaseDocument,
	BaseGuildCache,
	iBaseDocument,
	iBaseGuildCache,
	iBaseValue,
	iConfig
} from ".."
import { Client, Collection, Guild } from "discord.js"

export type iBaseBotCache<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D, GC>,
	R extends BaseBotCache<V, D, GC>
> = new (
	DClass: iBaseDocument<V, D>,
	GCClass: iBaseGuildCache<V, D, GC>,
	config: iConfig,
	bot: Client
) => R

export default abstract class BaseBotCache<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D, GC>
> {
	private readonly DClass: iBaseDocument<V, D>
	private readonly GCClass: iBaseGuildCache<V, D, GC>

	public readonly bot: Client
	public readonly ref: FirebaseFirestore.CollectionReference<V>
	public readonly guilds: Collection<string, GC>

	public constructor(
		DClass: iBaseDocument<V, D>,
		GCClass: iBaseGuildCache<V, D, GC>,
		config: iConfig,
		bot: Client
	) {
		this.DClass = DClass
		this.GCClass = GCClass

		admin.initializeApp({
			credential: admin.credential.cert(config.firebase.service_account),
			databaseURL: config.firebase.database_url
		})
		this.bot = bot
		this.ref = admin
			.firestore()
			.collection(config.firebase.collection) as FirebaseFirestore.CollectionReference<V>
		this.guilds = new Collection<string, GC>()
	}

	public getGuildCache(guild: Guild): Promise<GC> {
		return new Promise<GC>((resolve, reject) => {
			const cache = this.guilds.get(guild.id)
			if (!cache) {
				this.guilds.set(
					guild.id,
					new this.GCClass(this.DClass, this.bot, guild, this.ref.doc(guild.id), resolve)
				)

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

	public abstract registerGuildCache(guildId: string): Promise<void>
	public abstract eraseGuildCache(guildId: string): Promise<void>
}
