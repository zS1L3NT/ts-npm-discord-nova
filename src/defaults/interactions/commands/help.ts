import {
	BaseBotCache, BaseCommand, BaseEntry, BaseGuildCache, CommandHelper, FilesSetupHelper,
	HelpBuilder
} from "../../.."
import { CommandType } from "../../../interactions/command"

export default class CommandHelp<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseCommand<any, E, GC> {
	defer = false
	ephemeral = false
	data = {
		name: "help",
		description: "Shows you this help message"
	} as const

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override condition(helper: CommandHelper<any, E, GC>): boolean {
		return !!helper.match(this.fsh.options.help.commandRegex!)
	}

	override converter(helper: CommandHelper<any, E, GC>) {}

	override async execute(helper: CommandHelper<any, E, GC>) {
		const helpMenu = new HelpBuilder(this.fsh, helper.cache).buildMinimum()

		if (helper.type === CommandType.Slash) {
			helper.interaction!.channel?.send(helpMenu)
		} else {
			helper.respond(helpMenu)
		}
	}
}
