import { BaseBotCache, BaseEntry, BaseGuildCache } from ".."
import { ClientEvents } from "discord.js"

export default interface iEventFile<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>,
	N extends keyof ClientEvents
> {
	name: N
	execute: (botCache: BC, ...args: ClientEvents[N]) => Promise<any>
}
