import { BaseEntry, BaseGuildCache, ResponseBuilder } from ".."
import { ButtonInteraction, InteractionReplyOptions, MessagePayload } from "discord.js"

export default class ButtonHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	public constructor(public readonly cache: GC, public readonly interaction: ButtonInteraction) {}

	public respond(options: MessagePayload | InteractionReplyOptions | ResponseBuilder) {
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

	public update(options: MessagePayload | InteractionReplyOptions | ResponseBuilder) {
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
