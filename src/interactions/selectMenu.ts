import { SelectMenuInteraction } from "discord.js"

import { BaseEntry, BaseGuildCache, CommandPayload, ResponseBuilder } from "../"

export default abstract class BaseSelectMenu<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> {
	abstract defer: boolean
	abstract ephemeral: boolean
	middleware: SelectMenuMiddleware<E, GC>[] = []

	abstract execute(helper: SelectMenuHelper<E, GC>): Promise<any>
}

export abstract class SelectMenuMiddleware<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract handler(helper: SelectMenuHelper<E, GC>): boolean | Promise<boolean>
}

export class SelectMenuHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	constructor(public readonly cache: GC, public readonly interaction: SelectMenuInteraction) {}

	respond(options: ResponseBuilder | CommandPayload) {
		if (options instanceof ResponseBuilder) {
			this.interaction
				.followUp({ embeds: [options.build()] })
				.catch(err => logger.warn("Failed to follow up select menu interaction", err))
		} else {
			this.interaction
				.followUp(options)
				.catch(err => logger.warn("Failed to follow up select menu interaction", err))
		}
	}

	update(options: ResponseBuilder | CommandPayload) {
		if (options instanceof ResponseBuilder) {
			this.interaction
				.update({ embeds: [options.build()] })
				.catch(err => logger.warn("Failed to update select menu interaction", err))
		} else {
			this.interaction
				.update(options)
				.catch(err => logger.warn("Failed to update select menu interaction", err))
		}
	}

	value(): string | undefined {
		return this.interaction.values[0]
	}
}
