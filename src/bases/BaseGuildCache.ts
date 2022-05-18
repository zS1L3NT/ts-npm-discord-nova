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

export default abstract class BaseGuildCache<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> {
	public logger: LogManager<E, GC> = new LogManager(this)

	public constructor(
		public readonly bot: Client,
		public readonly guild: Guild,
		public readonly ref: DocumentReference<E>,
		public entry: E,
		resolve: (cache: GC) => void
	) {
		this.resolve(resolve)
		this.onConstruct()
	}

	public getAliases() {
		return this.entry.aliases
	}

	public abstract onConstruct(): void
	public abstract resolve(resolve: (cache: GC) => void): void
	public abstract updateMinutely(): void
}
