import { BaseDocument, BaseGuildCache, iBaseValue, ResponseBuilder } from ".."
import { InteractionReplyOptions, Message, MessagePayload } from "discord.js"

const time = (ms: number) => new Promise(res => setTimeout(res, ms))

export default class MessageHelper<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D>
> {
	public readonly cache: GC
	public readonly message: Message

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

	public getNumber<T, U>(string: string | undefined, not_defined: T, nan: U) {
		return string === undefined ? not_defined : isNaN(+string) ? nan : +string
	}

	public clearAfter(ms: number) {
		setTimeout(() => {
			this.message.delete().catch(() => {})
		}, ms)
	}

	public reactSuccess() {
		this.message.react("✅").catch(() => {})
	}

	public reactFailure() {
		this.message.react("❌").catch(() => {})
	}

	public respond(
		options: MessagePayload | InteractionReplyOptions | ResponseBuilder,
		ms?: number
	) {
		let message: Promise<Message>

		if (options instanceof ResponseBuilder) {
			message = this.message.channel.send({
				embeds: [options.build()]
			})
		} else {
			message = this.message.channel.send(options as MessagePayload | InteractionReplyOptions)
		}

		message
			.then(async temporary => {
				if (ms) {
					await time(ms)
					await temporary.delete().catch(() => {})
				}
			})
			.catch(() => {})
	}
}
