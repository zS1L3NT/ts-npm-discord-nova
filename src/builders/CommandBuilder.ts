import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders"

export interface iInteractionBuilder {
	name: string
	description: string
	options?: (
		| iInteractionBuilderStringOption
		| iInteractionBuilderNumberOption
		| iInteractionBuilderDefaultOption
	)[]
}

interface iInteractionBuilderDefaultOption {
	type: "boolean" | "user" | "role" | "channel" | "mentionable"
	name: string
	description: string
	required: boolean
}

interface iInteractionBuilderStringOption {
	type: "string"
	name: string
	description: string
	required: boolean
	choices?: {
		name: string
		value: string
	}[]
}

interface iInteractionBuilderNumberOption {
	type: "number"
	name: string
	description: string
	required: boolean
	choices?: {
		name: string
		value: number
	}[]
}

export default class CommandBuilder {
	private builder: iInteractionBuilder

	public constructor(builder: iInteractionBuilder) {
		this.builder = builder
	}

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
			.setName(this.builder.name)
			.setDescription(this.builder.description)

		if (this.builder.options) {
			for (const option of this.builder.options) {
				switch (option.type) {
					case "string":
						builder.addStringOption(string => {
							string
								.setName(option.name)
								.setDescription(option.description)
								.setRequired(option.required)

							if (option.choices) {
								string.addChoices(
									option.choices?.map(choice => [choice.name, choice.value])
								)
							}

							return string
						})
						break
					case "number":
						builder.addNumberOption(number => {
							number
								.setName(option.name)
								.setDescription(option.description)
								.setRequired(option.required)

							if (option.choices) {
								number.addChoices(
									option.choices?.map(choice => [choice.name, choice.value])
								)
							}

							return number
						})
						break
					case "boolean":
						builder.addBooleanOption(boolean =>
							boolean
								.setName(option.name)
								.setDescription(option.description)
								.setRequired(option.required)
						)
						break
					case "user":
						builder.addUserOption(user =>
							user
								.setName(option.name)
								.setDescription(option.description)
								.setRequired(option.required)
						)
						break
					case "role":
						builder.addRoleOption(role =>
							role
								.setName(option.name)
								.setDescription(option.description)
								.setRequired(option.required)
						)
						break
					case "channel":
						builder.addChannelOption(channel =>
							channel
								.setName(option.name)
								.setDescription(option.description)
								.setRequired(option.required)
						)
						break
					case "mentionable":
						builder.addMentionableOption(mentionable =>
							mentionable
								.setName(option.name)
								.setDescription(option.description)
								.setRequired(option.required)
						)
						break
				}
			}
		}

		return builder as B
	}
}
