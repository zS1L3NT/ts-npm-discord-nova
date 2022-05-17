import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseSelectMenu, FilesSetupHelper, HelpBuilder,
	SelectMenuHelper
} from "../.."

export default class SelectMenuHelpItem<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseSelectMenu<E, GC> {
	defer = false
	ephemeral = true

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override async execute(helper: SelectMenuHelper<E, GC>) {
		helper.interaction.update(
			new HelpBuilder(
				this.fsh.options.help.message(helper.cache),
				this.fsh.options.help.icon,
				this.fsh.options.directory,
				helper.cache.getAliases()
			).buildCommand(helper.value()!)
		)
	}
}
