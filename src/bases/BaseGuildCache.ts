import admin from "firebase-admin"
import { BaseEntry } from ".."
import { Client, Guild } from "discord.js"

export type iBaseGuildCache<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> = new (
	bot: Client,
	guild: Guild,
	ref: admin.firestore.DocumentReference<E>,
	entry: E,
	resolve: (cache: GC) => void
) => GC

export default abstract class BaseGuildCache<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> {
	public readonly bot: Client
	public readonly guild: Guild
	public readonly ref: admin.firestore.DocumentReference<E>
	public entry: E

	public constructor(
		bot: Client,
		guild: Guild,
		ref: admin.firestore.DocumentReference<E>,
		entry: E,
		resolve: (cache: GC) => void
	) {
		this.bot = bot
		this.guild = guild
		this.ref = ref
		this.entry = entry
		this.resolve(resolve)
		this.onConstruct()
	}

	public getAliases() {
		return this.entry.aliases
	}

	public abstract onConstruct(): void
	public abstract resolve(resolve: (cache: GC) => void): void
	public abstract updateMinutely(debug: number): void
}
