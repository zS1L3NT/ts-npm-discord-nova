import { ButtonInteraction, InteractionReplyOptions, InteractionUpdateOptions } from "discord.js"

import { BaseEntry, BaseGuildCache, ResponseBuilder } from "../"

export default abstract class BaseButton<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BMs extends ButtonMiddleware<E, GC>[] = []
> {
	middleware: iButtonMiddleware<E, GC, BMs[number]>[] = []
	abstract defer: boolean
	abstract ephemeral: boolean

	abstract execute(helper: ButtonHelper<E, GC>): Promise<any>
}

export type iButtonMiddleware<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BM extends ButtonMiddleware<E, GC>
> = new () => BM

export abstract class ButtonMiddleware<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract handler(helper: ButtonHelper<E, GC>): Promise<boolean>
}

export class ButtonHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	public constructor(public readonly cache: GC, public readonly interaction: ButtonInteraction) {}

	public respond(options: ResponseBuilder | InteractionReplyOptions) {
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

	public update(options: ResponseBuilder | InteractionUpdateOptions) {
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
