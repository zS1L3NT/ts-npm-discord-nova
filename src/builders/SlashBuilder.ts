import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders"

import { iSlashData } from "../helpers/SlashHelper"

export default class SlashBuilder {
	public constructor(private readonly data: iSlashData) {}

	public buildCommand(): SlashCommandBuilder {
		return this.build(SlashCommandBuilder)
	}

	public buildSubcommand(): SlashCommandSubcommandBuilder {
		return this.build(SlashCommandSubcommandBuilder)
	}

	private build<B extends SlashCommandBuilder | SlashCommandSubcommandBuilder>(
		Builder: new () => B
	): B {
		const builder = new Builder()
			.setName(this.data.name)
			.setDescription(this.data.description.slash)

		if (this.data.options) {
			for (const option of this.data.options) {
				switch (option.type) {
					case "string":
						builder.addStringOption(string => {
							string
								.setName(option.name)
								.setDescription(option.description.slash)
								.setRequired(option.required)

							if (option.choices) {
								string.addChoices(...option.choices)
							}

							return string
						})
						break
					case "number":
						builder.addIntegerOption(number => {
							number
								.setName(option.name)
								.setDescription(option.description.slash)
								.setRequired(option.required)

							if (option.choices) {
								number.addChoices(...option.choices)
							}

							return number
						})
						break
					case "boolean":
						builder.addBooleanOption(boolean =>
							boolean
								.setName(option.name)
								.setDescription(option.description.slash)
								.setRequired(option.required)
						)
						break
					case "user":
						builder.addUserOption(user =>
							user
								.setName(option.name)
								.setDescription(option.description.slash)
								.setRequired(option.required)
						)
						break
					case "role":
						builder.addRoleOption(role =>
							role
								.setName(option.name)
								.setDescription(option.description.slash)
								.setRequired(option.required)
						)
						break
					case "channel":
						builder.addChannelOption(channel =>
							channel
								.setName(option.name)
								.setDescription(option.description.slash)
								.setRequired(option.required)
						)
						break
					case "mentionable":
						builder.addMentionableOption(mentionable =>
							mentionable
								.setName(option.name)
								.setDescription(option.description.slash)
								.setRequired(option.required)
						)
						break
				}
			}
		}

		return builder as B
	}
}
