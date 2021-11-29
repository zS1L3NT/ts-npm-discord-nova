import BaseDocument, { iBaseValue } from "./bases/BaseDocument"
import { Collection } from "discord.js"
import { iConfig } from "./NovaBot"
import { iInteractionFile, iInteractionFolder } from "./helpers/BotSetupHelper"
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import { SlashCommandBuilder } from "@discordjs/builders"
import { BaseGuildCache } from "."

export default class SlashCommandDeployer<
	V extends iBaseValue,
	D extends BaseDocument<V, D>,
	GC extends BaseGuildCache<V, D>
> {
	private readonly guildId: string
	private readonly config: iConfig
	private readonly commands: SlashCommandBuilder[]

	public constructor(
		guildId: string,
		config: iConfig,
		interactionEntities: Collection<
			string,
			iInteractionFile<V, D, GC> | iInteractionFolder<V, D, GC>
		>
	) {
		this.guildId = guildId
		this.config = config
		this.commands = interactionEntities.map(file => file.builder)
	}

	public async deploy() {
		const rest = new REST({ version: "9" }).setToken(this.config.discord.token)
		await rest.put(Routes.applicationGuildCommands(this.config.discord.bot_id, this.guildId), {
			body: this.commands.map(command => command.toJSON())
		})
	}
}
