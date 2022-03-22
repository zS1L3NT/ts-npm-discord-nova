import iSlashSubFile from "./iSlashSubFile"
import { BaseEntry, BaseGuildCache } from ".."
import { Collection } from "discord.js"
import { SlashCommandBuilder } from "@discordjs/builders"

export default interface iSlashFolder<E extends BaseEntry, GC extends BaseGuildCache<E, GC>> {
	data: SlashCommandBuilder
	files: Collection<string, iSlashSubFile<E, GC>>
}
