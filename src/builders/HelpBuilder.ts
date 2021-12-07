import CommandBuilder from "./CommandBuilder"
import fs from "fs"
import path from "path"
import {
	BaseEntry,
	BaseGuildCache,
	iInteractionFile,
	iInteractionFolder,
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
import { iInteractionData } from "../helpers/InteractionHelper"
import { SlashCommandBuilder } from "@discordjs/builders"
import { useTry } from "no-try"

class HelpBuilder<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
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
				for (const [fileName, file] of (entity as iInteractionFolder<E, GC>).files) {
					const name = `${entityName} ${fileName}`
					embed.addField(name, file.data.description.detailed)
				}
			} else {
				embed.addField(
					entityName,
					(entity as iInteractionFile<E, GC>).data.description.detailed
				)
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

		const data: iInteractionData = command.includes(" ")
			? (interactionFiles.get(command.split(" ")[0]) as iInteractionFolder<E, GC>).files.get(
					command.split(" ")[1]
			  )!.data
			: (interactionFiles.get(command) as iInteractionFile<E, GC>).data

		const [ts_err] = useTry(() => {
			fs.readFileSync(path.join(this.cwd, "messages", command.replaceAll(" ", "/") + ".ts"))
		})
		const [js_err] = useTry(() => {
			fs.readFileSync(path.join(this.cwd, "messages", command.replaceAll(" ", "/") + ".js"))
		})

		const description = [
			data.description.detailed,
			"",
			`__Message Commands__: **${ts_err && js_err ? "Unsupported" : "Supported"}**`
		]

		if (data.options) {
			description.push("", "__Input Parameters__")
			for (let i = 0, il = data.options.length; i < il; i++) {
				const option = data.options[i]
				const values = [
					`**(${option.required ? "required" : "optional"})**`,
					`**About**: _${option.description.detailed}_`,
					`**Type**: ${option.requirements}`
				]
				if (option.default) {
					values.push(`**Default**: \`${option.default}\``)
				}

				embed.addField(`[${i + 1}]\t__${option.name}__`, values.join("\n"))
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
				for (const [fileName] of (entity as iInteractionFolder<E, GC>).files) {
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
			iInteractionFile<E, GC> | iInteractionFolder<E, GC>
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

			const files: Collection<string, iInteractionSubcommandFile<E, GC>> = new Collection()
			for (const fileName of fileNames) {
				const file = this.require<iInteractionSubcommandFile<E, GC>>(
					`commands/${folderName}/${fileName}`
				)
				files.set(file.data.name, file)
				builder.addSubcommand(new CommandBuilder(file.data).buildSubcommand())
			}

			interactionFiles.set(folderName, {
				data: builder,
				files
			})
		}

		// Slash commands
		const fileNames = entitiyNames.filter(f => HelpBuilder.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iInteractionFile<E, GC>>(`../commands/${filename}`)
			interactionFiles.set(file.data.name, file)
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
