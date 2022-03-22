import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	BotSetupHelper,
	HelpBuilder,
	iSlashFile
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	bsh: BotSetupHelper<E, GC, BC>
): iSlashFile<E, GC> => ({
	defer: false,
	ephemeral: false,
	data: {
		name: "help",
		description: {
			slash: "Displays the help command",
			help: "Shows you the help menu that you are looking at right now"
		}
	},
	execute: async helper => {
		helper.interaction.channel?.send(
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
