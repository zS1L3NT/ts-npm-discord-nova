import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	BotSetupHelper,
	iEventFile,
	SlashCommandDeployer
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	bsh: BotSetupHelper<E, GC, BC>
): iEventFile<E, GC, BC, "guildCreate"> => ({
	name: "guildCreate",
	execute: async (botCache, guild) => {
		logger.info(`Added to Guild(${guild.name})`)
		await botCache.registerGuildCache(guild.id)
		await new SlashCommandDeployer(guild.id, bsh.options.config, bsh.slashFiles).deploy()
	}
})

export default file
