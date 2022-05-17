import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseMessage, FilesSetupHelper, HelpBuilder,
	MessageHelper
} from "../.."

export default class MessageHelp<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseMessage<E, GC> {
	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override condition(helper: MessageHelper<E, GC>) {
		return !!helper.match(this.fsh.options.help.commandRegex!)
	}

	override async execute(helper: MessageHelper<E, GC>) {
		helper.respond(
			new HelpBuilder(
				this.fsh.options.help.message(helper.cache),
				this.fsh.options.help.icon,
				this.fsh.options.directory,
				helper.cache.getAliases()
			).buildMinimum()
		)
	}
}
