import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	StringSelectMenuBuilder,
} from "discord.js"

import { PrismaClient } from "@prisma/client"

import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	CommandPayload,
	CommandType,
	FilesSetupHelper,
} from "../"

class HelpBuilder<
	P extends PrismaClient,
	E extends BaseEntry,
	GC extends BaseGuildCache<P, E, GC>,
	BC extends BaseBotCache<P, E, GC>,
> {
	private readonly QUESTION =
		"https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/question.png?alt=media&token=fc6d0312-1ed2-408d-9309-5abe69c467c3"
	private readonly WARNING =
		"https://firebasestorage.googleapis.com/v0/b/zectan-projects.appspot.com/o/warning.png?alt=media&token=bc9c95ca-27df-40eb-a015-6d23b88eae31"

	constructor(
		private readonly fsh: FilesSetupHelper<P, E, GC, BC>,
		private readonly cache: GC,
	) {}

	buildMaximum(): CommandPayload {
		return {
			embeds: [
				new EmbedBuilder()
					.setAuthor({ name: "Help", iconURL: this.QUESTION })
					.setThumbnail(this.fsh.icon)
					.setColor("#C7D1D8")
					.setDescription("Overview of all commands")
					.addFields(
						Array.from(this.fsh.commandFiles.entries()).map(([name, commandFile]) => ({
							name,
							value: commandFile.data.description,
						})),
					),
			],
			components: [
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					this.createSelectMenu(),
				),
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("help-minimum")
						.setLabel("Show Help Overview")
						.setStyle(ButtonStyle.Primary)
						.setEmoji("➖"),
				),
			],
		}
	}

	buildMinimum(): CommandPayload {
		if (!this.cache.isAdministrator) {
			return {
				embeds: [
					new EmbedBuilder()
						.setAuthor({ name: "Warning", iconURL: this.WARNING })
						.setThumbnail(this.fsh.icon)
						.setColor(Colors.Red)
						.setDescription(
							[
								`ADMINISTRATOR is currently missing from the list of permissions in <@&${
									this.cache.guild.roles.botRoleFor(this.cache.bot.user!)!.id
								}>`,
								"All interactions with the bot will be temporarily unavailable until this permission is added.",
							].join("\n"),
						),
				],
			}
		}

		return {
			embeds: [
				new EmbedBuilder()
					.setAuthor({ name: "Help", iconURL: this.QUESTION })
					.setThumbnail(this.fsh.icon)
					.setColor("#C7D1D8")
					.setDescription(
						[
							...this.fsh.helpMessage(this.cache).split("\n"),
							"",
							"Click the button below to see all available commands",
							"Use the select menu below to find out more about a specific command",
						].join("\n"),
					),
			],
			components: [
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					this.createSelectMenu(),
				),
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("help-maximum")
						.setLabel("Show all Commands")
						.setStyle(ButtonStyle.Primary)
						.setEmoji("➕"),
				),
			],
		}
	}

	buildCommand(command: string): CommandPayload {
		const embed = new EmbedBuilder().setAuthor({ name: command, iconURL: this.QUESTION })

		const commandFile = this.fsh.commandFiles.get(command)!
		const alias = this.cache.aliases.find(alias => alias.command === command)

		const description = [
			commandFile.data.description,
			"",
			`__Supported__: **${
				commandFile.only === null
					? "Message Commands, Slash Commands"
					: commandFile.only === CommandType.Slash
					? "Slash Commands"
					: "Message Commands"
			}**`,
		]

		if (alias) {
			description.push(`__Message Command Alias__: \`${alias.alias}\``)
		}

		if (commandFile.data.options) {
			description.push("", "__Input Parameters__")
			for (let i = 0; i < commandFile.data.options.length; i++) {
				const option = commandFile.data.options[i]!
				const values = [
					`**(${option.required ? "required" : "optional"})**`,
					`**About**: _${option.description}_`,
					`**Type**: ${option.requirements}`,
				]
				if (option.default) {
					values.push(`**Default**: \`${option.default}\``)
				}

				embed.addFields({
					name: `[${i + 1}]\t__${option.name}__`,
					value: values.join("\n"),
				})
			}
		}

		embed.setDescription(description.join("\n"))

		return {
			embeds: [embed],
			components: [
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					this.createSelectMenu(),
				),
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("help-minimum")
						.setLabel("Back")
						.setStyle(ButtonStyle.Primary)
						.setEmoji("⬅"),
				),
			],
		}
	}

	createSelectMenu() {
		return new StringSelectMenuBuilder()
			.setCustomId("help-item")
			.setPlaceholder("Choose a command")
			.addOptions(
				Array.from(this.fsh.commandFiles.entries()).map(([name, commandFile]) => ({
					label: name,
					value: name,
					description: commandFile.data.description,
				})),
			)
	}
}

export default HelpBuilder
