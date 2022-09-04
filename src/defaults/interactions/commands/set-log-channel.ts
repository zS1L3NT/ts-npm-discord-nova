import { Colors, TextChannel } from "discord.js"

import { PrismaClient } from "@prisma/client"

import {
	BaseCommand, BaseEntry, BaseGuildCache, CommandHelper, CommandType, IsAdminMiddleware,
	ResponseBuilder
} from "../../.."

export default class<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>
> extends BaseCommand<P, E, GC> {
	override defer = true
	override ephemeral = true
	override data = {
		description: "Set the channel where the bot sends event logs to",
		options: [
			{
				name: "channel",
				description: [
					"The channel which you would want to set as the log channel",
					"Leave this empty to unset the log channel"
				].join("\n"),
				type: "channel" as const,
				requirements: "Text channel that isn't already the log channel",
				required: false
			}
		]
	}

	override only = CommandType.Slash
	override middleware = [new IsAdminMiddleware()]

	override condition(helper: CommandHelper<P, E, GC>) {}

	override converter(helper: CommandHelper<P, E, GC>) {}

	override async execute(helper: CommandHelper<P, E, GC>) {
		const channel = helper.channel("channel")
		const oldChannelId = helper.cache.entry.log_channel_id

		if (channel instanceof TextChannel) {
			if (channel.id === helper.cache.entry.log_channel_id) {
				helper.respond(ResponseBuilder.bad("This channel is already the Log channel!"))
			} else {
				//@ts-ignore
				await helper.cache.update({ log_channel_id: channel.id })
				helper.respond(
					ResponseBuilder.good(`Log channel reassigned to \`#${channel.name}\``)
				)
				helper.cache.logger.log({
					member: helper.member,
					title: `Log channel changed`,
					description: [
						`<@${helper.member.id}> changed the log channel`,
						oldChannelId ? `**Old Log Channel**: <#${oldChannelId}>` : null,
						`**New Log Channel**: <#${channel.id}>`
					].join("\n"),
					command: "set-log-channel",
					color: Colors.Blue
				})
			}
		} else if (channel === null) {
			//@ts-ignore
			await helper.cache.update({ log_channel_id: null })
			helper.respond(ResponseBuilder.good(`Log channel unassigned`))
			helper.cache.logger.log({
				member: helper.member,
				title: `Log channel unassigned`,
				description: `<@${helper.member.id}> unassigned the log channel\b**Old Log Channel**: <#${oldChannelId}>`,
				command: "set-log-channel",
				color: Colors.Blue
			})
		} else {
			helper.respond(ResponseBuilder.bad(`Please select a text channel`))
		}
	}
}
