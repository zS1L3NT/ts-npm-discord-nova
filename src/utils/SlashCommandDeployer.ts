import { Routes } from "discord-api-types/v9"
import { Collection } from "discord.js"

import { SlashCommandBuilder } from "@discordjs/builders"
import { REST } from "@discordjs/rest"

import { BaseEntry, BaseGuildCache } from "../"
import SlashBuilder from "../builders/SlashBuilder"
import BaseCommand from "../interactions/command"

export default class SlashCommandDeployer<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	private readonly commands: SlashCommandBuilder[]

	public constructor(
		private readonly guildId: string,
		commandFiles: Collection<string, BaseCommand<any, E, GC>>
	) {
		this.guildId = guildId
		this.commands = commandFiles.map(file =>
			file.data instanceof SlashCommandBuilder
				? file.data
				: new SlashBuilder(file.data).buildCommand()
		)
	}

	public async deploy() {
		const rest = new REST({ version: "9" }).setToken(process.env.DISCORD__TOKEN)
		await rest.put(Routes.applicationGuildCommands(process.env.DISCORD__BOT_ID, this.guildId), {
			body: this.commands.map(command => command.toJSON())
		})
	}
}
