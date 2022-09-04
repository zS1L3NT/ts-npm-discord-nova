import { PrismaClient } from "@prisma/client"

import {
	BaseBotCache, BaseButton, BaseEntry, BaseGuildCache, ButtonHelper, FilesSetupHelper, HelpBuilder
} from "../../.."

export default class<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>
> extends BaseButton<P, E, GC> {
	override defer = false
	override ephemeral = false

	override middleware = []

	constructor(public fsh: FilesSetupHelper<P, E, GC, BC>) {
		super()
	}

	override async execute(helper: ButtonHelper<P, E, GC>) {
		helper.update(new HelpBuilder(this.fsh, helper.cache).buildMinimum())
	}
}
