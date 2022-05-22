import {
	BaseBotCache, BaseCommand, BaseEntry, BaseGuildCache, CommandHelper, FilesSetupHelper,
	HelpBuilder
} from "../../.."

export default class<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseCommand<E, GC> {
	override defer = true
	override ephemeral = true
	override data = {
		description: "Shows you this help message"
	}

	override middleware = []

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override condition(helper: CommandHelper<E, GC>) {
		return helper.isMessageCommand(false)
	}

	override converter(helper: CommandHelper<E, GC>) {}

	override async execute(helper: CommandHelper<E, GC>) {
		helper.respond(new HelpBuilder(this.fsh, helper.cache).buildMinimum(), null)
	}
}
