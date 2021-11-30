import { BaseDocument, iBaseDocument, iBaseValue } from ".."
import { Client, Guild } from "discord.js"

export type iBaseGuildCache<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	R extends BaseGuildCache<V, D>
> = new (
	DClass: iBaseDocument<V, D>,
	bot: Client,
	guild: Guild,
	ref: FirebaseFirestore.DocumentReference<V>,
	resolve: (cache: R) => void
) => R

export default abstract class BaseGuildCache<V extends iBaseValue, D extends BaseDocument<V, D>> {
	public readonly bot: Client
	public readonly guild: Guild
	public readonly ref: FirebaseFirestore.DocumentReference<V>
	public document: D

	public constructor(
		DClass: iBaseDocument<V, D>,
		bot: Client,
		guild: Guild,
		ref: FirebaseFirestore.DocumentReference<V>,
		resolve: <GC extends BaseGuildCache<V, D>>(cache: GC) => void
	) {
		this.bot = bot
		this.guild = guild
		this.ref = ref
		this.document = new DClass().getEmpty()
		this.resolve(resolve)
	}

	public abstract resolve(resolve: <GC extends BaseGuildCache<V, D>>(cache: GC) => void): void

	/**
	 * Method run every minute
	 */
	public abstract updateMinutely(debug: number): Promise<void>
}
