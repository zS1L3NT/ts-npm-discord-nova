import ButtonHelpMaximum from "../interactions/buttons/help-maximum"
import ButtonHelpMinimum from "../interactions/buttons/help-minimum"
import EventGuildCreate from "../interactions/events/guildCreate"
import EventGuildDelete from "../interactions/events/guildDelete"
import fs from "fs"
import MessageHelp from "../interactions/messages/help"
import path from "path"
import SelectMenuHelpItem from "../interactions/selectMenus/help-item"
import SlashBuilder from "../builders/SlashBuilder"
import SlashHelp from "../interactions/slashs/help"
import SlashSetAlias from "../interactions/slashs/set/alias"
import {
	BaseBotCache,
	BaseEntry,
	BaseGuildCache,
	iButtonFile,
	iEventFile,
	iMessageFile,
	iSelectMenuFile,
	iSlashFile,
	iSlashFolder,
	iSlashSubFile,
	NovaOptions
} from ".."
import { Collection } from "discord.js"
import { SlashCommandBuilder } from "@discordjs/builders"
import { useTry } from "no-try"

export default class FilesSetupHelper<
	E extends BaseEntry,
	GC extends BaseGuildCache<E, GC>,
	BC extends BaseBotCache<E, GC>
> {
	public readonly slashFiles = new Collection<string, iSlashFile<E, GC> | iSlashFolder<E, GC>>()
	public readonly buttonFiles = new Collection<string, iButtonFile<E, GC>>()
	public readonly selectMenuFiles = new Collection<string, iSelectMenuFile<E, GC>>()
	public readonly messageFiles = new Collection<string, iMessageFile<E, GC>>()
	public readonly eventFiles: iEventFile<E, GC, BC, any>[] = []

	public constructor(public readonly options: NovaOptions<E, GC, BC>) {
		this.slashFiles.set("help", SlashHelp(this))
		this.buttonFiles.set("help-maximum", ButtonHelpMaximum(this))
		this.buttonFiles.set("help-minimum", ButtonHelpMinimum(this))
		this.selectMenuFiles.set("help-item", SelectMenuHelpItem(this))
		if (this.options.help.commandRegex) {
			this.messageFiles.set("help-item", MessageHelp(this))
		}
		this.eventFiles.push(EventGuildCreate(this), EventGuildDelete())

		this.setupSlashs()
		this.setupButtons()
		this.setupSelectMenus()
		this.setupMessages()
		this.setupEvents()
	}

	private isFile(file: string): boolean {
		return file.endsWith(".ts") || file.endsWith(".js")
	}

	private readEntities(name: string): string[] | null {
		const [err, files] = useTry(() => fs.readdirSync(path.join(this.options.directory, name)))
		if (err) return null
		return files
	}

	private require<T>(location: string): T {
		const file = require(path.join(this.options.directory, location))
		if ("default" in file) {
			return file.default
		} else {
			return file
		}
	}

	private setupSlashs() {
		const entityNames = this.readEntities("slashs")
		if (entityNames === null) return

		const messageCommands = this.readEntities("messages")
		const setAliasFile = messageCommands
			? messageCommands.length > 0
				? SlashSetAlias(messageCommands)
				: null
			: null

		// Slash subcommands
		const folderNames = entityNames.filter(f => !this.isFile(f))
		for (const folderName of folderNames) {
			const files = new Collection<string, iSlashSubFile<E, GC>>()
			const fileNames = this.readEntities(`slashs/${folderName}`)!
			const builder = new SlashCommandBuilder()
				.setName(folderName)
				.setDescription(`Commands for ${folderName}`)

			if (folderName === "set" && setAliasFile) {
				files.set("alias", setAliasFile)
				builder.addSubcommand(new SlashBuilder(setAliasFile.data).buildSubcommand())
			}

			for (const fileName of fileNames) {
				const file = this.require<iSlashSubFile<E, GC>>(`slashs/${folderName}/${fileName}`)
				files.set(file.data.name, file)
				builder.addSubcommand(new SlashBuilder(file.data).buildSubcommand())
			}

			this.slashFiles.set(folderName, {
				data: builder,
				files
			})
		}

		// Slash commands
		const fileNames = entityNames.filter(f => this.isFile(f))
		for (const filename of fileNames) {
			const file = this.require<iSlashFile<E, GC>>(`slashs/${filename}`)
			this.slashFiles.set(file.data.name, file)
		}

		if (!this.slashFiles.get("set") && setAliasFile) {
			const files = new Collection<string, iSlashSubFile<E, GC>>()
			const builder = new SlashCommandBuilder()
				.setName("set")
				.setDescription(`Commands for set`)

			files.set("alias", setAliasFile)
			builder.addSubcommand(new SlashBuilder(setAliasFile.data).buildSubcommand())

			this.slashFiles.set("set", {
				data: builder,
				files
			})
		}
	}

	private setupButtons() {
		const fileNames = this.readEntities("buttons")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iButtonFile<E, GC>>(`buttons/${fileName}`)
			this.buttonFiles.set(name, file)
		}
	}

	private setupSelectMenus() {
		const fileNames = this.readEntities("selectMenus")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const name = fileName.split(".")[0]!
			const file = this.require<iSelectMenuFile<E, GC>>(`selectMenus/${fileName}`)
			this.selectMenuFiles.set(name, file)
		}
	}

	private setupMessages() {
		const fileNames = this.readEntities("messages")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const file = this.require<iMessageFile<E, GC>>(`messages/${fileName}`)
			this.messageFiles.set(fileName.split(".ts").at(0)!, file)
		}
	}

	private setupEvents() {
		const fileNames = this.readEntities("events")
		if (fileNames === null) return

		for (const fileName of fileNames) {
			const file = this.require<iEventFile<E, GC, BC, any>>(`events/${fileName}`)
			this.eventFiles.push(file)
		}
	}
}
