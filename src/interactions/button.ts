import { ButtonInteraction } from "discord.js"

import { BaseEntry, BaseGuildCache, CommandPayload, ResponseBuilder } from "../"

export default abstract class BaseButton<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract defer: boolean
	abstract ephemeral: boolean
	middleware: ButtonMiddleware<E, GC>[] = []

	abstract execute(helper: ButtonHelper<E, GC>): Promise<any>
}

export type iButtonMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BM extends ButtonMiddleware<E, GC>
> = new () => BM

export abstract class ButtonMiddleware<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract handler(helper: ButtonHelper<E, GC>): boolean | Promise<boolean>
}

export class ButtonHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	constructor(public readonly cache: GC, public readonly interaction: ButtonInteraction) {}

	respond(options: ResponseBuilder | CommandPayload) {
		if (options instanceof ResponseBuilder) {
			this.interaction
				.followUp({ embeds: [options.build()] })
				.catch(err => logger.warn("Failed to follow up button interaction", err))
		} else {
			this.interaction
				.followUp(options)
				.catch(err => logger.warn("Failed to follow up button interaction", err))
		}
	}

	update(options: ResponseBuilder | CommandPayload) {
		if (options instanceof ResponseBuilder) {
			this.interaction
				.update({ embeds: [options.build()] })
				.catch(err => logger.warn("Failed to update button interaction", err))
		} else {
			this.interaction
				.update(options)
				.catch(err => logger.warn("Failed to update button interaction", err))
		}
	}
}
