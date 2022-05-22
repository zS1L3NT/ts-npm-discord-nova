import { GuildMember, Message, ModalSubmitInteraction } from "discord.js"

import { BaseEntry, BaseGuildCache, CommandPayload, ResponseBuilder } from "../"

export default abstract class BaseModal<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	/**
	 * If the modal submission should be deferred
	 *
	 * @example true
	 */
	abstract defer: boolean
	/**
	 * If the modal submission should be ephemeral
	 *
	 * @example true
	 */
	abstract ephemeral: boolean
	/**
	 * Middleware to run before the {@link execute} method is called
	 */
	abstract middleware: ModalMiddleware<E, GC>[]

	/**
	 * The method that is called when a modal is submitted
	 *
	 * @param helper The ModalHelper containing information about the modal submission
	 */
	abstract execute(helper: ModalHelper<E, GC>): Promise<any>
}

export abstract class ModalMiddleware<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	/**
	 * The function that should handle the modal interaction
	 *
	 * @param helper The ModalHelper containing information about the modal interaction
	 * @returns If the next middleware / execute method should be called
	 */
	abstract handler(helper: ModalHelper<E, GC>): boolean | Promise<boolean>
}

export class ModalHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	constructor(public readonly cache: GC, public readonly interaction: ModalSubmitInteraction) {}

	/**
	 * The GuildMember that submitted the modal
	 */
	get member() {
		return this.interaction.member as GuildMember
	}

	/**
	 * The Message that opened this modal
	 */
	get message() {
		return this.interaction.message as Message | null
	}

	/**
	 * Respond to the user with the `followUp` method on the {@link interaction}
	 *
	 * @param options The data to send back to the user
	 */
	respond(options: ResponseBuilder | CommandPayload) {
		if (options instanceof ResponseBuilder) {
			this.interaction
				.followUp({ embeds: [options.build()] })
				.catch(err => logger.warn("Failed to follow up modal submission response", err))
		} else {
			this.interaction
				.followUp(options)
				.catch(err => logger.warn("Failed to follow up modal submission response", err))
		}
	}

	/**
	 * Update the response to the user with the `update` method on the {@link interaction}
	 *
	 * @param options The data to send back to the user
	 */
	update(options: ResponseBuilder | CommandPayload) {
		if (options instanceof ResponseBuilder) {
			this.interaction
				.update({ embeds: [options.build()] })
				.catch(err => logger.warn("Failed to update modal submission response", err))
		} else {
			this.interaction
				.update(options)
				.catch(err => logger.warn("Failed to update modal submission response", err))
		}
	}

	/**
	 * Get the text value the user entered
	 *
	 * @param customId CustomID of the value to get
	 * @returns String
	 */
	text(customId: string) {
		return this.interaction.fields.getTextInputValue(customId)
	}
}
