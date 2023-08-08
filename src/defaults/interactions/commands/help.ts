import { PrismaClient } from "@prisma/client"

import {
	BaseBotCache,
	BaseCommand,
	BaseEntry,
	BaseGuildCache,
	CommandHelper,
	FilesSetupHelper,
	HelpBuilder,
} from "../../.."

export default class<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>,
> extends BaseCommand<P, E, GC> {
	override defer = true
	override ephemeral = true
	override data = {
		description: "Shows you this help message",
	}

	override middleware = []

	constructor(public fsh: FilesSetupHelper<P, E, GC, BC>) {
		super()
	}

	override condition(helper: CommandHelper<P, E, GC>) {
		return helper.isMessageCommand(false)
	}

	override converter() {}

	override async execute(helper: CommandHelper<P, E, GC>) {
		helper.respond(new HelpBuilder(this.fsh, helper.cache).buildMinimum(), null)
	}
}
