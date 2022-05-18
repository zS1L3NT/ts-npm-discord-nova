import {
	BaseBotCache, BaseCommand, BaseEntry, BaseGuildCache, CommandHelper, CommandType,
	FilesSetupHelper, HelpBuilder
} from "../../.."

export default class CommandHelp<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseCommand<E, GC> {
	defer = false
	ephemeral = false
	data = {
		name: "help",
		description: "Shows you this help message"
	} as const

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()

		const commandRegex = this.fsh.options.help.commandRegex
		if (!commandRegex) {
			this.only = CommandType.Slash
		}
	}

	override condition(helper: CommandHelper<E, GC>): boolean {
		return !!helper.match(this.fsh.options.help.commandRegex!)
	}

	override converter(helper: CommandHelper<E, GC>) {}

	override async execute(helper: CommandHelper<E, GC>) {
		const helpMenu = new HelpBuilder(this.fsh, helper.cache).buildMinimum()

		if (helper.type === CommandType.Slash) {
			helper.interaction!.channel?.send(helpMenu)
		} else {
			helper.respond(helpMenu)
		}
	}
}
