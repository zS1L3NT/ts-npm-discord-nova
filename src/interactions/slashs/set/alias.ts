import { FieldValue } from "firebase-admin/firestore"

import {
	BaseEntry, BaseGuildCache, BaseSlashSub, iSlashStringOption, ResponseBuilder, SlashHelper
} from "../../.."

export default class SlashsSubSetAlias<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>
> extends BaseSlashSub<E, GC> {
	defer = true
	ephemeral = true
	data = {
		name: "alias",
		description: "Sets an alias for a specific message command",
		options: [
			{
				name: "command",
				description: "The command you want to set the alias for",
				type: "string" as const,
				choices: [],
				requirements: "Valid message command",
				required: true
			},
			{
				name: "alias",
				description: [
					"The alias you want to set",
					"Leave empty to unset the alias for this command"
				].join("\n"),
				type: "string" as const,
				requirements: "Alphabetic text",
				required: false
			}
		]
	}

	constructor(public commands: string[]) {
		super()
		;(this.data.options[0]! as iSlashStringOption).choices = commands
			.map(f => f.split(".")[0]!)
			.map(c => ({ name: c, value: c }))
	}

	override async execute(helper: SlashHelper<E, GC>) {
		const command = helper.string("command")!
		const alias = helper.string("alias")

		const aliases = helper.cache.getAliases()
		if (alias) {
			if (!alias.match(/^[a-zA-Z]+$/)) {
				return helper.respond(ResponseBuilder.bad("Alias must be alphabetical!"))
			}

			if (this.commands.includes(alias) || Object.values(aliases).includes(alias)) {
				return helper.respond(ResponseBuilder.bad("Alias is already in use!"))
			}

			await helper.cache.ref.update({ aliases: { [command]: alias } })
			return helper.respond(
				ResponseBuilder.good(`Set Alias for \`${command}\` to \`${alias}\``)
			)
		} else {
			if (!aliases[command]) {
				return helper.respond(ResponseBuilder.bad("There is no Alias for this command!"))
			}

			await helper.cache.ref.update({
				aliases: { [command]: FieldValue.delete() }
			})
			return helper.respond(ResponseBuilder.good(`Removed Alias for \`${command}\``))
		}
	}
}
