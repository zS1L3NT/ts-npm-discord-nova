import { ClientEvents } from "discord.js"

import { BaseBotCache, BaseEntry, BaseGuildCache } from "../"

export default abstract class BaseEvent<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>,
	N extends keyof ClientEvents,
	EMs extends EventMiddleware<E, GC, BC, N>[] = []
> {
	middleware: iEventMiddleware<E, GC, BC, N, EMs[number]>[] = []
	abstract name: N

	abstract execute(botCache: BC, ...args: ClientEvents[N]): Promise<any>
}

export type iEventMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>,
	N extends keyof ClientEvents,
	EM extends EventMiddleware<E, GC, BC, N>
> = new () => EM

export abstract class EventMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>,
	N extends keyof ClientEvents
> {
	abstract handler(botCache: BC, ...args: ClientEvents[N]): Promise<boolean>
}
