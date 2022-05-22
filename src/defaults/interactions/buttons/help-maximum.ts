import {
	BaseBotCache, BaseButton, BaseEntry, BaseGuildCache, ButtonHelper, FilesSetupHelper, HelpBuilder
} from "../../.."

export default class<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseButton<E, GC> {
	override defer = false
	override ephemeral = true

	override middleware = []

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override async execute(helper: ButtonHelper<E, GC>) {
		helper.update(new HelpBuilder(this.fsh, helper.cache).buildMaximum())
	}
}
