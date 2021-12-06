import admin from "firebase-admin"
import { BaseRecord } from ".."
import { Client, Guild } from "discord.js"

export type iBaseGuildCache<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> = new (
	bot: Client,
	guild: Guild,
	ref: admin.firestore.DocumentReference<R>,
	resolve: (cache: GC) => void
) => GC

export default abstract class BaseGuildCache<
	R extends BaseRecord,
	GC extends BaseGuildCache<R, GC>
> {
	public readonly bot: Client
	public readonly guild: Guild
	public readonly ref: admin.firestore.DocumentReference<R>
	public record: R

	public constructor(
		bot: Client,
		guild: Guild,
		ref: admin.firestore.DocumentReference<R>,
		resolve: (cache: GC) => void
	) {
		this.bot = bot
		this.guild = guild
		this.ref = ref
		this.record = this.getEmptyRecord()
		this.resolve(resolve)
		this.onConstruct()
	}

	public abstract onConstruct(): void
	public abstract resolve(resolve: (cache: GC) => void): void
	public abstract updateMinutely(debug: number): void
	public abstract getEmptyRecord(): R
}
