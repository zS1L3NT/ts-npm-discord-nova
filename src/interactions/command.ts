import {
	ChatInputCommandInteraction,
	GuildChannel,
	GuildMember,
	Message,
	Role,
	User,
} from "discord.js"
import escapeStringRegexp from "escape-string-regexp"

import { PrismaClient } from "@prisma/client"

import { BaseEntry, BaseGuildCache, CommandPayload, iSlashData, ResponseBuilder } from "../"

export enum CommandType {
	Slash = "slash",
	Message = "message",
}

export default abstract class BaseCommand<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
> {
	/**
	 * If the slash command should be deferred
	 *
	 * @example true
	 */
	abstract defer: boolean
	/**
	 * If the slash command should be ephemeral
	 *
	 * @example true
	 */
	abstract ephemeral: boolean
	/**
	 * Metadata about the command that will be showed in the help command and the slash command description
	 *
	 * @example
	 * {
	 *     "description": "Plays a song",
	 *     "options": [
	 *         {
	 *             name: "query",
	 *             description: "The link of the song to play",
	 *             type: "string" as const,
	 *             requirements: "Text or URL",
	 *             required: true
	 *         }
	 *     ]
	 * }
	 */
	abstract data: iSlashData
	/**
	 * Enter this field if you want this command to only with either Message or Slash commands
	 * If not set, this command will work for both.
	 *
	 * @example
	 * CommandType.Slash
	 */
	only: CommandType | null = null
	/**
	 * Middleware to run before the {@link execute} method is called
	 */
	abstract middleware: CommandMiddleware<P, E, GC>[]

	/**
	 * The condition under which a message send will trigger this command.
	 *
	 * This can be left empty is {@link only} is set to {@link CommandType.Slash}
	 *
	 * @example helper.isMessageCommand(true)
	 *
	 * @param helper The CommandHelper containing information about the message or slash interaction
	 */
	abstract condition(helper: CommandHelper<P, E, GC>): boolean | void
	/**
	 * The function that turns a string into a json object with all the command arguments.
	 *
	 * This can be left empty is {@link only} is set to {@link CommandType.Slash}
	 *
	 * @param helper The CommandHelper containing information about the message or slash interaction
	 */
	abstract converter(helper: CommandHelper<P, E, GC>): any
	/**
	 * The method that is called when a message or slash command is triggered
	 *
	 * @param helper The CommandHelper containing information about the message or slash interaction
	 */
	abstract execute(helper: CommandHelper<P, E, GC>): Promise<any>
}

export abstract class CommandMiddleware<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
> {
	/**
	 * The function that should handle the message or slash interaction
	 *
	 * @param helper The CommandHelper containing information about the message or slash interaction
	 * @returns If the next middleware / execute method should be called
	 */
	abstract handler(helper: CommandHelper<P, E, GC>): boolean | Promise<boolean>
}

