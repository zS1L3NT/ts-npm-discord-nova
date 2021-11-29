import { Client, Guild } from "discord.js"
import BaseDocument, { iBaseDocument, iBaseValue } from "./BaseDocument"

export type iBaseGuildCache<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	R extends BaseGuildCache<V, D>
> = new (
	DClass: iBaseDocument<V, D>,
	bot: Client,
	guild: Guild,
	ref: FirebaseFirestore.DocumentReference<D>,
	resolve: (cache: R) => void
) => R

export default abstract class BaseGuildCache<V extends iBaseValue, D extends BaseDocument<V, D>> {
	public readonly bot: Client
	public readonly guild: Guild
	public readonly ref: FirebaseFirestore.DocumentReference<D>
	public document: D

	public constructor(
		DClass: iBaseDocument<V, D>,
		bot: Client,
		guild: Guild,
		ref: FirebaseFirestore.DocumentReference<D>,
		resolve: (cache: BaseGuildCache<V, D>) => void
	) {
		this.bot = bot
		this.guild = guild
		this.ref = ref
		this.document = new DClass().getEmpty()
		this.resolve(resolve)
	}

	public abstract resolve(resolve: (cache: BaseGuildCache<V, D>) => void): void

	/**
	 * Method run every minute
	 */
	public abstract updateMinutely(debug: number): Promise<void>
}
