import { Guild } from "discord.js"

import {
	BaseBotCache, BaseEntry, BaseEvent, BaseGuildCache, FilesSetupHelper, SlashCommandDeployer
} from "../../.."

export default class EventGuildCreate<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> extends BaseEvent<E, GC, BC, "guildCreate"> {
	override name = "guildCreate" as const

	constructor(public fsh: FilesSetupHelper<E, GC, BC>) {
		super()
	}

	override async execute(botCache: BC, guild: Guild) {
		logger.info(`Added to Guild(${guild.name})`)
		await botCache.registerGuildCache(guild.id)
		await new SlashCommandDeployer(guild.id, this.fsh.commandFiles).deploy()
	}
}
