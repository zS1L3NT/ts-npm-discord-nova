import { ButtonInteraction, GuildMember, Message } from "discord.js"

import { PrismaClient } from "@prisma/client"

import { BaseEntry, BaseGuildCache, CommandPayload, ResponseBuilder } from "../"

export default abstract class BaseButton<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
> {
	/**
	 * If the button interaction should be deferred
	 *
	 * @example true
	 */
	abstract defer: boolean
	/**
	 * If the button interaction should be ephemeral
	 *
	 * @example true
	 */
	abstract ephemeral: boolean
	/**
	 * Middleware to run before the {@link execute} method is called
	 */
	abstract middleware: ButtonMiddleware<P, E, GC>[]

	/**
	 * The method that is called when a button interaction is triggered
	 *
	 * @param helper The ButtonHelper containing information about the button interaction
	 */
	abstract execute(helper: ButtonHelper<P, E, GC>): Promise<any>
}

export type iButtonMiddleware<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BM extends ButtonMiddleware<P, E, GC>,
> = new () => BM

export abstract class ButtonMiddleware<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
> {
	/**
	 * The function that should handle the button interaction
	 *
	 * @param helper The ButtonHelper containing information about the button interaction
	 * @returns If the next middleware / execute method should be called
	 */
	abstract handler(helper: ButtonHelper<P, E, GC>): boolean | Promise<boolean>
}

export class ButtonHelper<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
> {
	constructor(
		public readonly cache: GC,
		public readonly interaction: ButtonInteraction,
	) {}

	/**
	 * The GuildMember that pressednt the button
	 */
	get member() {
		return this.interaction.member as GuildMember
	}

	/**
	 * The Message containing this button
	 */
	get message() {
		return this.interaction.message as Message
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
				.catch(err => logger.warn("Failed to follow up button interaction", err))
		} else {
			this.interaction
				.followUp(options)
				.catch(err => logger.warn("Failed to follow up button interaction", err))
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
				.catch(err => logger.warn("Failed to update button interaction", err))
		} else {
			this.interaction
				.update(options)
				.catch(err => logger.warn("Failed to update button interaction", err))
		}
	}
}
