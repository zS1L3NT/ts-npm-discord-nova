import SlashBuilder from "../builders/SlashBuilder"
import { BaseEntry, BaseGuildCache, iConfig, iSlashFile, iSlashFolder } from ".."
import { Collection } from "discord.js"
import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import { SlashCommandBuilder } from "@discordjs/builders"

export default class SlashCommandDeployer<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private readonly commands: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">[]

	public constructor(
		private readonly guildId: string,
		private readonly config: iConfig,
		slashEntities: Collection<string, iSlashFile<E, GC> | iSlashFolder<E, GC>>
	) {
		this.guildId = guildId
		this.config = config
		this.commands = slashEntities.map(file =>
			file.data instanceof SlashCommandBuilder
				? file.data
				: new SlashBuilder(file.data).buildCommand()
		)
	}

	public async deploy() {
		const rest = new REST({ version: "9" }).setToken(this.config.discord.token)
		await rest.put(Routes.applicationGuildCommands(this.config.discord.bot_id, this.guildId), {
			body: this.commands.map(command => command.toJSON())
		})
	}
}
