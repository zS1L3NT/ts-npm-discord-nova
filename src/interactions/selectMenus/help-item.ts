import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	BotSetupHelper,
	HelpBuilder,
	iSelectMenuFile
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	bsh: BotSetupHelper<E, GC, BC>
): iSelectMenuFile<E, GC> => ({
	defer: false,
	ephemeral: true,
	execute: async helper => {
		helper.interaction.update(
			new HelpBuilder(
				bsh.options.help.message(helper.cache),
				bsh.options.help.icon,
				bsh.options.directory,
				helper.cache.getAliases()
			).buildCommand(helper.value()!)
		)
	}
})

export default file
