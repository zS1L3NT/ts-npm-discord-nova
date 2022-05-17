import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseSelectMenu, FilesSetupHelper, HelpBuilder
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	fsh: FilesSetupHelper<E, GC, BC>
): BaseSelectMenu<E, GC> => ({
	defer: false,
	ephemeral: true,
	execute: async helper => {
		helper.interaction.update(
			new HelpBuilder(
				fsh.options.help.message(helper.cache),
				fsh.options.help.icon,
				fsh.options.directory,
				helper.cache.getAliases()
			).buildCommand(helper.value()!)
		)
	}
})

export default file
