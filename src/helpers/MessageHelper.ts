import { BaseEntry, BaseGuildCache, Emoji, ResponseBuilder } from ".."
import { InteractionReplyOptions, Message, MessagePayload } from "discord.js"

const time = (ms: number) => new Promise(res => setTimeout(res, ms))

export default class MessageHelper<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	public readonly cache: GC
	public readonly message: Message
	private response: Message | undefined
	private timeout: NodeJS.Timeout | undefined

	public constructor(cache: GC, message: Message) {
		this.cache = cache
		this.message = message
	}

	public match(regexp: string) {
		const regex = this.message.content.match(new RegExp(regexp))
		return regex ? regex.slice(1) : null
	}

	public matchOnly(command: string) {
		return !!this.match(`^${command}(?:(?= *$)(?!\\w+))`)
	}

	public matchMore(command: string) {
		return !!this.match(`^${command}(?:(?= *)(?!\\w+))`)
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

	public respond(
		options: MessagePayload | InteractionReplyOptions | ResponseBuilder,
		ms?: number
	) {
		let message: Promise<Message>

		if (options instanceof ResponseBuilder) {
			if (options.emoji === Emoji.GOOD) {
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
			message = this.message.channel.send(options as MessagePayload | InteractionReplyOptions)
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

		time(5000)
			.then(() => this.message.delete())
			.catch(err => logger.warn("Failed to delete message", err))
	}

	public update(
		options: MessagePayload | InteractionReplyOptions | ResponseBuilder,
		ms?: number
	) {
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
			message = this.response.edit(options as MessagePayload | InteractionReplyOptions)
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
