import { Message, MessageEditOptions, MessageOptions } from "discord.js"

import { BaseEntry, BaseGuildCache, ResponseBuilder } from ".."

export default abstract class BaseMessage<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	abstract condition(helper: MessageHelper<E, GC>): boolean
	abstract execute(helper: MessageHelper<E, GC>): Promise<void>
}

export class MessageHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private response: Message | undefined
	private timeout: NodeJS.Timeout | undefined

	public constructor(public readonly cache: GC, public readonly message: Message) {}

	public match(regexp: string) {
		const regex = this.message.content.match(new RegExp(regexp))
		return regex ? regex.slice(1) : null
	}

	public isMessageCommand(prefix: string, command: string, type: "only" | "more") {
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
		return this.match(`^\\S* *(.*)`)?.[0]
			?.replaceAll("  ", " ")
			?.split(" ")
			?.filter(i => i !== "")
	}

	public getNumber<T, U>(string: string | undefined, notDefined: T, nan: U) {
		return string === undefined ? notDefined : isNaN(+string) ? nan : +string
	}

	public clearAfter(ms: number) {
		setTimeout(() => {
			this.message.delete().catch(err => logger.warn("Failed to delete message", err))
		}, ms)
	}

	public reactSuccess() {
		this.message
			.react("✅")
			.catch(err => logger.warn("Failed to react (✅) to message command", err))
	}

	public reactFailure() {
		this.message
			.react("❌")
			.catch(err => logger.warn("Failed to react (❌) to message command", err))
	}

	public respond(options: ResponseBuilder | MessageOptions, ms?: number) {
		let message: Promise<Message>

		if (options instanceof ResponseBuilder) {
			if (options.emoji.includes("good.png")) {
				this.message
					.react("✅")
					.catch(err => logger.warn("Failed to react (✅) to message command", err))
			} else {
				this.message
					.react("❌")
					.catch(err => logger.warn("Failed to react (❌) to message command", err))
			}

			message = this.message.channel.send({
				embeds: [options.build()]
			})
		} else {
			message = this.message.channel.send(options)
		}

		message.then(async response => {
			this.response = response
			if (ms) {
				this.timeout = setTimeout(() => {
					this.response
						?.delete()
						.catch(err => logger.warn("Failed to delete message", err))
				}, ms)
			}
		})

		new Promise(res => setTimeout(res, 5000))
			.then(() => this.message.delete())
			.catch(err => logger.warn("Failed to delete message", err))
	}

	public update(options: ResponseBuilder | MessageEditOptions, ms?: number) {
		if (this.timeout) {
			clearTimeout(this.timeout)
		}

		if (!this.response) {
			throw new Error("Cannot update message that hasn't been responded to")
		}

		let message: Promise<Message>

		if (options instanceof ResponseBuilder) {
			message = this.response.edit({
				embeds: [options.build()]
			})
		} else {
			message = this.response.edit(options)
		}

		message.then(async response => {
			this.response = response
			if (ms) {
				this.timeout = setTimeout(() => {
					this.response
						?.delete()
						.catch(err => logger.warn("Failed to delete message", err))
				}, ms)
			}
		})
	}
}
