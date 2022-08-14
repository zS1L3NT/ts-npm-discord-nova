import { MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } from "discord.js"

import {
	BaseBotCache, BaseEntry, BaseGuildCache, CommandPayload, CommandType, FilesSetupHelper
} from "../"

class HelpBuilder<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	private readonly QUESTION =
		"https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/question.png?alt=media&token=fc6d0312-1ed2-408d-9309-5abe69c467c3"
	private readonly WARNING =
		"https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/warning.png?alt=media&token=bc9c95ca-27df-40eb-a015-6d23b88eae31"

	constructor(private readonly fsh: FilesSetupHelper<E, GC, BC>, private readonly cache: GC) {}

	buildMaximum(): CommandPayload {
		return {
			embeds: [
				new MessageEmbed()
					.setAuthor({ name: "Help", iconURL: this.QUESTION })
					.setThumbnail(this.fsh.icon)
					.setColor("#C7D1D8")
					.setDescription("Overview of all commands")
					.addFields(
						Array.from(this.fsh.commandFiles.entries()).map(([name, commandFile]) => ({
							name,
							value: commandFile.data.description
						}))
					)
			],
			components: [
				new MessageActionRow().addComponents(this.createSelectMenu()),
				new MessageActionRow().addComponents(
					new MessageButton()
						.setCustomId("help-minimum")
						.setLabel("Show Help Overview")
						.setStyle("PRIMARY")
						.setEmoji("➖")
				)
			]
		}
	}

	buildMinimum(): CommandPayload {
		if (!this.cache.isAdministrator) {
			return {
				embeds: [
					new MessageEmbed()
						.setAuthor({ name: "Warning", iconURL: this.WARNING })
						.setThumbnail(this.fsh.icon)
						.setColor("RED")
						.setDescription(
							[
								`ADMINISTRATOR Permission is currently missing in <@&${
									this.cache.guild.roles.botRoleFor(this.cache.bot.user!)!.id
								}>`,
								"All interactions with the bot will be temporarily unavailable until this permission is added."
							].join("\n")
						)
				]
			}
		}

		return {
			embeds: [
				new MessageEmbed()
					.setAuthor({ name: "Help", iconURL: this.QUESTION })
					.setThumbnail(this.fsh.icon)
					.setColor("#C7D1D8")
					.setDescription(
						[
							...this.fsh.helpMessage(this.cache).split("\n"),
							"",
							"Click the button below to see all available commands",
							"Use the select menu below to find out more about a specific command"
						].join("\n")
					)
			],
			components: [
				new MessageActionRow().addComponents(this.createSelectMenu()),
				new MessageActionRow().addComponents(
					new MessageButton()
						.setCustomId("help-maximum")
						.setLabel("Show all Commands")
						.setStyle("PRIMARY")
						.setEmoji("➕")
				)
			]
		}
	}

	buildCommand(command: string): CommandPayload {
		const embed = new MessageEmbed().setAuthor({ name: command, iconURL: this.QUESTION })

		const commandFile = this.fsh.commandFiles.get(command)!
		const aliases = this.cache.aliases

		const description = [
			commandFile.data.description,
			"",
			`__Supported__: **${
				commandFile.only === null
					? "Message Commands, Slash Commands"
					: commandFile.only === CommandType.Slash
					? "Slash Commands"
					: "Message Commands"
			}**`
		]

		if (aliases[command]) {
			description.push(`__Message Command Alias__: \`${aliases[command]}\``)
		}

		if (commandFile.data.options) {
			description.push("", "__Input Parameters__")
			for (let i = 0; i < commandFile.data.options.length; i++) {
				const option = commandFile.data.options[i]!
				const values = [
					`**(${option.required ? "required" : "optional"})**`,
					`**About**: _${option.description}_`,
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
				new MessageActionRow().addComponents(
					new MessageButton()
						.setCustomId("help-minimum")
						.setLabel("Back")
						.setStyle("PRIMARY")
						.setEmoji("⬅")
				)
			]
		}
	}

	createSelectMenu() {
		return new MessageSelectMenu()
			.setCustomId("help-item")
			.setPlaceholder("Choose a command")
			.addOptions(
				Array.from(this.fsh.commandFiles.entries()).map(([name, commandFile]) => ({
					label: name,
					value: name,
					description: commandFile.data.description
				}))
			)
	}
}

export default HelpBuilder
