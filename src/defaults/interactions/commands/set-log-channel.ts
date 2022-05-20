import { TextChannel } from "discord.js"

import {
	BaseCommand, BaseEntry, BaseGuildCache, CommandHelper, CommandType, IsAdminMiddleware,
	ResponseBuilder
} from "../../.."

export default class CommandSetLogChannel<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> extends BaseCommand<E, GC> {
	override defer = true
	override ephemeral = true
	override data = {
		name: "set-log-channel",
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

	override condition(helper: CommandHelper<E, GC>) {}

	override converter(helper: CommandHelper<E, GC>) {}

	override async execute(helper: CommandHelper<E, GC>) {
		const channel = helper.channel("channel")
		if (channel instanceof TextChannel) {
			if (channel.id === helper.cache.entry.log_channel_id) {
				helper.respond(ResponseBuilder.bad("This channel is already the Log channel!"))
			} else {
				await helper.cache.ref.update({ log_channel_id: channel.id })
				helper.respond(
					ResponseBuilder.good(`Log channel reassigned to \`#${channel.name}\``)
				)
			}
		} else if (channel === null) {
			await helper.cache.ref.update({ log_channel_id: "" })
			helper.respond(ResponseBuilder.good(`Log channel unassigned`))
		} else {
			helper.respond(ResponseBuilder.bad(`Please select a text channel`))
		}
	}
}
