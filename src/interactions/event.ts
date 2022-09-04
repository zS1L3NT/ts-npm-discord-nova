import { ClientEvents } from "discord.js"

import { PrismaClient } from "@prisma/client"

import { BaseBotCache, BaseEntry, BaseGuildCache } from "../"

export default abstract class BaseEvent<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>,
	N extends keyof ClientEvents
> {
	/**
	 * The name of the event
	 *
	 * @example "messageCreate"
	 */
	abstract name: N
	/**
	 * Middleware to run before the {@link execute} method is called
	 */
	abstract middleware: EventMiddleware<P, E, GC, BC, N>[]

	/**
	 * The method that is called when the event is emitted
	 *
	 * @param botCache The BotCache to possibly fetch a GuildCache
	 * @param args The args of the client event
	 */
	abstract execute(botCache: BC, ...args: ClientEvents[N]): Promise<any>
}

export type iEventMiddleware<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>,
	N extends keyof ClientEvents,
	EM extends EventMiddleware<P, E, GC, BC, N>
> = new () => EM

export abstract class EventMiddleware<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>,
	N extends keyof ClientEvents
> {
	/**
	 * The function that should handle the event
	 *
	 * @param botCache The BotCache to possibly fetch a GuildCache
	 * @param args The args of the client event
	 */
	abstract handler(botCache: BC, ...args: ClientEvents[N]): boolean | Promise<boolean>
}
