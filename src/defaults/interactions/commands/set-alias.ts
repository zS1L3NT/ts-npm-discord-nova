import { FieldValue } from "firebase-admin/firestore"

import {
	BaseCommand, BaseEntry, BaseGuildCache, CommandHelper, CommandType, IsAdminMiddleware,
	iSlashStringOption, ResponseBuilder
} from "../../.."

export default class<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> extends BaseCommand<
	E,
	GC
> {
	override defer = true
	override ephemeral = true
	override data = {
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

	override only = CommandType.Slash
	override middleware = [new IsAdminMiddleware()]

	constructor(public commands: string[]) {
		super()
		;(this.data.options[0]! as iSlashStringOption).choices = commands
			.map(f => f.split(".")[0]!)
			.map(c => ({ name: c, value: c }))
	}

	override condition(helper: CommandHelper<E, GC>) {}

	override converter(helper: CommandHelper<E, GC>) {}

	override async execute(helper: CommandHelper<E, GC>) {
		const command = helper.string("command")!
		const alias = helper.string("alias")

		const aliases = helper.cache.aliases
		if (alias) {
			if (!alias.match(/^[a-zA-Z]+$/)) {
				return helper.respond(ResponseBuilder.bad("Alias must be alphabetical!"))
			}

			if (this.commands.includes(alias) || Object.values(aliases).includes(alias)) {
				return helper.respond(ResponseBuilder.bad("Alias is already in use!"))
			}

			await helper.cache.ref.update({ aliases: { [command]: alias } })
			helper.respond(ResponseBuilder.good(`Set Alias for \`${command}\` to \`${alias}\``))
			helper.cache.logger.log({
				member: helper.member,
				title: `Alias added`,
				description: [
					`<@${helper.member.id}> added an alias for a command`,
					`**Command**: ${command}`,
					`**Alias**: ${alias}`
				].join("\n"),
				command: "set-alias",
				color: "#4987C7"
			})
		} else {
			if (!aliases[command]) {
				return helper.respond(ResponseBuilder.bad("There is no Alias for this command!"))
			}

			const alias = aliases[command]
			await helper.cache.ref.update({
				aliases: { [command]: FieldValue.delete() }
			})
			helper.respond(ResponseBuilder.good(`Removed Alias for \`${command}\``))
			helper.cache.logger.log({
				member: helper.member,
				title: `Alias removed`,
				description: [
					`<@${helper.member.id}> removed an alias for a command`,
					`**Command**: ${command}`,
					`**Alias**: ${alias}`
				].join("\n"),
				command: "set-alias",
				color: "#4987C7"
			})
		}
	}
}
