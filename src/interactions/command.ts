import { CommandInteraction, GuildChannel, GuildMember, Message, Role, User } from "discord.js"

import { BaseEntry, BaseGuildCache, CommandPayload, iSlashData, ResponseBuilder } from "../"

export enum CommandType {
	Slash = "slash",
	Message = "message"
}

export default abstract class BaseCommand<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract defer: boolean
	abstract ephemeral: boolean
	abstract data: iSlashData
	only: CommandType | null = null
	middleware: CommandMiddleware<E, GC>[] = []

	abstract condition(helper: CommandHelper<E, GC>): boolean
	abstract converter(helper: CommandHelper<E, GC>): any
	abstract execute(helper: CommandHelper<E, GC>): Promise<any>
}

export abstract class CommandMiddleware<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract handler(helper: CommandHelper<E, GC>): boolean | Promise<boolean>
}

export class CommandHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private data: any
	private responded = false
	private timeout: NodeJS.Timeout | undefined
	params: Record<
		string,
		GuildChannel | GuildMember | User | Role | string | number | boolean | null
	> = {}

	constructor(
		public readonly type: CommandType,
		public readonly cache: GC,
		public readonly interaction?: CommandInteraction,
		public readonly message?: Message
	) {}

	get member() {
		return (this.interaction || this.message)!.member as GuildMember
	}

	match(regexp: string) {
		if (!this.message) throw new Error("CommandHelper.match() called on Slash command")

		const regex = this.message.content.match(new RegExp(regexp))
		return regex ? regex.slice(1) : null
	}

	isMessageCommand(prefix: string, command: string, type: "only" | "more") {
		if (!this.message)
			throw new Error("CommandHelper.isMessageCommand() called on Slash command")

		const alias = this.cache.getAliases()[command]
		const commandRegex = `\\${prefix}${alias ? `(${command}|${alias})` : command}`

		switch (type) {
			case "only":
				return !!this.match(`^${commandRegex}(?:(?= *$)(?!\\w+))`)
			case "more":
				return !!this.match(`^${commandRegex}(?:(?= *)(?!\\w+))`)
			default:
				throw new Error(`Unknown command type`)
		}
	}

	input() {
		if (!this.message) throw new Error("CommandHelper.input() called on Slash command")

		return this.match(`^\\S* *(.*)`)?.[0]
			?.replaceAll("  ", " ")
			?.split(" ")
			?.filter(i => i !== "")
	}

	respond(options: ResponseBuilder | CommandPayload | null, ms: number | null = 5000) {
		const payload = options instanceof ResponseBuilder ? { embeds: [options.build()] } : options

		if (this.message) {
			if (options === null) {
				this.message
					.react("✅")
					.catch(err => logger.warn("Failed to react to message command", err))
			} else {
				if (this.timeout) clearTimeout(this.timeout)

				const promise: Promise<Message> = this.responded
					? this.data.edit(payload!)
					: this.message.channel.send(payload!)

				this.responded = true
				promise.then(async response => {
					this.data = response
					if (ms !== null) {
						this.timeout = setTimeout(() => {
							;(this.data as Message)
								?.delete()
								.catch(err => logger.warn("Failed to delete message", err))
						}, ms)
					}
				})
			}

			new Promise(res => setTimeout(res, 5000))
				.then(() => this.message?.delete())
				.catch(err => logger.warn("Failed to delete message", err))
		}

		if (this.interaction) {
			if (payload === null)
				throw new Error("CommandHelper.respond(null) called on a Slash command")

			const promise = this.responded
				? this.interaction.editReply(payload)
				: this.interaction.followUp(payload)

			this.responded = true
			promise.catch(err => logger.warn("Failed to follow up / edit interaction", err))
		}
	}

	mentionable(name: string) {
		return (this.interaction?.options.getMentionable(name) || this.params[name] || null) as
			| GuildMember
			| User
			| Role
			| null
	}

	channel(name: string) {
		return (this.interaction?.options.getChannel(name) ||
			this.params[name] ||
			null) as GuildChannel | null
	}

	role(name: string) {
		return (this.interaction?.options.getRole(name) || this.params[name] || null) as Role | null
	}

	user(name: string) {
		return (this.interaction?.options.getUser(name) || this.params[name] || null) as User | null
	}

	string(name: string) {
		return (this.interaction?.options.getString(name) || this.params[name] || null) as
			| string
			| null
	}

	integer(name: string) {
		return (this.interaction?.options.getInteger(name) || this.params[name] || null) as
			| number
			| null
	}

	boolean(name: string) {
		return (this.interaction?.options.getBoolean(name) || this.params[name] || null) as
			| boolean
			| null
	}
}
