import { BaseGuildCache, BaseRecord, ResponseBuilder } from ".."
import { InteractionReplyOptions, MessagePayload, SelectMenuInteraction } from "discord.js"

export default class MenuHelper<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
	public readonly cache: GC
	public readonly interaction: SelectMenuInteraction

	constructor(cache: GC, interaction: SelectMenuInteraction) {
		this.cache = cache
		this.interaction = interaction
	}

	public respond(options: MessagePayload | InteractionReplyOptions | ResponseBuilder) {
		if (options instanceof ResponseBuilder) {
			this.interaction
				.followUp({
					embeds: [options.build()]
				})
				.catch(() => {})
		} else {
			this.interaction.followUp(options).catch(() => {})
		}
	}

	public update(options: MessagePayload | InteractionReplyOptions | ResponseBuilder) {
		if (options instanceof ResponseBuilder) {
			this.interaction.update({
				embeds: [options.build()]
			})
		} else {
			this.interaction.update(options)
		}
	}

	public value(): string | undefined {
		return this.interaction.values[0]
	}
}
