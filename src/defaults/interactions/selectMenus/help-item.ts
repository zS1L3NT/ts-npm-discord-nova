import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseSelectMenu, FilesSetupHelper, HelpBuilder,
	SelectMenuHelper
} from "../../.."

export default class SelectMenuHelpItem<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseSelectMenu<E, GC> {
	override defer = false
	override ephemeral = true

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override async execute(helper: SelectMenuHelper<E, GC>) {
		helper.interaction.update(
			new HelpBuilder(this.fsh, helper.cache).buildCommand(helper.value()!)
		)
	}
}
