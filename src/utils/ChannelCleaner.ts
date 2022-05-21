import { Collection, Message, TextChannel } from "discord.js"

import { BaseEntry, BaseGuildCache } from "../"

/**
 * A class that assists in the cleaning of a Discord TextChannel.
 */
export default class ChannelCleaner<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private excluded: (message: Message) => boolean
	private channel?: TextChannel
	private readonly messages = new Collection<string, Message>()

	constructor(
		/**
		 * The GuildCache of the channel's Guild
		 */
		private readonly cache: GC,
		/**
		 * The id of the Channel to clean
		 */
		private readonly channelId: string,
		/**
		 * The only messages that should be in the Channel
		 */
		private readonly messageIds: string[]
	) {
		this.excluded = () => false
	}

	/**
	 * Set a filter to remove messages that meet a condition.
	 * TRUE if excluding message from deletion
	 *
	 * @param excluded Filter
	 */
	setExcluded(excluded: (message: Message) => boolean) {
		this.excluded = excluded
		return this
	}

	/**
	 * Begins the cleaning of the channel
	 */
	async clean() {
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
					this.messageIds.splice(
						this.messageIds.findIndex(m => m === messageId),
						1
					)
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

	/**
	 * Gets the TextChannel that was cleaned
	 *
	 * @throws Error if the {@link clean}	method has not been called and awaited yet
	 * @returns The Channel that was cleaned
	 */
	getChannel() {
		if (!this.channel) {
			throw new Error("Channel cleaning not done yet!")
		}
		return this.channel
	}

	/**
	 * Gets the messageIds before or after the cleaning
	 *
	 * @returns The messageIds before or after the cleaning
	 */
	getMessageIds() {
		return this.messageIds
	}

	/**
	 * Gets the collection of messages before or after the cleaning
	 *
	 * @returns The collection of messages before or after the cleaning
	 */
	getMessages() {
		return this.messages
	}
}
