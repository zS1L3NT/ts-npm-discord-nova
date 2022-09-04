import { PrismaClient } from "@prisma/client"

import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseSelectMenu, FilesSetupHelper, HelpBuilder,
	SelectMenuHelper
} from "../../.."

export default class<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>
> extends BaseSelectMenu<P, E, GC> {
	override defer = false
	override ephemeral = false

	override middleware = []

	constructor(public fsh: FilesSetupHelper<P, E, GC, BC>) {
		super()
	}

	override async execute(helper: SelectMenuHelper<P, E, GC>) {
		helper.update(new HelpBuilder(this.fsh, helper.cache).buildCommand(helper.value!))
	}
}
