import {
	BaseBotCache, BaseEntry, BaseGuildCache, BaseSlash, FilesSetupHelper, HelpBuilder
} from "../.."

const file = <
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
>(
	fsh: FilesSetupHelper<E, GC, BC>
): BaseSlash<E, GC> => ({
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
				fsh.options.help.message(helper.cache),
				fsh.options.help.icon,
				fsh.options.directory,
				helper.cache.getAliases()
			).buildMinimum()
		)
	}
})

export default file
