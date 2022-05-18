import { SelectMenuInteraction } from "discord.js"

import { BaseEntry, BaseGuildCache, CommandPayload, ResponseBuilder } from "../"

export default abstract class BaseSelectMenu<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	SMMs extends SelectMenuMiddleware<E, GC>[] = []
> {
	abstract defer: boolean
	abstract ephemeral: boolean
	middleware: iSelectMenuMiddleware<E, GC, SMMs[number]>[] = []

	abstract execute(helper: SelectMenuHelper<E, GC>): Promise<any>
}

export type iSelectMenuMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	SMM extends SelectMenuMiddleware<E, GC>
> = new () => SMM

export abstract class SelectMenuMiddleware<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract handler(helper: SelectMenuHelper<E, GC>): boolean | Promise<boolean>
}

export class SelectMenuHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	public constructor(
		public readonly cache: GC,
		public readonly interaction: SelectMenuInteraction
	) {}

	public respond(options: ResponseBuilder | CommandPayload) {
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

	public update(options: ResponseBuilder | CommandPayload) {
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

	public value(): string | undefined {
		return this.interaction.values[0]
	}
}
