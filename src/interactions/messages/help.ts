import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	FilesSetupHelper,
	HelpBuilder,
	iMessageFile
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	fsh: FilesSetupHelper<E, GC, BC>
): iMessageFile<E, GC> => ({
	condition: helper => !!helper.match(fsh.options.help.commandRegex!),
	execute: async helper => {
		helper.respond(
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
