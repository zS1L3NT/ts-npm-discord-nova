import { ColorResolvable, GuildMember, MessageEmbed, TextChannel } from "discord.js"

import { BaseEntry, BaseGuildCache } from "../"

type LogData = {
	member?: GuildMember
	title: string
	description: string | string[]
	command?: string
	color?: ColorResolvable
	embeds?: MessageEmbed[]
}

export default class LogManager<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	constructor(private readonly cache: BaseGuildCache<E, GC>) {}

	/**
	 * Log the data to the log channel if the `log_channel_id` is set.
	 *
	 * @param data Payload to log to the log channel if it is set
	 */
	async log(data: LogData) {
		const logChannelId = this.cache.entry.log_channel_id
		if (!logChannelId) return

		const logChannel = this.cache.guild.channels.cache.get(logChannelId)
		if (!(logChannel instanceof TextChannel)) {
			console.error(`Guild(${this.cache.guild.name}) has no TextChannel(${logChannelId})`)
			await this.cache.ref.update({ log_channel_id: "" })
			return
		}

		logChannel.send({
			embeds: [
				new MessageEmbed({
					author: data.member
						? {
								name: data.member.user.tag,
								iconURL: data.member.user.displayAvatarURL()
						  }
						: undefined,
					title: data.title,
					description: Array.isArray(data.description)
						? data.description.filter(s => s !== null).join("\n")
						: data.description,
					color: data.color,
					timestamp: new Date(),
					footer: data.command
						? {
								text: `Command: ${data.command}`
						  }
						: undefined
				}),
				...(data.embeds || [])
			]
		})
	}
}
