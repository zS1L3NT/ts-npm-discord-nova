import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	BotSetupHelper,
	HelpBuilder,
	iMessageFile
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	bsh: BotSetupHelper<E, GC, BC>
): iMessageFile<E, GC> => ({
	condition: helper => !!helper.match(bsh.options.help.commandRegex!),
	execute: async helper => {
		helper.respond(
			new HelpBuilder(
				bsh.options.help.message(helper.cache),
				bsh.options.help.icon,
				bsh.options.directory,
				helper.cache.getAliases()
			).buildMinimum()
		)
	}
})

export default file
