import { ColorResolvable, MessageEmbed, TextChannel } from "discord.js"

import { BaseEntry, BaseGuildCache } from "../"

type LogData = {
	avatar: string
	username: string
	title: string
	description: string
	color?: ColorResolvable
	date: Date
}

export default class LogManager<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	constructor(private readonly cache: BaseGuildCache<E, GC>) {}

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
					author: {
						name: data.username,
						url: data.avatar
					},
					title: data.title,
					description: data.title,
					color: data.color,
					footer: {
						text: data.date.toISOString()
					}
				})
			]
		})
	}
}
