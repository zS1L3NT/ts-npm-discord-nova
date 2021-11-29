import { ButtonInteraction, InteractionReplyOptions, MessagePayload } from "discord.js"
import BaseDocument, { iBaseValue } from "../bases/BaseDocument"
import BaseGuildCache from "../bases/BaseGuildCache"
import ResponseBuilder from "../builders/ResponseBuilder"

export default class ButtonHelper<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D>
> {
	public readonly cache: GC
	public readonly interaction: ButtonInteraction

	constructor(cache: GC, interaction: ButtonInteraction) {
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
}
