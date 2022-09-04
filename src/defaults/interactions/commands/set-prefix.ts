import { Colors } from "discord.js"

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
		description: "Changes the prefix for message commands in this server",
		options: [
			{
				name: "prefix",
				description: [
					"The message prefix to trigger message commands",
					"Leave this empty to unset the prefix"
				].join("\n"),
				type: "string" as const,
				requirements: "Text",
				required: false
			}
		]
	}

	override only = CommandType.Slash
	override middleware = [new IsAdminMiddleware()]

	override condition(helper: CommandHelper<P, E, GC>) {}

	override converter(helper: CommandHelper<P, E, GC>) {}

	override async execute(helper: CommandHelper<P, E, GC>) {
		const prefix = helper.string("prefix")
		const oldPrefix = helper.cache.prefix

		//@ts-ignore
		await helper.cache.update({ prefix })
		helper.respond(ResponseBuilder.good(`Prefix changed to \`${prefix}\``))
		helper.cache.logger.log({
			member: helper.member,
			title: `Message command prefix changed`,
			description: [
				`<@${helper.member.id}> changed the server's message command prefix`,
				oldPrefix ? `**Old Prefix**: ${oldPrefix}` : null,
				`**New Prefix**: ${prefix}`
			].join("\n"),
			command: "set-prefix",
			color: Colors.Blue
		})
	}
}
