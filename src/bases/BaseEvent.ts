import { ClientEvents } from "discord.js"

import { BaseBotCache, BaseEntry, BaseGuildCache } from "../"

export default abstract class BaseEvent<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>,
	N extends keyof ClientEvents
> {
	abstract name: N

	abstract execute: (botCache: BC, ...args: ClientEvents[N]) => Promise<any>
}
