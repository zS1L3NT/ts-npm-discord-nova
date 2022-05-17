import {
	Collection, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu
} from "discord.js"
import fs from "fs"
import { useTry } from "no-try"
import path from "path"

import { SlashCommandBuilder } from "@discordjs/builders"

import { BaseEntry, BaseGuildCache, iSlashFile, iSlashFolder, iSlashSubFile } from "../"
import { iSlashData } from "../helpers/SlashHelper"
import SlashBuilder from "./SlashBuilder"

class HelpBuilder<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private readonly QUESTION =
		"https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/question.png?alt=media&token=fc6d0312-1ed2-408d-9309-5abe69c467c3"

	public constructor(
		private readonly message: string,
		private readonly icon: string,
		private readonly directory: string,
		private readonly aliases: Record<string, string>
	) {}

	public buildMaximum(): {
		embeds: MessageEmbed[]
		components: MessageActionRow[]
	} {
		const slashFiles = this.getSlashFiles()

		const embed = new MessageEmbed()
			.setAuthor({ name: "Help", iconURL: this.QUESTION })
			.setThumbnail(this.icon)
			.setColor("#C7D1D8")
			.setDescription("Overview of all commands")

		const button = new MessageButton()
			.setCustomId("help-minimum")
			.setLabel("Show Help Overview")
			.setStyle("PRIMARY")
			.setEmoji("➖")

		for (const [entityName, entity] of slashFiles) {
			if (Object.keys(entity).includes("files")) {
				for (const [fileName, file] of (entity as iSlashFolder<E, GC>).files) {
					const name = `${entityName} ${fileName}`
					embed.addField(name, file.data.description.help)
				}
			} else {
				embed.addField(entityName, (entity as iSlashFile<E, GC>).data.description.help)
			}
		}

		return {
			embeds: [embed],
			components: [
				new MessageActionRow().addComponents(this.createSelectMenu()),
				new MessageActionRow().addComponents(button)
			]
		}
	}

	public buildMinimum(): {
		embeds: MessageEmbed[]
		components: MessageActionRow[]
	} {
		const embed = new MessageEmbed()
			.setAuthor({ name: "Help", iconURL: this.QUESTION })
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
			.setLabel("Show all Commands")
			.setStyle("PRIMARY")
			.setEmoji("➕")

		return {
			embeds: [embed],
			components: [
				new MessageActionRow().addComponents(this.createSelectMenu()),
				new MessageActionRow().addComponents(button)
			]
		}
	}

	public buildCommand(command: string): {
		embeds: MessageEmbed[]
		components: MessageActionRow[]
	} {
		const slashFiles = this.getSlashFiles()

		const embed = new MessageEmbed().setAuthor({ name: command, iconURL: this.QUESTION })
		const button = new MessageButton()
			.setCustomId("help-minimum")
			.setLabel("Back")
			.setStyle("PRIMARY")
			.setEmoji("⬅")

		const data: iSlashData = command.includes(" ")
			? (slashFiles.get(command.split(" ")[0]!) as iSlashFolder<E, GC>).files.get(
					command.split(" ")[1]!
			  )!.data
			: (slashFiles.get(command) as iSlashFile<E, GC>).data

		const [tsErr] = useTry(() => {
			fs.readFileSync(
				path.join(this.directory, "messages", command.replaceAll(" ", "/") + ".ts")
			)
		})
		const [jsErr] = useTry(() => {
			fs.readFileSync(
				path.join(this.directory, "messages", command.replaceAll(" ", "/") + ".js")
			)
		})

		const description = [
			data.description.help,
			"",
			`__Message Commands__: **${tsErr && jsErr ? "Unsupported" : "Supported"}**`
		]

		if (this.aliases[command]) {
			description.push(`__Message Command Alias__: \`${this.aliases[command]}\``)
		}

		if (data.options) {
			description.push("", "__Input Parameters__")
			for (let i = 0, il = data.options.length; i < il; i++) {
				const option = data.options[i]!
				const values = [
					`**(${option.required ? "required" : "optional"})**`,
					`**About**: _${option.description.help}_`,
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
				new MessageActionRow().addComponents(this.createSelectMenu()),
				new MessageActionRow().addComponents(button)
			]
		}
	}

	public createSelectMenu(): MessageSelectMenu {
		const slashFiles = this.getSlashFiles()
		const selectMenu = new MessageSelectMenu()
			.setCustomId("help-item")
			.setPlaceholder("Choose a command")

		for (const [entityName, entity] of slashFiles) {
			if (Object.keys(entity).includes("files")) {
				for (const [fileName] of (entity as iSlashFolder<E, GC>).files) {
					const name = `${entityName} ${fileName}`
					selectMenu.addOptions({
						label: name,
						value: name
					})
				}
			} else {
				selectMenu.addOptions({
					label: entityName,
					value: entityName
				})
			}
		}

		return selectMenu
	}

	private getSlashFiles() {
		const slashFiles = new Collection<string, iSlashFile<E, GC> | iSlashFolder<E, GC>>()
		const [err, entitiyNames] = useTry(() =>
			fs.readdirSync(path.join(this.directory, "slashs"))
		)

		if (err) return slashFiles

		// Slash subcommands
		const folderNames = entitiyNames.filter(f => !HelpBuilder.isFile(f))
		for (const folderName of folderNames) {
			const fileNames = fs.readdirSync(path.join(this.directory, `slashs/${folderName}`))
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			const files: Collection<string, iSlashSubFile<E, GC>> = new Collection()
			for (const fileName of fileNames) {
				const file = this.require<iSlashSubFile<E, GC>>(`slashs/${folderName}/${fileName}`)
				files.set(file.data.name, file)
				builder.addSubcommand(new SlashBuilder(file.data).buildSubcommand())
			}

			slashFiles.set(folderName, {
				data: builder,
				files
			})
		}

		// Slash commands
		const fileNames = entitiyNames.filter(f => HelpBuilder.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iSlashFile<E, GC>>(`slashs/${filename}`)
			slashFiles.set(file.data.name, file)
		}

		return slashFiles
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.directory, location))
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
