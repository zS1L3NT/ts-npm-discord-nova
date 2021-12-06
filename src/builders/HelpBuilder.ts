import CommandBuilder from "./CommandBuilder"
import fs from "fs"
import path from "path"
import {
	BaseGuildCache,
	BaseRecord,
	iInteractionFile,
	iInteractionFolder,
	iInteractionHelp,
	iInteractionSubcommandFile
} from ".."
import {
	Collection,
	MessageActionRow,
	MessageButton,
	MessageEmbed,
	MessageOptions,
	MessageSelectMenu
} from "discord.js"
import { SlashCommandBuilder } from "@discordjs/builders"
import { useTry } from "no-try"

class HelpBuilder<R extends BaseRecord, GC extends BaseGuildCache<R, GC>> {
	private message: string
	private icon: string
	private cwd: string
	private readonly QUESTION =
		"https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/question.png?alt=media&token=fc6d0312-1ed2-408d-9309-5abe69c467c3"

	public constructor(message: string, icon: string, cwd: string) {
		this.message = message
		this.icon = icon
		this.cwd = cwd
	}

	public buildMaximum(): MessageOptions {
		const interactionFiles = this.getInteractionFiles()

		const embed = new MessageEmbed()
			.setAuthor("Help", this.QUESTION)
			.setThumbnail(this.icon)
			.setColor("#C7D1D8")
			.setDescription("Overview of all commands")

		const button = new MessageButton()
			.setCustomId("help-minimum")
			.setLabel("Minimise")
			.setStyle("PRIMARY")
			.setEmoji("➖")

		for (const [entityName, entity] of interactionFiles) {
			if (Object.keys(entity).includes("files")) {
				for (const [fileName, file] of (entity as iInteractionFolder<R, GC>).files) {
					const name = `${entityName} ${fileName}`
					embed.addField(name, file.help.description)
				}
			} else {
				embed.addField(entityName, (entity as iInteractionFile<R, GC>).help.description)
			}
		}

		return {
			embeds: [embed],
			components: [
				new MessageActionRow().addComponents(this.createMenu()),
				new MessageActionRow().addComponents(button)
			]
		}
	}

	public buildMinimum(): MessageOptions {
		const embed = new MessageEmbed()
			.setAuthor("Help", this.QUESTION)
			.setThumbnail(this.icon)
			.setColor("#C7D1D8")
			.setDescription(
				[
					...this.message.split("\n"),
					"",
					"Click the button below to see all available commands",
					"Use the select menu below to find out more about a specific command"
				].join("\n")
			)

		const button = new MessageButton()
			.setCustomId("help-maximum")
			.setLabel("Maximise")
			.setStyle("PRIMARY")
			.setEmoji("➕")

		return {
			embeds: [embed],
			components: [
				new MessageActionRow().addComponents(this.createMenu()),
				new MessageActionRow().addComponents(button)
			]
		}
	}

	public buildCommand(command: string): MessageOptions {
		const interactionFiles = this.getInteractionFiles()

		const embed = new MessageEmbed().setAuthor(command, this.QUESTION)
		const button = new MessageButton()
			.setCustomId("help-minimum")
			.setLabel("Back")
			.setStyle("PRIMARY")
			.setEmoji("⬅")

		const help: iInteractionHelp = command.includes(" ")
			? (interactionFiles.get(command.split(" ")[0]) as iInteractionFolder<R, GC>).files.get(
					command.split(" ")[1]
			  )!.help
			: (interactionFiles.get(command) as iInteractionFile<R, GC>).help

		const [ts_err] = useTry(() => {
			fs.readFileSync(path.join(this.cwd, "messages", command.replaceAll(" ", "/") + ".ts"))
		})
		const [js_err] = useTry(() => {
			fs.readFileSync(path.join(this.cwd, "messages", command.replaceAll(" ", "/") + ".js"))
		})

		const description = [
			help.description,
			"",
			`__Message Commands__: **${ts_err && js_err ? "Unsupported" : "Supported"}**`
		]

		if (help.params.length) {
			description.push("", "__Input Parameters__")
			for (let i = 0, il = help.params.length; i < il; i++) {
				const param = help.params[i]
				const values = [
					`**(${param.required ? "required" : "optional"})**`,
					`**About**: _${param.description}_`,
					`**Type**: ${param.requirements}`
				]
				if (param.default) {
					values.push(`**Default**: \`${param.default}\``)
				}

				embed.addField(`[${i + 1}]\t__${param.name}__`, values.join("\n"))
			}
		}

		embed.setDescription(description.join("\n"))

		return {
			embeds: [embed],
			components: [
				new MessageActionRow().addComponents(this.createMenu()),
				new MessageActionRow().addComponents(button)
			]
		}
	}

	public createMenu(): MessageSelectMenu {
		const interactionFiles = this.getInteractionFiles()
		const menu = new MessageSelectMenu()
			.setCustomId("help-item")
			.setPlaceholder("Choose a command")

		for (const [entityName, entity] of interactionFiles) {
			if (Object.keys(entity).includes("files")) {
				for (const [fileName] of (entity as iInteractionFolder<R, GC>).files) {
					const name = `${entityName} ${fileName}`
					menu.addOptions({
						label: name,
						value: name
					})
				}
			} else {
				menu.addOptions({
					label: entityName,
					value: entityName
				})
			}
		}

		return menu
	}

	private getInteractionFiles() {
		const interactionFiles = new Collection<
			string,
			iInteractionFile<R, GC> | iInteractionFolder<R, GC>
		>()
		const [err, entitiyNames] = useTry(() => fs.readdirSync(path.join(this.cwd, "commands")))

		if (err) return interactionFiles

		// Slash subcommands
		const folderNames = entitiyNames.filter(f => !HelpBuilder.isFile(f))
		for (const folderName of folderNames) {
			const fileNames = fs.readdirSync(path.join(this.cwd, `commands/${folderName}`))
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			const files: Collection<string, iInteractionSubcommandFile<R, GC>> = new Collection()
			for (const fileName of fileNames) {
				const file = this.require<iInteractionSubcommandFile<R, GC>>(
					`commands/${folderName}/${fileName}`
				)
				files.set(file.builder.name, file)
				builder.addSubcommand(new CommandBuilder(file.builder).buildSubcommand())
			}

			interactionFiles.set(folderName, {
				builder,
				files
			})
		}

		// Slash commands
		const fileNames = entitiyNames.filter(f => HelpBuilder.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iInteractionFile<R, GC>>(`../commands/${filename}`)
			interactionFiles.set(file.builder.name, file)
		}

		return interactionFiles
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.cwd, location))
		if ("default" in file) {
			return file.default
		} else {
			return file
		}
	}

	private static isFile(file: string): boolean {
		return file.endsWith(".ts") || file.endsWith(".js")
	}
}

export default HelpBuilder
