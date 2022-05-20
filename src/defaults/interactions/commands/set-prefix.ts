import {
	BaseCommand, BaseEntry, BaseGuildCache, CommandHelper, CommandType, IsAdminMiddleware,
	ResponseBuilder
} from "../../.."

export default class CommandSetAlias<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> extends BaseCommand<E, GC> {
	override defer = true
	override ephemeral = true
	override data = {
		name: "prefix",
		description: "Changes the prefix for message commands in this server",
		options: [
			{
				name: "prefix",
				description: "The message prefix to trigger message commands",
				type: "string" as const,
				requirements: "Text",
				required: true
			}
		]
	}

	override only = CommandType.Slash
	override middleware = [new IsAdminMiddleware()]

	override condition(helper: CommandHelper<E, GC>) {}

	override converter(helper: CommandHelper<E, GC>) {}

	override async execute(helper: CommandHelper<E, GC>) {
		const prefix = helper.string("prefix")!

		await helper.cache.ref.update({ prefix })
		helper.respond(ResponseBuilder.good(`Prefix changed to \`${prefix}\``))
	}
}
