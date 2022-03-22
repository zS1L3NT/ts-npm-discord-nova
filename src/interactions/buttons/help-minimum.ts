import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	FilesSetupHelper,
	HelpBuilder,
	iButtonFile
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	fsh: FilesSetupHelper<E, GC, BC>
): iButtonFile<E, GC> => ({
	defer: false,
	ephemeral: true,
	execute: async helper => {
		await helper.interaction.update(
			new HelpBuilder(
				fsh.options.help.message(helper.cache),
				fsh.options.help.icon,
				fsh.options.directory,
				helper.cache.getAliases()
			).buildMinimum()
		)
	}
})

export default file
