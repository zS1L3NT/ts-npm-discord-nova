import CommandBuilder from "./builders/CommandBuilder"
import { BaseEntry, BaseGuildCache, iConfig, iInteractionFile, iInteractionFolder } from "."
import { Collection } from "discord.js"
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import { SlashCommandBuilder } from "@discordjs/builders"

export default class SlashCommandDeployer<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private readonly guildId: string
	private readonly config: iConfig
	private readonly commands: (
		| SlashCommandBuilder
		| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
	)[]

	public constructor(
		guildId: string,
		config: iConfig,
		interactionEntities: Collection<string, iInteractionFile<E, GC> | iInteractionFolder<E, GC>>
	) {
		this.guildId = guildId
		this.config = config
		this.commands = interactionEntities.map(file =>
			file.data instanceof SlashCommandBuilder
				? file.data
				: new CommandBuilder(file.data).buildCommand()
		)
	}

	public async deploy() {
		const rest = new REST({ version: "9" }).setToken(this.config.discord.token)
		await rest.put(Routes.applicationGuildCommands(this.config.discord.bot_id, this.guildId), {
			body: this.commands.map(command => command.toJSON())
		})
	}
}
