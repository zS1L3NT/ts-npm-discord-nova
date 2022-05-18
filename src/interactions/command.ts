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
	private response: any
	private timeout: NodeJS.Timeout | undefined
	public data: Record<
		string,
		GuildChannel | GuildMember | User | Role | string | number | boolean | null
	> = {}

	public constructor(
		public readonly type: CommandType,
		public readonly cache: GC,
		public readonly interaction?: CommandInteraction,
		public readonly message?: Message
	) {}

	public match(regexp: string) {
		if (!this.message) throw new Error("CommandHelper.match() called on Slash command")

		const regex = this.message.content.match(new RegExp(regexp))
		return regex ? regex.slice(1) : null
	}

	public isMessageCommand(prefix: string, command: string, type: "only" | "more") {
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

	public input() {
		if (!this.message) throw new Error("CommandHelper.input() called on Slash command")

		return this.match(`^\\S* *(.*)`)?.[0]
			?.replaceAll("  ", " ")
			?.split(" ")
			?.filter(i => i !== "")
	}

	public respond(options: ResponseBuilder | CommandPayload | null, ms?: number) {
		if (this.message) {
			if (options == null) {
				this.message
					.react("✅")
					.catch(err => logger.warn("Failed to react to message command", err))
			} else {
				;(options instanceof ResponseBuilder
					? this.message.channel.send({ embeds: [options.build()] })
					: this.message.channel.send(options)
				).then(async response => {
					this.response = response
					if (ms) {
						this.timeout = setTimeout(() => {
							;(this.response as Message)
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
			if (options === null)
				throw new Error("CommandHelper.respond(null) called on a Slash command")

			if (this.response) {
				if (options instanceof ResponseBuilder) {
					this.interaction
						.editReply({ embeds: [options.build()] })
						.catch(err => logger.warn("Failed to edit command interaction", err))
				} else {
					this.interaction
						.editReply(options)
						.catch(err => logger.warn("Failed to edit command interaction", err))
				}
			} else {
				if (options instanceof ResponseBuilder) {
					this.interaction
						.followUp({ embeds: [options.build()] })
						.catch(err => logger.warn("Failed to follow up command interaction", err))
				} else {
					this.interaction
						.followUp(options)
						.catch(err => logger.warn("Failed to follow up command interaction", err))
				}
				this.response = true
			}
		}
	}

	public update(options: ResponseBuilder | CommandPayload, ms?: number) {
		if (this.interaction) throw new Error("CommandHelper.update() called on a Slash command")

		if (this.timeout) {
			clearTimeout(this.timeout)
		}

		if (!(this.response instanceof Message)) {
			throw new Error("Cannot update message that hasn't been responded to")
		}

		;(options instanceof ResponseBuilder
			? this.response.edit({ embeds: [options.build()] })
			: this.response.edit(options)
		).then(async response => {
			this.response = response
			if (ms) {
				this.timeout = setTimeout(() => {
					;(this.response as Message)
						?.delete()
						.catch(err => logger.warn("Failed to delete message", err))
				}, ms)
			}
		})
	}

	public mentionable(name: string) {
		return (this.interaction?.options.getMentionable(name) || this.data[name] || null) as
			| GuildMember
			| User
			| Role
			| null
	}

	public channel(name: string) {
		return (this.interaction?.options.getChannel(name) ||
			this.data[name] ||
			null) as GuildChannel | null
	}

	public role(name: string) {
		return (this.interaction?.options.getRole(name) || this.data[name] || null) as Role | null
	}

	public user(name: string) {
		return (this.interaction?.options.getUser(name) || this.data[name] || null) as User | null
	}

	public string(name: string) {
		return (this.interaction?.options.getString(name) || this.data[name] || null) as
			| string
			| null
	}

	public integer(name: string) {
		return (this.interaction?.options.getInteger(name) || this.data[name] || null) as
			| number
			| null
	}

	public boolean(name: string) {
		return (this.interaction?.options.getBoolean(name) || this.data[name] || null) as
			| boolean
			| null
	}
}
