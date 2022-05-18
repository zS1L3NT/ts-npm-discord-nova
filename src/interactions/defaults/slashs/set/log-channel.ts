import { GuildMember, TextChannel } from "discord.js"

import { BaseEntry, BaseGuildCache, BaseSlashSub, ResponseBuilder, SlashHelper } from "../../../.."

export default class SlashsSubLogChannel<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> extends BaseSlashSub<E, GC> {
	defer = true
	ephemeral = true
	data = {
		name: "log-channel",
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

	override async execute(helper: SlashHelper<E, GC>) {
		const member = helper.interaction.member as GuildMember
		if (!member.permissions.has("ADMINISTRATOR") && member.id !== process.env.DISCORD__DEV_ID) {
			return helper.respond(ResponseBuilder.bad("Only administrators can set bot channels"))
		}

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
