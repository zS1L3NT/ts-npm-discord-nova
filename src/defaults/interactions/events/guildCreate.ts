import { Guild } from "discord.js"

import { PrismaClient } from "@prisma/client"

import {
	BaseBotCache,
	BaseEntry,
	BaseEvent,
	BaseGuildCache,
	FilesSetupHelper,
	SlashCommandDeployer,
} from "../../.."

export default class<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>,
> extends BaseEvent<P, E, GC, BC, "guildCreate"> {
	override name = "guildCreate" as const

	override middleware = []

	constructor(public fsh: FilesSetupHelper<P, E, GC, BC>) {
		super()
	}

	override async execute(botCache: BC, guild: Guild) {
		logger.info(`Added to Guild(${guild.name})`)
		await botCache.registerGuildCache(guild.id)
		await new SlashCommandDeployer(guild.id, this.fsh.commandFiles).deploy()
	}
}
