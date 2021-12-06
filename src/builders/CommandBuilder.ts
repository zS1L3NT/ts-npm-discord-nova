import { iInteractionBuilder } from ".."
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders"

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
	): SlashCommandBuilder | SlashCommandSubcommandBuilder {
		const builder = new Builder()
			.setName(this.builder.name)
			.setDescription(this.builder.description)

		return builder
	}
}
