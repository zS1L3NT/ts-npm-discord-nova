import { BaseEntry, BaseGuildCache } from "."
import { Collection, Message, TextChannel } from "discord.js"

type iFilter = (message: Message) => boolean
export default class ChannelCleaner<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private readonly channelId: string
	private readonly cache: GC
	private messageIds: string[]
	private excluded: iFilter

	private channel?: TextChannel
	private messages: Collection<string, Message>

	public constructor(cache: GC, channelId: string, messageIds: string[]) {
		this.excluded = () => false
		this.cache = cache
		this.channelId = channelId
		this.messageIds = messageIds

		this.messages = new Collection<string, Message>()
	}

	/**
	 * Set a filter to remove messages that meet a condition.
	 * TRUE if excluding message from deletion
	 *
	 * @param excluded Filter
	 */
	public setExcluded(excluded: iFilter) {
		this.excluded = excluded
		return this
	}

	public async clean() {
		const channel = this.cache.guild.channels.cache.get(this.channelId)
		if (channel instanceof TextChannel) {
			const messages = await channel.messages.fetch({ limit: 100 })
			// Clear all unrelated messages first
			for (const message of messages.values()) {
				if (!this.excluded(message) && !this.messageIds.includes(message.id)) {
					logger.warn(
						`Message(${message.content}) shouldn't be in Channel(${channel.name})`
					)
					message.delete().catch(err => logger.warn("Failed to delete message", err))
				} else {
					this.messages.set(message.id, message)
				}
			}

			// Remove missing ids from channel
			let removeCount = 0
			for (const messageId of this.messageIds) {
				if (!channel.messages.cache.get(messageId)) {
					logger.warn(`Channel(${channel.id}) has no Message(${messageId})`)
					this.messageIds = this.messageIds.filter(m => m !== messageId)
					removeCount++
				}
			}

			// Add back fresh messages to the channel
			for (let i = 0; i < removeCount; i++) {
				const message = await channel.send("\u200B")
				this.messageIds.push(message.id)
				this.messages.set(message.id, message)
			}

			this.channel = channel
		} else {
			throw new Error("no-channel")
		}
	}

	public getChannel() {
		if (!this.channel) {
			throw new Error("Channel cleaning not done yet!")
		}
		return this.channel
	}

	public getMessageIds() {
		return this.messageIds
	}

	public getMessages(): Collection<string, Message> {
		return this.messages
	}
}
