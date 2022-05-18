import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseSlash, FilesSetupHelper, HelpBuilder, SlashHelper
} from "../../.."

export default class SlashsHelp<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseSlash<E, GC> {
	defer = false
	ephemeral = false
	data = {
		name: "help",
		description: "Shows you this help message"
	} as const

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override async execute(helper: SlashHelper<E, GC>) {
		helper.interaction.channel?.send(
			new HelpBuilder(
				this.fsh.options.help.message(helper.cache),
				this.fsh.options.help.icon,
				this.fsh.options.directory,
				helper.cache.getAliases()
			).buildMinimum()
		)
	}
}