export class CommandHelper<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
> {
	private responded = false
	private response: Message | undefined
	private timeout: NodeJS.Timeout | undefined
	params: Record<
		string,
		GuildChannel | GuildMember | User | Role | string | number | boolean | null
	> = {}

	constructor(
		private readonly name: string,
		/**
		 * The type of command that is being handled
		 *
		 * Either {@link CommandType.Slash} or {@link CommandType.Message}
		 */
		public readonly type: CommandType,
		public readonly cache: GC,
		public readonly interaction?: ChatInputCommandInteraction,
		public readonly message?: Message,
	) {}

	/**
	 * The GuildMember that send the message or triggered the slash command
	 */
	get member() {
		return (this.interaction ?? this.message)!.member as GuildMember
	}

	/**
	 * Tests the message against the given regex pattern
	 *
	 * @param regexp The regexp to match against the message
	 * @throws Error if the command is a slash command
	 * @returns The groups that the regex match returned
	 */
	match(regexp: string) {
		if (!this.message) throw new Error("CommandHelper.match() called on Slash command")

		const regex = this.message.content.match(new RegExp(regexp))
		return regex ? regex.slice(1) : null
	}

	/**
	 * A convenience method to test if a message content matches a specific regex pattern of a command.
	 *
	 * If the command is **play**, the prefix is **!** and `isMessageCommand(true)` is passed,
	 * **!play hello** will trigger this command while **!play** with or without trailing spaces will not.
	 *
	 * If the command is **loop**, the prefix is **!** and `isMessageCommand(false)` is passed,
	 * **!loop** with or without trailing spaces will trigger this command while **!loop again** will not.
	 *
	 * If the command is **repeat**, the prefix is **!** and `isMessageCommand(null)` is passed,
	 * **!repeat 5** and **!repeat** with or without trailing spaces will trigger this command.
	 *
	 * @param hasArgs If the command is expecting arguments
	 * @throws Error if the command is a slash command
	 * @returns If the message content matches the command
	 */
	isMessageCommand(hasArgs: boolean | null) {
		if (!this.message)
			throw new Error("CommandHelper.isMessageCommand() called on Slash command")

		const alias = this.cache.aliases.find(alias => alias.command === this.name)?.alias
		const commandRegex =
			escapeStringRegexp(this.cache.prefix || "") +
			(alias ? `(${this.name}|${alias})` : this.name)

		return !!this.match(
			hasArgs === null
				? `^${commandRegex}`
				: `^${commandRegex}(?:(?= *${hasArgs ? "" : "$"})(?!\\w+))`,
		)
	}

	/**
	 * Gets the arguments passed in the message command
	 *
	 * @throws Error if the command is a slash command
	 * @returns The arguments passed in the message
	 */
	args() {
		if (!this.message) throw new Error("CommandHelper.args() called on Slash command")

		return (
			this.match(`^\\S* *(.*)`)?.[0]
				?.replaceAll("  ", " ")
				?.split(" ")
				?.filter(i => i !== "") ?? []
		)
	}

	/**
	 * Respond to the message or slash command with a message
	 * If this method is called more than once, the previous message will be edited
	 *
	 * @param options The data to send back to the user
	 * @param ms The message delete timer, defaults to 5 seconds
	 */
	respond(options: ResponseBuilder | CommandPayload, ms: number | null = 10000) {
		const payload = options instanceof ResponseBuilder ? { embeds: [options.build()] } : options

		if (this.message) {
			if (this.timeout) clearTimeout(this.timeout)

			const promise = this.responded
				? this.response!.edit(payload!)
				: this.message.channel.send(payload!)

			promise
				.then(async response => {
					this.response = response
					if (ms !== null) {
						this.timeout = setTimeout(() => {
							this.response
								?.delete()
								.catch(err => logger.warn("Failed to delete response", err))
						}, ms)
					}
				})
				.catch(err => logger.warn("Failed to send / edit response", err))

			new Promise(res => setTimeout(res, 10000))
				.then(() => this.message?.delete())
				.catch(err => logger.warn("Failed to delete message", err))
		}

		if (this.interaction) {
			const promise = this.responded
				? this.interaction.editReply(payload)
				: this.interaction.followUp(payload)

			promise.catch(err => logger.warn("Failed to follow up / edit interaction", err))
		}

		this.responded = true
	}

	/**
	 * Gets a mentionable from the slash command options or converted json object of the data
	 *
	 * @param name Key in the slash command options or converted json object of the data
	 * @returns Mentionable
	 */
	mentionable(name: string) {
		return (this.interaction?.options.getMentionable(name) ?? this.params[name] ?? null) as
			| GuildMember
			| User
			| Role
			| null
	}

	/**
	 * Gets a mentionable from the slash command options or converted json object of the data
	 *
	 * @param name Key in the slash command options or converted json object of the data
	 * @returns Channel
	 */
	channel(name: string) {
		return (this.interaction?.options.getChannel(name) ??
			this.params[name] ??
			null) as GuildChannel | null
	}

	/**
	 * Gets a role from the slash command options or converted json object of the data
	 *
	 * @param name Key in the slash command options or converted json object of the data
	 * @returns Role
	 */
	role(name: string) {
		return (this.interaction?.options.getRole(name) ?? this.params[name] ?? null) as Role | null
	}

	/**
	 * Gets a user from the slash command options or converted json object of the data
	 *
	 * @param name Key in the slash command options or converted json object of the data
	 * @returns User
	 */
	user(name: string) {
		return (this.interaction?.options.getUser(name) ?? this.params[name] ?? null) as User | null
	}

	/**
	 * Gets a string from the slash command options or converted json object of the data
	 *
	 * @param name Key in the slash command options or converted json object of the data
	 * @returns String
	 */
	string(name: string) {
		return (this.interaction?.options.getString(name) ?? this.params[name] ?? null) as
			| string
			| null
	}

	/**
	 * Gets a integer from the slash command options or converted json object of the data
	 *
	 * @param name Key in the slash command options or converted json object of the data
	 * @returns Integer
	 */
	integer(name: string) {
		return (this.interaction?.options.getInteger(name) ?? this.params[name] ?? null) as
			| number
			| null
	}

	/**
	 * Gets a boolean from the slash command options or converted json object of the data
	 *
	 * @param name Key in the slash command options or converted json object of the data
	 * @returns Boolean
	 */
	boolean(name: string) {
		return (this.interaction?.options.getBoolean(name) ?? this.params[name] ?? null) as
			| boolean
			| null
	}
}
