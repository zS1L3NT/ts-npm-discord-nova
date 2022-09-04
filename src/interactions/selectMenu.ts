import { GuildMember, Message, SelectMenuInteraction } from "discord.js"

import { PrismaClient } from "@prisma/client"

import { BaseEntry, BaseGuildCache, CommandPayload, ResponseBuilder } from "../"

export default abstract class BaseSelectMenu<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>
> {
	/**
	 * If the select menu interaction should be deferred
	 *
	 * @example true
	 */
	abstract defer: boolean
	/**
	 * If the select menu interaction should be ephemeral
	 *
	 * @example true
	 */
	abstract ephemeral: boolean
	/**
	 * Middleware to run before the {@link execute} method is called
	 */
	abstract middleware: SelectMenuMiddleware<P, E, GC>[]

	/**
	 * The method that is called when a select menu item is chosen
	 *
	 * @param helper The SelectMenuHelper containing information about the select menu interaction
	 */
	abstract execute(helper: SelectMenuHelper<P, E, GC>): Promise<any>
}

export abstract class SelectMenuMiddleware<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>
> {
	/**
	 * The function that should handle the select menu interaction
	 *
	 * @param helper The SelectMenuHelper containing information about the select menu interaction
	 * @returns If the next middleware / execute method should be called
	 */
	abstract handler(helper: SelectMenuHelper<P, E, GC>): boolean | Promise<boolean>
}

export class SelectMenuHelper<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>
> {
	constructor(public readonly cache: GC, public readonly interaction: SelectMenuInteraction) {}

	/**
	 * The GuildMember that pressednt the button
	 */
	get member() {
		return this.interaction.member as GuildMember
	}

	/**
	 * The Message containing this select menu
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
				.catch(err => logger.warn("Failed to follow up select menu interaction", err))
		} else {
			this.interaction
				.followUp(options)
				.catch(err => logger.warn("Failed to follow up select menu interaction", err))
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
				.catch(err => logger.warn("Failed to update select menu interaction", err))
		} else {
			this.interaction
				.update(options)
				.catch(err => logger.warn("Failed to update select menu interaction", err))
		}
	}

	/**
	 * The values that the user selected.
	 */
	get values() {
		return this.interaction.values
	}

	/**
	 * The first value that the user selected.
	 */
	get value() {
		return this.interaction.values[0]
	}
}
