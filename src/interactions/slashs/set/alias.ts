import admin from "firebase-admin"
import SlashHelper from "../../../helpers/SlashHelper"
import { BaseEntry, BaseGuildCache, Emoji, iSlashSubFile, ResponseBuilder } from "../../.."

const file = <E extends BaseEntry, GC extends BaseGuildCache<E, GC>>(commands: string[]): iSlashSubFile<E, GC> => ({
	defer: true,
	ephemeral: true,
	data: {
		name: "alias",
		description: {
			slash: "Sets an alias for a message command",
			help: "Sets an alias for a specific message command in this guild"
		},
		options: [
			{
				name: "command",
				description: {
					slash: "The command you want to set the alias for",
					help: "The command you want to set the alias for"
				},
				type: "string",
				choices: commands.map(f => f.split(".")[0]!).map(c => ({ name: c, value: c })),
				requirements: "Valid message command",
				required: true
			},
			{
				name: "alias",
				description: {
					slash: "Leave empty to unset the alias for this command",
					help: ["The alias you want to set", "Leave empty to unset the alias for this command"].join("\n")
				},
				type: "string",
				requirements: "Alphabetic text",
				required: false
			}
		]
	},
	execute: async (helper: SlashHelper<E, GC>) => {
		const command = helper.string("command")!
		const alias = helper.string("alias")

		const aliases = helper.cache.getAliases()
		if (alias) {
			if (!alias.match(/^[a-zA-Z]+$/)) {
				return helper.respond(
					new ResponseBuilder(Emoji.BAD, "Alias must be alphabetical!")
				)
			}

			if (commands.includes(alias) || Object.values(aliases).includes(alias)) {
				return helper.respond(
					new ResponseBuilder(Emoji.BAD, "Alias is already in use!")
				)
			}

			//@ts-ignore
			await helper.cache.ref.set({ aliases: { [command]: alias } }, { merge: true })
			return helper.respond(
				new ResponseBuilder(Emoji.GOOD, `Set Alias for \`${command}\` to \`${alias}\``)
			)
		} else {
			if (!aliases[command]) {
				return helper.respond(
					new ResponseBuilder(Emoji.BAD, "There is no Alias for this command!")
				)
			}

			//@ts-ignore
			await helper.cache.ref.set({ aliases: { [command]: admin.firestore.FieldValue.delete() } }, { merge: true })
			return helper.respond(
				new ResponseBuilder(Emoji.GOOD, `Removed Alias for \`${command}\``)
			)
		}
	}
})

export default file